import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InvoiceStatus } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { CreateFeeStructureDto } from './dto/create-fee-structure.dto';
import { GenerateInvoicesDto } from './dto/generate-invoices.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { FeeStructuresService } from './fee-structures.service';
import { InvoicingService } from './invoicing.service';
import { PaymentsService } from './payments.service';
import { RefundsAdjustmentsService } from './refunds-adjustments.service';
import { StudentLedgerService } from './student-ledger.service';
import { FinancialReportsService } from './financial-reports.service';
import {
  CreateFeeCategoryDto,
  CreateExtendedFeeStructureDto,
  CreateFeeScheduleDto,
  CreateFeeDiscountDto,
  AssignStudentFeeDto,
  GenerateSingleInvoiceDto,
  ProcessPaymentDto,
  RequestRefundDto,
  ReviewRefundDto,
  CreateFeeAdjustmentDto,
  OpenCashierShiftDto,
  CloseCashierShiftDto,
} from './dto/phase4g-fees.dto';

@Injectable()
export class FeesService {
  private readonly logger = new Logger(FeesService.name);

  constructor(
    private readonly prisma: PrismaService,
    public readonly feeStructuresService: FeeStructuresService,
    public readonly invoicingService: InvoicingService,
    public readonly paymentsService: PaymentsService,
    public readonly refundsAdjustmentsService: RefundsAdjustmentsService,
    public readonly studentLedgerService: StudentLedgerService,
    public readonly financialReportsService: FinancialReportsService,
  ) {}

  // ---------------------------------------------------------------------------
  // Phase 2 Legacy Compatibility Layer
  // ---------------------------------------------------------------------------

  async createStructure(dto: CreateFeeStructureDto) {
    const campus = await this.prisma.campus.findUnique({
      where: { id: dto.campusId },
    });
    if (!campus) throw new NotFoundException('Campus not found');

    const created = await this.prisma.feeStructure.create({
      data: {
        organizationId: campus.organizationId,
        campusId: dto.campusId,
        name: dto.name,
        amount: dto.amount,
        frequency: dto.frequency as any,
      },
    });

    return {
      ...created,
      amount: Number(created.amount),
    };
  }

