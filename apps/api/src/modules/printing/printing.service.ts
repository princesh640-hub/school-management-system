// =============================================================================
// Phase 4Q: Printing & Document Generation Service
// =============================================================================
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { QueueService, QueueName } from '../../core/queue/queue.service';
import { AuditService } from '../audit/audit.service';
import {
  IBulkGenerationDto,
  IPrintJob,
  DocumentGenerationJobStatus,
} from '@school/shared-types';

@Injectable()
export class PrintingService {
  private readonly logger = new Logger(PrintingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly audit: AuditService,
  ) {}

  // ---------------------------------------------------------------------------
  // 1. Bulk Document Generation Jobs
  // ---------------------------------------------------------------------------

  async createBulkJob(
    orgId: string,
    campusId: string | null,
    userId: string,
    dto: IBulkGenerationDto,
  ): Promise<IPrintJob> {
    if (!dto.targetIds || dto.targetIds.length === 0) {
      throw new BadRequestException('targetIds array must contain at least one entity ID');
    }

    const job = await this.prisma.documentGenerationJob.create({
      data: {
        organizationId: orgId,
        campusId: campusId || null,
        jobType: dto.jobType,
        status: 'PENDING',
        totalItems: dto.targetIds.length,
        processedItems: 0,
        failedItems: 0,
        payload: {
          targetIds: dto.targetIds,
          options: dto.options || {},
        },
        requestedBy: userId,
      },
    });

    // Enqueue async processing in BullMQ
    try {
      await this.queueService.addJob(
        QueueName.DOCUMENT_GENERATION,
        'process-bulk-generation',
        {
          jobId: job.id,
          orgId,
          campusId,
          jobType: dto.jobType,
          targetIds: dto.targetIds,
          options: dto.options,
        },
      );
    } catch (err: any) {
      this.logger.warn(`Could not enqueue document generation job ${job.id}: ${err.message}`);
    }

    await this.audit.logAction({
      action: 'BULK_DOCUMENT_GENERATION_QUEUED',
      entity: 'DocumentGenerationJob',
      entityId: job.id,
      userId,
      orgId,
      details: {
        jobType: dto.jobType,
        itemCount: dto.targetIds.length,
      },
    });

    return this.mapJobToDto(job);
  }

  async getJobStatus(orgId: string, jobId: string): Promise<IPrintJob> {
    const job = await this.prisma.documentGenerationJob.findFirst({
      where: { id: jobId, organizationId: orgId },
    });

    if (!job) {
      throw new NotFoundException(`Document generation job ${jobId} not found`);
    }

    return this.mapJobToDto(job);
  }

  async listJobs(
    orgId: string,
    campusId?: string,
    page = 1,
    limit = 20,
  ): Promise<{ jobs: IPrintJob[]; total: number; page: number; limit: number }> {
    const where: any = { organizationId: orgId };
    if (campusId) where.campusId = campusId;

    const skip = (page - 1) * limit;

    const [jobs, total] = await Promise.all([
      this.prisma.documentGenerationJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.documentGenerationJob.count({ where }),
    ]);

    return {
      jobs: jobs.map((j) => this.mapJobToDto(j)),
      total,
      page,
      limit,
    };
  }

  // ---------------------------------------------------------------------------
  // 2. Printable Document Renderer
  // ---------------------------------------------------------------------------

