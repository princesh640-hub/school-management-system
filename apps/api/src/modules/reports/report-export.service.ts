// =============================================================================
// Phase 4R: Report Export & Formatting Service (CSV & Printer Engine)
// =============================================================================
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { IReportResult } from '@school/shared-types';

@Injectable()
export class ReportExportService {
  private readonly logger = new Logger(ReportExportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Generates standard RFC 4180 compliant CSV string from report result
   */
  generateCsv(result: IReportResult): string {
    const headers = result.columns.map((c) => this.escapeCsv(c.label));
    const lines: string[] = [headers.join(',')];

    for (const row of result.data) {
      const line = result.columns.map((col) => {
        const val = row[col.key];
        if (val === null || val === undefined) return '';
        if (typeof val === 'number') return val.toString();
        return this.escapeCsv(val.toString());
      });
      lines.push(line.join(','));
    }

    // Totals line if applicable
    if (result.totals) {
      const totalsLine = result.columns.map((col) => {
        const val = result.totals![col.key];
        if (val !== undefined) return this.escapeCsv(`TOTAL: ${val}`);
        return '';
      });
      lines.push(totalsLine.join(','));
    }

    return lines.join('\r\n');
  }

  private escapeCsv(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /**
   * Renders a printer-ready HTML document adhering to centralized @media print styles
   */
  renderPrintableReport(result: IReportResult, institutionName: string = 'Academic Institution'): string {
    const columnsHeader = result.columns
      .map((c) => `<th style="text-align: ${c.align || 'left'};">${c.label}</th>`)
      .join('');

    const tableRows = result.data
      .map((row) => {
        const cells = result.columns
          .map((col) => {
            const val = row[col.key] ?? '—';
            return `<td style="text-align: ${col.align || 'left'};">${val}</td>`;
          })
          .join('');
        return `<tr>${cells}</tr>`;
      })
      .join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${result.metadata.name} - ${institutionName}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 10mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .report-sheet {
      width: 100%;
      padding: 16px;
    }
    .report-header {
      border-bottom: 2px solid #0284c7;
      padding-bottom: 12px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .report-header h1 {
      margin: 0 0 4px 0;
      font-size: 22px;
      color: #0f172a;
    }
    .report-header h2 {
      margin: 0;
      font-size: 16px;
      color: #0284c7;
      font-weight: 500;
    }
    .report-meta {
      font-size: 12px;
      color: #64748b;
      text-align: right;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      margin-top: 12px;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 6px 10px;
    }
    th {
      background-color: #f1f5f9;
      font-weight: 600;
      color: #334155;
    }
    tr:nth-child(even) {
      background-color: #f8fafc;
    }
    .report-footer {
      margin-top: 24px;
      padding-top: 8px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #94a3b8;
    }
    @media print {
      body { margin: 0; }
      .no-print { display: none !important; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="report-sheet">
    <div class="report-header">
      <div>
        <h1>${institutionName}</h1>
        <h2>${result.metadata.name}</h2>
      </div>
      <div class="report-meta">
        <div><strong>Generated:</strong> ${result.metadata.generatedAt.split('T')[0]}</div>
        <div><strong>Total Records:</strong> ${result.metadata.totalRecords}</div>
        <div><strong>Category:</strong> ${result.metadata.category}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>${columnsHeader}</tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>

    <div class="report-footer">
      <div>Enterprise School Management System • Official Confidential Report</div>
      <div>Page 1 • Duration: ${result.metadata.executionTimeMs}ms</div>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Records report execution in the tamper-evident log
   */
  async logExecution(
    orgId: string,
    campusId: string | undefined,
    userId: string,
    reportKey: string,
    reportName: string,
    category: string,
    format: string,
    rowCount: number,
    executionTimeMs: number,
    status = 'SUCCESS',
    errorMessage?: string,
  ) {
    try {
      await this.prisma.reportExecutionLog.create({
        data: {
          organizationId: orgId,
          campusId: campusId || null,
          userId,
          reportKey,
          reportName,
          category,
          format,
          rowCount,
          executionTimeMs,
          status,
          errorMessage,
        },
      });

      await this.audit.logAction({
        action: 'REPORT_EXECUTED',
        entity: 'Report',
        entityId: reportKey,
        userId,
        orgId,
        details: { reportName, format, rowCount, executionTimeMs },
      });
    } catch (err: any) {
      this.logger.warn(`Could not record report execution log: ${err.message}`);
    }
  }
}
