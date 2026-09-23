import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';

export interface GradeResolutionResult {
  grade: string;
  gradePoint: number;
  isPass: boolean;
  description?: string;
}

@Injectable()
export class GradingEngineService {
  private readonly logger = new Logger(GradingEngineService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Deterministically compute score percentage
   */
  computePercentage(marksObtained: number, maxMarks: number): number {
    if (!maxMarks || maxMarks <= 0) return 0;
    const pct = (marksObtained / maxMarks) * 100;
    return Math.round(pct * 100) / 100; // 2 decimal precision
  }

  /**
   * Calculate aggregated component marks and overall percentage
   */
  computeComponentTotal(components: Array<{ marksObtained: number; maxMarks: number; weight?: number | null }>): {
    totalMarks: number;
    totalMaxMarks: number;
    percentage: number;
  } {
    if (!components || components.length === 0) {
      return { totalMarks: 0, totalMaxMarks: 0, percentage: 0 };
    }

    // Check if weighted
    const hasWeights = components.some((c) => c.weight !== undefined && c.weight !== null && Number(c.weight) > 0);

    if (hasWeights) {
      let weightedScoreSum = 0;
      let totalWeight = 0;
      let totalMarks = 0;
      let totalMaxMarks = 0;

      for (const comp of components) {
        const weight = Number(comp.weight || 0);
        const max = Number(comp.maxMarks || 1);
        const marks = Number(comp.marksObtained || 0);
        const compPct = (marks / max) * 100;

        weightedScoreSum += (compPct * weight) / 100;
        totalWeight += weight;
        totalMarks += marks;
        totalMaxMarks += max;
      }

      const normalizedPercentage = totalWeight > 0 ? (weightedScoreSum / totalWeight) * 100 : 0;
      return {
        totalMarks: Math.round(totalMarks * 100) / 100,
        totalMaxMarks: Math.round(totalMaxMarks * 100) / 100,
        percentage: Math.round(normalizedPercentage * 100) / 100,
      };
    } else {
      let totalMarks = 0;
      let totalMaxMarks = 0;
      for (const comp of components) {
        totalMarks += Number(comp.marksObtained || 0);
        totalMaxMarks += Number(comp.maxMarks || 0);
      }
      return {
        totalMarks: Math.round(totalMarks * 100) / 100,
        totalMaxMarks: Math.round(totalMaxMarks * 100) / 100,
        percentage: this.computePercentage(totalMarks, totalMaxMarks),
      };
    }
  }

  /**
   * Resolves grade, grade point and pass status against a dynamic list of GradeScaleRules,
   * falling back to standard enterprise educational scale if no rules provided.
   */
  resolveGrade(
    percentage: number,
    rules?: Array<{
      grade: string;
      minPercentage: any;
      maxPercentage: any;
      gradePoint?: any;
      description?: string | null;
      isPass?: boolean;
    }>,
  ): GradeResolutionResult {
    const score = Math.max(0, Math.min(100, Math.round(percentage * 100) / 100));

    if (rules && rules.length > 0) {
      // Find matching rule (ordered by minPercentage desc)
      const sortedRules = [...rules].sort(
        (a, b) => Number(b.minPercentage) - Number(a.minPercentage),
      );

      for (const rule of sortedRules) {
        const min = Number(rule.minPercentage);
        const max = Number(rule.maxPercentage);

        // Allow max to be inclusive for highest bracket or standard boundary
        if (score >= min && (score <= max || (max === 100 && score <= 100.01))) {
          return {
            grade: rule.grade,
            gradePoint: rule.gradePoint !== undefined && rule.gradePoint !== null ? Number(rule.gradePoint) : 0,
            isPass: rule.isPass !== undefined ? Boolean(rule.isPass) : score >= 40,
            description: rule.description || undefined,
          };
        }
      }
    }

    // Standard Default 4.0 Scale Fallback (preserving 100% Phase 2 compatibility)
    if (score >= 90) return { grade: 'A+', gradePoint: 4.0, isPass: true, description: 'Outstanding' };
    if (score >= 80) return { grade: 'A', gradePoint: 3.7, isPass: true, description: 'Excellent' };
    if (score >= 70) return { grade: 'B', gradePoint: 3.0, isPass: true, description: 'Very Good' };
    if (score >= 60) return { grade: 'C', gradePoint: 2.0, isPass: true, description: 'Good / Average' };
    if (score >= 50) return { grade: 'D', gradePoint: 1.0, isPass: true, description: 'Pass / Below Average' };
    return { grade: 'F', gradePoint: 0.0, isPass: false, description: 'Fail' };
  }

  /**
   * Compute overall GPA across multiple subjects
   */
  computeGPA(items: Array<{ gradePoint: number; creditHours?: number }>): number {
    if (!items || items.length === 0) return 0;

    let totalPoints = 0;
    let totalCredits = 0;

    for (const item of items) {
      const credits = item.creditHours && item.creditHours > 0 ? item.creditHours : 1;
      totalPoints += item.gradePoint * credits;
      totalCredits += credits;
    }

    if (totalCredits === 0) return 0;
    return Math.round((totalPoints / totalCredits) * 100) / 100;
  }

  /**
   * Fetch grade scale rules from database by ID or default for organization/campus
   */
  async getGradeScaleRules(gradeScaleId?: string, organizationId?: string, campusId?: string) {
    if (gradeScaleId) {
      const scale = await this.prisma.gradeScale.findUnique({
        where: { id: gradeScaleId },
        include: {
          rules: {
            orderBy: { sequence: 'asc' },
          },
        },
      });
      if (scale && scale.rules.length > 0) return scale.rules;
    }

    if (organizationId) {
      const defaultScale = await this.prisma.gradeScale.findFirst({
        where: {
          organizationId,
          isDefault: true,
          ...(campusId ? { OR: [{ campusId }, { campusId: null }] } : {}),
        },
        include: {
          rules: {
            orderBy: { sequence: 'asc' },
          },
        },
      });
      if (defaultScale && defaultScale.rules.length > 0) return defaultScale.rules;
    }

    return [];
  }
}
