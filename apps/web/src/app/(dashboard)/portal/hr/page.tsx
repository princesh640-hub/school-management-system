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

interface Employee {
  id: string;
  employeeCode: string;
  designation: string;
  employmentType: string;
  lifecycleStatus?: string;
  joiningDate: string;
  salaryBase?: number;
  nationalId?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  qualifications?: string[];
  skills?: string[];
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  department?: {
    id: string;
    name: string;
  };
  designationRel?: {
    id: string;
    name: string;
  };
  contracts?: any[];
  documents?: any[];
}

export default function HRPage() {
  const [activeTab, setActiveTab] = useState('directory');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [expiringContracts, setExpiringContracts] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [departmentDist, setDepartmentDist] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState('ALL');

  // Onboard Modal
  const [showModal, setShowModal] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [designation, setDesignation] = useState('');
  const [employmentType, setEmploymentType] = useState('FULL_TIME');
  const [salaryBase, setSalaryBase] = useState('');
  const [gender, setGender] = useState('MALE');
  const [nationalId, setNationalId] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [formMsg, setFormMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Status Change Modal
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusTargetEmp, setStatusTargetEmp] = useState<Employee | null>(null);
  const [newStatus, setNewStatus] = useState('ACTIVE');
  const [statusReason, setStatusReason] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [isSubmittingStatus, setIsSubmittingStatus] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  // Contract Modal
  const [showContractModal, setShowContractModal] = useState(false);
  const [contractTargetEmpId, setContractTargetEmpId] = useState('');
  const [contractType, setContractType] = useState('FULL_TIME');
  const [contractStart, setContractStart] = useState('');
  const [contractEnd, setContractEnd] = useState('');
  const [contractRenewal, setContractRenewal] = useState('');
  const [contractTerms, setContractTerms] = useState('');
  const [isSubmittingContract, setIsSubmittingContract] = useState(false);
  const [contractMsg, setContractMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  // Document Modal
  const [showDocModal, setShowDocModal] = useState(false);
  const [docTargetEmpId, setDocTargetEmpId] = useState('');
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState('ID_PROOF');
  const [docUrl, setDocUrl] = useState('');
  const [isSubmittingDoc, setIsSubmittingDoc] = useState(false);
  const [docMsg, setDocMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  const fetchHRData = async () => {
    setIsLoading(true);
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const [empRes, contractRes, analyticsRes, distRes] = await Promise.all([
        fetch(`${API_URL}/employees`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/hr/contracts/expiring?days=60`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
        fetch(`${API_URL}/hr/analytics`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
        fetch(`${API_URL}/hr/distribution`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
      ]);

      if (empRes.ok) {
        setEmployees(await empRes.json());
      }
      if (contractRes && contractRes.ok) {
        setExpiringContracts(await contractRes.json());
      }
      if (analyticsRes && analyticsRes.ok) {
        setAnalytics(await analyticsRes.json());
      }
      if (distRes && distRes.ok) {
        setDepartmentDist(await distRes.json());
      }
    } catch {
      // Backend unavailable or network error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHRData();
  }, []);

  const handleRegisterEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormMsg(null);
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;

    try {
      const res = await fetch(`${API_URL}/employees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone,
          employeeCode,
          designation,
          employmentType,
          salaryBase: salaryBase ? parseFloat(salaryBase) : undefined,
          gender,
          nationalId: nationalId || undefined,
          address: address || undefined,
          emergencyContactName: emergencyName || undefined,
          emergencyContactPhone: emergencyPhone || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setFormMsg({ type: 'success', text: `Employee ${firstName} ${lastName} onboarded successfully!` });
        setTimeout(() => {
          setShowModal(false);
          setFormMsg(null);
          setFirstName('');
          setLastName('');
          setEmail('');
          setPhone('');
          setEmployeeCode('');
          setDesignation('');
          setSalaryBase('');
          setNationalId('');
          setAddress('');
          setEmergencyName('');
          setEmergencyPhone('');
          fetchHRData();
        }, 1200);
      } else {
        setFormMsg({ type: 'danger', text: data.message || 'Failed to onboard employee' });
      }
    } catch {
      setFormMsg({ type: 'danger', text: 'Network connection failed' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangeStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusTargetEmp) return;
    setIsSubmittingStatus(true);
    setStatusMsg(null);
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;

    try {
      const res = await fetch(`${API_URL}/employees/${statusTargetEmp.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          newStatus,
          reason: statusReason,
          notes: statusNotes,
          effectiveDate: new Date().toISOString(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setStatusMsg({ type: 'success', text: `Employee status updated to ${newStatus}` });
        setTimeout(() => {
          setShowStatusModal(false);
          setStatusMsg(null);
          setStatusReason('');
          setStatusNotes('');
          fetchHRData();
        }, 1200);
      } else {
        setStatusMsg({ type: 'danger', text: data.message || 'Failed to update status' });
      }
    } catch {
      setStatusMsg({ type: 'danger', text: 'Network connection failed' });
    } finally {
      setIsSubmittingStatus(false);
    }
  };

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractTargetEmpId) return;
    setIsSubmittingContract(true);
    setContractMsg(null);
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;

    try {
      const res = await fetch(`${API_URL}/employees/${contractTargetEmpId}/contracts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          contractType,
          startDate: contractStart,
          endDate: contractEnd || undefined,
          renewalDate: contractRenewal || undefined,
          terms: contractTerms || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setContractMsg({ type: 'success', text: `Contract ${data.contractNumber || ''} created successfully!` });
        setTimeout(() => {
          setShowContractModal(false);
          setContractMsg(null);
          setContractStart('');
          setContractEnd('');
          setContractRenewal('');
          setContractTerms('');
          fetchHRData();
        }, 1200);
      } else {
        setContractMsg({ type: 'danger', text: data.message || 'Failed to create contract' });
      }
    } catch {
      setContractMsg({ type: 'danger', text: 'Network connection failed' });
    } finally {
      setIsSubmittingContract(false);
    }
  };

  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTargetEmpId) return;
    setIsSubmittingDoc(true);
    setDocMsg(null);
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;

    try {
      const res = await fetch(`${API_URL}/employees/${docTargetEmpId}/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: docTitle,
          documentType: docType,
          fileUrl: docUrl || 'https://storage.school.edu/docs/sample.pdf',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setDocMsg({ type: 'success', text: `Document recorded successfully!` });
        setTimeout(() => {
          setShowDocModal(false);
          setDocMsg(null);
          setDocTitle('');
          setDocUrl('');
          fetchHRData();
        }, 1200);
      } else {
        setDocMsg({ type: 'danger', text: data.message || 'Failed to upload document' });
      }
    } catch {
      setDocMsg({ type: 'danger', text: 'Network connection failed' });
    } finally {
      setIsSubmittingDoc(false);
    }
  };

  const departments = Array.from(new Set(employees.map((e) => e.department?.name).filter(Boolean))) as string[];
  const filteredEmployees = selectedDept === 'ALL'
    ? employees
    : employees.filter((e) => e.department?.name === selectedDept);

  const totalStaff = analytics?.headcount?.total || employees.length;
  const activeStaff = analytics?.headcount?.active || employees.filter((e) => e.lifecycleStatus === 'ACTIVE' || !e.lifecycleStatus).length;
  const probationStaff = analytics?.headcount?.onProbation || employees.filter((e) => e.lifecycleStatus === 'ON_PROBATION').length;
  const onLeaveStaff = analytics?.headcount?.onLeave || employees.filter((e) => e.lifecycleStatus === 'ON_LEAVE').length;

  const directoryColumns: Column<Employee>[] = [
    {
      key: 'employeeCode',
      header: 'Emp Code',
      sortable: true,
      width: '120px',
      render: (item) => (
        <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 600, color: 'var(--primary-600)' }}>
          {item.employeeCode || 'N/A'}
        </span>
      ),
    },
    {
      key: 'user',
      header: 'Employee Name & Email',
      sortable: true,
      render: (item) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--primary-50)',
              color: 'var(--primary-700)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.875rem',
            }}
          >
            {item.user?.firstName?.[0] || 'E'}
          </div>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--neutral-900)' }}>
              {item.user?.firstName} {item.user?.lastName}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>
              {item.user?.email}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'designation',
      header: 'Designation / Dept',
      sortable: true,
      render: (item) => (
        <div>
          <div style={{ fontWeight: 500, color: 'var(--neutral-800)' }}>{item.designation || 'Staff'}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>
            {item.department?.name || 'General Administration'}
          </div>
        </div>
      ),
    },
    {
      key: 'lifecycleStatus',
      header: 'Status',
      sortable: true,
      render: (item) => {
        const st = item.lifecycleStatus || 'ACTIVE';
        let variant: 'success' | 'warning' | 'info' | 'danger' | 'neutral' = 'success';
        if (st === 'ON_PROBATION') variant = 'warning';
        if (st === 'ON_LEAVE') variant = 'info';
        if (st === 'SUSPENDED' || st === 'TERMINATED') variant = 'danger';
        return <Badge variant={variant} text={st.replace('_', ' ')} dot />;
      },
    },
    {
      key: 'employmentType',
      header: 'Type',
      render: (item) => (
        <span style={{ fontSize: '0.875rem', color: 'var(--neutral-700)', fontWeight: 500 }}>
          {(item.employmentType || 'FULL_TIME').replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'joiningDate',
      header: 'Joined',
      sortable: true,
      render: (item) => (
        <span style={{ fontSize: '0.875rem', color: 'var(--neutral-500)' }}>
          {item.joiningDate ? new Date(item.joiningDate).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setStatusTargetEmp(item);
              setNewStatus(item.lifecycleStatus || 'ACTIVE');
              setShowStatusModal(true);
            }}
          >
            Lifecycle
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setContractTargetEmpId(item.id);
              setShowContractModal(true);
            }}
          >
            + Contract
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setDocTargetEmpId(item.id);
              setShowDocModal(true);
            }}
          >
            + Doc
          </Button>
        </div>
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
              { label: 'Administration & HR', href: '#' },
              { label: 'Staff & HR Command Center' },
            ]}
          />
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--neutral-900)', marginTop: '0.5rem' }}>
            Staff & Human Resources
          </h1>
          <p style={{ color: 'var(--neutral-500)', fontSize: '0.875rem' }}>
            Unified management of employee lifecycles, employment contracts, document compliance, and organizational intelligence.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button variant="secondary" onClick={() => window.location.href = '/portal/hr/payroll'}>
            Payroll Workspace →
          </Button>
          <Button variant="primary" onClick={() => setShowModal(true)}>
            + Onboard Employee
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
            Total Headcount
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--neutral-900)', margin: '0.25rem 0' }}>
            {totalStaff}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--success-600)', fontWeight: 500 }}>
            {activeStaff} Active In Service
          </div>
        </Card>
        <Card>
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--neutral-500)', textTransform: 'uppercase' }}>
            Probation Personnel
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--warning-600)', margin: '0.25rem 0' }}>
            {probationStaff}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>
            Under assessment review
          </div>
        </Card>
        <Card>
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--neutral-500)', textTransform: 'uppercase' }}>
            On Leave
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--info-600)', margin: '0.25rem 0' }}>
            {onLeaveStaff}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>
            Scheduled leave & maternity
          </div>
        </Card>
        <Card>
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--neutral-500)', textTransform: 'uppercase' }}>
            Expiring Contracts (60d)
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: expiringContracts.length > 0 ? 'var(--danger-600)' : 'var(--neutral-800)', margin: '0.25rem 0' }}>
            {expiringContracts.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: expiringContracts.length > 0 ? 'var(--danger-600)' : 'var(--neutral-500)' }}>
            Action required soon
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'directory', label: 'Employee Directory & Lifecycle', count: employees.length },
          { id: 'contracts', label: 'Contracts & Expiries', count: expiringContracts.length },
          { id: 'documents', label: 'Documents & Compliance' },
          { id: 'analytics', label: 'HR Analytics & Distribution' },
        ]}
      />

      {/* Tab 1: Employee Directory */}
      {activeTab === 'directory' && (
        <Card
          title="Institutional Staff Directory"
          subtitle="Complete registry of personnel, status lifecycles, and credential metadata"
          headerAction={
            departments.length > 0 ? (
              <div style={{ minWidth: '180px' }}>
                <Select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  options={[
                    { value: 'ALL', label: 'All Departments' },
                    ...departments.map((d) => ({ value: d, label: d })),
                  ]}
                />
              </div>
            ) : undefined
          }
        >
          {isLoading ? (
            <TableSkeleton rows={6} />
          ) : (
            <DataTable
              data={filteredEmployees}
              columns={directoryColumns}
              searchPlaceholder="Search by name, employee code, designation..."
              emptyTitle="No staff members found"
              emptyDescription="No employees have been registered yet or none match your filter."
              emptyAction={
                <Button variant="primary" onClick={() => setShowModal(true)}>
                  Onboard First Employee
                </Button>
              }
            />
          )}
        </Card>
      )}

      {/* Tab 2: Contracts & Expiries */}
      {activeTab === 'contracts' && (
        <Card
          title="Employment Contracts & Renewal Alerts"
          subtitle="Tracks institutional contracts, probationary milestones, and expiration thresholds"
        >
          {expiringContracts.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-500)' }}>
              No contracts currently flagged for expiration within the next 60 days.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {expiringContracts.map((contract) => (
                <div
                  key={contract.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1rem',
                    border: '1px solid var(--neutral-200)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--neutral-50)',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 700, color: 'var(--primary-700)' }}>
                        {contract.contractNumber}
                      </span>
                      <Badge variant="warning" text={contract.status} />
                    </div>
                    <div style={{ fontWeight: 600, color: 'var(--neutral-800)', marginTop: '0.25rem' }}>
                      {contract.employee?.user?.firstName} {contract.employee?.user?.lastName} (
                      {contract.employee?.employeeCode}) — {contract.employee?.designation}
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--neutral-600)', marginTop: '0.25rem' }}>
                      Term: {new Date(contract.startDate).toLocaleDateString()} to{' '}
                      <strong>{new Date(contract.endDate).toLocaleDateString()}</strong>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      setContractTargetEmpId(contract.employeeId);
                      setShowContractModal(true);
                    }}
                  >
                    Renew Contract
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Tab 3: Documents & Compliance */}
      {activeTab === 'documents' && (
        <Card
          title="Personnel Document Vault"
          subtitle="Centralized archival of identification records, verified degrees, and NDAs"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--neutral-600)', margin: 0 }}>
                Secure employee document metadata indexed with MinIO/S3 object storage readiness.
              </p>
              <Button
                variant="primary"
                onClick={() => {
                  if (employees.length > 0) setDocTargetEmpId(employees[0].id);
                  setShowDocModal(true);
                }}
              >
                + Register New Document
              </Button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1rem',
                marginTop: '0.5rem',
              }}
            >
              {employees.slice(0, 8).map((emp) => (
                <div
                  key={emp.id}
                  style={{
                    border: '1px solid var(--neutral-200)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    background: '#fff',
                  }}
                >
                  <div style={{ fontWeight: 600, color: 'var(--neutral-900)' }}>
                    {emp.user?.firstName} {emp.user?.lastName}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)', marginBottom: '0.75rem' }}>
                    {emp.employeeCode} · {emp.department?.name || 'Academic'}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--neutral-700)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>National ID:</span>
                    <strong>{emp.nationalId || 'Verified On File'}</strong>
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--neutral-700)', display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                    <span>Emergency Contact:</span>
                    <span>{emp.emergencyContactName || 'Configured'}</span>
                  </div>
                  <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setDocTargetEmpId(emp.id);
                        setShowDocModal(true);
                      }}
                    >
                      + Add File Record
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Tab 4: Analytics & Department Distribution */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <Card title="Department Distribution" subtitle="Headcount allocation across academic and administrative departments">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {departmentDist.length === 0 ? (
                  <p style={{ color: 'var(--neutral-500)', fontSize: '0.875rem' }}>No department data available</p>
                ) : (
                  departmentDist.map((dept) => (
                    <div key={dept.departmentId} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                        <span style={{ fontWeight: 500, color: 'var(--neutral-800)' }}>{dept.departmentName}</span>
                        <span style={{ fontWeight: 600, color: 'var(--primary-600)' }}>{dept.count} members</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: 'var(--neutral-100)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${Math.min(100, Math.round((dept.count / (totalStaff || 1)) * 100))}%`,
                            height: '100%',
                            background: 'var(--primary-600)',
                            borderRadius: '4px',
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card title="Latest Payroll Snapshot" subtitle="Executive overview of the latest batch disbursement run">
              {analytics?.latestPayrollSummary ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.875rem', color: 'var(--neutral-600)' }}>Period:</span>
                    <strong>{analytics.latestPayrollSummary.periodName}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.875rem', color: 'var(--neutral-600)' }}>Status:</span>
                    <Badge variant="success" text={analytics.latestPayrollSummary.status} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.875rem', color: 'var(--neutral-600)' }}>Total Gross Disbursement:</span>
                    <strong style={{ fontSize: '1.125rem', color: 'var(--neutral-900)' }}>
                      ${analytics.latestPayrollSummary.totalGross?.toLocaleString()}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.875rem', color: 'var(--neutral-600)' }}>Total Net Take-Home:</span>
                    <strong style={{ fontSize: '1.25rem', color: 'var(--success-600)' }}>
                      ${analytics.latestPayrollSummary.totalNet?.toLocaleString()}
                    </strong>
                  </div>
                  <Button variant="secondary" onClick={() => window.location.href = '/portal/hr/payroll'}>
                    View Payroll Console →
                  </Button>
                </div>
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-500)' }}>
                  No batch payroll runs recorded yet.
                  <div style={{ marginTop: '1rem' }}>
                    <Button variant="primary" onClick={() => window.location.href = '/portal/hr/payroll'}>
                      Open Payroll Workspace
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* Modal 1: Onboard Employee Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Onboard New Employee" size="lg">
        <form onSubmit={handleRegisterEmployee} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {formMsg && <Alert variant={formMsg.type} title={formMsg.text} />}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input label="First Name" required value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="e.g. Eleanor" />
            <Input label="Last Name" required value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="e.g. Vance" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input label="Work Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="eleanor.vance@school.edu" />
            <Input label="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1-555-0199" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input label="Employee Code" required value={employeeCode} onChange={(e) => setEmployeeCode(e.target.value)} placeholder="e.g. EMP-2026-00088" />
            <Input label="Designation / Position" required value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="e.g. Senior Registrar" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Select
              label="Employment Type"
              value={employmentType}
              onChange={(e) => setEmploymentType(e.target.value)}
              options={[
                { value: 'FULL_TIME', label: 'Full Time' },
                { value: 'PART_TIME', label: 'Part Time' },
                { value: 'CONTRACT', label: 'Contractual' },
              ]}
            />
            <Select
              label="Gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              options={[
                { value: 'FEMALE', label: 'Female' },
                { value: 'MALE', label: 'Male' },
                { value: 'OTHER', label: 'Other' },
              ]}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input label="Base Monthly Salary ($)" type="number" value={salaryBase} onChange={(e) => setSalaryBase(e.target.value)} placeholder="e.g. 4500" />
            <Input label="National ID / SSN" value={nationalId} onChange={(e) => setNationalId(e.target.value)} placeholder="e.g. 123-45-6789" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input label="Emergency Contact Name" value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} placeholder="e.g. Robert Vance" />
            <Input label="Emergency Contact Phone" value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} placeholder="e.g. +1-555-0999" />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <Button variant="ghost" type="button" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>
              Confirm & Onboard
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Lifecycle Transition Modal */}
      <Modal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        title={`Change Employee Status: ${statusTargetEmp?.user?.firstName || ''} ${statusTargetEmp?.user?.lastName || ''}`}
      >
        <form onSubmit={handleChangeStatus} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {statusMsg && <Alert variant={statusMsg.type} title={statusMsg.text} />}
          <Select
            label="Target Lifecycle Status"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            options={[
              { value: 'ACTIVE', label: 'ACTIVE' },
              { value: 'ON_PROBATION', label: 'ON_PROBATION' },
              { value: 'CONFIRMED', label: 'CONFIRMED' },
              { value: 'ON_LEAVE', label: 'ON_LEAVE' },
              { value: 'SUSPENDED', label: 'SUSPENDED' },
              { value: 'RESIGNED', label: 'RESIGNED' },
              { value: 'TERMINATED', label: 'TERMINATED' },
              { value: 'RETIRED', label: 'RETIRED' },
            ]}
          />
          <Input
            label="Transition Reason"
            required
            value={statusReason}
            onChange={(e) => setStatusReason(e.target.value)}
            placeholder="e.g. End of probationary evaluation period"
          />
          <Input
            label="Additional Notes / Memo"
            value={statusNotes}
            onChange={(e) => setStatusNotes(e.target.value)}
            placeholder="Approved by Board of Governors"
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <Button variant="ghost" type="button" onClick={() => setShowStatusModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmittingStatus}>
              Commit Status Change
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 3: Issue Contract Modal */}
      <Modal isOpen={showContractModal} onClose={() => setShowContractModal(false)} title="Issue Employment Contract">
        <form onSubmit={handleCreateContract} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {contractMsg && <Alert variant={contractMsg.type} title={contractMsg.text} />}
          <Select
            label="Contract Type"
            value={contractType}
            onChange={(e) => setContractType(e.target.value)}
            options={[
              { value: 'FULL_TIME', label: 'Full-Time Regular' },
              { value: 'PART_TIME', label: 'Part-Time Regular' },
              { value: 'PROBATION', label: 'Probationary Agreement' },
              { value: 'CONSULTANT', label: 'Consultancy / Adjunct' },
            ]}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input label="Start Date" type="date" required value={contractStart} onChange={(e) => setContractStart(e.target.value)} />
            <Input label="End Date" type="date" value={contractEnd} onChange={(e) => setContractEnd(e.target.value)} />
          </div>
          <Input label="Renewal Review Date" type="date" value={contractRenewal} onChange={(e) => setContractRenewal(e.target.value)} />
          <Input label="Contract Terms & Notes" value={contractTerms} onChange={(e) => setContractTerms(e.target.value)} placeholder="Standard institutional terms and conditions" />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <Button variant="ghost" type="button" onClick={() => setShowContractModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmittingContract}>
              Issue Contract
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 4: Register Document Modal */}
      <Modal isOpen={showDocModal} onClose={() => setShowDocModal(false)} title="Register Employee Document">
        <form onSubmit={handleUploadDoc} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {docMsg && <Alert variant={docMsg.type} title={docMsg.text} />}
          <Input label="Document Title" required value={docTitle} onChange={(e) => setDocTitle(e.target.value)} placeholder="e.g. Master of Education Degree" />
          <Select
            label="Document Classification"
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            options={[
              { value: 'ID_PROOF', label: 'National ID / Passport' },
              { value: 'QUALIFICATION', label: 'Degree / Certificate' },
              { value: 'CONTRACT', label: 'Signed Contract / Agreement' },
              { value: 'TAX_DOCUMENT', label: 'Tax / Withholding Form' },
              { value: 'OTHER', label: 'Other Document' },
            ]}
          />
          <Input label="Storage / Resource URL" value={docUrl} onChange={(e) => setDocUrl(e.target.value)} placeholder="https://storage.school.edu/docs/sample.pdf" />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <Button variant="ghost" type="button" onClick={() => setShowDocModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmittingDoc}>
              Register Document
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
