import { Injectable } from '@nestjs/common';
import {
  PayrollCalculationResult,
  EarningType,
  DeductionType,
} from '@school/shared-types';

@Injectable()
export class PayrollCalculatorService {
  /**
   * Round monetary values strictly to 2 decimal places to prevent floating point drift.
   */
  roundMoney(amount: number): number {
    return Math.round((Number(amount) || 0) * 100) / 100;
  }

  /**
   * Calculate daily rate from base salary and working days in month (baseSalary / denominator).
   */
  calculateDailyRate(baseSalary: number, denominator: number = 30): number {
    const base = Math.max(0, this.roundMoney(baseSalary));
    const days = Math.max(1, Math.round(denominator));
    return this.roundMoney(base / days);
  }

  /**
   * Calculate unpaid leave and absence deductions: unpaidDays * dailyRate
   */
  calculateLeaveDeduction(unpaidDays: number, dailyRate: number): number {
    const days = Math.max(0, Number(unpaidDays) || 0);
    const rate = Math.max(0, this.roundMoney(dailyRate));
    return this.roundMoney(days * rate);
  }

  /**
   * Calculate loan deduction capped against remaining balance: Math.min(installment, remainingBalance)
   */
  calculateLoanDeduction(monthlyInstallment: number, remainingBalance: number): number {
    const installment = Math.max(0, this.roundMoney(monthlyInstallment));
    const remaining = Math.max(0, this.roundMoney(remainingBalance));
    return Math.min(installment, remaining);
  }

  /**
   * Calculate salary component allowance or deduction amount given base salary.
   */
  calculateComponentAmount(options: {
    baseSalary: number;
    calculationType: 'FIXED' | 'PERCENTAGE_OF_BASE';
    value: number;
  }): number {
    const { baseSalary, calculationType, value } = options;
    const base = Math.max(0, this.roundMoney(baseSalary));
    const val = Math.max(0, this.roundMoney(value));

    if (calculationType === 'PERCENTAGE_OF_BASE') {
      return this.roundMoney((base * val) / 100);
    }
    return val;
  }

  /**
   * Alias for calculateEmployeePayroll
   */
  calculateSalary(options: any): PayrollCalculationResult {
    return this.calculateEmployeePayroll(options);
  }

