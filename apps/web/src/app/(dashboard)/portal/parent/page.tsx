'use client';

// =============================================================================
// Phase 4N: Parent & Guardian Portal Command Center
// =============================================================================
import React, { useState, useEffect, useCallback } from 'react';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Tabs } from '@/components/ui/Tabs';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/feedback/EmptyState';
import {
  IParentChildSummary,
  IParentChildOverview,
  IParentChildProfile,
  IParentAttendanceSummary,
  IParentTimetable,
  IParentExamResult,
  IParentReportCard,
  IParentFeeSummary,
  IParentTransportInfo,
  IParentHostelInfo,
  IParentNotice,
  IParentProfile,
} from '@school/shared-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export default function ParentPortalPage() {
  const [children, setChildren] = useState<IParentChildSummary[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'danger' | 'warning'; text: string } | null>(null);

  // Child-scoped data states (flushed on child switch)
  const [overview, setOverview] = useState<IParentChildOverview | null>(null);
  const [childProfile, setChildProfile] = useState<IParentChildProfile | null>(null);
  const [attendance, setAttendance] = useState<IParentAttendanceSummary | null>(null);
  const [timetable, setTimetable] = useState<IParentTimetable | null>(null);
  const [results, setResults] = useState<IParentExamResult[]>([]);
  const [reportCards, setReportCards] = useState<IParentReportCard[]>([]);
  const [fees, setFees] = useState<IParentFeeSummary | null>(null);
  const [transport, setTransport] = useState<IParentTransportInfo | null>(null);
  const [hostel, setHostel] = useState<IParentHostelInfo | null>(null);

  // Parent-level data states
  const [notices, setNotices] = useState<IParentNotice[]>([]);
  const [parentProfile, setParentProfile] = useState<IParentProfile | null>(null);
  const [messageSubject, setMessageSubject] = useState('');
  const [messageText, setMessageText] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  const getAuthToken = () =>
    typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;

  // 1. Fetch Authorized Children Roster
  const fetchChildrenRoster = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/parent/children`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: IParentChildSummary[] = await res.json();
        setChildren(data);
        if (data.length > 0 && !selectedChildId) {
          setSelectedChildId(data[0].studentId);
        }
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  }, [selectedChildId]);

  useEffect(() => {
    fetchChildrenRoster();
  }, [fetchChildrenRoster]);

  // 2. Fetch Child-Specific Data with Safe State Flushing
  const fetchChildScopedData = useCallback(async (studentId: string) => {
    if (!studentId) return;
    const token = getAuthToken();
    if (!token) return;

    // IMMEDIATE STATE FLUSH TO PREVENT CROSS-CHILD BLEEDING
    setOverview(null);
    setChildProfile(null);
    setAttendance(null);
    setTimetable(null);
    setResults([]);
    setReportCards([]);
    setFees(null);
    setTransport(null);
    setHostel(null);

    try {
      const [ovRes, profRes, attRes, timeRes, resRes, rcRes, feeRes, trRes, hstRes] =
        await Promise.all([
          fetch(`${API_URL}/parent/children/${studentId}/overview`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/parent/children/${studentId}/profile`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/parent/children/${studentId}/attendance`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/parent/children/${studentId}/timetable`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/parent/children/${studentId}/results`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/parent/children/${studentId}/report-cards`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/parent/children/${studentId}/fees`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/parent/children/${studentId}/transport`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/parent/children/${studentId}/hostel`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

      if (ovRes.ok) setOverview(await ovRes.json());
      if (profRes.ok) setChildProfile(await profRes.json());
      if (attRes.ok) setAttendance(await attRes.json());
      if (timeRes.ok) setTimetable(await timeRes.json());
      if (resRes.ok) setResults(await resRes.json());
      if (rcRes.ok) setReportCards(await rcRes.json());
      if (feeRes.ok) setFees(await feeRes.json());
      if (trRes.ok) setTransport(await trRes.json());
      if (hstRes.ok) setHostel(await hstRes.json());
    } catch {
      // Network error handled gracefully
    }
  }, []);

  // Fetch Parent-Level Data (Notices & Profile)
  const fetchParentLevelData = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;

    try {
      const [noticeRes, profRes] = await Promise.all([
        fetch(`${API_URL}/parent/notices`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/parent/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (noticeRes.ok) setNotices(await noticeRes.json());
      if (profRes.ok) setParentProfile(await profRes.json());
    } catch {}
  }, []);

  useEffect(() => {
    fetchParentLevelData();
  }, [fetchParentLevelData]);

  useEffect(() => {
    if (selectedChildId) {
      fetchChildScopedData(selectedChildId);
    }
  }, [selectedChildId, fetchChildScopedData]);

  // Handle Child Switch with safe transition
  const handleSelectChild = (childId: string) => {
    if (childId === selectedChildId) return;
    setFeedback(null);
    setSelectedChildId(childId);
  };

  const handlePayOnline = (invoiceId: string) => {
    if (fees?.paymentGateway.status === 'NOT_CONFIGURED') {
      setFeedback({
        type: 'warning',
        text: 'ONLINE PAYMENT NOT CONFIGURED: Online card processing is currently not enabled for this school instance. Please settle outstanding invoices directly with the campus accounts cashier.',
      });
      return;
    }

    setFeedback({
      type: 'success',
      text: `Redirecting to payment gateway for invoice ${invoiceId}...`,
    });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChildId || !messageText) return;
    setIsSendingMessage(true);
    setFeedback(null);

    const token = getAuthToken();
    try {
      const res = await fetch(`${API_URL}/parent/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          studentId: selectedChildId,
          subject: messageSubject || 'Parent Inquiry',
          message: messageText,
        }),
      });

      if (res.ok) {
        setFeedback({
          type: 'success',
          text: 'Inquiry transmitted to school staff. You will receive updates in your notifications.',
        });
        setMessageSubject('');
        setMessageText('');
      } else {
        setFeedback({ type: 'danger', text: 'Failed to transmit message.' });
      }
    } catch {
      setFeedback({ type: 'danger', text: 'Network communication failure.' });
    } finally {
      setIsSendingMessage(false);
    }
  };

  const selectedChild = children.find((c) => c.studentId === selectedChildId);

  const tabs = [
    { id: 'overview', label: '🏠 Overview' },
    { id: 'profile', label: '👤 Child Profile' },
    { id: 'attendance', label: '📅 Attendance' },
    { id: 'timetable', label: '🕒 Timetable' },
    { id: 'exams', label: '📝 Exams & Results' },
    { id: 'report-cards', label: '📜 Report Cards', count: reportCards.length },
    { id: 'fees', label: '💳 Fees & Receipts' },
    { id: 'transport', label: '🚌 Transport & Hostel' },
    { id: 'notices', label: '📢 Notices & Messaging', count: notices.length },
    { id: 'parent-settings', label: '⚙️ My Profile' },
  ];

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Portal' }, { label: 'Parent & Guardian Portal' }]} />

      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.625rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Parent & Guardian Portal
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Unified academic progress, attendance records, timetable, and school circulars for your children
          </p>
        </div>
      </div>

      {feedback && (
        <Alert variant={feedback.type} style={{ marginBottom: 16 }}>
          {feedback.text}
        </Alert>
      )}

      {/* =========================================================================
          MULTI-CHILD SELECTOR BAR
         ========================================================================= */}
      <div style={{ marginBottom: 20 }}>
        <Card padding="sm" style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-default)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Select Child:
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {children.length > 0 ? (
                children.map((child) => {
                  const isSelected = child.studentId === selectedChildId;
                  return (
                    <button
                      key={child.studentId}
                      type="button"
                      onClick={() => handleSelectChild(child.studentId)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 14px',
                        borderRadius: 'var(--radius-sm)',
                        border: isSelected ? '2px solid var(--brand-primary)' : '1px solid var(--border-default)',
                        backgroundColor: isSelected ? '#ffffff' : 'transparent',
                        boxShadow: isSelected ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: '50%',
                          backgroundColor: isSelected ? 'var(--brand-primary)' : 'var(--border-default)',
                          color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.875rem',
                        }}
                      >
                        {child.firstName[0]}
                        {child.lastName[0]}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: isSelected ? 'var(--brand-primary)' : 'var(--text-primary)' }}>
                          {child.fullName}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {child.className ? `${child.className} - ${child.sectionName}` : 'Student'} • {child.admissionNumber}
                        </div>
                      </div>
                      {isSelected && (
                        <Badge variant="success" size="sm">
                          Active
                        </Badge>
                      )}
                    </button>
                  );
                })
              ) : (
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  {isLoading ? 'Loading linked children...' : 'No linked children registered to this guardian account.'}
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Portal Navigation Tabs */}
      <div style={{ marginBottom: 20 }}>
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {/* =========================================================================
          TAB 1: CHILD OVERVIEW DASHBOARD
         ========================================================================= */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Attention Items Banner */}
          {overview?.attentionItems && overview.attentionItems.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {overview.attentionItems.map((item, idx) => (
                <Alert
                  key={idx}
                  variant={item.severity === 'URGENT' ? 'danger' : item.severity === 'WARNING' ? 'warning' : 'info'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>{item.title}:</strong> {item.message}
                    </div>
                    {item.actionUrl && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (item.actionUrl?.includes('fees')) setActiveTab('fees');
                          if (item.actionUrl?.includes('exams')) setActiveTab('exams');
                        }}
                      >
                        View Details
                      </Button>
                    )}
                  </div>
                </Alert>
              ))}
            </div>
          )}

          {/* Quick KPI Summary Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 16,
            }}
          >
            <Card padding="md">
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Attendance Rate (Month)
              </div>
              <div style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--brand-primary)', marginTop: 6 }}>
                {overview ? `${overview.attendance.monthPercentage}%` : '—'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                {overview?.attendance.daysPresent} present of {overview?.attendance.totalDays} sessions
              </div>
            </Card>

            <Card padding="md">
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Outstanding Fee Balance
              </div>
              <div
                style={{
                  fontSize: '1.875rem',
                  fontWeight: 700,
                  color: (overview?.fees.balanceOutstanding || 0) > 0 ? '#dc2626' : '#16a34a',
                  marginTop: 6,
                }}
              >
                {overview ? `$${overview.fees.balanceOutstanding.toFixed(2)}` : '—'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                {overview?.fees.hasOverdue ? 'Overdue balance pending' : 'All current fees settled'}
              </div>
            </Card>

            <Card padding="md">
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Latest Published Exam
              </div>
              <div style={{ fontSize: '1.875rem', fontWeight: 700, color: '#2563eb', marginTop: 6 }}>
                {overview?.latestResult ? `${overview.latestResult.percentage}%` : 'N/A'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                {overview?.latestResult ? `${overview.latestResult.examName} (${overview.latestResult.grade || 'Pass'})` : 'No recent exam'}
              </div>
            </Card>

            <Card padding="md">
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Current Campus
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: 8 }}>
                {selectedChild?.campusName || 'Main Campus'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Admission #{selectedChild?.admissionNumber}
              </div>
            </Card>
          </div>

          {/* Today's Schedule & Upcoming Exams Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            {/* Today's Classes */}
            <Card padding="md">
              <h3 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 600 }}>
                Today's Class Schedule
              </h3>
              {overview?.upcomingTimetableToday && overview.upcomingTimetableToday.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {overview.upcomingTimetableToday.map((p, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 10px',
                        borderRadius: 6,
                        backgroundColor: 'var(--bg-subtle)',
                        fontSize: '0.875rem',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600 }}>{p.subjectName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {p.periodName} ({p.startTime} - {p.endTime}) {p.roomName ? `• Room ${p.roomName}` : ''}
                        </div>
                      </div>
                      <Badge variant="default">{p.teacherName || 'Faculty'}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
                  No classes scheduled for today or schedule unpublished.
                </p>
              )}
            </Card>

            {/* Upcoming Exams */}
            <Card padding="md">
              <h3 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 600 }}>
                Upcoming Eligible Exams
              </h3>
              {overview?.upcomingExams && overview.upcomingExams.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {overview.upcomingExams.map((e, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 10px',
                        borderRadius: 6,
                        backgroundColor: 'var(--bg-subtle)',
                        fontSize: '0.875rem',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600 }}>{e.subjectName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {e.examName} • Date: {e.examDate}
                        </div>
                      </div>
                      <Badge variant="warning">Upcoming</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
                  No upcoming examinations scheduled.
                </p>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: CHILD PROFILE
         ========================================================================= */}
      {activeTab === 'profile' && childProfile && (
        <Card padding="md">
          <h3 style={{ margin: '0 0 16px', fontSize: '1.125rem', fontWeight: 600 }}>
            {childProfile.fullName} — Student Profile
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Admission Number</label>
              <div style={{ fontWeight: 600 }}>{childProfile.admissionNumber}</div>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Class & Section</label>
              <div style={{ fontWeight: 600 }}>
                {childProfile.currentClass} - {childProfile.currentSection}
              </div>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Academic Year</label>
              <div style={{ fontWeight: 600 }}>{childProfile.academicYear || '2026–2027'}</div>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Date of Birth</label>
              <div style={{ fontWeight: 600 }}>{childProfile.dateOfBirth}</div>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Blood Group</label>
              <div style={{ fontWeight: 600 }}>{childProfile.bloodGroup || 'Not Specified'}</div>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Emergency Contact</label>
              <div style={{ fontWeight: 600 }}>
                {childProfile.emergencyContactPhone || childProfile.emergencyContact || '—'}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 24, borderTop: '1px solid var(--border-light)', paddingTop: 16 }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '0.9375rem', fontWeight: 600 }}>
              Authorized Guardians
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {childProfile.guardians.map((g) => (
                <div
                  key={g.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    borderRadius: 6,
                    backgroundColor: 'var(--bg-subtle)',
                    fontSize: '0.875rem',
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 600 }}>{g.name}</span>{' '}
                    <span style={{ color: 'var(--text-muted)' }}>({g.relationship})</span>
                    {g.phone && <span style={{ marginLeft: 8, color: 'var(--text-secondary)' }}>• {g.phone}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {g.isPrimary && <Badge variant="info">Primary Guardian</Badge>}
                    {g.canPickup && <Badge variant="success">Pickup Authorized</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* =========================================================================
          TAB 3: ATTENDANCE
         ========================================================================= */}
      {activeTab === 'attendance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {attendance && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: 12,
              }}
            >
              <Card padding="sm">
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Attendance Rate</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--brand-primary)' }}>
                  {attendance.attendancePercentage}%
                </div>
              </Card>
              <Card padding="sm">
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Sessions</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{attendance.totalDays}</div>
              </Card>
              <Card padding="sm">
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Present</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#16a34a' }}>{attendance.presentDays}</div>
              </Card>
              <Card padding="sm">
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Absent</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#dc2626' }}>{attendance.absentDays}</div>
              </Card>
              <Card padding="sm">
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Late Arrival</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#eab308' }}>{attendance.lateDays}</div>
              </Card>
            </div>
          )}

          <Card padding="none">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-default)', textAlign: 'left', background: 'var(--bg-subtle)' }}>
                    <th style={{ padding: '10px 14px' }}>Date</th>
                    <th style={{ padding: '10px 14px' }}>Status</th>
                    <th style={{ padding: '10px 14px' }}>Remarks / Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance?.records && attendance.records.length > 0 ? (
                    attendance.records.map((r) => (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 600 }}>{r.date}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <Badge
                            variant={
                              r.status === 'PRESENT' ? 'success' :
                              r.status === 'ABSENT' ? 'danger' :
                              r.status === 'LATE' ? 'warning' : 'default'
                            }
                          >
                            {r.status}
                          </Badge>
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>
                          {r.remarks || '—'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} style={{ padding: '24px', textAlign: 'center' }}>
                        <EmptyState icon="📅" title="No attendance records" description="No daily records logged for this period." />
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
          TAB 4: TIMETABLE
         ========================================================================= */}
      {activeTab === 'timetable' && (
        <Card padding="none">
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-default)', background: 'var(--bg-subtle)' }}>
            <div style={{ fontWeight: 600 }}>
              {timetable?.className} - {timetable?.sectionName} Weekly Timetable
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Published Schedule ({timetable?.versionName || 'Active Term'})
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-default)', textAlign: 'left' }}>
                  <th style={{ padding: '10px 14px' }}>Day</th>
                  <th style={{ padding: '10px 14px' }}>Period</th>
                  <th style={{ padding: '10px 14px' }}>Time</th>
                  <th style={{ padding: '10px 14px' }}>Subject</th>
                  <th style={{ padding: '10px 14px' }}>Teacher</th>
                  <th style={{ padding: '10px 14px' }}>Room</th>
                </tr>
              </thead>
              <tbody>
                {timetable?.entries && timetable.entries.length > 0 ? (
                  timetable.entries.map((e) => (
                    <tr key={e.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 600 }}>{e.dayOfWeek}</td>
                      <td style={{ padding: '10px 14px' }}>{e.periodName}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>{e.startTime} - {e.endTime}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 600 }}>{e.subjectName}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{e.teacherName || 'Faculty'}</td>
                      <td style={{ padding: '10px 14px' }}>{e.roomName || '—'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ padding: '24px', textAlign: 'center' }}>
                      <EmptyState icon="🕒" title="No published timetable" description="Timetable for this class section has not been published yet." />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* =========================================================================
          TAB 5: EXAMS & RESULTS
         ========================================================================= */}
      {activeTab === 'exams' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card padding="none">
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-default)', background: 'var(--bg-subtle)' }}>
              <div style={{ fontWeight: 600 }}>Published Examination Results</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Official approved subject marks and performance metrics
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-default)', textAlign: 'left' }}>
                    <th style={{ padding: '10px 14px' }}>Exam Session</th>
                    <th style={{ padding: '10px 14px' }}>Subject</th>
                    <th style={{ padding: '10px 14px' }}>Marks Obtained</th>
                    <th style={{ padding: '10px 14px' }}>Percentage</th>
                    <th style={{ padding: '10px 14px' }}>Grade</th>
                    <th style={{ padding: '10px 14px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {results.length > 0 ? (
                    results.map((r) => (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 600 }}>{r.examSessionName}</td>
                        <td style={{ padding: '10px 14px' }}>{r.subjectName}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 600 }}>
                          {r.marksObtained} / {r.maxMarks}
                        </td>
                        <td style={{ padding: '10px 14px' }}>{r.percentage}%</td>
                        <td style={{ padding: '10px 14px', fontWeight: 700 }}>{r.grade || '—'}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <Badge variant={r.isPassed ? 'success' : 'danger'}>
                            {r.isPassed ? 'PASSED' : 'FAILED'}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} style={{ padding: '24px', textAlign: 'center' }}>
                        <EmptyState icon="📝" title="No published results" description="Results will appear here once officially published by the examination office." />
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
          TAB 6: REPORT CARDS
         ========================================================================= */}
      {activeTab === 'report-cards' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {reportCards.length > 0 ? (
            reportCards.map((rc) => (
              <Card key={rc.id} padding="md">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>
                      {rc.examSessionName} — Official Term Report Card
                    </h3>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                      Academic Year: {rc.academicYear} • Issue Date: {rc.issueDate}
                    </div>
                  </div>
                  <Badge variant="success">Published & Verified</Badge>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginTop: 16 }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Overall Grade</label>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--brand-primary)' }}>
                      {rc.grade || 'A'}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Percentage</label>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                      {rc.percentage ? `${rc.percentage}%` : '—'}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Attendance</label>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                      {rc.attendancePercentage ? `${rc.attendancePercentage}%` : '—'}
                    </div>
                  </div>
                  {rc.rank && (
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Class Rank</label>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#16a34a' }}>
                        #{rc.rank}
                      </div>
                    </div>
                  )}
                </div>

                {rc.teacherRemarks && (
                  <div style={{ marginTop: 14, padding: 10, borderRadius: 6, backgroundColor: 'var(--bg-subtle)', fontSize: '0.875rem' }}>
                    <strong>Faculty Remarks:</strong> {rc.teacherRemarks}
                  </div>
                )}
              </Card>
            ))
          ) : (
            <EmptyState icon="📜" title="No report cards published" description="Official term report cards will be listed here upon generation." />
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 7: FEES & RECEIPTS
         ========================================================================= */}
      {activeTab === 'fees' && fees && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Fee Balance Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 16,
            }}
          >
            <Card padding="md">
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Invoiced</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>${fees.totalInvoiced.toFixed(2)}</div>
            </Card>
            <Card padding="md">
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Paid to Date</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#16a34a' }}>${fees.totalPaid.toFixed(2)}</div>
            </Card>
            <Card padding="md">
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Remaining Balance</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: fees.balanceOutstanding > 0 ? '#dc2626' : '#16a34a' }}>
                ${fees.balanceOutstanding.toFixed(2)}
              </div>
            </Card>
          </div>

          {/* Invoices Table */}
          <Card padding="none">
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-default)', background: 'var(--bg-subtle)' }}>
              <div style={{ fontWeight: 600 }}>Tuition & Campus Invoices</div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-default)', textAlign: 'left' }}>
                    <th style={{ padding: '10px 14px' }}>Invoice #</th>
                    <th style={{ padding: '10px 14px' }}>Fee Structure</th>
                    <th style={{ padding: '10px 14px' }}>Due Date</th>
                    <th style={{ padding: '10px 14px' }}>Total Amount</th>
                    <th style={{ padding: '10px 14px' }}>Paid</th>
                    <th style={{ padding: '10px 14px' }}>Balance</th>
                    <th style={{ padding: '10px 14px' }}>Status</th>
                    <th style={{ padding: '10px 14px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {fees.invoices.length > 0 ? (
                    fees.invoices.map((inv) => (
                      <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 600 }}>{inv.invoiceNumber}</td>
                        <td style={{ padding: '10px 14px' }}>{inv.feeStructureName}</td>
                        <td style={{ padding: '10px 14px' }}>{inv.dueDate}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 600 }}>${inv.amount.toFixed(2)}</td>
                        <td style={{ padding: '10px 14px', color: '#16a34a' }}>${inv.paidAmount.toFixed(2)}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 600, color: inv.remainingAmount > 0 ? '#dc2626' : '#16a34a' }}>
                          ${inv.remainingAmount.toFixed(2)}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <Badge variant={inv.status === 'PAID' ? 'success' : inv.status === 'OVERDUE' ? 'danger' : 'warning'}>
                            {inv.status}
                          </Badge>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          {inv.remainingAmount > 0 && (
                            <Button size="sm" variant="primary" onClick={() => handlePayOnline(inv.id)}>
                              Pay Now
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} style={{ padding: '24px', textAlign: 'center' }}>
                        <EmptyState icon="💳" title="No invoices" description="No invoices found for this student." />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Payment Receipts */}
          {fees.receipts.length > 0 && (
            <Card padding="none">
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-default)', background: 'var(--bg-subtle)' }}>
                <div style={{ fontWeight: 600 }}>Payment Receipts</div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-default)', textAlign: 'left' }}>
                      <th style={{ padding: '10px 14px' }}>Receipt #</th>
                      <th style={{ padding: '10px 14px' }}>Invoice #</th>
                      <th style={{ padding: '10px 14px' }}>Payment Date</th>
                      <th style={{ padding: '10px 14px' }}>Amount</th>
                      <th style={{ padding: '10px 14px' }}>Method</th>
                      <th style={{ padding: '10px 14px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fees.receipts.map((rcp) => (
                      <tr key={rcp.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 600 }}>{rcp.receiptNumber}</td>
                        <td style={{ padding: '10px 14px', fontFamily: 'monospace' }}>{rcp.invoiceNumber}</td>
                        <td style={{ padding: '10px 14px' }}>{rcp.paymentDate}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 600, color: '#16a34a' }}>${rcp.amount.toFixed(2)}</td>
                        <td style={{ padding: '10px 14px' }}>{rcp.paymentMethod}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <Badge variant="success">CONFIRMED</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 8: TRANSPORT & HOSTEL
         ========================================================================= */}
      {activeTab === 'transport' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Transport Card */}
          <Card padding="md">
            <h3 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 600 }}>
              School Bus & Transport Service
            </h3>
            {transport?.hasAssignment && transport.assignment ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Assigned Route</label>
                  <div style={{ fontWeight: 600 }}>{transport.assignment.routeName} ({transport.assignment.routeCode})</div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pickup Stop & Time</label>
                  <div style={{ fontWeight: 600 }}>{transport.assignment.stopName || 'Designated Stop'} • {transport.assignment.pickupTime || '07:30 AM'}</div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Assigned Bus & Driver</label>
                  <div style={{ fontWeight: 600 }}>{transport.assignment.vehicleNumber || 'Campus Bus'} ({transport.assignment.driverName || 'Driver'})</div>
                  {transport.assignment.driverPhone && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Phone: {transport.assignment.driverPhone}</div>
                  )}
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
                Student is not currently enrolled in school bus transportation.
              </p>
            )}
          </Card>

          {/* Hostel Card */}
          <Card padding="md">
            <h3 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 600 }}>
              Hostel & Residential Boarding
            </h3>
            {hostel?.hasAllocation && hostel.allocation ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hostel Residence</label>
                  <div style={{ fontWeight: 600 }}>{hostel.allocation.hostelName}</div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Room & Bed</label>
                  <div style={{ fontWeight: 600 }}>Room {hostel.allocation.roomNumber}, Bed {hostel.allocation.bedNumber}</div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Check-in Date</label>
                  <div style={{ fontWeight: 600 }}>{hostel.allocation.checkInDate}</div>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
                Student is a day scholar and not allocated to residential hostels.
              </p>
            )}
          </Card>
        </div>
      )}

      {/* =========================================================================
          TAB 9: NOTICES & MESSAGING
         ========================================================================= */}
      {activeTab === 'notices' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          {/* Targeted Circulars */}
          <Card padding="none">
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-default)', background: 'var(--bg-subtle)' }}>
              <div style={{ fontWeight: 600 }}>Campus Circulars & Notices</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {notices.length > 0 ? (
                notices.map((n) => (
                  <div key={n.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{n.title}</span>
                      <Badge variant={n.priority === 'URGENT' ? 'danger' : 'default'} size="sm">
                        {n.category}
                      </Badge>
                    </div>
                    <p style={{ margin: '6px 0', fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {n.content}
                    </p>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Published: {new Date(n.publishedAt).toLocaleDateString()}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: 24, textAlign: 'center' }}>
                  <EmptyState icon="📢" title="No announcements" description="No active notices targeted to your profile." />
                </div>
              )}
            </div>
          </Card>

          {/* Child-Scoped In-System Messaging */}
          <Card padding="md">
            <h3 style={{ margin: '0 0 6px', fontSize: '1rem', fontWeight: 600 }}>
              Send Inquiry Regarding {selectedChild?.fullName || 'Child'}
            </h3>
            <p style={{ margin: '0 0 14px', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Inquiries are tagged to this child's record and routed directly to the campus coordination office.
            </p>

            <form onSubmit={handleSendMessage} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Input
                label="Subject"
                placeholder="e.g. Question regarding upcoming exam schedule"
                value={messageSubject}
                onChange={(e) => setMessageSubject(e.target.value)}
                required
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Message Content *
                </label>
                <textarea
                  rows={4}
                  required
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type your message clearly here..."
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
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button type="submit" variant="primary" isLoading={isSendingMessage}>
                  Transmit Inquiry
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* =========================================================================
          TAB 10: MY PROFILE & SETTINGS
         ========================================================================= */}
      {activeTab === 'parent-settings' && parentProfile && (
        <Card padding="md" style={{ maxWidth: 640 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1.125rem', fontWeight: 600 }}>
            Guardian Contact & Security Profile
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Full Name</label>
              <div style={{ fontWeight: 600, fontSize: '1rem' }}>{parentProfile.fullName}</div>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Registered Email</label>
              <div style={{ fontWeight: 600 }}>{parentProfile.email}</div>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Phone Number</label>
              <div style={{ fontWeight: 600 }}>{parentProfile.phone || 'Not Provided'}</div>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Occupation</label>
              <div style={{ fontWeight: 600 }}>{parentProfile.occupation || 'Not Specified'}</div>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Registered Address</label>
              <div style={{ fontWeight: 600 }}>{parentProfile.address || 'Not Specified'}</div>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Authorized Linked Children</label>
              <div style={{ fontWeight: 600, color: 'var(--brand-primary)' }}>
                {parentProfile.childrenCount} verified students
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
