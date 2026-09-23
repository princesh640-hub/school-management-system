// =============================================================================
// Phase 4L: Procurement Reports & Dashboard Service
// =============================================================================
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';

@Injectable()
export class ProcurementReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardKpis(user: CurrentUserPayload) {
    const orgId = user.organizationId;
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalSuppliers,
      activeSuppliers,
      pendingRequestsCount,
      activeOrdersCount,
      orders,
      goodsReceiptsThisMonthCount,
      recordedInvoicesCount,
      invoices,
    ] = await Promise.all([
      this.prisma.supplier.count({ where: { organizationId: orgId } }),
      this.prisma.supplier.count({
        where: { organizationId: orgId, status: 'ACTIVE' },
      }),
      this.prisma.purchaseRequest.count({
        where: {
          organizationId: orgId,
          status: { in: ['SUBMITTED', 'UNDER_REVIEW'] },
        },
      }),
      this.prisma.purchaseOrder.count({
        where: {
          organizationId: orgId,
          status: { in: ['APPROVED', 'ISSUED', 'PARTIALLY_RECEIVED'] },
        },
      }),
      this.prisma.purchaseOrder.findMany({
        where: {
          organizationId: orgId,
          status: { in: ['APPROVED', 'ISSUED', 'PARTIALLY_RECEIVED', 'RECEIVED'] },
        },
        select: { totalAmount: true },
      }),
      this.prisma.goodsReceipt.count({
        where: {
          organizationId: orgId,
          receivedDate: { gte: firstDayOfMonth },
        },
      }),
      this.prisma.supplierInvoiceReference.count({
        where: { organizationId: orgId },
      }),
      this.prisma.supplierInvoiceReference.findMany({
        where: {
          organizationId: orgId,
          status: { in: ['RECORDED', 'VERIFIED'] },
        },
        select: { amount: true },
      }),
    ]);

    const totalOrdersValue = orders.reduce(
      (sum, o) => sum + Number(o.totalAmount),
      0,
    );

    const pendingInvoicesValue = invoices.reduce(
      (sum, i) => sum + Number(i.amount),
      0,
    );

    return {
      totalSuppliers,
      activeSuppliers,
      pendingRequestsCount,
      activeOrdersCount,
      totalOrdersValue: Math.round(totalOrdersValue * 100) / 100,
      goodsReceiptsThisMonthCount,
      recordedInvoicesCount,
      pendingInvoicesValue: Math.round(pendingInvoicesValue * 100) / 100,
    };
  }

  async getSpendSummary(user: CurrentUserPayload) {
    const orgId = user.organizationId;
    const suppliers = await this.prisma.supplier.findMany({
      where: { organizationId: orgId },
      include: {
        purchaseOrders: {
          where: {
            status: { in: ['APPROVED', 'ISSUED', 'PARTIALLY_RECEIVED', 'RECEIVED'] },
          },
          select: { totalAmount: true },
        },
        _count: { select: { goodsReceipts: true } },
      },
    });

    const spendSummary = suppliers.map((s) => {
      const totalSpend = s.purchaseOrders.reduce(
        (sum, o) => sum + Number(o.totalAmount),
        0,
      );
      return {
        supplierId: s.id,
        supplierCode: s.supplierCode,
        name: s.name,
        ordersCount: s.purchaseOrders.length,
        receiptsCount: s._count.goodsReceipts,
        totalSpend: Math.round(totalSpend * 100) / 100,
      };
    });

    return spendSummary.sort((a, b) => b.totalSpend - a.totalSpend);
  }
}
