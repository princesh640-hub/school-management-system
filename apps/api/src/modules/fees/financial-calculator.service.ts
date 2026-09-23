import { Injectable } from '@nestjs/common';
import { LateFeeType, DiscountType } from '@school/shared-types';

@Injectable()
export class FinancialCalculatorService {
  /**
   * Round monetary values strictly to 2 decimal places to prevent floating point drift.
   */
  roundMoney(amount: number): number {
    return Math.round((Number(amount) || 0) * 100) / 100;
  }

  /**
   * Calculate discount amount given base fee and discount specification.
   * Ensures discount never exceeds the base amount.
   */
  calculateDiscount(baseAmount: number, discountType: DiscountType, value: number): number {
    const base = Math.max(0, this.roundMoney(baseAmount));
    const rate = Math.max(0, this.roundMoney(value));

    let discount = 0;
    if (discountType === 'PERCENTAGE') {
      discount = (base * rate) / 100;
    } else {
      discount = rate; // Fixed amount, scholarship, or concession
    }

    discount = this.roundMoney(discount);
    return Math.min(base, discount); // Never produce negative total
  }

  /**
   * Calculate late fee fine based on policy, due date, and payment/current date.
   */
  calculateLateFee(options: {
    baseAmount: number;
    dueDate: Date;
    currentDate?: Date;
    lateFeeType: LateFeeType;
    lateFeeValue: number;
    graceDays?: number;
    maxLateFee?: number | null;
  }): number {
    const { baseAmount, dueDate, currentDate = new Date(), lateFeeType, lateFeeValue, graceDays = 0, maxLateFee } = options;

    const diffMs = currentDate.getTime() - dueDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // Within grace period -> No late fee
    if (diffDays <= graceDays) {
      return 0;
    }

    const overdueDays = diffDays - graceDays;
    let fine = 0;

    if (lateFeeType === 'FIXED') {
      fine = lateFeeValue;
    } else if (lateFeeType === 'DAILY_RATE') {
      fine = overdueDays * lateFeeValue;
    } else if (lateFeeType === 'PERCENTAGE') {
      fine = (baseAmount * lateFeeValue) / 100;
    }

    fine = this.roundMoney(fine);

    if (maxLateFee !== undefined && maxLateFee !== null && maxLateFee > 0) {
      fine = Math.min(fine, this.roundMoney(maxLateFee));
    }

    return fine;
  }

  /**
   * Compute invoice net total: subtotal - discounts + fines
   */
  computeInvoiceTotal(options: {
    subtotal: number;
    discountAmount?: number;
    fineAmount?: number;
  }): { netTotal: number; discountAmount: number; fineAmount: number } {
    const sub = Math.max(0, this.roundMoney(options.subtotal));
    const disc = Math.min(sub, Math.max(0, this.roundMoney(options.discountAmount || 0)));
    const fine = Math.max(0, this.roundMoney(options.fineAmount || 0));

    const net = this.roundMoney(sub - disc + fine);
    return {
      netTotal: net,
      discountAmount: disc,
      fineAmount: fine,
    };
  }

  /**
   * Determine maximum allowable refund against a transaction
   */
  calculateEligibleRefund(paidAmount: number, existingRefunds: number = 0): number {
    const paid = Math.max(0, this.roundMoney(paidAmount));
    const refunded = Math.max(0, this.roundMoney(existingRefunds));
    return Math.max(0, this.roundMoney(paid - refunded));
  }

  /**
   * Break a net amount into equal scheduled installments with final remainder balancing.
   */
  generateInstallmentAmounts(totalAmount: number, numberOfInstallments: number): number[] {
    if (numberOfInstallments <= 1) return [this.roundMoney(totalAmount)];

    const totalCents = Math.round(this.roundMoney(totalAmount) * 100);
    const baseCents = Math.floor(totalCents / numberOfInstallments);
    const remainderCents = totalCents - baseCents * numberOfInstallments;

    const result: number[] = [];
    for (let i = 0; i < numberOfInstallments; i++) {
      // Add remainder cents to the final installment
      const installmentCents = i === numberOfInstallments - 1 ? baseCents + remainderCents : baseCents;
      result.push(installmentCents / 100);
    }

    return result;
  }

  calculateInstallmentSchedule(totalAmount: number, numberOfInstallments: number): number[] {
    return this.generateInstallmentAmounts(totalAmount, numberOfInstallments);
  }
}