  async getStructures(campusId?: string) {
    const where: any = {};
    if (campusId) where.campusId = campusId;

    const structures = await this.prisma.feeStructure.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        campus: {
          select: { id: true, name: true, code: true },
        },
        _count: {
          select: { feeInvoices: true },
        },
      },
    });

    return structures.map((s) => ({
      ...s,
      amount: Number(s.amount),
    }));
  }

  async generateInvoices(dto: GenerateInvoicesDto) {
    return this.invoicingService.generateInvoices(null, dto);
  }

  async getInvoices(filters: {
    studentId?: string;
    status?: InvoiceStatus;
    academicYearId?: string;
    page?: number;
    limit?: number;
  }) {
    return this.invoicingService.getInvoices(filters);
  }

  async getInvoiceById(id: string) {
    return this.invoicingService.getInvoiceById(id);
  }

  async recordPayment(user: CurrentUserPayload, dto: RecordPaymentDto) {
    return this.paymentsService.recordPayment(user, dto);
  }

  // ---------------------------------------------------------------------------
  // Phase 4G Extended Operations
  // ---------------------------------------------------------------------------

  // Fee Categories
  async createCategory(user: CurrentUserPayload, dto: CreateFeeCategoryDto) {
    return this.feeStructuresService.createCategory(user, dto);
  }

  async getCategories(user: CurrentUserPayload, campusId?: string) {
    return this.feeStructuresService.getCategories(user, campusId);
  }

  // Extended Fee Structures
  async createExtendedStructure(user: CurrentUserPayload, dto: CreateExtendedFeeStructureDto) {
    return this.feeStructuresService.createStructure(user, dto);
  }

  // Fee Schedules
  async createSchedule(user: CurrentUserPayload, dto: CreateFeeScheduleDto) {
    return this.feeStructuresService.createSchedule(user, dto);
  }

  async getSchedules(user: CurrentUserPayload, academicYearId?: string, feeStructureId?: string) {
    return this.feeStructuresService.getSchedules(user, academicYearId, feeStructureId);
  }

  // Fee Discounts
  async createDiscount(user: CurrentUserPayload, dto: CreateFeeDiscountDto) {
    return this.feeStructuresService.createDiscount(user, dto);
  }

  async getDiscounts(user: CurrentUserPayload, campusId?: string) {
    return this.feeStructuresService.getDiscounts(user, campusId);
  }

  // Student Fee Assignments
  async assignStudentFee(user: CurrentUserPayload, dto: AssignStudentFeeDto) {
    return this.feeStructuresService.assignStudentFee(user, dto);
  }

  async getStudentFeeAssignments(user: CurrentUserPayload, studentId: string, academicYearId?: string) {
    return this.feeStructuresService.getStudentFeeAssignments(user, studentId, academicYearId);
  }

  // Invoicing
  async generateSingleInvoice(user: CurrentUserPayload, dto: GenerateSingleInvoiceDto) {
    return this.invoicingService.generateSingleInvoice(user, dto);
  }

  async voidInvoice(user: CurrentUserPayload, id: string, reason: string) {
    return this.invoicingService.voidInvoice(user, id, reason);
  }

  async applyLateFees(organizationId: string, campusId?: string) {
    return this.invoicingService.applyLateFees(organizationId, campusId);
  }

  // Payments & Receipts
  async processPayment(user: CurrentUserPayload, dto: ProcessPaymentDto) {
    return this.paymentsService.recordPayment(user, dto);
  }

  async getReceipt(paymentId: string) {
    return this.paymentsService.generateReceipt(paymentId);
  }

  // Cashier Shifts
  async openCashierShift(user: CurrentUserPayload, dto: OpenCashierShiftDto) {
    return this.paymentsService.openShift(user, dto);
  }

  async closeCashierShift(user: CurrentUserPayload, shiftId: string, dto: CloseCashierShiftDto) {
    return this.paymentsService.closeShift(user, shiftId, dto);
  }

  async getCurrentShift(user: CurrentUserPayload) {
    return this.paymentsService.getCurrentShift(user);
  }

  async getCashierShifts(user: CurrentUserPayload, campusId?: string) {
    return this.paymentsService.getShifts(user, campusId);
  }

  // Refunds
  async requestRefund(user: CurrentUserPayload, dto: RequestRefundDto) {
    return this.refundsAdjustmentsService.requestRefund(user, dto);
  }

  async reviewRefund(user: CurrentUserPayload, refundId: string, dto: ReviewRefundDto) {
    return this.refundsAdjustmentsService.reviewRefund(user, refundId, dto);
  }

  async getRefunds(user: CurrentUserPayload, status?: string) {
    return this.refundsAdjustmentsService.getRefunds(user, status);
  }

  // Adjustments
  async createAdjustment(user: CurrentUserPayload, dto: CreateFeeAdjustmentDto) {
    return this.refundsAdjustmentsService.createAdjustment(user, dto);
  }

  async getAdjustments(user: CurrentUserPayload, feeInvoiceId?: string, type?: string) {
    return this.refundsAdjustmentsService.getAdjustments(user, feeInvoiceId, type);
  }

  // Student Ledger
  async getStudentLedger(studentId: string, academicYearId?: string) {
    return this.studentLedgerService.getStudentLedger(studentId, academicYearId);
  }

  // Reports
  async getCollectionSummary(options: {
    organizationId: string;
    campusId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    return this.financialReportsService.getCollectionSummary(options);
  }

  async getDefaultersAgingReport(options: {
    organizationId: string;
    campusId?: string;
    academicYearId?: string;
  }) {
    return this.financialReportsService.getDefaultersAgingReport(options);
  }
}
