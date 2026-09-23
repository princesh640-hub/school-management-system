'use client';

// =============================================================================
// Phase 4M: Institutional Communication & Notification Command Center
// =============================================================================
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
import { EmptyState } from '@/components/feedback/EmptyState';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export default function CommunicationCommandCenterPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  // 1. Overview KPIs
  const [kpis, setKpis] = useState<any>({
    messagesTodayCount: 0,
    queuedCount: 0,
    sentCount: 0,
    deliveredCount: 0,
    failedCount: 0,
    scheduledCount: 0,
    activeAnnouncementsCount: 0,
    unreadInAppCount: 0,
    channelsSummary: [
      { channel: 'IN_APP', count: 0, delivered: 0, failed: 0 },
      { channel: 'EMAIL', count: 0, delivered: 0, failed: 0 },
      { channel: 'SMS', count: 0, delivered: 0, failed: 0 },
      { channel: 'PUSH', count: 0, delivered: 0, failed: 0 },
      { channel: 'WHATSAPP', count: 0, delivered: 0, failed: 0 },
    ],
  });

  // 2. Announcements State
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [announcementSearch, setAnnouncementSearch] = useState('');
  const [announcementStatusFilter, setAnnouncementStatusFilter] = useState('');
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    content: '',
    category: 'GENERAL',
    priority: 'NORMAL',
    audienceType: 'ALL',
    targetRoles: [] as string[],
    targetGrades: [] as string[],
    scheduledFor: '',
    expiresAt: '',
  });

  // 3. Campaigns State
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [campaignSearch, setCampaignSearch] = useState('');
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [campaignForm, setCampaignForm] = useState({
    title: '',
    description: '',
    channels: ['IN_APP'] as string[],
    templateId: '',
    customSubject: '',
    customBody: '',
    audienceType: 'ROLES',
    roles: ['STUDENT', 'PARENT'],
    priority: 'NORMAL',
  });

  // 4. Templates State
  const [templates, setTemplates] = useState<any[]>([]);
  const [templateSearch, setTemplateSearch] = useState('');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewContent, setPreviewContent] = useState<any>(null);
  const [templateForm, setTemplateForm] = useState({
    code: '',
    name: '',
    channel: 'IN_APP',
    language: 'EN',
    subject: '',
    body: '',
  });

  // 5. Audiences State
  const [audiences, setAudiences] = useState<any[]>([]);
  const [showAudienceModal, setShowAudienceModal] = useState(false);
  const [audienceForm, setAudienceForm] = useState({
    code: '',
    name: '',
    description: '',
    audienceType: 'ROLES',
    roles: ['TEACHER'],
  });
  const [previewAudienceCount, setPreviewAudienceCount] = useState<number | null>(null);

  // 6. Deliveries State
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [deliveryFilterStatus, setDeliveryFilterStatus] = useState('');
  const [deliveryFilterChannel, setDeliveryFilterChannel] = useState('');
  const [deliverySearch, setDeliverySearch] = useState('');

  // 7. Provider Health State
  const [providers, setProviders] = useState<any[]>([]);

  // 8. Preferences State
  const [preferences, setPreferences] = useState<any[]>([]);
  const [quietHoursStart, setQuietHoursStart] = useState('22:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState('07:00');
  const [devices, setDevices] = useState<any[]>([]);

  // Fetch helpers
  const getAuthToken = () =>
    typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;

  const fetchDashboard = async () => {
    const token = getAuthToken();
    if (!token) return;
    try {
      const [kpiRes, provRes] = await Promise.all([
        fetch(`${API_URL}/communication/reports/kpis`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/communication/reports/providers`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      if (kpiRes.ok) {
        const data = await kpiRes.json();
        setKpis(data);
      }
      if (provRes.ok) {
        const data = await provRes.json();
        setProviders(data);
      }
    } catch {
      // Fallback in case of mock environment
    }
  };

  const fetchAnnouncements = async () => {
    const token = getAuthToken();
    if (!token) return;
    try {
      const query = new URLSearchParams();
      if (announcementSearch) query.set('search', announcementSearch);
      if (announcementStatusFilter) query.set('status', announcementStatusFilter);
      const res = await fetch(`${API_URL}/communication/announcements?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data || []);
      }
    } catch {}
  };

  const fetchCampaigns = async () => {
    const token = getAuthToken();
    if (!token) return;
    try {
      const query = new URLSearchParams();
      if (campaignSearch) query.set('search', campaignSearch);
      const res = await fetch(`${API_URL}/communication/campaigns?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data || []);
      }
    } catch {}
  };

  const fetchTemplates = async () => {
    const token = getAuthToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/communication/templates`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data || []);
      }
    } catch {}
  };

  const fetchAudiences = async () => {
    const token = getAuthToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/communication/audiences`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAudiences(data || []);
      }
    } catch {}
  };

  const fetchDeliveries = async () => {
    const token = getAuthToken();
    if (!token) return;
    try {
      const query = new URLSearchParams();
      if (deliveryFilterStatus) query.set('status', deliveryFilterStatus);
      if (deliveryFilterChannel) query.set('channel', deliveryFilterChannel);
      if (deliverySearch) query.set('search', deliverySearch);
      const res = await fetch(`${API_URL}/communication/deliveries?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDeliveries(data.items || []);
      }
    } catch {}
  };

  const fetchPreferences = async () => {
    const token = getAuthToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/communication/preferences`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPreferences(data.preferences || []);
        if (data.quietHoursStart) setQuietHoursStart(data.quietHoursStart);
        if (data.quietHoursEnd) setQuietHoursEnd(data.quietHoursEnd);
      }
    } catch {}
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  useEffect(() => {
    if (activeTab === 'announcements') fetchAnnouncements();
    if (activeTab === 'campaigns') {
      fetchCampaigns();
      fetchTemplates();
    }
    if (activeTab === 'templates') fetchTemplates();
    if (activeTab === 'audiences') fetchAudiences();
    if (activeTab === 'deliveries') fetchDeliveries();
    if (activeTab === 'preferences') fetchPreferences();
    if (activeTab === 'providers') fetchDashboard();
  }, [activeTab]);

  // Actions
  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFeedback(null);
    const token = getAuthToken();
    try {
      const res = await fetch(`${API_URL}/communication/announcements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(announcementForm),
      });
      if (res.ok) {
        setFeedback({ type: 'success', text: 'Announcement created successfully!' });
        setShowAnnouncementModal(false);
        fetchAnnouncements();
        fetchDashboard();
      } else {
        const err = await res.json();
        setFeedback({ type: 'danger', text: err.message || 'Failed to create announcement' });
      }
    } catch (e: any) {
      setFeedback({ type: 'danger', text: e.message || 'Network error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublishAnnouncement = async (id: string) => {
    const token = getAuthToken();
    try {
      const res = await fetch(`${API_URL}/communication/announcements/${id}/publish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setFeedback({ type: 'success', text: 'Announcement published & notifications broadcasted!' });
        fetchAnnouncements();
        fetchDashboard();
      }
    } catch {}
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFeedback(null);
    const token = getAuthToken();
    try {
      const res = await fetch(`${API_URL}/communication/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: campaignForm.title,
          description: campaignForm.description,
          channels: campaignForm.channels,
          templateId: campaignForm.templateId || undefined,
          customSubject: campaignForm.customSubject,
          customBody: campaignForm.customBody,
          audienceType: campaignForm.audienceType,
          audienceFilter: { roles: campaignForm.roles },
          priority: campaignForm.priority,
        }),
      });
      if (res.ok) {
        setFeedback({ type: 'success', text: 'Campaign created and queued!' });
        setShowCampaignModal(false);
        fetchCampaigns();
        fetchDashboard();
      } else {
        const err = await res.json();
        setFeedback({ type: 'danger', text: err.message || 'Failed to create campaign' });
      }
    } catch (e: any) {
      setFeedback({ type: 'danger', text: e.message || 'Network error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendCampaign = async (id: string) => {
    const token = getAuthToken();
    try {
      const res = await fetch(`${API_URL}/communication/campaigns/${id}/send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setFeedback({ type: 'success', text: 'Campaign dispatched successfully!' });
        fetchCampaigns();
        fetchDashboard();
      }
    } catch {}
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFeedback(null);
    const token = getAuthToken();
    try {
      const res = await fetch(`${API_URL}/communication/templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(templateForm),
      });
      if (res.ok) {
        setFeedback({ type: 'success', text: 'Template created successfully!' });
        setShowTemplateModal(false);
        fetchTemplates();
      } else {
        const err = await res.json();
        setFeedback({ type: 'danger', text: err.message || 'Failed to create template' });
      }
    } catch (e: any) {
      setFeedback({ type: 'danger', text: e.message || 'Network error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreviewTemplate = async (id: string) => {
    const token = getAuthToken();
    try {
      const res = await fetch(`${API_URL}/communication/templates/${id}/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          student_name: 'Ahmed Ali',
          name: 'Ahmed Ali',
          date: 'September 19, 2026',
          title: 'Campus Notice',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setPreviewContent(data);
        setShowPreviewModal(true);
      }
    } catch {}
  };

  const handleCreateAudience = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const token = getAuthToken();
    try {
      const res = await fetch(`${API_URL}/communication/audiences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          code: audienceForm.code,
          name: audienceForm.name,
          description: audienceForm.description,
          audienceType: audienceForm.audienceType,
          filterCriteria: { roles: audienceForm.roles },
        }),
      });
      if (res.ok) {
        setFeedback({ type: 'success', text: 'Audience segment created successfully!' });
        setShowAudienceModal(false);
        fetchAudiences();
      }
    } catch {} finally {
      setIsLoading(false);
    }
  };

  const handleRetryDelivery = async (id: string) => {
    const token = getAuthToken();
    try {
      const res = await fetch(`${API_URL}/communication/deliveries/${id}/retry`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setFeedback({ type: 'success', text: 'Delivery re-queued for retry!' });
        fetchDeliveries();
        fetchDashboard();
      }
    } catch {}
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getAuthToken();
    try {
      const res = await fetch(`${API_URL}/communication/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          preferences,
          quietHoursStart,
          quietHoursEnd,
        }),
      });
      if (res.ok) {
        setFeedback({ type: 'success', text: 'Communication preferences updated!' });
      }
    } catch {}
  };

  const tabs = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'announcements', label: '📢 Announcements', count: announcements.length },
    { id: 'campaigns', label: '🚀 Campaigns', count: campaigns.length },
    { id: 'templates', label: '📝 Templates', count: templates.length },
    { id: 'audiences', label: '👥 Audiences', count: audiences.length },
    { id: 'deliveries', label: '📨 Delivery Logs', count: deliveries.length },
    { id: 'providers', label: '⚙️ Provider Health' },
    { id: 'preferences', label: '🔕 Preferences' },
  ];

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Portal' }, { label: 'Communication Hub' }]} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.625rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Institutional Communication Ecosystem
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Multi-channel notifications, scheduled campaigns, institutional announcements, and delivery monitoring
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setShowAnnouncementModal(true);
              setFeedback(null);
            }}
          >
            📢 New Announcement
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setShowCampaignModal(true);
              setFeedback(null);
            }}
          >
            🚀 Launch Campaign
          </Button>
        </div>
      </div>

      {feedback && (
        <Alert variant={feedback.type} style={{ marginBottom: 16 }}>
          {feedback.text}
        </Alert>
      )}

      <div style={{ marginBottom: 20 }}>
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {/* =========================================================================
          TAB 1: OVERVIEW & KPIS
         ========================================================================= */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* KPI Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 16,
            }}
          >
            <Card padding="md">
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Messages Today
              </div>
              <div style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--brand-primary)', marginTop: 6 }}>
                {kpis.messagesTodayCount}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Across all channels
              </div>
            </Card>

            <Card padding="md">
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Delivered Successfully
              </div>
              <div style={{ fontSize: '1.875rem', fontWeight: 700, color: '#16a34a', marginTop: 6 }}>
                {kpis.deliveredCount}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Confirmed provider delivery
              </div>
            </Card>

            <Card padding="md">
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Queued / In-Flight
              </div>
              <div style={{ fontSize: '1.875rem', fontWeight: 700, color: '#eab308', marginTop: 6 }}>
                {kpis.queuedCount}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                BullMQ processing queue
              </div>
            </Card>

            <Card padding="md">
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Failed Attempts
              </div>
              <div style={{ fontSize: '1.875rem', fontWeight: 700, color: '#dc2626', marginTop: 6 }}>
                {kpis.failedCount}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Eligible for retry backoff
              </div>
            </Card>

            <Card padding="md">
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Active Announcements
              </div>
              <div style={{ fontSize: '1.875rem', fontWeight: 700, color: '#2563eb', marginTop: 6 }}>
                {kpis.activeAnnouncementsCount}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Live across campuses
              </div>
            </Card>
          </div>

          {/* Channels Activity Table */}
          <Card padding="md">
            <h3 style={{ margin: '0 0 14px', fontSize: '1rem', fontWeight: 600 }}>
              Channel Distribution & Health
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-default)', textAlign: 'left' }}>
                    <th style={{ padding: '8px 12px' }}>Channel</th>
                    <th style={{ padding: '8px 12px' }}>Provider</th>
                    <th style={{ padding: '8px 12px' }}>Total Messages</th>
                    <th style={{ padding: '8px 12px' }}>Delivered</th>
                    <th style={{ padding: '8px 12px' }}>Failed</th>
                    <th style={{ padding: '8px 12px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {kpis.channelsSummary?.map((c: any) => (
                    <tr key={c.channel} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                        <Badge variant="info">{c.channel}</Badge>
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>
                        {c.channel === 'IN_APP' && 'Internal Postgres Engine'}
                        {c.channel === 'EMAIL' && 'SMTP / SES Gateway'}
                        {c.channel === 'SMS' && 'Twilio / Cloud SMS Gateway'}
                        {c.channel === 'PUSH' && 'FCM / APNs Gateway'}
                        {c.channel === 'WHATSAPP' && 'Meta WhatsApp Business'}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>{c.count}</td>
                      <td style={{ padding: '10px 12px', color: '#16a34a' }}>{c.delivered}</td>
                      <td style={{ padding: '10px 12px', color: c.failed > 0 ? '#dc2626' : 'var(--text-muted)' }}>
                        {c.failed}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <Badge variant={c.channel === 'IN_APP' ? 'success' : 'default'}>
                          {c.channel === 'IN_APP' ? 'ONLINE' : 'CONFIGURED'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* =========================================================================
          TAB 2: ANNOUNCEMENTS
         ========================================================================= */}
      {activeTab === 'announcements' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Input
              placeholder="Search announcements..."
              value={announcementSearch}
              onChange={(e) => setAnnouncementSearch(e.target.value)}
              style={{ maxWidth: 280 }}
            />
            <Select
              value={announcementStatusFilter}
              onChange={(e) => setAnnouncementStatusFilter(e.target.value)}
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'DRAFT', label: 'Draft' },
                { value: 'SCHEDULED', label: 'Scheduled' },
                { value: 'PUBLISHED', label: 'Published' },
                { value: 'EXPIRED', label: 'Expired' },
                { value: 'ARCHIVED', label: 'Archived' },
              ]}
              style={{ width: 160 }}
            />
            <Button variant="outline" size="sm" onClick={fetchAnnouncements}>
              Filter
            </Button>
          </div>

          <Card padding="none">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-default)', textAlign: 'left', background: 'var(--bg-subtle)' }}>
                    <th style={{ padding: '10px 14px' }}>Code</th>
                    <th style={{ padding: '10px 14px' }}>Title</th>
                    <th style={{ padding: '10px 14px' }}>Category</th>
                    <th style={{ padding: '10px 14px' }}>Priority</th>
                    <th style={{ padding: '10px 14px' }}>Status</th>
                    <th style={{ padding: '10px 14px' }}>Audience</th>
                    <th style={{ padding: '10px 14px' }}>Views</th>
                    <th style={{ padding: '10px 14px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {announcements.length > 0 ? (
                    announcements.map((a) => (
                      <tr key={a.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 600 }}>{a.code}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 600 }}>{a.title}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <Badge variant="default">{a.category}</Badge>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <Badge variant={a.priority === 'URGENT' ? 'danger' : a.priority === 'HIGH' ? 'warning' : 'default'}>
                            {a.priority}
                          </Badge>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <Badge variant={a.status === 'PUBLISHED' ? 'success' : a.status === 'DRAFT' ? 'default' : 'info'}>
                            {a.status}
                          </Badge>
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>
                          {a.audienceType} {a.targetRoles?.length ? `(${a.targetRoles.join(', ')})` : ''}
                        </td>
                        <td style={{ padding: '10px 14px' }}>{a.viewsCount}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {a.status !== 'PUBLISHED' && (
                              <Button variant="primary" size="sm" onClick={() => handlePublishAnnouncement(a.id)}>
                                Publish
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} style={{ padding: '24px', textAlign: 'center' }}>
                        <EmptyState icon="📢" title="No announcements" description="Create an announcement to post institutional circulars." />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* =========================================================================
          TAB 3: CAMPAIGNS
         ========================================================================= */}
      {activeTab === 'campaigns' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Input
              placeholder="Search campaigns..."
              value={campaignSearch}
              onChange={(e) => setCampaignSearch(e.target.value)}
              style={{ maxWidth: 280 }}
            />
            <Button variant="primary" size="sm" onClick={() => setShowCampaignModal(true)}>
              🚀 Create Campaign
            </Button>
          </div>

          <Card padding="none">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-default)', textAlign: 'left', background: 'var(--bg-subtle)' }}>
                    <th style={{ padding: '10px 14px' }}>Code</th>
                    <th style={{ padding: '10px 14px' }}>Campaign Title</th>
                    <th style={{ padding: '10px 14px' }}>Channels</th>
                    <th style={{ padding: '10px 14px' }}>Audience</th>
                    <th style={{ padding: '10px 14px' }}>Recipients</th>
                    <th style={{ padding: '10px 14px' }}>Delivered</th>
                    <th style={{ padding: '10px 14px' }}>Status</th>
                    <th style={{ padding: '10px 14px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.length > 0 ? (
                    campaigns.map((c) => (
                      <tr key={c.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 600 }}>{c.code}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 600 }}>{c.title}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {c.channels?.map((ch: string) => (
                              <Badge key={ch} variant="info" size="sm">
                                {ch}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td style={{ padding: '10px 14px' }}>{c.audienceType}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 600 }}>{c.totalRecipients}</td>
                        <td style={{ padding: '10px 14px', color: '#16a34a' }}>{c.deliveredCount}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <Badge variant={c.status === 'SENT' ? 'success' : c.status === 'PROCESSING' ? 'warning' : 'default'}>
                            {c.status}
                          </Badge>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          {c.status === 'QUEUED' && (
                            <Button variant="primary" size="sm" onClick={() => handleSendCampaign(c.id)}>
                              Execute Now
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} style={{ padding: '24px', textAlign: 'center' }}>
                        <EmptyState icon="🚀" title="No campaigns" description="Launch a multi-channel campaign to reach students, teachers, or parents." />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* =========================================================================
          TAB 4: TEMPLATES
         ========================================================================= */}
      {activeTab === 'templates' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Input
              placeholder="Search templates..."
              value={templateSearch}
              onChange={(e) => setTemplateSearch(e.target.value)}
              style={{ maxWidth: 280 }}
            />
            <Button variant="primary" size="sm" onClick={() => setShowTemplateModal(true)}>
              📝 New Template
            </Button>
          </div>

          <Card padding="none">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-default)', textAlign: 'left', background: 'var(--bg-subtle)' }}>
                    <th style={{ padding: '10px 14px' }}>Code</th>
                    <th style={{ padding: '10px 14px' }}>Name</th>
                    <th style={{ padding: '10px 14px' }}>Channel</th>
                    <th style={{ padding: '10px 14px' }}>Language</th>
                    <th style={{ padding: '10px 14px' }}>Subject</th>
                    <th style={{ padding: '10px 14px' }}>Version</th>
                    <th style={{ padding: '10px 14px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.length > 0 ? (
                    templates.map((t) => (
                      <tr key={t.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 600 }}>{t.code}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 600 }}>{t.name}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <Badge variant="info">{t.channel}</Badge>
                        </td>
                        <td style={{ padding: '10px 14px' }}>{t.language}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{t.subject || '—'}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <Badge variant="default">v{t.currentVersion}</Badge>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <Button variant="outline" size="sm" onClick={() => handlePreviewTemplate(t.id)}>
                            Preview
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} style={{ padding: '24px', textAlign: 'center' }}>
                        <EmptyState icon="📝" title="No templates" description="Create reusable notification and email templates with {{variables}}." />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* =========================================================================
          TAB 5: AUDIENCES
         ========================================================================= */}
      {activeTab === 'audiences' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Saved Audience Segments</h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Target groups dynamically calculated at delivery time to maintain real-time accuracy.
              </p>
            </div>
            <Button variant="primary" size="sm" onClick={() => setShowAudienceModal(true)}>
              👥 Create Segment
            </Button>
          </div>

          <Card padding="none">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-default)', textAlign: 'left', background: 'var(--bg-subtle)' }}>
                    <th style={{ padding: '10px 14px' }}>Code</th>
                    <th style={{ padding: '10px 14px' }}>Segment Name</th>
                    <th style={{ padding: '10px 14px' }}>Target Type</th>
                    <th style={{ padding: '10px 14px' }}>Description</th>
                    <th style={{ padding: '10px 14px' }}>Dynamic</th>
                  </tr>
                </thead>
                <tbody>
                  {audiences.length > 0 ? (
                    audiences.map((aud) => (
                      <tr key={aud.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 600 }}>{aud.code}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 600 }}>{aud.name}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <Badge variant="info">{aud.audienceType}</Badge>
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{aud.description || '—'}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <Badge variant="success">Auto-Resolved</Badge>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ padding: '24px', textAlign: 'center' }}>
                        <EmptyState icon="👥" title="No audience segments" description="Create segments like 'All Teachers', 'High School Parents', etc." />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* =========================================================================
          TAB 6: DELIVERY LOGS
         ========================================================================= */}
      {activeTab === 'deliveries' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Input
              placeholder="Search recipient / subject / key..."
              value={deliverySearch}
              onChange={(e) => setDeliverySearch(e.target.value)}
              style={{ maxWidth: 280 }}
            />
            <Select
              value={deliveryFilterChannel}
              onChange={(e) => setDeliveryFilterChannel(e.target.value)}
              options={[
                { value: '', label: 'All Channels' },
                { value: 'IN_APP', label: 'In-App' },
                { value: 'EMAIL', label: 'Email' },
                { value: 'SMS', label: 'SMS' },
                { value: 'PUSH', label: 'Push' },
                { value: 'WHATSAPP', label: 'WhatsApp' },
              ]}
              style={{ width: 140 }}
            />
            <Select
              value={deliveryFilterStatus}
              onChange={(e) => setDeliveryFilterStatus(e.target.value)}
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'QUEUED', label: 'Queued' },
                { value: 'SENT', label: 'Sent' },
                { value: 'DELIVERED', label: 'Delivered' },
                { value: 'FAILED', label: 'Failed' },
                { value: 'SKIPPED', label: 'Skipped' },
                { value: 'NOT_CONFIGURED', label: 'Not Configured' },
              ]}
              style={{ width: 160 }}
            />
            <Button variant="outline" size="sm" onClick={fetchDeliveries}>
              Filter
            </Button>
          </div>

          <Card padding="none">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-default)', textAlign: 'left', background: 'var(--bg-subtle)' }}>
                    <th style={{ padding: '10px 14px' }}>Channel</th>
                    <th style={{ padding: '10px 14px' }}>Recipient</th>
                    <th style={{ padding: '10px 14px' }}>Subject / Content</th>
                    <th style={{ padding: '10px 14px' }}>Provider</th>
                    <th style={{ padding: '10px 14px' }}>Status</th>
                    <th style={{ padding: '10px 14px' }}>Attempts</th>
                    <th style={{ padding: '10px 14px' }}>Timestamp</th>
                    <th style={{ padding: '10px 14px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveries.length > 0 ? (
                    deliveries.map((d) => (
                      <tr key={d.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '10px 14px' }}>
                          <Badge variant="info" size="sm">{d.channel}</Badge>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ fontWeight: 600 }}>{d.recipientName || 'User'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{d.recipient}</div>
                        </td>
                        <td style={{ padding: '10px 14px', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {d.subject || d.contentSnippet || '—'}
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{d.provider}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <Badge
                            variant={
                              d.status === 'DELIVERED' ? 'success' :
                              d.status === 'SENT' ? 'info' :
                              d.status === 'FAILED' ? 'danger' :
                              d.status === 'NOT_CONFIGURED' || d.status === 'SKIPPED' ? 'warning' : 'default'
                            }
                          >
                            {d.status}
                          </Badge>
                        </td>
                        <td style={{ padding: '10px 14px' }}>{d.attempts}/{d.maxAttempts}</td>
                        <td style={{ padding: '10px 14px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {new Date(d.createdAt).toLocaleString()}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          {(d.status === 'FAILED' || d.status === 'NOT_CONFIGURED') && (
                            <Button variant="outline" size="sm" onClick={() => handleRetryDelivery(d.id)}>
                              Retry
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} style={{ padding: '24px', textAlign: 'center' }}>
                        <EmptyState icon="📨" title="No deliveries recorded" description="Message dispatches and webhook receipts will appear here in real-time." />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* =========================================================================
          TAB 7: PROVIDER HEALTH
         ========================================================================= */}
      {activeTab === 'providers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Alert variant="info">
            <strong>Provider Integrity Guard:</strong> External channels (Email, SMS, Push, WhatsApp) are abstracted. In environments where external API credentials are not yet provisioned, deliveries are safely logged as <code>NOT_CONFIGURED</code> or <code>SKIPPED</code>. Deliveries are never fabricated or falsely marked delivered.
          </Alert>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {providers.map((p) => (
              <Card key={p.channel} padding="md">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{p.channel}</h3>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                      {p.providerName}
                    </div>
                  </div>
                  <Badge variant={p.status === 'ONLINE' ? 'success' : 'warning'}>
                    {p.status}
                  </Badge>
                </div>
                <p style={{ margin: '0 0 12px', fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {p.description}
                </p>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Configured: <strong>{p.isConfigured ? 'Yes (Live)' : 'No (Stubbed / Safe Fallback)'}</strong>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 8: PREFERENCES & QUIET HOURS
         ========================================================================= */}
      {activeTab === 'preferences' && (
        <div style={{ maxWidth: 640 }}>
          <Card padding="md">
            <h3 style={{ margin: '0 0 4px', fontSize: '1.125rem', fontWeight: 600 }}>
              Personal Communication Preferences
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Configure channel opt-ins and quiet hours. In-App critical security notices will always be delivered.
            </p>

            <form onSubmit={handleSavePreferences} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <h4 style={{ margin: '0 0 10px', fontSize: '0.875rem', fontWeight: 600 }}>
                  Active Notification Channels
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {preferences.map((pref, idx) => (
                    <label key={pref.channel} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem' }}>
                      <input
                        type="checkbox"
                        checked={pref.isEnabled}
                        onChange={(e) => {
                          const updated = [...preferences];
                          updated[idx].isEnabled = e.target.checked;
                          setPreferences(updated);
                        }}
                      />
                      <span style={{ fontWeight: 500 }}>{pref.channel}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        ({pref.category || 'ALL'})
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 16 }}>
                <h4 style={{ margin: '0 0 10px', fontSize: '0.875rem', fontWeight: 600 }}>
                  Quiet Hours (Silenced Channels)
                </h4>
                <div style={{ display: 'flex', gap: 14 }}>
                  <Input
                    label="Start Time"
                    type="time"
                    value={quietHoursStart}
                    onChange={(e) => setQuietHoursStart(e.target.value)}
                  />
                  <Input
                    label="End Time"
                    type="time"
                    value={quietHoursEnd}
                    onChange={(e) => setQuietHoursEnd(e.target.value)}
                  />
                </div>
                <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  During quiet hours, external SMS, WhatsApp, and Push notifications are silenced.
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                <Button type="submit" variant="primary">
                  Save Preferences
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* =========================================================================
          MODALS
         ========================================================================= */}
      {/* 1. Create Announcement Modal */}
      <Modal
        isOpen={showAnnouncementModal}
        onClose={() => setShowAnnouncementModal(false)}
        title="Create Institutional Announcement"
        maxWidth={540}
      >
        <form onSubmit={handleCreateAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input
            label="Announcement Title"
            required
            value={announcementForm.title}
            onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
            placeholder="e.g. Annual Sports Gala 2026"
          />

          <div style={{ display: 'flex', gap: 12 }}>
            <Select
              label="Category"
              value={announcementForm.category}
              onChange={(e) => setAnnouncementForm({ ...announcementForm, category: e.target.value })}
              options={[
                { value: 'GENERAL', label: 'General Notice' },
                { value: 'ACADEMIC', label: 'Academic circular' },
                { value: 'EXAMS', label: 'Examination schedule' },
                { value: 'FEES', label: 'Fee announcement' },
                { value: 'EMERGENCY', label: 'Emergency alert' },
              ]}
            />
            <Select
              label="Priority"
              value={announcementForm.priority}
              onChange={(e) => setAnnouncementForm({ ...announcementForm, priority: e.target.value })}
              options={[
                { value: 'LOW', label: 'Low' },
                { value: 'NORMAL', label: 'Normal' },
                { value: 'HIGH', label: 'High' },
                { value: 'URGENT', label: 'Urgent' },
              ]}
            />
          </div>

          <Select
            label="Audience Scope"
            value={announcementForm.audienceType}
            onChange={(e) => setAnnouncementForm({ ...announcementForm, audienceType: e.target.value })}
            options={[
              { value: 'ALL', label: 'Entire Institution (All Campuses & Roles)' },
              { value: 'ROLES', label: 'Specific Roles Only' },
              { value: 'CLASS_SECTION', label: 'Specific Grade / Class' },
            ]}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Announcement Content *
            </label>
            <textarea
              rows={4}
              required
              value={announcementForm.content}
              onChange={(e) => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
              placeholder="Provide complete circular text and details..."
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-default)',
                fontSize: '0.875rem',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
            <Button type="button" variant="outline" onClick={() => setShowAnnouncementModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isLoading}>
              Save Announcement
            </Button>
          </div>
        </form>
      </Modal>

      {/* 2. Create Campaign Modal */}
      <Modal
        isOpen={showCampaignModal}
        onClose={() => setShowCampaignModal(false)}
        title="Launch Communication Campaign"
        maxWidth={540}
      >
        <form onSubmit={handleCreateCampaign} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input
            label="Campaign Name"
            required
            value={campaignForm.title}
            onChange={(e) => setCampaignForm({ ...campaignForm, title: e.target.value })}
            placeholder="e.g. Midterm Results Notification"
          />

          <div>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Dispatch Channels
            </label>
            <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
              {['IN_APP', 'EMAIL', 'SMS', 'PUSH', 'WHATSAPP'].map((ch) => (
                <label key={ch} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8125rem' }}>
                  <input
                    type="checkbox"
                    checked={campaignForm.channels.includes(ch)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setCampaignForm({ ...campaignForm, channels: [...campaignForm.channels, ch] });
                      } else {
                        setCampaignForm({ ...campaignForm, channels: campaignForm.channels.filter((c) => c !== ch) });
                      }
                    }}
                  />
                  {ch}
                </label>
              ))}
            </div>
          </div>

          <Select
            label="Reusable Template (Optional)"
            value={campaignForm.templateId}
            onChange={(e) => setCampaignForm({ ...campaignForm, templateId: e.target.value })}
            options={[
              { value: '', label: 'None (Use Custom Content Below)' },
              ...templates.map((t) => ({ value: t.id, label: `${t.name} (${t.code})` })),
            ]}
          />

          {!campaignForm.templateId && (
            <>
              <Input
                label="Custom Subject / Heading"
                value={campaignForm.customSubject}
                onChange={(e) => setCampaignForm({ ...campaignForm, customSubject: e.target.value })}
                placeholder="Notice Subject"
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Custom Body (supports {'{{student_name}}'} variables)
                </label>
                <textarea
                  rows={3}
                  value={campaignForm.customBody}
                  onChange={(e) => setCampaignForm({ ...campaignForm, customBody: e.target.value })}
                  placeholder="Dear {{student_name}}, please note that..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-default)',
                    fontSize: '0.875rem',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
            <Button type="button" variant="outline" onClick={() => setShowCampaignModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isLoading}>
              Queue Campaign
            </Button>
          </div>
        </form>
      </Modal>

      {/* 3. Create Template Modal */}
      <Modal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        title="Create Multi-Channel Template"
        maxWidth={540}
      >
        <form onSubmit={handleCreateTemplate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <Input
              label="Template Code"
              required
              value={templateForm.code}
              onChange={(e) => setTemplateForm({ ...templateForm, code: e.target.value.toUpperCase() })}
              placeholder="EXAM_RESULT_ALERT"
            />
            <Input
              label="Friendly Name"
              required
              value={templateForm.name}
              onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
              placeholder="Exam Result Alert"
            />
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <Select
              label="Channel"
              value={templateForm.channel}
              onChange={(e) => setTemplateForm({ ...templateForm, channel: e.target.value })}
              options={[
                { value: 'IN_APP', label: 'In-App' },
                { value: 'EMAIL', label: 'Email' },
                { value: 'SMS', label: 'SMS' },
                { value: 'PUSH', label: 'Push' },
                { value: 'WHATSAPP', label: 'WhatsApp' },
              ]}
            />
            <Select
              label="Language"
              value={templateForm.language}
              onChange={(e) => setTemplateForm({ ...templateForm, language: e.target.value })}
              options={[
                { value: 'EN', label: 'English (EN)' },
                { value: 'UR', label: 'Urdu (UR)' },
                { value: 'AR', label: 'Arabic (AR)' },
              ]}
            />
          </div>

          <Input
            label="Subject (Email / In-App)"
            value={templateForm.subject}
            onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
            placeholder="Important Update for {{student_name}}"
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Template Body Content *
            </label>
            <textarea
              rows={4}
              required
              value={templateForm.body}
              onChange={(e) => setTemplateForm({ ...templateForm, body: e.target.value })}
              placeholder="Dear {{recipient_name}}, your {{title}} is ready on {{date}}."
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-default)',
                fontSize: '0.875rem',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
            <Button type="button" variant="outline" onClick={() => setShowTemplateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isLoading}>
              Save Template
            </Button>
          </div>
        </form>
      </Modal>

      {/* 4. Preview Template Modal */}
      <Modal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        title="Rendered Template Preview"
        maxWidth={480}
      >
        {previewContent && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Template Code</div>
              <div style={{ fontWeight: 600 }}>{previewContent.code} ({previewContent.channel})</div>
            </div>
            {previewContent.renderedSubject && (
              <div style={{ background: 'var(--bg-subtle)', padding: 10, borderRadius: 6 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>Subject</div>
                <div style={{ fontWeight: 600 }}>{previewContent.renderedSubject}</div>
              </div>
            )}
            <div style={{ background: 'var(--bg-subtle)', padding: 12, borderRadius: 6 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>Interpolated Body</div>
              <div style={{ fontSize: '0.875rem', lineHeight: 1.5 }}>{previewContent.renderedBody}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="outline" onClick={() => setShowPreviewModal(false)}>
                Close Preview
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* 5. Create Audience Modal */}
      <Modal
        isOpen={showAudienceModal}
        onClose={() => setShowAudienceModal(false)}
        title="Create Saved Audience Segment"
        maxWidth={480}
      >
        <form onSubmit={handleCreateAudience} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input
            label="Audience Code"
            required
            value={audienceForm.code}
            onChange={(e) => setAudienceForm({ ...audienceForm, code: e.target.value.toUpperCase() })}
            placeholder="AUD_ALL_PARENTS"
          />
          <Input
            label="Segment Name"
            required
            value={audienceForm.name}
            onChange={(e) => setAudienceForm({ ...audienceForm, name: e.target.value })}
            placeholder="All Enrolled Parents"
          />
          <Input
            label="Description"
            value={audienceForm.description}
            onChange={(e) => setAudienceForm({ ...audienceForm, description: e.target.value })}
            placeholder="Active parents of all registered students"
          />
          <Select
            label="Target Scope"
            value={audienceForm.audienceType}
            onChange={(e) => setAudienceForm({ ...audienceForm, audienceType: e.target.value })}
            options={[
              { value: 'ROLES', label: 'Role-Based Targeting' },
              { value: 'CAMPUS', label: 'Campus-Wide' },
              { value: 'CLASS_SECTION', label: 'Class / Section' },
              { value: 'DEPARTMENT', label: 'Staff Department' },
            ]}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
            <Button type="button" variant="outline" onClick={() => setShowAudienceModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isLoading}>
              Save Segment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
