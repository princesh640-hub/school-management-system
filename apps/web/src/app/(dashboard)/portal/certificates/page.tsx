'use client';

import React, { useState, useEffect } from 'react';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { Alert } from '@/components/ui/Alert';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import {
  IIssuedCertificate,
  ICertificateType,
  ICertificateTemplate,
  IPrintJob,
  CertificateCategory,
} from '@school/shared-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export default function CertificatesPage() {
  const [activeTab, setActiveTab] = useState('issued');
  const [certificates, setCertificates] = useState<IIssuedCertificate[]>([]);
  const [types, setTypes] = useState<ICertificateType[]>([]);
  const [templates, setTemplates] = useState<ICertificateTemplate[]>([]);
  const [jobs, setJobs] = useState<IPrintJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  // Search and filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
  const [certToRevoke, setCertToRevoke] = useState<IIssuedCertificate | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [printPreviewHtml, setPrintPreviewHtml] = useState<string | null>(null);

  // Forms
  const [issueForm, setIssueForm] = useState<{
    certificateTypeId: string;
    templateId: string;
    entityType: CertificateCategory;
    entityId: string;
    recipientName: string;
    remarks: string;
  }>({
    certificateTypeId: '',
    templateId: '',
    entityType: 'STUDENT',
    entityId: '',
    recipientName: '',
    remarks: '',
  });

  const getHeaders = () => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [certRes, typeRes, tmplRes, jobRes] = await Promise.all([
        fetch(`${API_URL}/certificates/issued`, { headers: getHeaders() }),
        fetch(`${API_URL}/certificates/types`, { headers: getHeaders() }),
        fetch(`${API_URL}/certificates/templates`, { headers: getHeaders() }),
        fetch(`${API_URL}/printing/jobs`, { headers: getHeaders() }),
      ]);

      if (certRes.ok) {
        const d = await certRes.json();
        setCertificates(d.certificates || []);
      }
      if (typeRes.ok) setTypes(await typeRes.json());
      if (tmplRes.ok) setTemplates(await tmplRes.json());
      if (jobRes.ok) {
        const j = await jobRes.json();
        setJobs(j.jobs || []);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleIssueCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/certificates/issue`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(issueForm),
      });

      if (res.ok) {
        setFeedback({ type: 'success', text: 'Certificate successfully created / issued' });
        setIsIssueModalOpen(false);
        loadData();
      } else {
        const err = await res.json();
        setFeedback({ type: 'danger', text: err.message || 'Failed to issue certificate' });
      }
    } catch {
      setFeedback({ type: 'danger', text: 'Network error issuing certificate' });
    }
  };

  const handleApprove = async (certId: string) => {
    try {
      const res = await fetch(`${API_URL}/certificates/${certId}/approve`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ approved: true, remarks: 'Verified and approved by administration.' }),
      });

      if (res.ok) {
        setFeedback({ type: 'success', text: 'Certificate approved and issued' });
        loadData();
      } else {
        const err = await res.json();
        setFeedback({ type: 'danger', text: err.message || 'Approval failed' });
      }
    } catch {
      setFeedback({ type: 'danger', text: 'Network error during approval' });
    }
  };

  const handleRevoke = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certToRevoke) return;
    try {
      const res = await fetch(`${API_URL}/certificates/${certToRevoke.id}/revoke`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ reason: revokeReason }),
      });

      if (res.ok) {
        setFeedback({ type: 'success', text: `Certificate ${certToRevoke.certificateNumber} has been revoked` });
        setIsRevokeModalOpen(false);
        setRevokeReason('');
        loadData();
      } else {
        const err = await res.json();
        setFeedback({ type: 'danger', text: err.message || 'Revocation failed' });
      }
    } catch {
      setFeedback({ type: 'danger', text: 'Network error during revocation' });
    }
  };

  const handlePrint = async (cert: IIssuedCertificate) => {
    try {
      const res = await fetch(`${API_URL}/printing/render/CERTIFICATE/${cert.id}`, { headers: getHeaders() });
      if (res.ok) {
        const html = await res.text();
        setPrintPreviewHtml(html);
      } else {
        setFeedback({ type: 'danger', text: 'Failed to generate print layout' });
      }
    } catch {
      setFeedback({ type: 'danger', text: 'Network error rendering certificate' });
    }
  };

  const copyVerifyUrl = (ref: string) => {
    const url = `${window.location.origin}/verify/${ref}`;
    navigator.clipboard.writeText(url);
    setFeedback({ type: 'success', text: `Verification link copied: ${url}` });
  };

  const filteredCerts = certificates.filter((c) => {
    const matchesSearch =
      !searchQuery ||
      c.certificateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.recipientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.certificateTypeName && c.certificateTypeName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      ((c as any).certificateType && (c as any).certificateType.name?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = !statusFilter || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header & Navigation */}
      <div style={{ marginBottom: '20px' }} className="no-print">
        <Breadcrumbs
          items={[
            { label: 'Portal', href: '/portal/dashboard' },
            { label: 'Certificates & Printing', href: '/portal/certificates' },
          ]}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
              Certificate Management & Printing Center
            </h1>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>
              Issuance ledger, cryptographic verification, printable templates, and batch rendering.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Button variant="primary" onClick={() => setIsIssueModalOpen(true)}>
              + Issue Certificate
            </Button>
          </div>
        </div>
      </div>

      {feedback && (
        <div style={{ marginBottom: '16px' }} className="no-print">
          <Alert
            variant={feedback.type}
            title={feedback.type === 'success' ? 'Success' : 'Notice'}
            onClose={() => setFeedback(null)}
          >
            {feedback.text}
          </Alert>
        </div>
      )}

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
        className="no-print"
      >
        <Card>
          <div style={{ padding: '16px' }}>
            <span style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
              Total Issued
            </span>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', marginTop: '6px' }}>
              {certificates.filter((c) => c.status === 'ISSUED').length}
            </div>
            <span style={{ fontSize: '12px', color: '#16a34a' }}>Cryptographically signed</span>
          </div>
        </Card>
        <Card>
          <div style={{ padding: '16px' }}>
            <span style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
              Pending Approval
            </span>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#d97706', marginTop: '6px' }}>
              {certificates.filter((c) => c.status === 'PENDING_APPROVAL').length}
            </div>
            <span style={{ fontSize: '12px', color: '#d97706' }}>Awaiting administrator</span>
          </div>
        </Card>
        <Card>
          <div style={{ padding: '16px' }}>
            <span style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
              Revoked
            </span>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#dc2626', marginTop: '6px' }}>
              {certificates.filter((c) => c.status === 'REVOKED').length}
            </div>
            <span style={{ fontSize: '12px', color: '#dc2626' }}>Invalidated certificates</span>
          </div>
        </Card>
        <Card>
          <div style={{ padding: '16px' }}>
            <span style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
              Configured Types
            </span>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#0284c7', marginTop: '6px' }}>
              {types.length || 9}
            </div>
            <span style={{ fontSize: '12px', color: '#0284c7' }}>Standard templates</span>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div style={{ marginBottom: '20px' }} className="no-print">
        <Tabs
          tabs={[
            { id: 'issued', label: 'Issued Ledger' },
            { id: 'types', label: 'Certificate Types' },
            { id: 'templates', label: 'Print Templates' },
            { id: 'jobs', label: 'Batch Print Jobs' },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />
      </div>

      {/* Tab: Issued Ledger */}
      {activeTab === 'issued' && (
        <div>
          <Card style={{ marginBottom: '16px' }} className="no-print">
            <div style={{ padding: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: '1 1 250px' }}>
                <Input
                  placeholder="Search by CERT #, recipient name, type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div style={{ width: '180px' }}>
                <Select
                  options={[
                    { value: '', label: 'All Statuses' },
                    { value: 'ISSUED', label: 'Issued' },
                    { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
                    { value: 'DRAFT', label: 'Draft' },
                    { value: 'REVOKED', label: 'Revoked' },
                  ]}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                />
              </div>
            </div>
          </Card>

          <Card>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569' }}>
                    <th style={{ padding: '12px 16px' }}>Cert #</th>
                    <th style={{ padding: '12px 16px' }}>Certificate Type</th>
                    <th style={{ padding: '12px 16px' }}>Recipient Name</th>
                    <th style={{ padding: '12px 16px' }}>Issue Date</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th style={{ padding: '12px 16px' }}>Verification Ref</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                        Loading issued certificates...
                      </td>
                    </tr>
                  ) : filteredCerts.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                        No certificates found.
                      </td>
                    </tr>
                  ) : (
                    filteredCerts.map((cert) => (
                      <tr key={cert.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0284c7' }}>
                          {cert.certificateNumber}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <Badge variant="neutral">{cert.certificateTypeName || (cert as any).certificateType?.name || 'Certificate'}</Badge>
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 500, color: '#0f172a' }}>
                          {cert.recipientName}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#64748b' }}>
                          {(cert.issuedDate || (cert as any).issueDate) ? ((cert.issuedDate || (cert as any).issueDate)).split('T')[0] : 'Pending'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <Badge
                            variant={
                              cert.status === 'ISSUED'
                                ? 'success'
                                : cert.status === 'PENDING_APPROVAL'
                                ? 'warning'
                                : cert.status === 'REVOKED'
                                ? 'danger'
                                : 'neutral'
                            }
                          >
                            {cert.status}
                          </Badge>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            onClick={() => copyVerifyUrl(cert.verificationReference)}
                            style={{
                              cursor: 'pointer',
                              fontFamily: 'monospace',
                              fontSize: '12px',
                              color: '#0284c7',
                              background: '#f0f9ff',
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}
                            title="Click to copy public verification URL"
                          >
                            {cert.verificationReference.substring(0, 10)}...
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            <Button size="sm" variant="secondary" onClick={() => handlePrint(cert)}>
                              Print / View
                            </Button>
                            {cert.status === 'PENDING_APPROVAL' && (
                              <Button size="sm" variant="primary" onClick={() => handleApprove(cert.id)}>
                                Approve
                              </Button>
                            )}
                            {cert.status === 'ISSUED' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setCertToRevoke(cert);
                                  setIsRevokeModalOpen(true);
                                }}
                              >
                                Revoke
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Tab: Certificate Types */}
      {activeTab === 'types' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          {types.map((type) => (
            <Card key={type.id}>
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>{type.name}</h3>
                  <Badge variant="primary">{type.category}</Badge>
                </div>
                <p style={{ color: '#64748b', fontSize: '13px', margin: '8px 0 16px 0' }}>
                  {type.description || 'Institutional formal certificate'}
                </p>
                <div style={{ fontSize: '13px', color: '#475569' }}>
                  <div>
                    <strong>Type Code:</strong> {type.code}
                  </div>
                  <div>
                    <strong>Approval Required:</strong> {type.requiresApproval ? 'Yes' : 'No'}
                  </div>
                  <div>
                    <strong>Sequential Sequence:</strong> {(type as any).sequenceCounter ?? 0} issued
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Tab: Templates */}
      {activeTab === 'templates' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {templates.map((tmpl) => (
            <Card key={tmpl.id}>
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>{tmpl.name}</h3>
                  <Badge variant="neutral">{(tmpl as any).layout || 'PORTRAIT'}</Badge>
                </div>
                <p style={{ color: '#64748b', fontSize: '13px', margin: '8px 0 16px 0' }}>
                  Page Size: {(tmpl as any).pageSize || 'A4'} • Version {tmpl.currentVersion}
                </p>
                <div style={{ fontSize: '12px', color: '#64748b', background: '#f8fafc', padding: '10px', borderRadius: '6px' }}>
                  Whitelisted Placeholders: <code>{'{{student_name}}'}</code>, <code>{'{{certificate_number}}'}</code>, <code>{'{{issue_date}}'}</code>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Tab: Batch Print Jobs */}
      {activeTab === 'jobs' && (
        <Card>
          <div style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px' }}>Background Generation Jobs</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569' }}>
                  <th style={{ padding: '10px 14px' }}>Job ID</th>
                  <th style={{ padding: '10px 14px' }}>Job Type</th>
                  <th style={{ padding: '10px 14px' }}>Items</th>
                  <th style={{ padding: '10px 14px' }}>Status</th>
                  <th style={{ padding: '10px 14px' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace' }}>{j.id.substring(0, 8)}...</td>
                    <td style={{ padding: '10px 14px' }}>{j.jobType}</td>
                    <td style={{ padding: '10px 14px' }}>{j.totalItems}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <Badge variant={j.status === 'COMPLETED' ? 'success' : 'neutral'}>{j.status}</Badge>
                    </td>
                    <td style={{ padding: '10px 14px', color: '#64748b' }}>{j.createdAt.split('T')[0]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Issue Modal */}
      <Modal isOpen={isIssueModalOpen} onClose={() => setIsIssueModalOpen(false)} title="Issue New Certificate">
        <form onSubmit={handleIssueCertificate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Certificate Type *</label>
            <Select
              required
              options={[
                { value: '', label: 'Select Certificate Type' },
                ...types.map((t) => ({ value: t.id, label: `${t.name} (${t.category})` })),
              ]}
              value={issueForm.certificateTypeId}
              onChange={(e) => setIssueForm({ ...issueForm, certificateTypeId: e.target.value })}
            />
          </div>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Recipient Category *</label>
            <Select
              options={[
                { value: 'STUDENT', label: 'Student' },
                { value: 'EMPLOYEE', label: 'Employee / Faculty' },
                { value: 'GENERAL', label: 'General' },
              ]}
              value={issueForm.entityType}
              onChange={(e) => setIssueForm({ ...issueForm, entityType: e.target.value as any })}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Recipient Name *</label>
              <Input
                required
                placeholder="Full Name"
                value={issueForm.recipientName}
                onChange={(e) => setIssueForm({ ...issueForm, recipientName: e.target.value })}
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Recipient Entity ID *</label>
              <Input
                required
                placeholder="Student / Employee ID"
                value={issueForm.entityId}
                onChange={(e) => setIssueForm({ ...issueForm, entityId: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Administrative Remarks</label>
            <Input
              placeholder="e.g. Approved by Academic Board"
              value={issueForm.remarks}
              onChange={(e) => setIssueForm({ ...issueForm, remarks: e.target.value })}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <Button variant="outline" type="button" onClick={() => setIsIssueModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Issue Certificate
            </Button>
          </div>
        </form>
      </Modal>

      {/* Revoke Modal */}
      <Modal
        isOpen={isRevokeModalOpen}
        onClose={() => setIsRevokeModalOpen(false)}
        title={`Revoke Certificate — ${certToRevoke?.certificateNumber}`}
      >
        <form onSubmit={handleRevoke} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ margin: 0, fontSize: '14px', color: '#dc2626', fontWeight: 500 }}>
            Warning: Revoking this certificate will permanently invalidate its verification QR code and public authenticity record.
          </p>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Mandatory Reason for Revocation *</label>
            <Input
              required
              placeholder="e.g. Issued in error, student expelled, forged credentials"
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <Button variant="outline" type="button" onClick={() => setIsRevokeModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" type="submit">
              Confirm Revocation
            </Button>
          </div>
        </form>
      </Modal>

      {/* Print Preview Modal */}
      {printPreviewHtml && (
        <Modal isOpen={!!printPreviewHtml} onClose={() => setPrintPreviewHtml(null)} title="Print & PDF Document Preview">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button
                variant="primary"
                onClick={() => {
                  const printWin = window.open('', '_blank');
                  if (printWin) {
                    printWin.document.write(printPreviewHtml);
                    printWin.document.close();
                    printWin.focus();
                    setTimeout(() => printWin.print(), 250);
                  }
                }}
              >
                🖨️ Send to Printer / Save PDF
              </Button>
            </div>
            <div
              style={{
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '16px',
                background: '#ffffff',
                maxHeight: '600px',
                overflowY: 'auto',
              }}
              dangerouslySetInnerHTML={{ __html: printPreviewHtml }}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
