'use client';

import React, { useState, useEffect } from 'react';
import {
  IntegrationType,
  IntegrationProvider,
  IntegrationHealthStatus,
  IntegrationEnvironment,
} from '@school/shared-types';

interface CatalogItem {
  type: IntegrationType;
  provider: IntegrationProvider;
  name: string;
  category: string;
  description: string;
  supportedEnvironments: Array<'SANDBOX' | 'PRODUCTION'>;
  parameters: Array<{
    key: string;
    label: string;
    type: string;
    required: boolean;
    secret: boolean;
    description: string;
    defaultValue?: any;
  }>;
}

interface ConfigItem {
  id: string;
  type: IntegrationType;
  provider: IntegrationProvider;
  name: string;
  description?: string;
  environment: IntegrationEnvironment;
  isEnabled: boolean;
  maskedConfig: Record<string, any>;
  healthStatus: IntegrationHealthStatus;
  lastHealthCheckAt?: string;
  lastSuccessAt?: string;
  lastFailureAt?: string;
  lastErrorMessage?: string;
  failureCount: number;
}

interface WebhookLogItem {
  id: string;
  provider: string;
  eventType: string;
  eventId?: string;
  status: string;
  responseCode?: number;
  processingTimeMs?: number;
  errorMessage?: string;
  createdAt: string;
}

interface IntegrationLogItem {
  id: string;
  type: string;
  provider: string;
  operation: string;
  direction: string;
  status: string;
  latencyMs: number;
  normalizedError?: string;
  errorMessage?: string;
  createdAt: string;
}

