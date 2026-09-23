// =============================================================================
// Phase 4M: Communication Templates Service
// =============================================================================
import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import {
  CommunicationChannel,
  TemplateLanguage,
} from '@prisma/client';
import {
  ICreateTemplateDto,
  IUpdateTemplateDto,
} from '@school/shared-types';

@Injectable()
export class CommunicationTemplatesService {
  private readonly logger = new Logger(CommunicationTemplatesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Extracts placeholder variable names from a template string (e.g. {{student_name}}).
   */
  extractVariables(content: string): string[] {
    const matches = content.match(/\{\{([a-zA-Z0-9_]+)\}\}/g);
    if (!matches) return [];
    const vars = matches.map((m) => m.replace(/[\{\}]/g, '').trim());
    return Array.from(new Set(vars));
  }

  /**
   * Safely renders a template by interpolating {{var}} syntax with supplied values.
   */
  renderContent(content: string, variables: Record<string, any> = {}): string {
    if (!content) return '';
    return content.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (match, key) => {
      const val = variables[key];
      return val !== undefined && val !== null ? String(val) : '';
    });
  }

  /**
   * Creates a new communication template along with initial version #1.
   */
  async createTemplate(
    organizationId: string,
    dto: ICreateTemplateDto,
    userId?: string,
  ) {
    const language = (dto.language as TemplateLanguage) || TemplateLanguage.EN;
    const channel = (dto.channel as CommunicationChannel) || CommunicationChannel.IN_APP;

    const existing = await this.prisma.communicationTemplate.findFirst({
      where: {
        organizationId,
        code: dto.code.trim().toUpperCase(),
        language,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Template with code '${dto.code}' and language '${language}' already exists.`,
      );
    }

    const autoVars = this.extractVariables(
      `${dto.subject || ''} ${dto.body || ''}`,
    );
    const combinedVars = Array.from(
      new Set([...autoVars, ...(dto.variables || [])]),
    );

    return this.prisma.$transaction(async (tx) => {
      const template = await tx.communicationTemplate.create({
        data: {
          organizationId,
          code: dto.code.trim().toUpperCase(),
          name: dto.name,
          description: dto.description,
          channel,
          language,
          subject: dto.subject,
          body: dto.body,
          variables: combinedVars,
          currentVersion: 1,
          isActive: true,
        },
      });

      await tx.communicationTemplateVersion.create({
        data: {
          templateId: template.id,
          version: 1,
          subject: dto.subject,
          body: dto.body,
          variables: combinedVars,
          changeNotes: 'Initial creation',
          changedBy: userId,
        },
      });

      return template;
    });
  }

  /**
   * List templates with optional channel, language, and active filters.
   */
  async listTemplates(
    organizationId: string,
    filters?: {
      channel?: CommunicationChannel;
      language?: TemplateLanguage;
      search?: string;
      isActive?: boolean;
    },
  ) {
    const where: any = { organizationId };

    if (filters?.channel) {
      where.channel = filters.channel;
    }
    if (filters?.language) {
      where.language = filters.language;
    }
    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { code: { contains: filters.search, mode: 'insensitive' } },
        { subject: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.communicationTemplate.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }, { code: 'asc' }],
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 5,
        },
      },
    });
  }

  /**
   * Retrieves a template by ID including historical versions.
   */
  async getTemplateById(organizationId: string, id: string) {
    const template = await this.prisma.communicationTemplate.findFirst({
      where: { id, organizationId },
      include: {
        versions: {
          orderBy: { version: 'desc' },
        },
      },
    });

    if (!template) {
      throw new NotFoundException(`Template with ID '${id}' not found.`);
    }

    return template;
  }

  /**
   * Retrieves a template by code and language.
   */
  async getTemplateByCode(
    organizationId: string,
    code: string,
    language: TemplateLanguage = TemplateLanguage.EN,
  ) {
    return this.prisma.communicationTemplate.findFirst({
      where: {
        organizationId,
        code: code.trim().toUpperCase(),
        language,
        isActive: true,
      },
    });
  }

  /**
   * Updates an existing template and creates a new version record if content changes.
   */
  async updateTemplate(
    organizationId: string,
    id: string,
    dto: IUpdateTemplateDto,
    userId?: string,
  ) {
    const template = await this.getTemplateById(organizationId, id);

    const isContentChanged =
      (dto.body !== undefined && dto.body !== template.body) ||
      (dto.subject !== undefined && dto.subject !== template.subject) ||
      (dto.variables !== undefined &&
        JSON.stringify(dto.variables) !== JSON.stringify(template.variables));

    const newSubject = dto.subject !== undefined ? dto.subject : template.subject;
    const newBody = dto.body !== undefined ? dto.body : template.body;

    const autoVars = this.extractVariables(`${newSubject || ''} ${newBody || ''}`);
    const finalVars = Array.from(
      new Set([...autoVars, ...(dto.variables || template.variables)]),
    );

    return this.prisma.$transaction(async (tx) => {
      const nextVersion = isContentChanged
        ? template.currentVersion + 1
        : template.currentVersion;

      const updated = await tx.communicationTemplate.update({
        where: { id },
        data: {
          name: dto.name ?? template.name,
          description: dto.description ?? template.description,
          channel: (dto.channel as CommunicationChannel) ?? template.channel,
          subject: newSubject,
          body: newBody,
          variables: finalVars,
          currentVersion: nextVersion,
          isActive: dto.isActive ?? template.isActive,
        },
      });

      if (isContentChanged) {
        await tx.communicationTemplateVersion.create({
          data: {
            templateId: template.id,
            version: nextVersion,
            subject: newSubject,
            body: newBody,
            variables: finalVars,
            changeNotes: dto.changeNotes || `Updated to version ${nextVersion}`,
            changedBy: userId,
          },
        });
      }

      return updated;
    });
  }

  /**
   * Deletes a template.
   */
  async deleteTemplate(organizationId: string, id: string) {
    await this.getTemplateById(organizationId, id);
    return this.prisma.communicationTemplate.delete({
      where: { id },
    });
  }

  /**
   * Previews a template with sample or supplied variables.
   */
  async previewTemplate(
    organizationId: string,
    id: string,
    sampleData: Record<string, any> = {},
  ) {
    const template = await this.getTemplateById(organizationId, id);

    const renderedSubject = template.subject
      ? this.renderContent(template.subject, sampleData)
      : null;
    const renderedBody = this.renderContent(template.body, sampleData);

    return {
      templateId: template.id,
      code: template.code,
      channel: template.channel,
      language: template.language,
      variables: template.variables,
      sampleDataUsed: sampleData,
      renderedSubject,
      renderedBody,
    };
  }
}
