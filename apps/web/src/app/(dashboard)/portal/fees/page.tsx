'use client';

import React, { useState, useEffect } from 'react';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { Tabs } from '@/components/ui/Tabs';
import { DataTable, ColumnDef } from '@/components/data-table/DataTable';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export default function FeesPage() {
  const [activeTab, setActiveTab] = useState('invoices');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [structures, setStructures] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [refunds, setRefunds] = useState<any[]>([]);
  const [currentShift, setCurrentShift] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
  const [printableReceipt, setPrintableReceipt] = useState<any | null>(null);

  // Payment Form
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState('CASH');
  const [refNumber, setRefNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [payMsg, setPayMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);
  const [isSubmittingPay, setIsSubmittingPay] = useState(false);

  // Cashier Shift Form
  const [shiftOpeningBalance, setShiftOpeningBalance] = useState<number>(0);
  const [shiftClosingBalance, setShiftClosingBalance] = useState<number>(0);
  const [shiftNotes, setShiftNotes] = useState('');
  const [isSubmittingShift, setIsSubmittingShift] = useState(false);

  // Refund Form
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundReason, setRefundReason] = useState('');
  const [isSubmittingRefund, setIsSubmittingRefund] = useState(false);

  // Adjustment Form
  const [adjType, setAdjType] = useState('CREDIT');
  const [adjAmount, setAdjAmount] = useState<number>(0);
  const [adjReason, setAdjReason] = useState('');
  const [isSubmittingAdj, setIsSubmittingAdj] = useState(false);

  // Student Ledger State
  const [ledgerStudentId, setLedgerStudentId] = useState('');
  const [ledgerData, setLedgerData] = useState<any | null>(null);
  const [isSearchingLedger, setIsSearchingLedger] = useState(false);

  // Reports State
  const [collectionReport, setCollectionReport] = useState<any | null>(null);
  const [defaultersReport, setDefaultersReport] = useState<any | null>(null);
  const [isLoadingReports, setIsLoadingReports] = useState(false);

  const fetchFeesData = async () => {
    setIsLoading(true);
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const [invRes, strRes, catRes, schRes, discRes, curShiftRes] = await Promise.all([
        fetch(`${API_URL}/fees/invoices`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/fees/structures`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/fees/categories`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
        fetch(`${API_URL}/fees/schedules`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
        fetch(`${API_URL}/fees/discounts`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
        fetch(`${API_URL}/fees/shifts/current`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
      ]);

      if (invRes.ok) {
        const invData = await invRes.json();
        setInvoices(invData.items || []);
      }
      if (strRes.ok) {
        setStructures(await strRes.json());
      }
      if (catRes && catRes.ok) {
        setCategories(await catRes.json());
      }
      if (schRes && schRes.ok) {
        setSchedules(await schRes.json());
      }
      if (discRes && discRes.ok) {
        setDiscounts(await discRes.json());
      }
      if (curShiftRes && curShiftRes.ok) {
        setCurrentShift(await curShiftRes.json());
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeesData();
  }, []);

  const openPaymentModal = (invoice: any) => {
    setSelectedInvoice(invoice);
    setPayAmount(invoice.balanceDue);
    setPayMsg(null);
    setShowPaymentModal(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    setIsSubmittingPay(true);
    setPayMsg(null);
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;

    try {
      const res = await fetch(`${API_URL}/fees/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          feeInvoiceId: selectedInvoice.id,
          amount: Number(payAmount),
          paymentMethod: payMethod,
          referenceNumber: refNumber || undefined,
          remarks: remarks || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setPayMsg({
          type: 'success',
          text: `Payment recorded successfully! Receipt: ${data.payment?.receiptNumber}`,
        });
        fetchFeesData();
        setTimeout(() => setShowPaymentModal(false), 1500);
      } else {
        setPayMsg({ type: 'danger', text: data.message || 'Payment recording failed' });
      }
    } catch (err: any) {
      setPayMsg({ type: 'danger', text: err.message || 'Network error' });
    } finally {
      setIsSubmittingPay(false);
    }
  };

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingShift(true);
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;
    try {
      const res = await fetch(`${API_URL}/fees/shifts/open`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ openingBalance: Number(shiftOpeningBalance) }),
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentShift(data.shift);
        setShowShiftModal(false);
      }
    } catch {
      // Fallback
    } finally {
      setIsSubmittingShift(false);
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentShift) return;
    setIsSubmittingShift(true);
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;
    try {
      const res = await fetch(`${API_URL}/fees/shifts/${currentShift.id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ closingBalance: Number(shiftClosingBalance), notes: shiftNotes }),
      });
      if (res.ok) {
        setCurrentShift(null);
        setShowShiftModal(false);
      }
    } catch {
      // Fallback
    } finally {
      setIsSubmittingShift(false);
    }
  };

  const handleViewReceipt = async (paymentId: string) => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;
    try {
      const res = await fetch(`${API_URL}/fees/receipts/${paymentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setPrintableReceipt(await res.json());
        setShowReceiptModal(true);
      }
    } catch {
      // Fallback
    }
  };

  const handleFetchLedger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ledgerStudentId) return;
    setIsSearchingLedger(true);
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;
    try {
      const res = await fetch(`${API_URL}/fees/ledger/student/${ledgerStudentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setLedgerData(await res.json());
      }
    } catch {
      // Fallback
    } finally {
      setIsSearchingLedger(false);
    }
  };

  const handleFetchReports = async () => {
    setIsLoadingReports(true);
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;
    try {
      const [colRes, defRes] = await Promise.all([
        fetch(`${API_URL}/fees/reports/collections`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/fees/reports/defaulters`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (colRes.ok) setCollectionReport(await colRes.json());
      if (defRes.ok) setDefaultersReport(await defRes.json());
    } catch {
      // Fallback
    } finally {
      setIsLoadingReports(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'reports') {
      handleFetchReports();
    }
  }, [activeTab]);

  // Invoice Columns
  const invoiceColumns: ColumnDef<any>[] = [
    {
      key: 'invoiceNumber',
      header: 'Invoice #',
      sortable: true,
      render: (row) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--brand-primary)' }}>
          {row.invoiceNumber}
        </span>
      ),
    },
    {
      key: 'studentName',
      header: 'Student',
      sortable: true,
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.studentName}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.admissionNumber}</div>
        </div>
      ),
    },
    {
      key: 'feeStructureName',
      header: 'Fee Type',
      sortable: true,
      render: (row) => <span>{row.feeStructureName}</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      align: 'right',
      render: (row) => <span style={{ fontWeight: 600 }}>${Number(row.amount).toFixed(2)}</span>,
    },
    {
      key: 'paidAmount',
      header: 'Paid',
      sortable: true,
      align: 'right',
      render: (row) => (
        <span style={{ color: 'var(--status-success)', fontWeight: 600 }}>
          ${Number(row.paidAmount).toFixed(2)}
        </span>
      ),
    },
    {
      key: 'balanceDue',
      header: 'Balance Due',
      sortable: true,
      align: 'right',
      render: (row) => (
        <span
          style={{
            color: row.balanceDue > 0 ? 'var(--status-danger)' : 'var(--status-success)',
            fontWeight: 700,
          }}
        >
          ${Number(row.balanceDue).toFixed(2)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      align: 'center',
      render: (row) => {
        const getVariant = () => {
          if (row.status === 'PAID') return 'success';
          if (row.status === 'PARTIAL') return 'warning';
          if (row.status === 'VOID' || row.status === 'CANCELLED') return 'neutral';
          return 'danger';
        };
        return <Badge variant={getVariant()} dot>{row.status}</Badge>;
      },
    },
    {
      key: 'actions',
      header: 'Action',
      align: 'right',
      render: (row) => (
        row.status !== 'PAID' && row.status !== 'VOID' && row.status !== 'CANCELLED' ? (
          <Button variant="primary" size="sm" onClick={() => openPaymentModal(row)}>
            Pay
          </Button>
        ) : (
          <Badge variant="neutral" size="sm">Settled</Badge>
        )
      ),
    },
  ];

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Fees & Invoicing' }]} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Fees, Billing & Financial Management
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Fee schedules, itemized billing, cashier reconciliation, student ledgers, and collection analytics
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowShiftModal(true)}
          >
            {currentShift ? 'Cashier Shift: Active' : 'Open Cashier Shift'}
          </Button>
          {invoices.length > 0 && (
            <Button
              variant="success"
              size="sm"
              onClick={() => openPaymentModal(invoices[0])}
            >
              Record Payment
            </Button>
          )}
        </div>
      </div>

      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'invoices', label: 'Invoices & Billing', count: invoices.length },
          { id: 'cashier', label: 'Cashier & Payments' },
          { id: 'structures', label: 'Structures & Schedules' },
          { id: 'ledger', label: 'Student Financial Ledger' },
          { id: 'refunds', label: 'Refunds & Adjustments' },
          { id: 'reports', label: 'Collections & Aging Reports' },
        ]}
        style={{ marginBottom: 24 }}
      />

      {/* ---------------------------------------------------------------------- */}
      {/* TAB 1: INVOICES & BILLING */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === 'invoices' && (
        <div>
          {/* Overview Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 24 }}>
            {structures.map((st) => (
              <Card key={st.id} padding="md">
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{st.name}</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--status-success)', margin: '6px 0' }}>
                  ${Number(st.amount).toFixed(2)}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Frequency: {st.frequency} • {st._count?.feeInvoices || 0} invoices
                </div>
              </Card>
            ))}
          </div>

          {/* Invoices Table */}
          <DataTable
            columns={invoiceColumns}
            data={invoices}
            isLoading={isLoading}
            searchPlaceholder="Search invoices by student name or invoice #..."
            searchFields={['invoiceNumber', 'studentName', 'feeStructureName']}
          />
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* TAB 2: CASHIER & PAYMENTS */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === 'cashier' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 24 }}>
            <Card padding="lg">
              <h3 style={{ margin: '0 0 12px', fontSize: '1.125rem', fontWeight: 600 }}>Active Cashier Shift</h3>
              {currentShift ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Status:</span>
                    <Badge variant="success" dot>OPEN</Badge>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Drawer Opening Balance:</span>
                    <span style={{ fontWeight: 600 }}>${Number(currentShift.openingBalance).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Cash Collected in Shift:</span>
                    <span style={{ fontWeight: 600, color: 'var(--status-success)' }}>
                      ${Number(currentShift.cashCollected || 0).toFixed(2)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Transactions Count:</span>
                    <span style={{ fontWeight: 600 }}>{currentShift.paymentsCount || 0}</span>
                  </div>
                  <Button variant="danger" size="sm" onClick={() => setShowShiftModal(true)}>
                    Close Shift & Reconcile Drawer
                  </Button>
                </div>
              ) : (
                <div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 16 }}>
                    No active shift open. Please open a shift with your drawer cash float to process counter payments.
                  </p>
                  <Button variant="primary" size="sm" onClick={() => setShowShiftModal(true)}>
                    Open New Cashier Shift
                  </Button>
                </div>
              )}
            </Card>

            <Card padding="lg">
              <h3 style={{ margin: '0 0 12px', fontSize: '1.125rem', fontWeight: 600 }}>Quick Actions</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 16 }}>
                Record student fees, verify receipts, and maintain sequential financial audit trails.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                {invoices.length > 0 && (
                  <Button variant="success" onClick={() => openPaymentModal(invoices[0])}>
                    Record Payment
                  </Button>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* TAB 3: STRUCTURES & SCHEDULES */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === 'structures' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
          <Card padding="lg">
            <h3 style={{ margin: '0 0 12px', fontSize: '1.125rem', fontWeight: 600 }}>Fee Categories</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {categories.map((c) => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{c.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Code: {c.code}</div>
                  </div>
                  <Badge variant="neutral">{c._count?.feeStructures || 0} structures</Badge>
                </div>
              ))}
              {categories.length === 0 && (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No fee categories configured.</div>
              )}
            </div>
          </Card>

          <Card padding="lg">
            <h3 style={{ margin: '0 0 12px', fontSize: '1.125rem', fontWeight: 600 }}>Fee Discounts & Scholarships</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {discounts.map((d) => (
                <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{d.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{d.code} • {d.discountType}</div>
                  </div>
                  <span style={{ fontWeight: 700, color: 'var(--status-success)' }}>
                    {d.discountType === 'PERCENTAGE' ? `${d.value}%` : `$${d.value}`}
                  </span>
                </div>
              ))}
              {discounts.length === 0 && (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No active discount policies.</div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* TAB 4: STUDENT FINANCIAL LEDGER */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === 'ledger' && (
        <div>
          <Card padding="lg" style={{ marginBottom: 24 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '1.125rem', fontWeight: 600 }}>Student Financial Ledger Lookup</h3>
            <form onSubmit={handleFetchLedger} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', maxWidth: 600 }}>
              <div style={{ flex: 1 }}>
                <Input
                  label="Student Profile ID or Admission Number"
                  value={ledgerStudentId}
                  onChange={(e) => setLedgerStudentId(e.target.value)}
                  placeholder="Enter student UUID or admission #"
                  required
                />
              </div>
              <Button type="submit" variant="primary" isLoading={isSearchingLedger}>
                Load Ledger
              </Button>
            </form>
          </Card>

          {ledgerData && (
            <div>
              {/* Ledger Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
                <Card padding="md">
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Invoiced</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    ${ledgerData.summary.totalInvoiced.toFixed(2)}
                  </div>
                </Card>
                <Card padding="md">
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Paid</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--status-success)' }}>
                    ${ledgerData.summary.totalPaid.toFixed(2)}
                  </div>
                </Card>
                <Card padding="md">
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Adjusted / Waived</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--brand-primary)' }}>
                    ${ledgerData.summary.totalAdjusted.toFixed(2)}
                  </div>
                </Card>
                <Card padding="md">
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Net Outstanding Balance</div>
                  <div
                    style={{
                      fontSize: '1.5rem',
                      fontWeight: 700,
                      color: ledgerData.summary.netOutstandingBalance > 0 ? 'var(--status-danger)' : 'var(--status-success)',
                    }}
                  >
                    ${ledgerData.summary.netOutstandingBalance.toFixed(2)}
                  </div>
                </Card>
              </div>

              {/* Timeline Entries Table */}
              <Card padding="none">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--surface-subtle)' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left' }}>Date</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left' }}>Type</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left' }}>Reference</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left' }}>Description</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Debit ($)</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Credit ($)</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Running Balance ($)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerData.entries.map((entry: any) => (
                      <tr key={entry.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '10px 16px' }}>{new Date(entry.date).toLocaleDateString()}</td>
                        <td style={{ padding: '10px 16px' }}>
                          <Badge variant={entry.type === 'INVOICE' ? 'neutral' : entry.type === 'PAYMENT' ? 'success' : 'warning'} size="sm">
                            {entry.type}
                          </Badge>
                        </td>
                        <td style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)' }}>{entry.reference}</td>
                        <td style={{ padding: '10px 16px' }}>{entry.description}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600 }}>
                          {entry.debit > 0 ? `$${entry.debit.toFixed(2)}` : '-'}
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--status-success)' }}>
                          {entry.credit > 0 ? `$${entry.credit.toFixed(2)}` : '-'}
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700 }}>
                          ${entry.balance.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* TAB 5: REFUNDS & ADJUSTMENTS */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === 'refunds' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
          <Card padding="lg">
            <h3 style={{ margin: '0 0 12px', fontSize: '1.125rem', fontWeight: 600 }}>Reversal & Refund Policies</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Historical transactions are immutable. All reversals require an audited refund record linked to the original payment receipt and verified by administrative approval.
            </p>
          </Card>

          <Card padding="lg">
            <h3 style={{ margin: '0 0 12px', fontSize: '1.125rem', fontWeight: 600 }}>Administrative Fee Adjustments</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Credit waivers, debit fines, and corrections update the invoice balance with full audit trails.
            </p>
          </Card>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* TAB 6: COLLECTIONS & AGING REPORTS */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === 'reports' && (
        <div>
          {isLoadingReports ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading financial reports...</div>
          ) : (
            <div>
              {/* Collection Summary */}
              {collectionReport && (
                <div style={{ marginBottom: 32 }}>
                  <h3 style={{ margin: '0 0 16px', fontSize: '1.125rem', fontWeight: 600 }}>Revenue & Collection Summary</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
                    <Card padding="md">
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Gross Collected</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--status-success)' }}>
                        ${collectionReport.totalCollected.toFixed(2)}
                      </div>
                    </Card>
                    <Card padding="md">
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Approved Refunds</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--status-danger)' }}>
                        ${collectionReport.totalRefunded.toFixed(2)}
                      </div>
                    </Card>
                    <Card padding="md">
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Net Realized Collection</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--brand-primary)' }}>
                        ${collectionReport.netCollected.toFixed(2)}
                      </div>
                    </Card>
                  </div>

                  <Card padding="md">
                    <h4 style={{ margin: '0 0 12px', fontSize: '0.9375rem', fontWeight: 600 }}>Collections by Payment Method</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                      {collectionReport.byPaymentMethod.map((pm: any) => (
                        <div key={pm.method} style={{ padding: '10px 14px', backgroundColor: 'var(--surface-subtle)', borderRadius: 'var(--radius-sm)' }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{pm.method} ({pm.count} txns)</div>
                          <div style={{ fontSize: '1.125rem', fontWeight: 700 }}>${pm.totalAmount.toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              )}

              {/* Defaulters Aging Report */}
              {defaultersReport && (
                <div>
                  <h3 style={{ margin: '0 0 16px', fontSize: '1.125rem', fontWeight: 600 }}>Overdue Accounts & Defaulters Aging</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 20 }}>
                    {defaultersReport.buckets.map((b: any) => (
                      <Card key={b.bucket} padding="md">
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{b.bucket}</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--status-danger)' }}>
                          ${b.totalAmount.toFixed(2)}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{b.count} invoices</div>
                      </Card>
                    ))}
                  </div>

                  <Card padding="none">
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--surface-subtle)' }}>
                          <th style={{ padding: '12px 16px', textAlign: 'left' }}>Student</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left' }}>Class</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left' }}>Guardian Phone</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left' }}>Invoice #</th>
                          <th style={{ padding: '12px 16px', textAlign: 'right' }}>Days Overdue</th>
                          <th style={{ padding: '12px 16px', textAlign: 'right' }}>Overdue Amount ($)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {defaultersReport.defaulters.map((d: any, idx: number) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '10px 16px', fontWeight: 600 }}>{d.studentName}</td>
                            <td style={{ padding: '10px 16px' }}>{d.className} - {d.sectionName}</td>
                            <td style={{ padding: '10px 16px' }}>{d.guardianPhone || 'N/A'}</td>
                            <td style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)' }}>{d.invoiceNumber}</td>
                            <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                              <Badge variant="danger" size="sm">{d.daysOverdue} days</Badge>
                            </td>
                            <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--status-danger)' }}>
                              ${d.overdueAmount.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Card>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* MODALS */}
      {/* ---------------------------------------------------------------------- */}

      {/* Payment Recording Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Record Payment Transaction"
        maxWidth={460}
      >
        {selectedInvoice && (
          <div style={{ padding: '12px 16px', backgroundColor: 'var(--surface-subtle)', borderRadius: 'var(--radius-sm)', marginBottom: 16, fontSize: '0.85rem' }}>
            <div><strong>Invoice:</strong> {selectedInvoice.invoiceNumber}</div>
            <div><strong>Student:</strong> {selectedInvoice.studentName}</div>
            <div><strong>Balance Due:</strong> ${Number(selectedInvoice.balanceDue).toFixed(2)}</div>
          </div>
        )}

        {payMsg && (
          <Alert variant={payMsg.type} style={{ marginBottom: 16 }}>
            {payMsg.text}
          </Alert>
        )}

        <form onSubmit={handleRecordPayment} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input
            label="Payment Amount ($)"
            type="number"
            step="0.01"
            required
            value={payAmount}
            max={selectedInvoice?.balanceDue}
            onChange={(e) => setPayAmount(Number(e.target.value))}
          />

          <Select
            label="Payment Method"
            value={payMethod}
            onChange={(e) => setPayMethod(e.target.value)}
            options={[
              { value: 'CASH', label: 'Cash Payment' },
              { value: 'BANK_TRANSFER', label: 'Direct Bank Transfer' },
              { value: 'CHEQUE', label: 'Cheque' },
              { value: 'CARD', label: 'Credit/Debit Card' },
              { value: 'ONLINE_GATEWAY', label: 'Online Payment Gateway' },
            ]}
          />

          <Input
            label="Transaction Reference #"
            value={refNumber}
            onChange={(e) => setRefNumber(e.target.value)}
            placeholder="e.g. TXN-98412"
          />

          <Input
            label="Remarks / Notes"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="e.g. Received by finance front desk"
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
            <Button type="button" variant="outline" onClick={() => setShowPaymentModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="success" isLoading={isSubmittingPay}>
              Process Payment Receipt
            </Button>
          </div>
        </form>
      </Modal>

      {/* Cashier Shift Modal */}
      <Modal
        isOpen={showShiftModal}
        onClose={() => setShowShiftModal(false)}
        title={currentShift ? 'Close Cashier Shift & Drawer Reconciliation' : 'Open Cashier Shift'}
        maxWidth={460}
      >
        {currentShift ? (
          <form onSubmit={handleCloseShift} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ padding: '12px 16px', backgroundColor: 'var(--surface-subtle)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
              <div><strong>Opening Float:</strong> ${Number(currentShift.openingBalance).toFixed(2)}</div>
              <div><strong>Cash Collected:</strong> ${Number(currentShift.cashCollected || 0).toFixed(2)}</div>
              <div><strong>Expected Drawer Total:</strong> ${(Number(currentShift.openingBalance) + Number(currentShift.cashCollected || 0)).toFixed(2)}</div>
            </div>

            <Input
              label="Actual Counted Cash Drawer Balance ($)"
              type="number"
              step="0.01"
              required
              value={shiftClosingBalance}
              onChange={(e) => setShiftClosingBalance(Number(e.target.value))}
            />

            <Input
              label="Shift Notes / Discrepancy Reason"
              value={shiftNotes}
              onChange={(e) => setShiftNotes(e.target.value)}
              placeholder="e.g. Shift balanced accurately"
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
              <Button type="button" variant="outline" onClick={() => setShowShiftModal(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="danger" isLoading={isSubmittingShift}>
                Confirm Close Shift
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleOpenShift} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Input
              label="Drawer Starting Float / Opening Balance ($)"
              type="number"
              step="0.01"
              required
              value={shiftOpeningBalance}
              onChange={(e) => setShiftOpeningBalance(Number(e.target.value))}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
              <Button type="button" variant="outline" onClick={() => setShowShiftModal(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isSubmittingShift}>
                Open Shift
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Printable Receipt Modal */}
      <Modal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        title="Official Payment Receipt"
        maxWidth={540}
      >
        {printableReceipt && (
          <div style={{ padding: 16, backgroundColor: '#fff', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: 12, marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{printableReceipt.organization?.name}</h2>
              <div style={{ fontSize: '0.8rem', color: '#666' }}>OFFICIAL PAYMENT RECEIPT</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, marginTop: 4 }}>
                {printableReceipt.receiptNumber}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: '0.85rem', marginBottom: 16 }}>
              <div><strong>Student:</strong> {printableReceipt.student.name}</div>
              <div><strong>Admission #:</strong> {printableReceipt.student.admissionNumber}</div>
              <div><strong>Class:</strong> {printableReceipt.student.className} - {printableReceipt.student.sectionName}</div>
              <div><strong>Date:</strong> {new Date(printableReceipt.paymentDate).toLocaleDateString()}</div>
              <div><strong>Method:</strong> {printableReceipt.paymentMethod}</div>
              <div><strong>Ref #:</strong> {printableReceipt.referenceNumber || 'N/A'}</div>
            </div>

            <div style={{ borderTop: '1px solid #ccc', paddingTop: 12, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.1rem' }}>
                <span>Amount Paid:</span>
                <span style={{ color: 'var(--status-success)' }}>${printableReceipt.amount.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginTop: 4 }}>
                <span>Balance Remaining on Invoice:</span>
                <span>${printableReceipt.invoice.balanceRemaining.toFixed(2)}</span>
              </div>
            </div>

            <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#888', marginTop: 20 }}>
              Issued by Cashier ID: {printableReceipt.cashier?.userId} • System-Generated Auditable Receipt
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <Button variant="primary" onClick={() => window.print()}>
                Print Receipt
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
