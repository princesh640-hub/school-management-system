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
  IInstitutionalDocument,
  IDocumentCategory,
  IDocumentType,
  IDocumentDashboardOverview,
  IDocumentVersion,
} from '@school/shared-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export default function DocumentsPage() {
  const [activeTab, setActiveTab] = useState('documents');
  const [overview, setOverview] = useState<IDocumentDashboardOverview | null>(null);
  const [documents, setDocuments] = useState<IInstitutionalDocument[]>([]);
  const [categories, setCategories] = useState<IDocumentCategory[]>([]);
  const [types, setTypes] = useState<IDocumentType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedDocForVersion, setSelectedDocForVersion] = useState<IInstitutionalDocument | null>(null);
  const [versionsList, setVersionsList] = useState<IDocumentVersion[]>([]);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [docToShare, setDocToShare] = useState<IInstitutionalDocument | null>(null);

  // Form states
  const [uploadForm, setUploadForm] = useState({
    title: '',
    categoryId: '',
    typeId: '',
    entityType: 'STUDENT',
    entityId: '',
    fileKey: '',
    fileName: '',
    mimeType: 'application/pdf',
    sizeInBytes: 1048576,
    expiryDate: '',
    isConfidential: false,
    notes: '',
  });

  const [shareForm, setShareForm] = useState({
    sharedWithUserId: '',
    sharedWithRole: '',
    permission: 'VIEW',
    expiresAt: '',
  });

  const [versionForm, setVersionForm] = useState({
    fileKey: '',
    fileName: '',
    mimeType: 'application/pdf',
    sizeInBytes: 1048576,
    changeSummary: '',
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
      const [ovRes, docRes, catRes, typeRes] = await Promise.all([
        fetch(`${API_URL}/documents/dashboard/overview`, { headers: getHeaders() }),
        fetch(`${API_URL}/documents`, { headers: getHeaders() }),
        fetch(`${API_URL}/documents/categories/all`, { headers: getHeaders() }),
        fetch(`${API_URL}/documents/types/all`, { headers: getHeaders() }),
      ]);

      if (ovRes.ok) setOverview(await ovRes.json());
      if (docRes.ok) {
        const d = await docRes.json();
        setDocuments(d.documents || []);
      }
      if (catRes.ok) setCategories(await catRes.json());
      if (typeRes.ok) setTypes(await typeRes.json());
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDownload = async (docId: string, fileName: string) => {
    try {
      const res = await fetch(`${API_URL}/documents/${docId}/download`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.downloadUrl) {
          window.open(data.downloadUrl, '_blank');
          setFeedback({ type: 'success', text: `Secure download URL generated for ${fileName}` });
        }
      } else {
        const err = await res.json();
        setFeedback({ type: 'danger', text: err.message || 'Failed to generate download link' });
      }
    } catch {
      setFeedback({ type: 'danger', text: 'Network error generating download link' });
    }
  };

  const handleOpenVersions = async (doc: IInstitutionalDocument) => {
    setSelectedDocForVersion(doc);
    try {
      const res = await fetch(`${API_URL}/documents/${doc.id}/versions`, { headers: getHeaders() });
      if (res.ok) {
        setVersionsList(await res.json());
      }
    } catch {
      setVersionsList([]);
    }
  };

  const handleUploadNewVersion = async () => {
    if (!selectedDocForVersion) return;
    try {
      const res = await fetch(`${API_URL}/documents/${selectedDocForVersion.id}/versions`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          fileKey: versionForm.fileKey || `documents/${selectedDocForVersion.id}-v${selectedDocForVersion.currentVersion + 1}.pdf`,
          fileName: versionForm.fileName || `${selectedDocForVersion.fileName}-updated.pdf`,
          mimeType: versionForm.mimeType,
          sizeInBytes: versionForm.sizeInBytes,
          changeSummary: versionForm.changeSummary,
        }),
      });

      if (res.ok) {
        setFeedback({ type: 'success', text: `New version uploaded for ${selectedDocForVersion.documentNumber}` });
        handleOpenVersions(selectedDocForVersion);
        loadData();
      } else {
        const err = await res.json();
        setFeedback({ type: 'danger', text: err.message || 'Failed to upload version' });
      }
    } catch {
      setFeedback({ type: 'danger', text: 'Error uploading version' });
    }
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/documents`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          ...uploadForm,
          fileKey: uploadForm.fileKey || `documents/${Date.now()}-${uploadForm.fileName || 'upload.pdf'}`,
          fileName: uploadForm.fileName || 'Document.pdf',
        }),
      });

      if (res.ok) {
        setFeedback({ type: 'success', text: 'Document successfully registered' });
        setIsUploadOpen(false);
        loadData();
      } else {
        const err = await res.json();
        setFeedback({ type: 'danger', text: err.message || 'Failed to register document' });
      }
    } catch {
      setFeedback({ type: 'danger', text: 'Network error creating document' });
    }
  };

  const handleShareSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docToShare) return;
    try {
      const res = await fetch(`${API_URL}/documents/${docToShare.id}/share`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(shareForm),
      });

      if (res.ok) {
        setFeedback({ type: 'success', text: `Access granted for document ${docToShare.documentNumber}` });
        setIsShareModalOpen(false);
      } else {
        const err = await res.json();
        setFeedback({ type: 'danger', text: err.message || 'Failed to share document' });
      }
    } catch {
      setFeedback({ type: 'danger', text: 'Network error sharing document' });
    }
  };

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      !searchQuery ||
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.documentNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.entityName && doc.entityName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = !selectedCategory || doc.categoryId === selectedCategory;
    const matchesStatus = !selectedStatus || doc.status === selectedStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header & Navigation */}
      <div style={{ marginBottom: '20px' }} className="no-print">
        <Breadcrumbs
          items={[
            { label: 'Portal', href: '/portal/dashboard' },
            { label: 'Document Center', href: '/portal/documents' },
          ]}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
              Institutional Document Center
            </h1>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>
              Enterprise repository, access control, short-lived signed downloads, and version tracking.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Button variant="primary" onClick={() => setIsUploadOpen(true)}>
              + Upload Document
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

      {/* KPI Overview Cards */}
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
              Total Active Documents
            </span>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', marginTop: '6px' }}>
              {overview?.totalDocuments ?? documents.length}
            </div>
            <span style={{ fontSize: '12px', color: '#0284c7' }}>Version-controlled repository</span>
          </div>
        </Card>
        <Card>
          <div style={{ padding: '16px' }}>
            <span style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
              Expiring Within 30 Days
            </span>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#d97706', marginTop: '6px' }}>
              {overview?.expiringDocumentsCount ?? 0}
            </div>
            <span style={{ fontSize: '12px', color: '#d97706' }}>Requires renewal</span>
          </div>
        </Card>
        <Card>
          <div style={{ padding: '16px' }}>
            <span style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
              Expired Documents
            </span>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#dc2626', marginTop: '6px' }}>
              {overview?.expiredDocumentsCount ?? 0}
            </div>
            <span style={{ fontSize: '12px', color: '#dc2626' }}>Action mandatory</span>
          </div>
        </Card>
        <Card>
          <div style={{ padding: '16px' }}>
            <span style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
              Document Categories
            </span>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#16a34a', marginTop: '6px' }}>
              {categories.length || 10}
            </div>
            <span style={{ fontSize: '12px', color: '#16a34a' }}>Institutional taxonomy</span>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div style={{ marginBottom: '20px' }} className="no-print">
        <Tabs
          tabs={[
            { id: 'documents', label: 'Document Register' },
            { id: 'categories', label: 'Categories & Types' },
            { id: 'expiring', label: 'Expiring & Alerts' },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />
      </div>

      {/* Tab Content: Document Register */}
      {activeTab === 'documents' && (
        <div>
          {/* Filters Bar */}
          <Card style={{ marginBottom: '16px' }} className="no-print">
            <div style={{ padding: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: '1 1 250px' }}>
                <Input
                  placeholder="Search by title, DOC #, entity..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div style={{ width: '200px' }}>
                <Select
                  options={[
                    { value: '', label: 'All Categories' },
                    ...categories.map((c) => ({ value: c.id, label: c.name })),
                  ]}
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                />
              </div>
              <div style={{ width: '160px' }}>
                <Select
                  options={[
                    { value: '', label: 'All Statuses' },
                    { value: 'ACTIVE', label: 'Active' },
                    { value: 'ARCHIVED', label: 'Archived' },
                    { value: 'EXPIRED', label: 'Expired' },
                  ]}
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                />
              </div>
            </div>
          </Card>

          {/* Documents Table */}
          <Card>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569' }}>
                    <th style={{ padding: '12px 16px' }}>Doc #</th>
                    <th style={{ padding: '12px 16px' }}>Document Title</th>
                    <th style={{ padding: '12px 16px' }}>Category & Type</th>
                    <th style={{ padding: '12px 16px' }}>Linked Entity</th>
                    <th style={{ padding: '12px 16px' }}>Version</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th style={{ padding: '12px 16px' }}>Expiry</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                        Loading documents...
                      </td>
                    </tr>
                  ) : filteredDocs.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                        No documents found matching filters.
                      </td>
                    </tr>
                  ) : (
                    filteredDocs.map((doc) => (
                      <tr key={doc.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0284c7' }}>
                          {doc.documentNumber}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 500, color: '#0f172a' }}>{doc.title}</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>
                            {doc.fileName} • {(doc.sizeInBytes / 1024).toFixed(0)} KB
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <Badge variant="neutral">{doc.categoryName || 'General'}</Badge>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#334155' }}>
                          {doc.entityType ? (
                            <span>
                              {doc.entityType}: {doc.entityName || doc.entityId}
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>Institution-wide</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            onClick={() => handleOpenVersions(doc)}
                            style={{
                              cursor: 'pointer',
                              color: '#0284c7',
                              fontWeight: 600,
                              textDecoration: 'underline',
                            }}
                          >
                            v{doc.currentVersion}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <Badge
                            variant={
                              doc.status === 'ACTIVE'
                                ? 'success'
                                : doc.status === 'EXPIRED'
                                ? 'danger'
                                : 'neutral'
                            }
                          >
                            {doc.status}
                          </Badge>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#64748b' }}>
                          {doc.expiryDate ? doc.expiryDate.split('T')[0] : '—'}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleDownload(doc.id, doc.fileName)}
                            >
                              Download
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setDocToShare(doc);
                                setIsShareModalOpen(true);
                              }}
                            >
                              Share
                            </Button>
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

      {/* Tab Content: Categories & Types */}
      {activeTab === 'categories' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {categories.map((cat) => {
            const catTypes = types.filter((t) => t.categoryId === cat.id);
            return (
              <Card key={cat.id}>
                <div style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>{cat.name}</h3>
                    <Badge variant="primary">{cat.code}</Badge>
                  </div>
                  <p style={{ color: '#64748b', fontSize: '13px', margin: '8px 0 16px 0' }}>
                    {cat.description || 'Institutional operational category'}
                  </p>
                  <div>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155', textTransform: 'uppercase' }}>
                      Permitted Document Types ({catTypes.length}):
                    </span>
                    <ul style={{ paddingLeft: '20px', margin: '8px 0 0 0', fontSize: '13px', color: '#475569' }}>
                      {catTypes.map((t) => (
                        <li key={t.id} style={{ margin: '4px 0' }}>
                          <strong>{t.name}</strong> ({t.code})
                          {t.requiresExpiry && <span style={{ color: '#d97706', marginLeft: '6px' }}>• Requires Expiry</span>}
                        </li>
                      ))}
                      {catTypes.length === 0 && <li style={{ color: '#94a3b8' }}>Standard institutional file</li>}
                    </ul>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Tab Content: Expiring & Alerts */}
      {activeTab === 'expiring' && (
        <div>
          <Card>
            <div style={{ padding: '20px' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', color: '#0f172a' }}>
                Proactive Expiry Monitoring & Compliance
              </h3>
              <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>
                Documents registered with mandatory expiration dates (e.g. driving licenses, vehicle insurance, teacher qualifications, annual health certificates).
              </p>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569' }}>
                    <th style={{ padding: '10px 14px' }}>Doc #</th>
                    <th style={{ padding: '10px 14px' }}>Title</th>
                    <th style={{ padding: '10px 14px' }}>Category</th>
                    <th style={{ padding: '10px 14px' }}>Expiry Date</th>
                    <th style={{ padding: '10px 14px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {documents
                    .filter((d) => d.expiryDate)
                    .map((d) => (
                      <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 600 }}>{d.documentNumber}</td>
                        <td style={{ padding: '10px 14px' }}>{d.title}</td>
                        <td style={{ padding: '10px 14px' }}>{d.categoryName}</td>
                        <td style={{ padding: '10px 14px', color: '#dc2626', fontWeight: 600 }}>
                          {d.expiryDate ? d.expiryDate.split('T')[0] : 'N/A'}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <Button size="sm" variant="outline" onClick={() => handleOpenVersions(d)}>
                            Renew / Update
                          </Button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Upload Document Modal */}
      <Modal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} title="Register Institutional Document">
        <form onSubmit={handleCreateDocument} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Document Title *</label>
            <Input
              required
              placeholder="e.g. Student Birth Certificate, Vehicle Fitness 2026"
              value={uploadForm.title}
              onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Category *</label>
              <Select
                required
                options={[
                  { value: '', label: 'Select Category' },
                  ...categories.map((c) => ({ value: c.id, label: c.name })),
                ]}
                value={uploadForm.categoryId}
                onChange={(e) => setUploadForm({ ...uploadForm, categoryId: e.target.value })}
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Document Type *</label>
              <Select
                required
                options={[
                  { value: '', label: 'Select Type' },
                  ...types
                    .filter((t) => !uploadForm.categoryId || t.categoryId === uploadForm.categoryId)
                    .map((t) => ({ value: t.id, label: t.name })),
                ]}
                value={uploadForm.typeId}
                onChange={(e) => setUploadForm({ ...uploadForm, typeId: e.target.value })}
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Entity Type</label>
              <Select
                options={[
                  { value: 'STUDENT', label: 'Student' },
                  { value: 'EMPLOYEE', label: 'Employee' },
                  { value: 'VEHICLE', label: 'Vehicle' },
                  { value: 'GENERAL', label: 'General / Campus' },
                ]}
                value={uploadForm.entityType}
                onChange={(e) => setUploadForm({ ...uploadForm, entityType: e.target.value })}
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Entity ID / Ref</label>
              <Input
                placeholder="e.g. Student ID, Reg No"
                value={uploadForm.entityId}
                onChange={(e) => setUploadForm({ ...uploadForm, entityId: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>File Name *</label>
            <Input
              required
              placeholder="document.pdf"
              value={uploadForm.fileName}
              onChange={(e) => setUploadForm({ ...uploadForm, fileName: e.target.value })}
            />
          </div>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Expiry Date (Optional)</label>
            <Input
              type="date"
              value={uploadForm.expiryDate}
              onChange={(e) => setUploadForm({ ...uploadForm, expiryDate: e.target.value })}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <Button variant="outline" type="button" onClick={() => setIsUploadOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Document
            </Button>
          </div>
        </form>
      </Modal>

      {/* Version History Modal */}
      <Modal
        isOpen={!!selectedDocForVersion}
        onClose={() => setSelectedDocForVersion(null)}
        title={`Version History — ${selectedDocForVersion?.documentNumber}`}
      >
        <div>
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '15px' }}>{selectedDocForVersion?.title}</h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
              Current Version: <strong>v{selectedDocForVersion?.currentVersion}</strong>
            </p>
          </div>

          <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '20px' }}>
            <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '6px 8px' }}>Version</th>
                  <th style={{ padding: '6px 8px' }}>File Name</th>
                  <th style={{ padding: '6px 8px' }}>Summary</th>
                  <th style={{ padding: '6px 8px' }}>Uploaded At</th>
                </tr>
              </thead>
              <tbody>
                {versionsList.map((v) => (
                  <tr key={v.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '6px 8px', fontWeight: 600 }}>v{v.versionNumber}</td>
                    <td style={{ padding: '6px 8px' }}>{v.fileName}</td>
                    <td style={{ padding: '6px 8px', color: '#64748b' }}>{v.changeSummary || '—'}</td>
                    <td style={{ padding: '6px 8px', color: '#64748b' }}>{v.createdAt.split('T')[0]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
            <h5 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Upload New Version</h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Input
                placeholder="New File Name (e.g. renewed-cert.pdf)"
                value={versionForm.fileName}
                onChange={(e) => setVersionForm({ ...versionForm, fileName: e.target.value })}
              />
              <Input
                placeholder="Change Summary / Reason for Revision"
                value={versionForm.changeSummary}
                onChange={(e) => setVersionForm({ ...versionForm, changeSummary: e.target.value })}
              />
              <Button variant="primary" onClick={handleUploadNewVersion}>
                Submit Revision
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Share Document Modal */}
      <Modal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title={`Share Document — ${docToShare?.documentNumber}`}
      >
        <form onSubmit={handleShareSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
            Grant secure, audited, and time-limited access to <strong>{docToShare?.title}</strong>.
          </p>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Permission</label>
            <Select
              options={[
                { value: 'VIEW', label: 'View Only' },
                { value: 'DOWNLOAD', label: 'Download & View' },
              ]}
              value={shareForm.permission}
              onChange={(e) => setShareForm({ ...shareForm, permission: e.target.value as any })}
            />
          </div>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Recipient User ID (Optional)</label>
            <Input
              placeholder="Target User ID"
              value={shareForm.sharedWithUserId}
              onChange={(e) => setShareForm({ ...shareForm, sharedWithUserId: e.target.value })}
            />
          </div>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Recipient Role (Optional)</label>
            <Input
              placeholder="e.g. TEACHER, ACCOUNTANT"
              value={shareForm.sharedWithRole}
              onChange={(e) => setShareForm({ ...shareForm, sharedWithRole: e.target.value })}
            />
          </div>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Share Expiration (Optional)</label>
            <Input
              type="datetime-local"
              value={shareForm.expiresAt}
              onChange={(e) => setShareForm({ ...shareForm, expiresAt: e.target.value })}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <Button variant="outline" type="button" onClick={() => setIsShareModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Grant Access
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