export default function IntegrationsPage() {
  const [activeTab, setActiveTab] = useState<
    'catalog' | 'health' | 'webhooks' | 'data-exchange' | 'audit'
  >('catalog');

  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLogItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<IntegrationLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filter
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Modal / Drawer state
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<CatalogItem | null>(null);
  const [editingConfig, setEditingConfig] = useState<ConfigItem | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [formEnv, setFormEnv] = useState<'SANDBOX' | 'PRODUCTION'>('SANDBOX');
  const [formName, setFormName] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Data Exchange state
  const [exchangeEntity, setExchangeEntity] = useState('STUDENTS');
  const [csvContent, setCsvContent] = useState('');
  const [validationResult, setValidationResult] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Mock / API call simulation
      const catalogRes = await fetch('/api/v1/integrations/catalog').then((r) =>
        r.ok ? r.json() : null,
      );
      const configsRes = await fetch('/api/v1/integrations').then((r) =>
        r.ok ? r.json() : null,
      );
      const webhooksRes = await fetch('/api/v1/integrations/webhooks/logs').then((r) =>
        r.ok ? r.json() : null,
      );
      const logsRes = await fetch('/api/v1/integrations/logs/all').then((r) =>
        r.ok ? r.json() : null,
      );

      const parseArr = (json: any) => Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : (Array.isArray(json?.items) ? json.items : []));

      if (catalogRes) setCatalog(parseArr(catalogRes));
      if (configsRes) setConfigs(parseArr(configsRes));
      if (webhooksRes) setWebhookLogs(parseArr(webhooksRes));
      if (logsRes?.items || logsRes?.data) setAuditLogs(parseArr(logsRes));
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const handleOpenConfig = (item: CatalogItem, existingConfig?: ConfigItem) => {
    setSelectedCatalogItem(item);
    setEditingConfig(existingConfig || null);
    setFormName(existingConfig ? existingConfig.name : item.name);
    setFormEnv(existingConfig ? existingConfig.environment : 'SANDBOX');

    const initialData: Record<string, any> = {};
    item.parameters.forEach((p) => {
      initialData[p.key] = existingConfig?.maskedConfig?.[p.key] || p.defaultValue || '';
    });
    setFormData(initialData);
    setIsModalOpen(true);
  };

  const handleSaveConfig = async () => {
    if (!selectedCatalogItem) return;
    setActionLoading(true);
    setFeedback(null);

    try {
      const payload = {
        type: selectedCatalogItem.type,
        provider: selectedCatalogItem.provider,
        name: formName,
        environment: formEnv,
        isEnabled: true,
        config: formData,
      };

      const res = await fetch('/api/v1/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to save configuration');
      }

      setFeedback({ type: 'success', message: 'Integration credentials encrypted and saved securely.' });
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleTestConnection = async (configId: string) => {
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/v1/integrations/${configId}/test`, { method: 'POST' });
      const data = await res.json();

      if (data.isSuccess) {
        setFeedback({
          type: 'success',
          message: `Connection Verified: ${data.message} (${data.latencyMs}ms)`,
        });
      } else {
        setFeedback({
          type: 'error',
          message: `Connection Failed: ${data.message}`,
        });
      }
      fetchData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleEnable = async (config: ConfigItem) => {
    setActionLoading(true);
    try {
      const endpoint = config.isEnabled ? 'disable' : 'enable';
      await fetch(`/api/v1/integrations/${config.id}/${endpoint}`, { method: 'POST' });
      fetchData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Data exchange actions
  const handleValidateCsv = async () => {
    if (!csvContent.trim()) {
      setFeedback({ type: 'error', message: 'Please paste CSV content to validate.' });
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch('/api/v1/integrations/data-exchange/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType: exchangeEntity, csvContent }),
      });
      const data = await res.json();
      setValidationResult(data);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleExecuteImport = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/v1/integrations/data-exchange/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: exchangeEntity,
          fileName: `manual-batch-${Date.now()}.csv`,
          csvContent,
        }),
      });
      const job = await res.json();
      setFeedback({
        type: 'success',
        message: `Import processed! Status: ${job.status}. ${job.successfulRows}/${job.totalRows} rows succeeded.`,
      });
      setCsvContent('');
      setValidationResult(null);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const categories = ['ALL', 'Communication', 'Finance', 'Infrastructure', 'Operations', 'Academics', 'Identity'];

  const safeCatalog = Array.isArray(catalog) ? catalog : [];
  const filteredCatalog = safeCatalog.filter((item) => {
    if (categoryFilter === 'ALL') return true;
    return item.category.toLowerCase() === categoryFilter.toLowerCase();
  });

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Integrations & External Services
            </h1>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '4px 8px',
                borderRadius: '4px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: '#059669',
              }}
            >
              Live Provider Engine
            </span>
          </div>
          <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Provider-independent gateway adapters, encrypted server secrets, HMAC webhooks, and exchange pipelines.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setActiveTab('data-exchange')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-surface)',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '0.875rem',
            }}
          >
            📥 Data Exchange
          </button>
          <a
            href="/api/v1/integrations/calendar/feed/academic.ics"
            target="_blank"
            rel="noreferrer"
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              backgroundColor: 'var(--brand-primary)',
              color: '#ffffff',
              textDecoration: 'none',
              fontWeight: 500,
              fontSize: '0.875rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            📅 iCal Subscription Feed
          </a>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '6px',
            marginBottom: '20px',
            backgroundColor: feedback.type === 'success' ? '#ecfdf5' : '#fef2f2',
            border: `1px solid ${feedback.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            color: feedback.type === 'success' ? '#065f46' : '#991b1b',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '0.9rem' }}>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid var(--border-color)',
          marginBottom: '24px',
          overflowX: 'auto',
        }}
      >
        {[
          { key: 'catalog', label: 'Integration Catalog' },
          { key: 'health', label: 'Health & Latency Monitor' },
          { key: 'webhooks', label: 'Inbound Webhook Ledger' },
          { key: 'data-exchange', label: 'Data Exchange & Import' },
          { key: 'audit', label: 'Audit Logs' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: '10px 18px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontWeight: activeTab === tab.key ? 600 : 500,
              fontSize: '0.9rem',
              color: activeTab === tab.key ? 'var(--brand-primary)' : 'var(--text-secondary)',
              borderBottom: `2px solid ${activeTab === tab.key ? 'var(--brand-primary)' : 'transparent'}`,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: INTEGRATION CATALOG */}
      {activeTab === 'catalog' && (
        <div>
          {/* Category Filter Chips */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategoryFilter(c)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '16px',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  border: '1px solid',
                  backgroundColor: categoryFilter === c ? 'var(--brand-primary)' : 'var(--bg-surface)',
                  color: categoryFilter === c ? '#ffffff' : 'var(--text-secondary)',
                  borderColor: categoryFilter === c ? 'var(--brand-primary)' : 'var(--border-color)',
                }}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Cards Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '20px',
            }}
          >
            {filteredCatalog.map((item) => {
              const existing = configs.find(
                (c) => c.type === item.type && c.provider === item.provider,
              );
              const isConfigured = !!existing;
              const isHealthy = existing?.healthStatus === 'HEALTHY';

              return (
                <div
                  key={`${item.type}-${item.provider}`}
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {item.category} • {item.type}
                      </span>
                      {isConfigured ? (
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            backgroundColor: isHealthy ? '#d1fae5' : existing.isEnabled ? '#fef3c7' : '#f3f4f6',
                            color: isHealthy ? '#065f46' : existing.isEnabled ? '#92400e' : '#4b5563',
                          }}
                        >
                          {existing.isEnabled ? existing.healthStatus : 'DISABLED'}
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: '0.7rem',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            backgroundColor: '#f3f4f6',
                            color: '#6b7280',
                          }}
                        >
                          NOT CONFIGURED
                        </span>
                      )}
                    </div>

                    <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {item.name}
                    </h3>
                    <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {item.description}
                    </p>

                    {existing && (
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                          padding: '8px 12px',
                          backgroundColor: 'var(--bg-app)',
                          borderRadius: '4px',
                          marginBottom: '16px',
                        }}
                      >
                        <div>Environment: <strong>{existing.environment}</strong></div>
                        {existing.lastHealthCheckAt && (
                          <div>Checked: {new Date(existing.lastHealthCheckAt).toLocaleTimeString()}</div>
                        )}
                        {existing.lastErrorMessage && (
                          <div style={{ color: '#b91c1c', marginTop: '4px' }}>
                            Error: {existing.lastErrorMessage}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
                    <button
                      onClick={() => handleOpenConfig(item, existing)}
                      style={{
                        flex: 1,
                        padding: '8px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: isConfigured ? 'var(--bg-surface)' : 'var(--brand-primary)',
                        color: isConfigured ? 'var(--text-primary)' : '#ffffff',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: 500,
                      }}
                    >
                      {isConfigured ? '⚙️ Edit Config' : '➕ Configure'}
                    </button>

                    {isConfigured && (
                      <>
                        <button
                          onClick={() => handleTestConnection(existing.id)}
                          disabled={actionLoading}
                          title="Execute non-destructive connection test"
                          style={{
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-surface)',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                          }}
                        >
                          🧪 Test
                        </button>
                        <button
                          onClick={() => handleToggleEnable(existing)}
                          disabled={actionLoading}
                          title={existing.isEnabled ? 'Disable Integration' : 'Enable Integration'}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-surface)',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            color: existing.isEnabled ? '#b91c1c' : '#059669',
                          }}
                        >
                          {existing.isEnabled ? '⏹ Disable' : '▶ Enable'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: HEALTH & LATENCY MONITOR */}
      {activeTab === 'health' && (
        <div style={{ backgroundColor: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '24px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 16px' }}>Service Telemetry & Ping Latency</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px' }}>Type</th>
                <th style={{ padding: '12px' }}>Provider</th>
                <th style={{ padding: '12px' }}>Status</th>
                <th style={{ padding: '12px' }}>Environment</th>
                <th style={{ padding: '12px' }}>Failures</th>
                <th style={{ padding: '12px' }}>Last Check</th>
                <th style={{ padding: '12px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {configs.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No integrations currently configured.
                  </td>
                </tr>
              ) : (
                configs.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px', fontWeight: 600 }}>{c.type}</td>
                    <td style={{ padding: '12px' }}>{c.provider}</td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor:
                            c.healthStatus === 'HEALTHY'
                              ? '#d1fae5'
                              : c.isEnabled
                              ? '#fef3c7'
                              : '#f3f4f6',
                          color:
                            c.healthStatus === 'HEALTHY'
                              ? '#065f46'
                              : c.isEnabled
                              ? '#92400e'
                              : '#4b5563',
                        }}
                      >
                        {c.isEnabled ? c.healthStatus : 'DISABLED'}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>{c.environment}</td>
                    <td style={{ padding: '12px' }}>{c.failureCount}</td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                      {c.lastHealthCheckAt ? new Date(c.lastHealthCheckAt).toLocaleString() : 'Never'}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <button
                        onClick={() => handleTestConnection(c.id)}
                        disabled={actionLoading}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-surface)',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                        }}
                      >
                        Re-check
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: WEBHOOKS ACTIVITY */}
      {activeTab === 'webhooks' && (
        <div style={{ backgroundColor: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '24px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 8px' }}>Inbound Webhook Ledger</h2>
          <p style={{ margin: '0 0 20px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            External events verified via cryptographic signatures (Stripe, Razorpay, Twilio, WhatsApp). Idempotency enforced.
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px' }}>Provider</th>
                <th style={{ padding: '12px' }}>Event Type</th>
                <th style={{ padding: '12px' }}>Event ID</th>
                <th style={{ padding: '12px' }}>Status</th>
                <th style={{ padding: '12px' }}>Latency</th>
                <th style={{ padding: '12px' }}>Received At</th>
              </tr>
            </thead>
            <tbody>
              {webhookLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No inbound webhooks received yet. External callbacks will appear here in real-time.
                  </td>
                </tr>
              ) : (
                webhookLogs.map((w) => (
                  <tr key={w.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px', fontWeight: 600 }}>{w.provider}</td>
                    <td style={{ padding: '12px' }}><code>{w.eventType}</code></td>
                    <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '0.8rem' }}>{w.eventId || 'N/A'}</td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor:
                            w.status === 'PROCESSED'
                              ? '#d1fae5'
                              : w.status === 'DUPLICATE'
                              ? '#e0e7ff'
                              : '#fee2e2',
                          color:
                            w.status === 'PROCESSED'
                              ? '#065f46'
                              : w.status === 'DUPLICATE'
                              ? '#3730a3'
                              : '#991b1b',
                        }}
                      >
                        {w.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>{w.processingTimeMs ? `${w.processingTimeMs}ms` : '—'}</td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                      {new Date(w.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4: DATA EXCHANGE */}
      {activeTab === 'data-exchange' && (
        <div style={{ backgroundColor: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '24px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 6px' }}>Data Exchange Pipeline</h2>
          <p style={{ margin: '0 0 20px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Safely import and validate student, employee, fee, inventory, and library data with schema verification.
          </p>

          <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', alignItems: 'center' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                Entity Target:
              </label>
              <select
                value={exchangeEntity}
                onChange={(e) => setExchangeEntity(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-surface)',
                  fontSize: '0.9rem',
                }}
              >
                <option value="STUDENTS">Students (Admissions & Census)</option>
                <option value="EMPLOYEES">Employees (Staff & Faculty)</option>
                <option value="FEES">Fee Invoices & Dues</option>
                <option value="INVENTORY">Inventory & Assets</option>
                <option value="BOOKS">Library Books & Accessions</option>
              </select>
            </div>

            <button
              onClick={() => {
                const sampleHeaders: Record<string, string> = {
                  STUDENTS: 'admissionNumber,firstName,lastName,dateOfBirth,gender,gradeLevel,section\nSTU-2026-001,Aiden,Smith,2010-05-12,MALE,Grade 10,A\nSTU-2026-002,Sophia,Johnson,2010-08-22,FEMALE,Grade 10,B',
                  EMPLOYEES: 'employeeNumber,firstName,lastName,email,phone,designation\nEMP-2026-001,Marcus,Vance,marcus@school.edu,+12025550143,Senior Teacher',
                  FEES: 'studentId,invoiceNumber,amount,dueDate\nSTU-001,INV-2026-0001,1200,2026-10-15',
                  INVENTORY: 'itemCode,name,category,quantity\nITM-001,Science Lab Beakers,LAB,50',
                  BOOKS: 'accessionNumber,isbn,title,author\nACC-001,978-0132350884,Clean Code,Robert C. Martin',
                };
                setCsvContent(sampleHeaders[exchangeEntity] || '');
              }}
              style={{
                marginTop: '22px',
                padding: '8px 14px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-surface)',
                cursor: 'pointer',
                fontSize: '0.85rem',
              }}
            >
              📄 Load Starter Sample
            </button>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
              CSV Content Payload:
            </label>
            <textarea
              rows={8}
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
              placeholder="Paste raw CSV content here..."
              style={{
                width: '100%',
                padding: '12px',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-app)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button
              onClick={handleValidateCsv}
              disabled={actionLoading}
              style={{
                padding: '10px 20px',
                borderRadius: '6px',
                backgroundColor: 'var(--brand-primary)',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.875rem',
              }}
            >
              🔍 Validate Schema
            </button>

            {validationResult && validationResult.validRows > 0 && (
              <button
                onClick={handleExecuteImport}
                disabled={actionLoading}
                style={{
                  padding: '10px 20px',
                  borderRadius: '6px',
                  backgroundColor: '#059669',
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                }}
              >
                🚀 Commit Import ({validationResult.validRows} rows)
              </button>
            )}
          </div>

          {validationResult && (
            <div
              style={{
                padding: '16px',
                borderRadius: '6px',
                backgroundColor: validationResult.isValid ? '#ecfdf5' : '#fffbeb',
                border: `1px solid ${validationResult.isValid ? '#a7f3d0' : '#fde68a'}`,
              }}
            >
              <h4 style={{ margin: '0 0 8px', color: validationResult.isValid ? '#065f46' : '#92400e' }}>
                Validation Summary: {validationResult.validRows}/{validationResult.totalRows} valid rows
              </h4>
              {validationResult.errors?.length > 0 && (
                <ul style={{ margin: 0, paddingInlineStart: '20px', color: '#b91c1c', fontSize: '0.85rem' }}>
                  {validationResult.errors.map((e: any, idx: number) => (
                    <li key={idx}>
                      Row {e.row}: {e.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div style={{ backgroundColor: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '24px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 16px' }}>Integration Audit History</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px' }}>Operation</th>
                <th style={{ padding: '12px' }}>Type</th>
                <th style={{ padding: '12px' }}>Provider</th>
                <th style={{ padding: '12px' }}>Status</th>
                <th style={{ padding: '12px' }}>Latency</th>
                <th style={{ padding: '12px' }}>Normalized Error</th>
                <th style={{ padding: '12px' }}>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No integration execution logs recorded yet.
                  </td>
                </tr>
              ) : (
                auditLogs.map((l) => (
                  <tr key={l.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px', fontWeight: 600 }}>{l.operation}</td>
                    <td style={{ padding: '12px' }}>{l.type}</td>
                    <td style={{ padding: '12px' }}>{l.provider}</td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor: l.status === 'SUCCESS' ? '#d1fae5' : '#fee2e2',
                          color: l.status === 'SUCCESS' ? '#065f46' : '#991b1b',
                        }}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>{l.latencyMs}ms</td>
                    <td style={{ padding: '12px', color: '#b91c1c' }}>{l.normalizedError || '—'}</td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                      {new Date(l.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* CONFIGURATION MODAL */}
      {isModalOpen && selectedCatalogItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(2px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderRadius: '8px',
              maxWidth: '560px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>
                  Configure {selectedCatalogItem.name}
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {selectedCatalogItem.category} • {selectedCatalogItem.provider}
                </span>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                  Integration Display Name:
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-app)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                  Environment Mode:
                </label>
                <select
                  value={formEnv}
                  onChange={(e) => setFormEnv(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-app)',
                  }}
                >
                  <option value="SANDBOX">SANDBOX (Test Mode)</option>
                  <option value="PRODUCTION">PRODUCTION (Live Mode)</option>
                </select>
              </div>

              {selectedCatalogItem.parameters.map((param) => (
                <div key={param.key}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                    {param.label} {param.required && <span style={{ color: '#b91c1c' }}>*</span>}
                  </label>
                  <input
                    type={param.secret ? 'password' : param.type === 'number' ? 'number' : 'text'}
                    value={formData[param.key] ?? ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        [param.key]: param.type === 'number' ? Number(e.target.value) : e.target.value,
                      })
                    }
                    placeholder={param.secret ? '••••••••' : param.description}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-app)',
                    }}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{param.description}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-surface)',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveConfig}
                disabled={actionLoading}
                style={{
                  padding: '8px 18px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--brand-primary)',
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {actionLoading ? 'Encrypting & Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
