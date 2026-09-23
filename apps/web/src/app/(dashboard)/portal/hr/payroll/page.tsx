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
import { DataTable, Column } from '@/components/data-table/DataTable';
import { TableSkeleton } from '@/components/feedback/LoadingSkeleton';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export default function PayrollPage() {
  const [activeTab, setActiveTab] = useState('runs');
  const [periods, setPeriods] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [structures, setStructures] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [payslips, setPayslips] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [showRunModal, setShowRunModal] = useState(false);
  const [showStructureModal, setShowStructureModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [showRepaymentModal, setShowRepaymentModal] = useState(false);
  const [showRunDetailsModal, setShowRunDetailsModal] = useState(false);
  const [showPayslipModal, setShowPayslipModal] = useState(false);
  const [showPrecheckModal, setShowPrecheckModal] = useState(false);

  // Active selections
  const [selectedRun, setSelectedRun] = useState<any | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<any | null>(null);
  const [printableStatement, setPrintableStatement] = useState<any | null>(null);
  const [precheckResult, setPrecheckResult] = useState<any | null>(null);

  // Forms state
  const [periodName, setPeriodName] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [periodPayDate, setPeriodPayDate] = useState('');

  const [runPeriodId, setRunPeriodId] = useState('');

  const [structName, setStructName] = useState('');
  const [structCode, setStructCode] = useState('');
  const [structBase, setStructBase] = useState<number>(3000);
  const [structCurrency, setStructCurrency] = useState('USD');

  const [assignEmpId, setAssignEmpId] = useState('');
  const [assignStructId, setAssignStructId] = useState('');
  const [assignEffectiveFrom, setAssignEffectiveFrom] = useState('');
  const [assignOverride, setAssignOverride] = useState('');

  const [loanEmpId, setLoanEmpId] = useState('');
  const [loanPrincipal, setLoanPrincipal] = useState<number>(1000);
  const [loanTermMonths, setLoanTermMonths] = useState<number>(10);
  const [loanReason, setLoanReason] = useState('');

  const [repayAmount, setRepayAmount] = useState<number>(100);
  const [repayMethod, setRepayMethod] = useState('PAYROLL_DEDUCTION');

  const [formMsg, setFormMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPayrollData = async () => {
    setIsLoading(true);
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const [perRes, runRes, strRes, loanRes, payRes, empRes] = await Promise.all([
        fetch(`${API_URL}/payroll/periods`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
        fetch(`${API_URL}/payroll/runs`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
        fetch(`${API_URL}/payroll/salary-structures`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
        fetch(`${API_URL}/payroll/loans`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
        fetch(`${API_URL}/payroll/payslips`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
        fetch(`${API_URL}/employees`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
      ]);

      if (perRes && perRes.ok) setPeriods(await perRes.json());
      if (runRes && runRes.ok) setRuns(await runRes.json());
      if (strRes && strRes.ok) setStructures(await strRes.json());
      if (loanRes && loanRes.ok) setLoans(await loanRes.json());
      if (payRes && payRes.ok) setPayslips(await payRes.json());
      if (empRes && empRes.ok) setEmployees(await empRes.json());
    } catch {
      // Backend unavailable or network error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayrollData();
  }, []);

  // 1. Create Period
  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormMsg(null);
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;

    try {
      const res = await fetch(`${API_URL}/payroll/periods`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: periodName,
          startDate: periodStart,
          endDate: periodEnd,
          paymentDate: periodPayDate || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setFormMsg({ type: 'success', text: `Period "${periodName}" created successfully!` });
        setTimeout(() => {
          setShowPeriodModal(false);
          setFormMsg(null);
          setPeriodName('');
          setPeriodStart('');
          setPeriodEnd('');
          setPeriodPayDate('');
          fetchPayrollData();
        }, 1200);
      } else {
        setFormMsg({ type: 'danger', text: data.message || 'Failed to create period' });
      }
    } catch {
      setFormMsg({ type: 'danger', text: 'Network connection failed' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Pre-Check Exceptions
  const handleRunPrecheck = async (periodId: string) => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;
    try {
      const res = await fetch(`${API_URL}/payroll/runs/pre-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ periodId }),
      });
      if (res.ok) {
        const result = await res.json();
        setPrecheckResult(result);
        setShowPrecheckModal(true);
      }
    } catch {
      alert('Failed to run pre-check verification');
    }
  };

  // 3. Process Batch Run
  const handleProcessRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!runPeriodId) return;
    setIsSubmitting(true);
    setFormMsg(null);
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;

    try {
      const res = await fetch(`${API_URL}/payroll/runs/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ payrollPeriodId: runPeriodId }),
      });

      const data = await res.json();
      if (res.ok) {
        setFormMsg({ type: 'success', text: `Payroll Run ${data.runNumber} processed successfully!` });
        setTimeout(() => {
          setShowRunModal(false);
          setFormMsg(null);
          fetchPayrollData();
        }, 1200);
      } else {
        setFormMsg({ type: 'danger', text: data.message || 'Failed to process run' });
      }
    } catch {
      setFormMsg({ type: 'danger', text: 'Network connection failed' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Run Approval Gate
  const handleApproveRun = async (runId: string) => {
    if (!confirm('Approve this payroll run? This locks calculations for executive sign-off.')) return;
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;
    try {
      const res = await fetch(`${API_URL}/payroll/runs/${runId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        alert('Payroll run APPROVED successfully!');
        fetchPayrollData();
      } else {
        const err = await res.json();
        alert(err.message || 'Approval failed');
      }
    } catch {
      alert('Network error');
    }
  };

  // 5. Run Lock Gate
  const handleLockRun = async (runId: string) => {
    if (!confirm('Permanently LOCK this payroll run? Locked runs cannot be modified without formal audited adjustments.')) return;
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;
    try {
      const res = await fetch(`${API_URL}/payroll/runs/${runId}/lock`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        alert('Payroll run LOCKED successfully!');
        fetchPayrollData();
      } else {
        const err = await res.json();
        alert(err.message || 'Lock failed');
      }
    } catch {
      alert('Network error');
    }
  };

  // 6. Generate Payslips
  const handleGeneratePayslips = async (runId: string) => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;
    try {
      const res = await fetch(`${API_URL}/payroll/runs/${runId}/generate-payslips`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        alert('Official sequential payslips generated successfully!');
        fetchPayrollData();
      } else {
        const err = await res.json();
        alert(err.message || 'Payslip generation failed');
      }
    } catch {
      alert('Network error');
    }
  };

  // 7. View Printable Statement
  const handleViewStatement = async (payslipId: string) => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;
    try {
      const res = await fetch(`${API_URL}/payroll/payslips/${payslipId}/statement`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const stmt = await res.json();
        setPrintableStatement(stmt);
        setShowPayslipModal(true);
      }
    } catch {
      alert('Failed to load payslip statement');
    }
  };

  // 8. View Run Details
  const handleViewRunDetails = async (runId: string) => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;
    try {
      const res = await fetch(`${API_URL}/payroll/runs/${runId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setSelectedRun(await res.json());
        setShowRunDetailsModal(true);
      }
    } catch {
      alert('Failed to load run details');
    }
  };

  // 9. Create Structure
  const handleCreateStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormMsg(null);
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;

    try {
      const res = await fetch(`${API_URL}/payroll/salary-structures`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: structName,
          code: structCode,
          baseSalary: Number(structBase),
          currency: structCurrency,
          frequency: 'MONTHLY',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setFormMsg({ type: 'success', text: `Salary structure "${structName}" created!` });
        setTimeout(() => {
          setShowStructureModal(false);
          setFormMsg(null);
          setStructName('');
          setStructCode('');
          fetchPayrollData();
        }, 1200);
      } else {
        setFormMsg({ type: 'danger', text: data.message || 'Failed to create structure' });
      }
    } catch {
      setFormMsg({ type: 'danger', text: 'Network connection failed' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 10. Assign Structure
  const handleAssignStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignEmpId || !assignStructId) return;
    setIsSubmitting(true);
    setFormMsg(null);
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;

    try {
      const res = await fetch(`${API_URL}/payroll/salary-assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          employeeId: assignEmpId,
          salaryStructureId: assignStructId,
          baseSalaryOverride: assignOverride ? Number(assignOverride) : undefined,
          effectiveFrom: assignEffectiveFrom || new Date().toISOString(),
          reason: 'Institutional Compensation Assignment',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setFormMsg({ type: 'success', text: 'Salary structure assigned successfully!' });
        setTimeout(() => {
          setShowAssignModal(false);
          setFormMsg(null);
          setAssignOverride('');
          fetchPayrollData();
        }, 1200);
      } else {
        setFormMsg({ type: 'danger', text: data.message || 'Failed to assign structure' });
      }
    } catch {
      setFormMsg({ type: 'danger', text: 'Network connection failed' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 11. Create Loan
  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loanEmpId) return;
    setIsSubmitting(true);
    setFormMsg(null);
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;

    try {
      const res = await fetch(`${API_URL}/payroll/loans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          employeeId: loanEmpId,
          principalAmount: Number(loanPrincipal),
          repaymentTermMonths: Number(loanTermMonths),
          reason: loanReason || 'Staff Personal Advance',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setFormMsg({ type: 'success', text: `Loan ${data.loanNumber} created!` });
        setTimeout(() => {
          setShowLoanModal(false);
          setFormMsg(null);
          setLoanReason('');
          fetchPayrollData();
        }, 1200);
      } else {
        setFormMsg({ type: 'danger', text: data.message || 'Failed to create loan' });
      }
    } catch {
      setFormMsg({ type: 'danger', text: 'Network connection failed' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 12. Approve Loan
  const handleApproveLoan = async (loanId: string) => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;
    try {
      const res = await fetch(`${API_URL}/payroll/loans/${loanId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        alert('Loan approved and activated!');
        fetchPayrollData();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to approve loan');
      }
    } catch {
      alert('Network error');
    }
  };

  // Summary KPI values
  const activeRunsCount = runs.length;
  const totalDisbursed = runs.reduce((acc, r) => acc + (Number(r.totalNet) || 0), 0);
  const activeLoansCount = loans.filter((l) => l.status === 'ACTIVE').length;
  const activeLoansBalance = loans
    .filter((l) => l.status === 'ACTIVE')
    .reduce((acc, l) => acc + (Number(l.remainingBalance) || 0), 0);

  // Column Definitions
  const runColumns: Column<any>[] = [
    {
      key: 'runNumber',
      header: 'Run Number',
      sortable: true,
      width: '130px',
      render: (r) => (
        <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, color: 'var(--primary-700)' }}>
          {r.runNumber}
        </span>
      ),
    },
    {
      key: 'payrollPeriod',
      header: 'Period Name',
      sortable: true,
      render: (r) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--neutral-900)' }}>{r.payrollPeriod?.name || 'Standard Period'}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>
            {r.payrollPeriod?.startDate ? new Date(r.payrollPeriod.startDate).toLocaleDateString() : '—'} to{' '}
            {r.payrollPeriod?.endDate ? new Date(r.payrollPeriod.endDate).toLocaleDateString() : '—'}
          </div>
        </div>
      ),
    },
    {
      key: 'totalEmployees',
      header: 'Staff Count',
      render: (r) => <span style={{ fontWeight: 600 }}>{r.totalEmployees}</span>,
    },
    {
      key: 'totalGross',
      header: 'Total Gross',
      render: (r) => <span>${Number(r.totalGross || 0).toLocaleString()}</span>,
    },
    {
      key: 'totalDeductions',
      header: 'Deductions',
      render: (r) => <span style={{ color: 'var(--danger-600)' }}>-${Number(r.totalDeductions || 0).toLocaleString()}</span>,
    },
    {
      key: 'totalNet',
      header: 'Net Take-Home',
      render: (r) => (
        <strong style={{ color: 'var(--success-600)', fontSize: '0.9375rem' }}>
          ${Number(r.totalNet || 0).toLocaleString()}
        </strong>
      ),
    },
    {
      key: 'status',
      header: 'Status & Gates',
      render: (r) => {
        let variant: 'neutral' | 'info' | 'warning' | 'success' | 'danger' = 'neutral';
        if (r.status === 'PROCESSING' || r.status === 'REVIEW') variant = 'warning';
        if (r.status === 'APPROVED') variant = 'info';
        if (r.status === 'LOCKED' || r.status === 'PAID') variant = 'success';
        return <Badge variant={variant} text={r.status} dot />;
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Button size="sm" variant="ghost" onClick={() => handleViewRunDetails(r.id)}>
            Records
          </Button>
          {r.status === 'REVIEW' && (
            <Button size="sm" variant="secondary" onClick={() => handleApproveRun(r.id)}>
              Approve
            </Button>
          )}
          {r.status === 'APPROVED' && (
            <Button size="sm" variant="primary" onClick={() => handleLockRun(r.id)}>
              Lock
            </Button>
          )}
          {(r.status === 'APPROVED' || r.status === 'LOCKED') && (
            <Button size="sm" variant="ghost" onClick={() => handleGeneratePayslips(r.id)}>
              Generate Payslips
            </Button>
          )}
        </div>
      ),
    },
  ];

  const loanColumns: Column<any>[] = [
    {
      key: 'loanNumber',
      header: 'Loan ID',
      sortable: true,
      render: (l) => (
        <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 600, color: 'var(--primary-600)' }}>
          {l.loanNumber}
        </span>
      ),
    },
    {
      key: 'employee',
      header: 'Employee',
      render: (l) => (
        <div>
          <div style={{ fontWeight: 600 }}>
            {l.employee?.user?.firstName} {l.employee?.user?.lastName}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>{l.employee?.employeeCode}</div>
        </div>
      ),
    },
    {
      key: 'principalAmount',
      header: 'Principal',
      render: (l) => <span>${Number(l.principalAmount).toLocaleString()}</span>,
    },
    {
      key: 'monthlyInstallment',
      header: 'Monthly Installment',
      render: (l) => <span>${Number(l.monthlyInstallment).toFixed(2)}</span>,
    },
    {
      key: 'remainingBalance',
      header: 'Balance Remaining',
      render: (l) => (
        <strong style={{ color: Number(l.remainingBalance) > 0 ? 'var(--warning-700)' : 'var(--success-600)' }}>
          ${Number(l.remainingBalance).toLocaleString()}
        </strong>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (l) => {
        const variant = l.status === 'ACTIVE' ? 'info' : l.status === 'REPAID' ? 'success' : 'warning';
        return <Badge variant={variant} text={l.status} />;
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (l) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {l.status === 'PENDING' && (
            <Button size="sm" variant="secondary" onClick={() => handleApproveLoan(l.id)}>
              Approve
            </Button>
          )}
        </div>
      ),
    },
  ];

  const payslipColumns: Column<any>[] = [
    {
      key: 'payslipNumber',
      header: 'Payslip #',
      sortable: true,
      render: (p) => (
        <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 600, color: 'var(--primary-600)' }}>
          {p.payslipNumber}
        </span>
      ),
    },
    {
      key: 'employee',
      header: 'Employee & Role',
      render: (p) => {
        const emp = p.payrollEmployeeRecord?.employee;
        return (
          <div>
            <div style={{ fontWeight: 600 }}>
              {emp?.user?.firstName} {emp?.user?.lastName}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>
              {emp?.employeeCode} · {emp?.designationRel?.name || emp?.designation || 'Staff'}
            </div>
          </div>
        );
      },
    },
    {
      key: 'period',
      header: 'Month/Year',
      render: (p) => <span>{p.month}/{p.year}</span>,
    },
    {
      key: 'grossPay',
      header: 'Gross Pay',
      render: (p) => <span>${Number(p.grossPay).toLocaleString()}</span>,
    },
    {
      key: 'totalDeductions',
      header: 'Deductions',
      render: (p) => <span style={{ color: 'var(--danger-600)' }}>-${Number(p.totalDeductions).toLocaleString()}</span>,
    },
    {
      key: 'netPay',
      header: 'Net Pay',
      render: (p) => <strong style={{ color: 'var(--success-600)' }}>${Number(p.netPay).toLocaleString()}</strong>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => <Badge variant="success" text={p.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (p) => (
        <Button size="sm" variant="ghost" onClick={() => handleViewStatement(p.id)}>
          View Statement
        </Button>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header & Breadcrumbs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <Breadcrumbs
            items={[
              { label: 'Portal', href: '/portal/dashboard' },
              { label: 'HR Management', href: '/portal/hr' },
              { label: 'Payroll & Compensation Console' },
            ]}
          />
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--neutral-900)', marginTop: '0.5rem' }}>
            Institutional Payroll Engine
          </h1>
          <p style={{ color: 'var(--neutral-500)', fontSize: '0.875rem' }}>
            Multi-tier batch disbursement, attendance & leave deduction integration, loans ledger, and verified payslips.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button variant="secondary" onClick={() => window.location.href = '/portal/hr'}>
            ← HR Directory
          </Button>
          <Button variant="primary" onClick={() => setShowPeriodModal(true)}>
            + New Payroll Period
          </Button>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
        }}
      >
        <Card>
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--neutral-500)', textTransform: 'uppercase' }}>
            Disbursement Cycles
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--neutral-900)', margin: '0.25rem 0' }}>
            {activeRunsCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--primary-600)', fontWeight: 500 }}>
            Batch Runs Executed
          </div>
        </Card>
        <Card>
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--neutral-500)', textTransform: 'uppercase' }}>
            Cumulative Net Disbursed
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success-600)', margin: '0.25rem 0' }}>
            ${totalDisbursed.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>
            Zero-drift accurate math
          </div>
        </Card>
        <Card>
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--neutral-500)', textTransform: 'uppercase' }}>
            Active Staff Loans
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--info-600)', margin: '0.25rem 0' }}>
            {activeLoansCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>
            Outstanding: ${activeLoansBalance.toLocaleString()}
          </div>
        </Card>
        <Card>
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--neutral-500)', textTransform: 'uppercase' }}>
            Generated Payslips
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--neutral-800)', margin: '0.25rem 0' }}>
            {payslips.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>
            Available in self-service
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'runs', label: 'Periods & Batch Runs', count: runs.length },
          { id: 'structures', label: 'Salary Structures & Assignments', count: structures.length },
          { id: 'loans', label: 'Loans & Advances Ledger', count: loans.length },
          { id: 'payslips', label: 'Official Payslips', count: payslips.length },
        ]}
      />

      {/* Tab 1: Periods & Batch Runs */}
      {activeTab === 'runs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Active Periods Overview */}
          <Card
            title="Payroll Periods & Eligibility Verification"
            subtitle="Scheduled payment cycles ready for pre-check validation and batch processing"
            headerAction={
              <Button
                variant="primary"
                onClick={() => {
                  if (periods.length > 0) setRunPeriodId(periods[0].id);
                  setShowRunModal(true);
                }}
              >
                + Process Batch Run
              </Button>
            }
          >
            {periods.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--neutral-500)' }}>
                No payroll periods created yet. Click "+ New Payroll Period" above to get started.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                {periods.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      border: '1px solid var(--neutral-200)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1rem',
                      background: '#fff',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '1rem', color: 'var(--neutral-900)' }}>{p.name}</strong>
                      <Badge variant={p.status === 'OPEN' ? 'info' : 'success'} text={p.status} />
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--neutral-600)', margin: '0.5rem 0' }}>
                      Range: {new Date(p.startDate).toLocaleDateString()} – {new Date(p.endDate).toLocaleDateString()}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                      <Button size="sm" variant="ghost" onClick={() => handleRunPrecheck(p.id)}>
                        Pre-Check Exceptions
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setRunPeriodId(p.id);
                          setShowRunModal(true);
                        }}
                      >
                        Run Batch
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Executed Runs Table */}
          <Card
            title="Batch Payroll Disbursements"
            subtitle="Execution history, multi-tier approval states, and locking gates"
          >
            {isLoading ? (
              <TableSkeleton rows={4} />
            ) : (
              <DataTable
                data={runs}
                columns={runColumns}
                searchPlaceholder="Search run number, period name..."
                emptyTitle="No payroll runs executed yet"
                emptyDescription="Process a batch run for an open period to start disbursement."
              />
            )}
          </Card>
        </div>
      )}

      {/* Tab 2: Salary Structures */}
      {activeTab === 'structures' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Card
            title="Salary Structures & Compensation Bands"
            subtitle="Standardized base salaries and recurring component packages"
            headerAction={
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button variant="secondary" onClick={() => setShowAssignModal(true)}>
                  Assign to Employee
                </Button>
                <Button variant="primary" onClick={() => setShowStructureModal(true)}>
                  + New Structure
                </Button>
              </div>
            }
          >
            {structures.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-500)' }}>
                No salary structures created yet.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                {structures.map((s) => (
                  <div
                    key={s.id}
                    style={{
                      border: '1px solid var(--neutral-200)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1.25rem',
                      background: '#fff',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '1.125rem', color: 'var(--neutral-900)' }}>{s.name}</strong>
                      <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.8125rem', color: 'var(--neutral-500)' }}>
                        {s.code}
                      </span>
                    </div>
                    <div style={{ margin: '0.75rem 0', fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary-700)' }}>
                      ${Number(s.baseSalary).toLocaleString()}{' '}
                      <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--neutral-500)' }}>
                        {s.currency} / {s.frequency}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--neutral-600)' }}>
                      Components: {s.components?.length || 0} configured (allowances & deductions)
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Tab 3: Loans & Advances Ledger */}
      {activeTab === 'loans' && (
        <Card
          title="Staff Loans & Salary Advances Ledger"
          subtitle="Tracks loan applications, approvals, monthly deductions, and balances"
          headerAction={
            <Button variant="primary" onClick={() => setShowLoanModal(true)}>
              + Issue Loan / Advance
            </Button>
          }
        >
          {isLoading ? (
            <TableSkeleton rows={4} />
          ) : (
            <DataTable
              data={loans}
              columns={loanColumns}
              searchPlaceholder="Search by loan number or employee..."
              emptyTitle="No loans or advances recorded"
              emptyDescription="Click '+ Issue Loan / Advance' to create an installment schedule."
            />
          )}
        </Card>
      )}

      {/* Tab 4: Official Payslips */}
      {activeTab === 'payslips' && (
        <Card
          title="Official Verified Payslips Console"
          subtitle="Audit-compliant payslips with strict privacy isolation and printable format"
        >
          {isLoading ? (
            <TableSkeleton rows={5} />
          ) : (
            <DataTable
              data={payslips}
              columns={payslipColumns}
              searchPlaceholder="Search by payslip number or staff member..."
              emptyTitle="No payslips generated"
              emptyDescription="Generate payslips from an APPROVED or LOCKED payroll run."
            />
          )}
        </Card>
      )}

      {/* Modal 1: Create Period */}
      <Modal isOpen={showPeriodModal} onClose={() => setShowPeriodModal(false)} title="Create New Payroll Period">
        <form onSubmit={handleCreatePeriod} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {formMsg && <Alert variant={formMsg.type} title={formMsg.text} />}
          <Input label="Period Name" required value={periodName} onChange={(e) => setPeriodName(e.target.value)} placeholder="e.g. October 2026 Monthly Payroll" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input label="Start Date" type="date" required value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
            <Input label="End Date" type="date" required value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
          </div>
          <Input label="Disbursement / Payment Date" type="date" value={periodPayDate} onChange={(e) => setPeriodPayDate(e.target.value)} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <Button variant="ghost" type="button" onClick={() => setShowPeriodModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>Create Period</Button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Process Batch Run */}
      <Modal isOpen={showRunModal} onClose={() => setShowRunModal(false)} title="Execute Batch Payroll Run">
        <form onSubmit={handleProcessRun} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {formMsg && <Alert variant={formMsg.type} title={formMsg.text} />}
          <Select
            label="Select Payroll Period"
            value={runPeriodId}
            onChange={(e) => setRunPeriodId(e.target.value)}
            options={periods.map((p) => ({ value: p.id, label: `${p.name} (${p.status})` }))}
          />
          <div style={{ padding: '0.75rem', background: 'var(--neutral-50)', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', color: 'var(--neutral-700)' }}>
            <strong>Calculation Workflow:</strong> Pulls active employees, evaluates effective salary structures, deducts unexcused absences and unpaid leaves, applies loan installments capped at balance, and generates draft run records with zero rounding drift.
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <Button variant="ghost" type="button" onClick={() => setShowRunModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>Calculate & Run Batch</Button>
          </div>
        </form>
      </Modal>

      {/* Modal 3: Create Structure */}
      <Modal isOpen={showStructureModal} onClose={() => setShowStructureModal(false)} title="Create Salary Structure">
        <form onSubmit={handleCreateStructure} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {formMsg && <Alert variant={formMsg.type} title={formMsg.text} />}
          <Input label="Structure Name" required value={structName} onChange={(e) => setStructName(e.target.value)} placeholder="e.g. Senior Faculty Grade 1" />
          <Input label="Structure Code" required value={structCode} onChange={(e) => setStructCode(e.target.value)} placeholder="e.g. FAC-G1" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input label="Base Salary" type="number" required value={structBase} onChange={(e) => setStructBase(Number(e.target.value))} />
            <Input label="Currency" value={structCurrency} onChange={(e) => setStructCurrency(e.target.value)} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <Button variant="ghost" type="button" onClick={() => setShowStructureModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>Save Structure</Button>
          </div>
        </form>
      </Modal>

      {/* Modal 4: Assign Structure */}
      <Modal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)} title="Assign Salary Structure to Employee">
        <form onSubmit={handleAssignStructure} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {formMsg && <Alert variant={formMsg.type} title={formMsg.text} />}
          <Select
            label="Employee"
            value={assignEmpId}
            onChange={(e) => setAssignEmpId(e.target.value)}
            options={[
              { value: '', label: '-- Select Employee --' },
              ...employees.map((e) => ({
                value: e.id,
                label: `${e.user?.firstName} ${e.user?.lastName} (${e.employeeCode})`,
              })),
            ]}
          />
          <Select
            label="Salary Structure"
            value={assignStructId}
            onChange={(e) => setAssignStructId(e.target.value)}
            options={[
              { value: '', label: '-- Select Structure --' },
              ...structures.map((s) => ({
                value: s.id,
                label: `${s.name} ($${Number(s.baseSalary).toLocaleString()})`,
              })),
            ]}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input label="Effective From Date" type="date" required value={assignEffectiveFrom} onChange={(e) => setAssignEffectiveFrom(e.target.value)} />
            <Input label="Base Salary Override ($)" type="number" value={assignOverride} onChange={(e) => setAssignOverride(e.target.value)} placeholder="Optional override" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <Button variant="ghost" type="button" onClick={() => setShowAssignModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>Confirm Assignment</Button>
          </div>
        </form>
      </Modal>

      {/* Modal 5: Issue Loan */}
      <Modal isOpen={showLoanModal} onClose={() => setShowLoanModal(false)} title="Issue Employee Loan / Advance">
        <form onSubmit={handleCreateLoan} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {formMsg && <Alert variant={formMsg.type} title={formMsg.text} />}
          <Select
            label="Employee"
            value={loanEmpId}
            onChange={(e) => setLoanEmpId(e.target.value)}
            options={[
              { value: '', label: '-- Select Employee --' },
              ...employees.map((e) => ({
                value: e.id,
                label: `${e.user?.firstName} ${e.user?.lastName} (${e.employeeCode})`,
              })),
            ]}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input label="Principal Loan Amount ($)" type="number" required value={loanPrincipal} onChange={(e) => setLoanPrincipal(Number(e.target.value))} />
            <Input label="Repayment Term (Months)" type="number" required value={loanTermMonths} onChange={(e) => setLoanTermMonths(Number(e.target.value))} />
          </div>
          <Input label="Loan Purpose / Reason" value={loanReason} onChange={(e) => setLoanReason(e.target.value)} placeholder="e.g. Educational support advance" />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <Button variant="ghost" type="button" onClick={() => setShowLoanModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>Create Loan Agreement</Button>
          </div>
        </form>
      </Modal>

      {/* Modal 6: Pre-Check Exceptions Results */}
      <Modal isOpen={showPrecheckModal} onClose={() => setShowPrecheckModal(false)} title="Payroll Eligibility & Exceptions Scanner" size="lg">
        {precheckResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div style={{ padding: '0.75rem', background: 'var(--neutral-50)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>Total Eligible Staff</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{precheckResult.summary?.eligibleCount}</div>
              </div>
              <div style={{ padding: '0.75rem', background: 'var(--neutral-50)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>Ready For Calculation</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--success-600)' }}>{precheckResult.summary?.readyCount}</div>
              </div>
              <div style={{ padding: '0.75rem', background: 'var(--neutral-50)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>Exceptions Detected</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: precheckResult.summary?.exceptionsCount > 0 ? 'var(--danger-600)' : 'var(--neutral-700)' }}>
                  {precheckResult.summary?.exceptionsCount}
                </div>
              </div>
            </div>

            {precheckResult.exceptions?.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <h4 style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: 'var(--danger-700)' }}>Action Required (Exceptions):</h4>
                {precheckResult.exceptions.map((ex: any, idx: number) => (
                  <div key={idx} style={{ padding: '0.5rem 0.75rem', background: '#FEF2F2', border: '1px solid #F87171', borderRadius: '4px', fontSize: '0.8125rem' }}>
                    <strong>{ex.employeeCode} ({ex.employeeName}):</strong> {ex.error}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <Button variant="primary" onClick={() => setShowPrecheckModal(false)}>Acknowledge & Close</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal 7: Printable Official Payslip Statement */}
      <Modal isOpen={showPayslipModal} onClose={() => setShowPayslipModal(false)} title="Official Payslip Statement" size="lg">
        {printableStatement && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1rem', background: '#fff' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid var(--neutral-800)', paddingBottom: '0.75rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>{printableStatement.school?.name}</h2>
                <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>Official Compensation Statement</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, color: 'var(--primary-700)' }}>
                  {printableStatement.payslipNumber}
                </span>
                <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>
                  Issued: {new Date(printableStatement.issueDate).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Employee & Period Details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'var(--neutral-50)', padding: '0.75rem', borderRadius: '4px' }}>
              <div>
                <div style={{ fontSize: '0.8125rem' }}><strong>Staff:</strong> {printableStatement.employee?.name}</div>
                <div style={{ fontSize: '0.8125rem' }}><strong>Code:</strong> {printableStatement.employee?.employeeCode}</div>
                <div style={{ fontSize: '0.8125rem' }}><strong>Role:</strong> {printableStatement.employee?.designation}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.8125rem' }}><strong>Period:</strong> {printableStatement.period?.name}</div>
                <div style={{ fontSize: '0.8125rem' }}>
                  <strong>Dates:</strong> {new Date(printableStatement.period?.startDate).toLocaleDateString()} – {new Date(printableStatement.period?.endDate).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Earnings & Deductions Tables */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              {/* Earnings */}
              <div>
                <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--success-700)' }}>Earnings</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {printableStatement.earnings?.map((e: any, idx: number) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', borderBottom: '1px dotted var(--neutral-200)', padding: '2px 0' }}>
                      <span>{e.title}</span>
                      <strong style={{ color: 'var(--neutral-900)' }}>${Number(e.amount).toFixed(2)}</strong>
                    </div>
                  ))}
                </div>
              </div>

              {/* Deductions */}
              <div>
                <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--danger-700)' }}>Deductions</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {printableStatement.deductions?.map((d: any, idx: number) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', borderBottom: '1px dotted var(--neutral-200)', padding: '2px 0' }}>
                      <span>{d.title}</span>
                      <strong style={{ color: 'var(--danger-600)' }}>-${Number(d.amount).toFixed(2)}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Net Total Summary */}
            <div style={{ borderTop: '2px solid var(--neutral-800)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--neutral-600)' }}>Gross Pay: ${Number(printableStatement.summary?.grossPay).toFixed(2)}</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--neutral-600)' }}>Total Deductions: -${Number(printableStatement.summary?.totalDeductions).toFixed(2)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--neutral-500)', fontWeight: 600 }}>Net Take-Home</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--success-600)' }}>
                  ${Number(printableStatement.summary?.netPay).toFixed(2)}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
              <Button variant="ghost" onClick={() => setShowPayslipModal(false)}>Close</Button>
              <Button variant="primary" onClick={() => window.print()}>Print Statement</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal 8: Run Employee Records */}
      <Modal isOpen={showRunDetailsModal} onClose={() => setShowRunDetailsModal(false)} title={`Run Records: ${selectedRun?.runNumber || ''}`} size="lg">
        {selectedRun && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>Period:</strong> {selectedRun.payrollPeriod?.name}
              </div>
              <Badge variant="info" text={selectedRun.status} />
            </div>

            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--neutral-300)', textAlign: 'left', color: 'var(--neutral-600)' }}>
                    <th style={{ padding: '6px' }}>Staff</th>
                    <th style={{ padding: '6px' }}>Base</th>
                    <th style={{ padding: '6px' }}>Allowances</th>
                    <th style={{ padding: '6px' }}>Deductions</th>
                    <th style={{ padding: '6px' }}>Net</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRun.records?.map((rec: any) => (
                    <tr key={rec.id} style={{ borderBottom: '1px solid var(--neutral-100)' }}>
                      <td style={{ padding: '6px' }}>
                        <strong>{rec.employee?.user?.firstName} {rec.employee?.user?.lastName}</strong>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--neutral-500)' }}>{rec.employee?.employeeCode}</div>
                      </td>
                      <td style={{ padding: '6px' }}>${rec.baseSalary?.toFixed(2)}</td>
                      <td style={{ padding: '6px' }}>+${rec.totalAllowances?.toFixed(2)}</td>
                      <td style={{ padding: '6px', color: 'var(--danger-600)' }}>-${rec.totalDeductions?.toFixed(2)}</td>
                      <td style={{ padding: '6px', fontWeight: 700, color: 'var(--success-600)' }}>${rec.netSalary?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <Button variant="primary" onClick={() => setShowRunDetailsModal(false)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
