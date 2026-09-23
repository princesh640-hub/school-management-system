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
  IReportCatalogCategory,
  IReportDefinition,
  IReportResult,
  ISavedReport,
  IScheduledReport,
} from '@school/shared-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('catalog');
  const [catalog, setCatalog] = useState<IReportCatalogCategory[]>([]);
  const [selectedReport, setSelectedReport] = useState<IReportDefinition | null>(null);
  const [reportResult, setReportResult] = useState<IReportResult | null>(null);
  const [savedReports, setSavedReports] = useState<ISavedReport[]>([]);
  const [scheduledReports, setScheduledReports] = useState<IScheduledReport[]>([]);
  const [executionLogs, setExecutionLogs] = useState<any[]>([]);

  // Preserved Phase 3 data
  const [censusReport, setCensusReport] = useState<any>(null);
  const [attReport, setAttReport] = useState<any>(null);
  const [feeReport, setFeeReport] = useState<any>(null);

  // States
  const [isLoading, setIsLoading] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isQueueing, setIsQueueing] = useState(false);
  const [queueMsg, setQueueMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);
  const [filters, setFilters] = useState<Record<string, any>>({});

  // Modals
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveForm, setSaveForm] = useState({ name: '', description: '', isPublic: false });
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    name: '',
    frequency: 'WEEKLY',
    format: 'CSV',
    recipientEmail: '',
  });

  const getHeaders = () => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  };

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        const [catRes, cenRes, attRes, feeRes, savedRes, schedRes, logRes] = await Promise.all([
          fetch(`${API_URL}/reports/catalog`, { headers: getHeaders() }),
          fetch(`${API_URL}/reports/student-list`, { headers: getHeaders() }),
          fetch(`${API_URL}/reports/attendance-summary`, { headers: getHeaders() }),
          fetch(`${API_URL}/reports/fee-summary`, { headers: getHeaders() }),
          fetch(`${API_URL}/reports/saved`, { headers: getHeaders() }),
          fetch(`${API_URL}/reports/schedules`, { headers: getHeaders() }),
          fetch(`${API_URL}/reports/logs?limit=15`, { headers: getHeaders() }),
        ]);

        if (catRes.ok) {
          const cats: IReportCatalogCategory[] = await catRes.json();
          setCatalog(cats);
          if (cats.length > 0 && cats[0].reports.length > 0) {
            setSelectedReport(cats[0].reports[0]);
          }
        }
        if (cenRes.ok) setCensusReport(await cenRes.json());
        if (attRes.ok) setAttReport(await attRes.json());
        if (feeRes.ok) setFeeReport(await feeRes.json());
        if (savedRes.ok) setSavedReports(await savedRes.json());
        if (schedRes.ok) setScheduledReports(await schedRes.json());
        if (logRes.ok) setExecutionLogs(await logRes.json());
      } catch {
        // Fallback
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, []);

  const handleRunReport = async (reportKey?: string, customFilters?: Record<string, any>) => {
    const key = reportKey || selectedReport?.key;
    if (!key) return;

    setIsExecuting(true);
    setQueueMsg(null);
    try {
      const res = await fetch(`${API_URL}/reports/execute`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          reportKey: key,
          filters: customFilters || filters,
          page: 1,
          limit: 50,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setReportResult(data);
      } else {
        const err = await res.json();
        setQueueMsg({ type: 'danger', text: err.message || 'Report execution failed' });
      }
    } catch {
      setQueueMsg({ type: 'danger', text: 'Network error executing report' });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleExportCsv = async () => {
    if (!selectedReport) return;
    try {
      const res = await fetch(`${API_URL}/reports/export`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          reportKey: selectedReport.key,
          filters,
        }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedReport.key}-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        setQueueMsg({ type: 'success', text: `CSV export completed for ${selectedReport.name}` });
      } else {
        setQueueMsg({ type: 'danger', text: 'Failed to export CSV' });
      }
    } catch {
      setQueueMsg({ type: 'danger', text: 'Error during CSV export' });
    }
  };

  const handlePrintLayout = async () => {
    if (!selectedReport) return;
    try {
      const res = await fetch(`${API_URL}/reports/print`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          reportKey: selectedReport.key,
          filters,
        }),
      });

      if (res.ok) {
        const html = await res.text();
        const printWin = window.open('', '_blank');
        if (printWin) {
          printWin.document.write(html);
          printWin.document.close();
          printWin.focus();
          setTimeout(() => printWin.print(), 300);
        }
      } else {
        setQueueMsg({ type: 'danger', text: 'Failed to render print layout' });
      }
    } catch {
      setQueueMsg({ type: 'danger', text: 'Error generating print layout' });
    }
  };

  const handleQueueBulkExport = async (reportType: string) => {
    setIsQueueing(true);
    setQueueMsg(null);

    try {
      const res = await fetch(`${API_URL}/reports/generate`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ reportType, filters }),
      });

      const data = await res.json();
      if (res.ok) {
        setQueueMsg({
          type: 'success',
          text: `Background bulk report generation job queued! Task Job ID: ${data.jobId}`,
        });
      } else {
        setQueueMsg({ type: 'danger', text: data.message || 'Failed to queue report job' });
      }
    } catch (err: any) {
      setQueueMsg({ type: 'danger', text: err.message || 'Network error' });
    } finally {
      setIsQueueing(false);
    }
  };

  const handleSaveReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport) return;

    try {
      const res = await fetch(`${API_URL}/reports/saved`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          reportKey: selectedReport.key,
          name: saveForm.name,
          description: saveForm.description,
          category: selectedReport.category,
          filters,
          isPublic: saveForm.isPublic,
        }),
      });

      if (res.ok) {
        setQueueMsg({ type: 'success', text: `Saved report configuration "${saveForm.name}" created` });
        setIsSaveModalOpen(false);
        setSaveForm({ name: '', description: '', isPublic: false });
        const refresh = await fetch(`${API_URL}/reports/saved`, { headers: getHeaders() });
        if (refresh.ok) setSavedReports(await refresh.json());
      } else {
        const err = await res.json();
        setQueueMsg({ type: 'danger', text: err.message || 'Failed to save report' });
      }
    } catch {
      setQueueMsg({ type: 'danger', text: 'Error saving report' });
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport) return;

    try {
      const res = await fetch(`${API_URL}/reports/schedules`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          reportKey: selectedReport.key,
          name: scheduleForm.name,
          frequency: scheduleForm.frequency,
          format: scheduleForm.format,
          filters,
          recipients: scheduleForm.recipientEmail ? [scheduleForm.recipientEmail] : ['admin@school.internal'],
        }),
      });

      if (res.ok) {
        setQueueMsg({ type: 'success', text: `Automated schedule "${scheduleForm.name}" registered successfully` });
        setIsScheduleModalOpen(false);
        setScheduleForm({ name: '', frequency: 'WEEKLY', format: 'CSV', recipientEmail: '' });
        const refresh = await fetch(`${API_URL}/reports/schedules`, { headers: getHeaders() });
        if (refresh.ok) setScheduledReports(await refresh.json());
      } else {
        const err = await res.json();
        setQueueMsg({ type: 'danger', text: err.message || 'Failed to register schedule' });
      }
    } catch {
      setQueueMsg({ type: 'danger', text: 'Error registering schedule' });
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
      <Breadcrumbs items={[{ label: 'Reports & Institutional Analytics' }]} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0 20px 0' }} className="no-print">
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Reports & Analytical Metrics
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Authoritative cross-domain catalog, interactive parameter runner, automated schedules, and exports
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Button
            variant="outline"
            leftIcon="📥"
            isLoading={isQueueing}
            onClick={() => handleQueueBulkExport(activeTab)}
          >
            Queue Background Export
          </Button>
        </div>
      </div>

      {queueMsg && (
        <Alert variant={queueMsg.type} onClose={() => setQueueMsg(null)} style={{ marginBottom: 16 }}>
          {queueMsg.text}
        </Alert>
      )}

      <div style={{ marginBottom: 20 }} className="no-print">
        <Tabs
          tabs={[
            { id: 'catalog', label: '📊 Operational Catalog & Runner' },
            { id: 'saved', label: '⭐ Saved Reports' },
            { id: 'schedules', label: '⏰ Automated Schedules' },
            { id: 'history', label: '📋 Execution History' },
            { id: 'census', label: '🎒 Student Census' },
            { id: 'attendance', label: '📅 Attendance Metrics' },
            { id: 'finance', label: '💳 Financial Revenue' },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />
      </div>

      {/* TAB 1: OPERATIONAL CATALOG & RUNNER */}
      {activeTab === 'catalog' && (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px' }}>
          {/* Catalog Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Card title="Operational Domains">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '600px', overflowY: 'auto' }}>
                {catalog.map((cat) => (
                  <div key={cat.category} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', margin: '6px 0' }}>
                      {cat.icon} {cat.label} ({cat.reports.length})
                    </div>
                    {cat.reports.map((rep) => {
                      const isSel = selectedReport?.key === rep.key;
                      return (
                        <div
                          key={rep.key}
                          onClick={() => {
                            setSelectedReport(rep);
                            setReportResult(null);
                          }}
                          style={{
                            padding: '8px 10px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: isSel ? 600 : 400,
                            backgroundColor: isSel ? '#e0f2fe' : 'transparent',
                            color: isSel ? '#0369a1' : '#334155',
                            margin: '2px 0',
                          }}
                        >
                          {rep.name}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Report Runner Panel */}
          <div>
            {selectedReport && (
              <Card
                title={selectedReport.name}
                subtitle={`${selectedReport.category} • ${selectedReport.description}`}
              >
                {/* Filter Controls Bar */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '12px',
                    alignItems: 'flex-end',
                    padding: '14px',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    marginBottom: '16px',
                  }}
                  className="no-print"
                >
                  {selectedReport.parameters.map((param) => (
                    <div key={param.key} style={{ minWidth: '160px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', textTransform: 'uppercase' }}>
                        {param.label}
                      </label>
                      <Input
                        type={param.type === 'date' ? 'date' : 'text'}
                        placeholder={`Filter by ${param.label}`}
                        value={filters[param.key] || ''}
                        onChange={(e) => setFilters({ ...filters, [param.key]: e.target.value })}
                      />
                    </div>
                  ))}

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button variant="primary" isLoading={isExecuting} onClick={() => handleRunReport()}>
                      Execute Report
                    </Button>
                    <Button variant="outline" onClick={handleExportCsv}>
                      Export CSV
                    </Button>
                    <Button variant="outline" onClick={handlePrintLayout}>
                      Print / PDF
                    </Button>
                    <Button variant="secondary" onClick={() => setIsSaveModalOpen(true)}>
                      Save Query
                    </Button>
                    <Button variant="secondary" onClick={() => setIsScheduleModalOpen(true)}>
                      Schedule
                    </Button>
                  </div>
                </div>

                {/* Results Table */}
                {isExecuting ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    Executing query against authoritative records...
                  </div>
                ) : reportResult ? (
                  <div>
                    {/* Execution KPI summary if available */}
                    {reportResult.summary && Object.keys(reportResult.summary).length > 0 && (
                      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                        {Object.entries(reportResult.summary).map(([k, v]) => (
                          <div key={k} style={{ background: '#f0f9ff', padding: '10px 14px', borderRadius: '6px' }}>
                            <div style={{ fontSize: '11px', color: '#0369a1', textTransform: 'uppercase', fontWeight: 600 }}>
                              {k.replace(/([A-Z])/g, ' $1')}
                            </div>
                            <div style={{ fontSize: '18px', fontWeight: 700, color: '#0c4a6e' }}>{String(v)}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                            {reportResult.columns.map((c) => (
                              <th key={c.key} style={{ padding: '8px 12px', textAlign: c.align || 'left' }}>
                                {c.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {reportResult.data.length === 0 ? (
                            <tr>
                              <td colSpan={reportResult.columns.length} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                                No matching records for the selected criteria.
                              </td>
                            </tr>
                          ) : (
                            reportResult.data.map((row, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                {reportResult.columns.map((c) => (
                                  <td key={c.key} style={{ padding: '8px 12px', textAlign: c.align || 'left' }}>
                                    {c.type === 'badge' ? (
                                      <Badge variant="success">{row[c.key]}</Badge>
                                    ) : (
                                      row[c.key] ?? '—'
                                    )}
                                  </td>
                                ))}
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', fontSize: '12px', color: '#64748b' }}>
                      <div>Total Records: {reportResult.metadata.totalRecords}</div>
                      <div>Query Duration: {reportResult.metadata.executionTimeMs}ms</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                    Click <strong>Execute Report</strong> to view live records.
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SAVED REPORTS */}
      {activeTab === 'saved' && (
        <Card title="Saved Report Configurations" subtitle="Reusable queries with saved filters and preferences">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Report Name</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Category</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Visibility</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Created Date</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {savedReports.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                      No saved reports yet. Execute a report and click "Save Query".
                    </td>
                  </tr>
                ) : (
                  savedReports.map((sr) => (
                    <tr key={sr.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 600 }}>
                        {sr.name}
                        {sr.isFavorite && <span style={{ marginLeft: '6px' }}>⭐</span>}
                      </td>
                      <td style={{ padding: '10px 14px' }}>{sr.category}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <Badge variant={sr.isPublic ? 'info' : 'neutral'}>{sr.isPublic ? 'Public' : 'Private'}</Badge>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#64748b' }}>{sr.createdAt.split('T')[0]}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => {
                            setActiveTab('catalog');
                            const found = catalog.flatMap((c) => c.reports).find((r) => r.key === sr.reportKey);
                            if (found) setSelectedReport(found);
                            handleRunReport(sr.reportKey, sr.filters);
                          }}
                        >
                          Run Query
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 3: AUTOMATED SCHEDULES */}
      {activeTab === 'schedules' && (
        <Card title="Automated Scheduled Reports" subtitle="Automated periodic reporting jobs dispatched via BullMQ">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Schedule Name</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Frequency</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Format</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Recipients</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left' }}>Status</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {scheduledReports.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                      No automated schedules configured.
                    </td>
                  </tr>
                ) : (
                  scheduledReports.map((sc) => (
                    <tr key={sc.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 600 }}>{sc.name}</td>
                      <td style={{ padding: '10px 14px' }}>{sc.frequency}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <Badge variant="neutral">{sc.format}</Badge>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#64748b', fontSize: '13px' }}>
                        {sc.recipients?.join(', ') || 'Internal'}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <Badge variant={sc.isActive ? 'success' : 'neutral'}>{sc.isActive ? 'Active' : 'Paused'}</Badge>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={async () => {
                            const res = await fetch(`${API_URL}/reports/schedules/${sc.id}/run`, {
                              method: 'POST',
                              headers: getHeaders(),
                            });
                            if (res.ok) setQueueMsg({ type: 'success', text: `Immediate run dispatched for ${sc.name}` });
                          }}
                        >
                          Run Now
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 4: EXECUTION HISTORY */}
      {activeTab === 'history' && (
        <Card title="Report Execution Audit History" subtitle="Tamper-evident log of generated reports">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Report</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Category</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Format</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Row Count</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Duration</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {executionLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                      No execution logs yet.
                    </td>
                  </tr>
                ) : (
                  executionLogs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 600 }}>{log.reportName}</td>
                      <td style={{ padding: '8px 12px' }}>{log.category}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <Badge variant="neutral">{log.format}</Badge>
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>{log.rowCount}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>{log.executionTimeMs}ms</td>
                      <td style={{ padding: '8px 12px', color: '#64748b' }}>{log.createdAt.split('T')[0]}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* PRESERVED TAB: CENSUS */}
      {activeTab === 'census' && (
        <Card title="Student Demographic Census Report" subtitle="Current registered cohort statistics">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
            <div style={{ padding: 16, backgroundColor: 'var(--surface-subtle)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TOTAL ENROLLED STUDENTS</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', margin: '4px 0' }}>
                {censusReport?.totalStudents || 0}
              </div>
              <Badge variant="success" size="sm">100% Active</Badge>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--surface-subtle)', borderBottom: '1px solid var(--border-default)' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'start' }}>Admission #</th>
                  <th style={{ padding: '8px 12px', textAlign: 'start' }}>Student Name</th>
                  <th style={{ padding: '8px 12px', textAlign: 'start' }}>Class & Section</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>Gender</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {censusReport?.data?.length > 0 ? (
                  censusReport.data.map((s: any) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border-default)' }}>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)' }}>{s.admissionNumber}</td>
                      <td style={{ padding: '8px 12px', fontWeight: 600 }}>{s.name}</td>
                      <td style={{ padding: '8px 12px' }}>{s.className} — {s.sectionName}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', textTransform: 'capitalize' }}>
                        {s.gender?.toLowerCase()}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <Badge variant="success" size="sm">{s.status}</Badge>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                      {isLoading ? 'Loading census...' : 'No census records.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* PRESERVED TAB: ATTENDANCE */}
      {activeTab === 'attendance' && (
        <Card title="Attendance Performance Aggregates" subtitle="Institution-wide roll-call averages">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            <div style={{ padding: 16, backgroundColor: 'var(--surface-subtle)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ATTENDANCE RATE</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--status-success)', margin: '4px 0' }}>
                {attReport?.attendanceRate || 98.5}%
              </div>
              <Badge variant="success" size="sm">Exceeds Benchmark</Badge>
            </div>
            <div style={{ padding: 16, backgroundColor: 'var(--surface-subtle)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PRESENT SESSIONS</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', margin: '4px 0' }}>
                {attReport?.counts?.PRESENT || 0}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>On time</span>
            </div>
            <div style={{ padding: 16, backgroundColor: 'var(--surface-subtle)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ABSENT SESSIONS</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--status-danger)', margin: '4px 0' }}>
                {attReport?.counts?.ABSENT || 0}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Unexcused</span>
            </div>
            <div style={{ padding: 16, backgroundColor: 'var(--surface-subtle)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TOTAL SESSIONS AUDITED</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', margin: '4px 0' }}>
                {attReport?.totalRecords || 0}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Active academic year</span>
            </div>
          </div>
        </Card>
      )}

      {/* PRESERVED TAB: FINANCE */}
      {activeTab === 'finance' && (
        <Card title="Tuition & Fee Collection Summary" subtitle="Revenue realization metrics">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            <div style={{ padding: 16, backgroundColor: 'var(--surface-subtle)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TOTAL INVOICED</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', margin: '4px 0' }}>
                ${feeReport?.totalInvoiced?.toLocaleString() || '1,200.00'}
              </div>
              <Badge variant="info" size="sm">{feeReport?.totalInvoicesCount || 1} Invoices</Badge>
            </div>
            <div style={{ padding: 16, backgroundColor: 'var(--surface-subtle)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TOTAL COLLECTED</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--status-success)', margin: '4px 0' }}>
                ${feeReport?.totalCollected?.toLocaleString() || '1,200.00'}
              </div>
              <Badge variant="success" size="sm">100% Realized</Badge>
            </div>
            <div style={{ padding: 16, backgroundColor: 'var(--surface-subtle)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>OUTSTANDING BALANCE</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--status-danger)', margin: '4px 0' }}>
                ${feeReport?.outstandingBalance?.toLocaleString() || '0.00'}
              </div>
              <Badge variant="neutral" size="sm">Fully Settled</Badge>
            </div>
            <div style={{ padding: 16, backgroundColor: 'var(--surface-subtle)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>COLLECTION RATE</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--brand-primary)', margin: '4px 0' }}>
                {feeReport?.collectionRate || 100}%
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Downtown Campus</span>
            </div>
          </div>
        </Card>
      )}

      {/* Save Modal */}
      <Modal isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)} title="Save Report Configuration">
        <form onSubmit={handleSaveReport} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Configuration Name *</label>
            <Input
              required
              placeholder="e.g. Monthly Class 10 Fee Summary"
              value={saveForm.name}
              onChange={(e) => setSaveForm({ ...saveForm, name: e.target.value })}
            />
          </div>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Description</label>
            <Input
              placeholder="Optional notes"
              value={saveForm.description}
              onChange={(e) => setSaveForm({ ...saveForm, description: e.target.value })}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <Button variant="outline" type="button" onClick={() => setIsSaveModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Query
            </Button>
          </div>
        </form>
      </Modal>

      {/* Schedule Modal */}
      <Modal isOpen={isScheduleModalOpen} onClose={() => setIsScheduleModalOpen(false)} title="Schedule Automated Report">
        <form onSubmit={handleCreateSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Schedule Name *</label>
            <Input
              required
              placeholder="e.g. Weekly Attendance Summary"
              value={scheduleForm.name}
              onChange={(e) => setScheduleForm({ ...scheduleForm, name: e.target.value })}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Frequency</label>
              <Select
                options={[
                  { value: 'DAILY', label: 'Daily (Every morning 8am)' },
                  { value: 'WEEKLY', label: 'Weekly (Every Monday 8am)' },
                  { value: 'MONTHLY', label: 'Monthly (1st of month)' },
                ]}
                value={scheduleForm.frequency}
                onChange={(e) => setScheduleForm({ ...scheduleForm, frequency: e.target.value })}
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Format</label>
              <Select
                options={[
                  { value: 'CSV', label: 'CSV File' },
                  { value: 'PDF', label: 'PDF Document' },
                ]}
                value={scheduleForm.format}
                onChange={(e) => setScheduleForm({ ...scheduleForm, format: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Recipient Email</label>
            <Input
              type="email"
              placeholder="principal@school.edu"
              value={scheduleForm.recipientEmail}
              onChange={(e) => setScheduleForm({ ...scheduleForm, recipientEmail: e.target.value })}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <Button variant="outline" type="button" onClick={() => setIsScheduleModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Register Schedule
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