  async renderPrintableDocument(
    orgId: string,
    docType: string,
    entityId: string,
  ): Promise<{ html: string; title: string; pageSize: string; orientation: string }> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true, code: true, logoUrl: true, address: true, phone: true, email: true },
    });
    const schoolName = org?.name || 'Academic Institution';

    switch (docType.toUpperCase()) {
      case 'CERTIFICATE': {
        const cert = await this.prisma.issuedCertificate.findFirst({
          where: { id: entityId, organizationId: orgId },
          include: {
            certificateType: true,
            template: true,
          },
        });

        if (!cert) {
          throw new NotFoundException(`Certificate ${entityId} not found`);
        }

        const layout = cert.template?.layout || 'LANDSCAPE';
        const pageSize = cert.template?.pageSize || 'A4';
        const orientation = layout.toLowerCase();

        const content = cert.renderedHtml || `
          <div class="certificate-container ${orientation}">
            <div class="certificate-border">
              <div class="header">
                <h1>${schoolName}</h1>
                <h2>${cert.certificateType?.name || 'CERTIFICATE'}</h2>
              </div>
              <div class="body">
                <p class="presented-to">This is to certify that</p>
                <h3 class="recipient-name">${cert.recipientName}</h3>
                <p class="cert-text">has successfully satisfied all the institutional criteria and requirements.</p>
              </div>
              <div class="footer">
                <div class="meta">
                  <p><strong>Certificate No:</strong> ${cert.certificateNumber}</p>
                  <p><strong>Issue Date:</strong> ${cert.issueDate.toISOString().split('T')[0]}</p>
                  <p><strong>Verification:</strong> ${cert.verificationReference}</p>
                </div>
                <div class="signatures">
                  <div class="sig-line">
                    <div class="line"></div>
                    <span>Authorized Signatory</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;

        const wrappedHtml = this.wrapWithPrintStyles(content, `${cert.certificateType?.name} - ${cert.certificateNumber}`, pageSize, orientation);
        return {
          html: wrappedHtml,
          title: `${cert.certificateType?.name} - ${cert.certificateNumber}`,
          pageSize,
          orientation,
        };
      }

      case 'FEE_RECEIPT': {
        const payment = await this.prisma.paymentTransaction.findFirst({
          where: { id: entityId, organizationId: orgId },
          include: {
            feeInvoice: {
              include: {
                student: {
                  include: {
                    user: { select: { firstName: true, lastName: true, email: true } },
                  },
                },
                items: true,
              },
            },
          },
        });

        if (!payment) {
          throw new NotFoundException(`Payment receipt ${entityId} not found`);
        }

        const student = payment.feeInvoice?.student;
        const studentName = student?.user ? `${student.user.firstName} ${student.user.lastName}` : 'Student';
        const receiptNo = payment.receiptNumber || `RCP-${payment.id.substring(0, 8).toUpperCase()}`;

        const itemsHtml = payment.feeInvoice?.items?.map((item) => `
          <tr>
            <td>${item.name || 'Tuition / Term Fee'}</td>
            <td style="text-align: right;">${item.amount}</td>
          </tr>
        `).join('') || `
          <tr>
            <td>Fee Installment</td>
            <td style="text-align: right;">${payment.amount}</td>
          </tr>
        `;

        const content = `
          <div class="receipt-container">
            <div class="receipt-header">
              <h2>${schoolName}</h2>
              <p class="subtitle">Official Fee Payment Receipt</p>
              <div class="receipt-meta">
                <div><strong>Receipt No:</strong> ${receiptNo}</div>
                <div><strong>Date:</strong> ${payment.createdAt.toISOString().split('T')[0]}</div>
                <div><strong>Payment Method:</strong> ${payment.paymentMethod || 'CASH'}</div>
              </div>
            </div>
            <div class="student-info">
              <p><strong>Student Name:</strong> ${studentName}</p>
              <p><strong>Student ID / Admission:</strong> ${student?.admissionNumber || 'N/A'}</p>
            </div>
            <table class="receipt-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th style="text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
              <tfoot>
                <tr>
                  <th>Total Paid</th>
                  <th style="text-align: right;">${payment.amount}</th>
                </tr>
              </tfoot>
            </table>
            <div class="receipt-footer">
              <p>Status: <strong>PAID</strong></p>
              <p class="stamp-notice">This is a system-generated receipt and requires no manual stamp.</p>
            </div>
          </div>
        `;

        const wrappedHtml = this.wrapWithPrintStyles(content, `Receipt - ${receiptNo}`, 'A5', 'portrait');
        return {
          html: wrappedHtml,
          title: `Receipt - ${receiptNo}`,
          pageSize: 'A5',
          orientation: 'portrait',
        };
      }

      case 'PAYSLIP': {
        const payslip = await this.prisma.payslip.findFirst({
          where: { id: entityId, organizationId: orgId },
          include: {
            employee: {
              include: {
                user: { select: { firstName: true, lastName: true, email: true } },
                department: true,
                designation: true,
              },
            },
          },
        });

        if (!payslip) {
          throw new NotFoundException(`Payslip ${entityId} not found`);
        }

        const emp = payslip.employee;
        const empName = emp?.user ? `${emp.user.firstName} ${emp.user.lastName}` : 'Employee';
        const payslipNumber = (payslip as any).payslipNumber || `PSL-${payslip.id.substring(0, 8).toUpperCase()}`;

        const content = `
          <div class="payslip-container">
            <div class="payslip-header">
              <h2>${schoolName}</h2>
              <h3>Salary Payslip</h3>
              <p><strong>Payslip Reference:</strong> ${payslipNumber}</p>
            </div>
            <div class="emp-grid">
              <div><strong>Employee Name:</strong> ${empName}</div>
              <div><strong>Employee Code:</strong> ${emp?.employeeNumber || 'N/A'}</div>
              <div><strong>Department:</strong> ${emp?.department?.name || 'General'}</div>
              <div><strong>Designation:</strong> ${emp?.designation?.title || 'Staff'}</div>
            </div>
            <table class="payslip-table">
              <thead>
                <tr>
                  <th>Earnings Breakdown</th>
                  <th style="text-align: right;">Amount</th>
                  <th>Deductions</th>
                  <th style="text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Basic Salary</td>
                  <td style="text-align: right;">${payslip.grossPay}</td>
                  <td>Tax & Deductions</td>
                  <td style="text-align: right;">${payslip.totalDeductions}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <th colspan="2">Gross Earnings: ${payslip.grossPay}</th>
                  <th colspan="2" style="text-align: right;">Net Payable: ${payslip.netPay}</th>
                </tr>
              </tfoot>
            </table>
            <div class="payslip-footer">
              <p>Payment Mode: Bank Transfer</p>
              <p>Confidential institutional document generated on ${new Date().toISOString().split('T')[0]}</p>
            </div>
          </div>
        `;

        const wrappedHtml = this.wrapWithPrintStyles(content, `Payslip - ${empName}`, 'A4', 'portrait');
        return {
          html: wrappedHtml,
          title: `Payslip - ${empName}`,
          pageSize: 'A4',
          orientation: 'portrait',
        };
      }

      default:
        throw new BadRequestException(`Unsupported print document type: ${docType}`);
    }
  }

  // ---------------------------------------------------------------------------
  // 3. Print HTML Wrapper & Styling
  // ---------------------------------------------------------------------------

  private wrapWithPrintStyles(
    bodyHtml: string,
    title: string,
    pageSize: string,
    orientation: string,
  ): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @page {
      size: ${pageSize.toUpperCase()} ${orientation};
      margin: 12mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1a1a1a;
      background-color: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .certificate-container {
      width: 100%;
      height: 100%;
      padding: 24px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .certificate-border {
      border: 6px double #1e3a8a;
      padding: 32px;
      text-align: center;
      min-height: 520px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border-radius: 8px;
    }
    .certificate-border .header h1 {
      font-size: 28px;
      color: #1e3a8a;
      margin: 0 0 8px 0;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .certificate-border .header h2 {
      font-size: 20px;
      color: #3b82f6;
      margin: 0 0 24px 0;
      font-weight: 500;
    }
    .certificate-border .recipient-name {
      font-size: 30px;
      color: #0f172a;
      text-decoration: underline;
      margin: 16px 0;
      font-family: Georgia, serif;
    }
    .certificate-border .cert-text {
      font-size: 16px;
      line-height: 1.6;
      color: #475569;
      max-width: 650px;
      margin: 0 auto;
    }
    .certificate-border .footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 36px;
      text-align: left;
    }
    .certificate-border .signatures .line {
      width: 180px;
      border-bottom: 1.5px solid #334155;
      margin-bottom: 6px;
    }
    .receipt-container, .payslip-container {
      padding: 16px;
      max-width: 750px;
      margin: 0 auto;
    }
    .receipt-header, .payslip-header {
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .receipt-table, .payslip-table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
    }
    .receipt-table th, .receipt-table td,
    .payslip-table th, .payslip-table td {
      border: 1px solid #cbd5e1;
      padding: 8px 12px;
      font-size: 13px;
    }
    .receipt-table th, .payslip-table th {
      background-color: #f1f5f9;
      font-weight: 600;
    }
    @media print {
      body {
        margin: 0;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  ${bodyHtml}
</body>
</html>`;
  }

  // ---------------------------------------------------------------------------
  // 4. Mapper
  // ---------------------------------------------------------------------------

  private mapJobToDto(job: any): IPrintJob {
    return {
      id: job.id,
      organizationId: job.organizationId,
      campusId: job.campusId,
      jobType: job.jobType,
      status: job.status as DocumentGenerationJobStatus,
      totalItems: job.totalItems,
      processedItems: job.processedItems,
      failedItems: job.failedItems,
      payload: job.payload,
      resultSummary: job.resultSummary,
      errorDetails: job.errorDetails,
      requestedBy: job.requestedBy,
      createdAt: job.createdAt.toISOString(),
      completedAt: job.completedAt ? job.completedAt.toISOString() : null,
    };
  }
}