  /**
   * Compute authoritative gross, deductions, and net salary for an employee.
   * Deterministic, zero-drift, and transaction-safe.
   */
  calculateEmployeePayroll(options: {
    baseSalary: number;
    allowances?: Array<{ title: string; amount: number }>;
    deductions?: Array<{ title: string; amount: number }>;
    bonusAmount?: number;
    overtimeAmount?: number;
    unpaidLeaveDays?: number;
    absenceDays?: number;
    daysInMonth?: number;
    activeLoanRemaining?: number;
    monthlyLoanInstallment?: number;
    adjustments?: Array<{ type: 'EARNING' | 'DEDUCTION'; amount: number; reason: string }>;
  }): PayrollCalculationResult {
    const baseSalary = Math.max(0, this.roundMoney(options.baseSalary));
    const daysInMonth = Math.max(1, options.daysInMonth || 30);
    const dailyRate = this.calculateDailyRate(baseSalary, daysInMonth);

    const earningsBreakdown: Array<{ title: string; type: EarningType; amount: number }> = [];
    const deductionsBreakdown: Array<{ title: string; type: DeductionType; amount: number }> = [];

    // 1. Base Salary
    earningsBreakdown.push({
      title: 'Base Salary',
      type: 'BASE',
      amount: baseSalary,
    });

    // 2. Allowances
    let totalAllowances = 0;
    if (options.allowances && options.allowances.length > 0) {
      for (const al of options.allowances) {
        const amt = Math.max(0, this.roundMoney(al.amount));
        totalAllowances += amt;
        earningsBreakdown.push({
          title: al.title,
          type: 'ALLOWANCE',
          amount: amt,
        });
      }
    }

    // 3. Bonuses
    const bonusAmount = Math.max(0, this.roundMoney(options.bonusAmount || 0));
    if (bonusAmount > 0) {
      earningsBreakdown.push({
        title: 'Performance Bonus',
        type: 'BONUS',
        amount: bonusAmount,
      });
    }

    // 4. Overtime
    const overtimeAmount = Math.max(0, this.roundMoney(options.overtimeAmount || 0));
    if (overtimeAmount > 0) {
      earningsBreakdown.push({
        title: 'Approved Overtime',
        type: 'OVERTIME',
        amount: overtimeAmount,
      });
    }

    // 5. Earning Adjustments
    let totalEarningAdjustments = 0;
    if (options.adjustments && options.adjustments.length > 0) {
      for (const adj of options.adjustments) {
        if (adj.type === 'EARNING') {
          const amt = Math.max(0, this.roundMoney(adj.amount));
          totalEarningAdjustments += amt;
          earningsBreakdown.push({
            title: `Adjustment: ${adj.reason}`,
            type: 'OTHER',
            amount: amt,
          });
        }
      }
    }

    const grossSalary = this.roundMoney(
      baseSalary + totalAllowances + bonusAmount + overtimeAmount + totalEarningAdjustments,
    );

    // 6. Fixed Deductions (Tax, Provident Fund, etc.)
    let totalFixedDeductions = 0;
    if (options.deductions && options.deductions.length > 0) {
      for (const d of options.deductions) {
        const amt = Math.max(0, this.roundMoney(d.amount));
        totalFixedDeductions += amt;
        deductionsBreakdown.push({
          title: d.title,
          type: 'TAX',
          amount: amt,
        });
      }
    }

    // 7. Unpaid Leave Deductions (Phase 4D Integration)
    const unpaidDays = Math.max(0, Number(options.unpaidLeaveDays || 0));
    const unpaidLeaveDeduction = this.calculateLeaveDeduction(unpaidDays, dailyRate);
    if (unpaidLeaveDeduction > 0) {
      deductionsBreakdown.push({
        title: `Unpaid Leave (${unpaidDays} days)`,
        type: 'UNPAID_LEAVE',
        amount: unpaidLeaveDeduction,
      });
    }

    // 8. Unexcused Absence Deductions (Phase 4D Integration)
    const absDays = Math.max(0, Number(options.absenceDays || 0));
    const absenceDeduction = this.calculateLeaveDeduction(absDays, dailyRate);
    if (absenceDeduction > 0) {
      deductionsBreakdown.push({
        title: `Unexcused Absence (${absDays} days)`,
        type: 'ABSENCE',
        amount: absenceDeduction,
      });
    }

    // 9. Loan Installment Recovery (capped at remaining loan balance)
    let loanDeduction = 0;
    if (options.monthlyLoanInstallment && options.monthlyLoanInstallment > 0) {
      const remaining = Math.max(0, this.roundMoney(options.activeLoanRemaining || 0));
      loanDeduction = this.calculateLoanDeduction(options.monthlyLoanInstallment, remaining);

      if (loanDeduction > 0) {
        deductionsBreakdown.push({
          title: 'Employee Loan Repayment Installment',
          type: 'LOAN_REPAYMENT',
          amount: loanDeduction,
        });
      }
    }

    // 10. Deduction Adjustments
    let totalDeductionAdjustments = 0;
    if (options.adjustments && options.adjustments.length > 0) {
      for (const adj of options.adjustments) {
        if (adj.type === 'DEDUCTION') {
          const amt = Math.max(0, this.roundMoney(adj.amount));
          totalDeductionAdjustments += amt;
          deductionsBreakdown.push({
            title: `Adjustment: ${adj.reason}`,
            type: 'OTHER',
            amount: amt,
          });
        }
      }
    }

    const totalDeductions = this.roundMoney(
      totalFixedDeductions +
        unpaidLeaveDeduction +
        absenceDeduction +
        loanDeduction +
        totalDeductionAdjustments,
    );

    const netSalary = this.roundMoney(Math.max(0, grossSalary - totalDeductions));

    return {
      baseSalary,
      allowances: this.roundMoney(totalAllowances),
      bonuses: this.roundMoney(bonusAmount),
      overtime: this.roundMoney(overtimeAmount),
      grossSalary,
      taxDeduction: this.roundMoney(totalFixedDeductions),
      unpaidLeaveDeduction,
      absenceDeduction,
      loanDeduction,
      otherDeductions: this.roundMoney(totalDeductionAdjustments),
      totalDeductions,
      netSalary,
      earningsBreakdown,
      deductionsBreakdown,
    };
  }
}
