'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { Drawer } from '@/components/ui/Drawer';
import { KpiSkeleton } from '@/components/feedback/LoadingSkeleton';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export default function DashboardOverviewPage() {
  const { user } = useAuth();
  const [activeRoleView, setActiveRoleView] = useState<string>('principal');
  const [feeSummary, setFeeSummary] = useState<any>(null);
  const [attendanceSummary, setAttendanceSummary] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [analyticsKpis, setAnalyticsKpis] = useState<any>(null);
  const [trends, setTrends] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Drill-down drawer state
  const [drillDownKey, setDrillDownKey] = useState<string | null>(null);
  const [drillDownTitle, setDrillDownTitle] = useState<string>('');
  const [drillDownRecords, setDrillDownRecords] = useState<any[]>([]);
  const [isDrillDownLoading, setIsDrillDownLoading] = useState(false);

  useEffect(() => {
    // Default initial view based on user roles
    if (user?.roles?.includes('TEACHER')) {
      setActiveRoleView('teacher');
    } else if (user?.roles?.includes('ACCOUNTANT')) {
      setActiveRoleView('accountant');
    } else if (user?.roles?.includes('STUDENT') || user?.roles?.includes('PARENT')) {
      setActiveRoleView('student');
    }
  }, [user]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;
      if (!token) return;

      try {
        const [feeRes, attRes, audRes, kpiRes, trendRes] = await Promise.all([
          fetch(`${API_URL}/reports/fee-summary`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/reports/attendance-summary`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/audit?limit=5`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/reports/analytics/dashboard`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/reports/analytics/trends`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        if (feeRes.ok) {
          const json = await feeRes.json();
          setFeeSummary(json.data || json);
        }
        if (attRes.ok) {
          const json = await attRes.json();
          setAttendanceSummary(json.data || json);
        }
        if (audRes.ok) {
          const audData = await audRes.json();
          setAuditLogs(audData.data?.items || audData.data || []);
        }
        if (kpiRes.ok) {
          const json = await kpiRes.json();
          setAnalyticsKpis(json.data || json);
        }
        if (trendRes.ok) {
          const json = await trendRes.json();
          setTrends(json.data || json);
        }
      } catch {
        // Fallback
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const openDrillDown = async (metricKey: string, title: string) => {
    setDrillDownKey(metricKey);
    setDrillDownTitle(title);
    setIsDrillDownLoading(true);
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;

    try {
      const res = await fetch(`${API_URL}/reports/analytics/drill-down?metricKey=${metricKey}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDrillDownRecords(data.records || []);
      }
    } catch {
      setDrillDownRecords([]);
    } finally {
      setIsDrillDownLoading(false);
    }
  };

  const roleTabs = [
    { id: 'principal', label: '👑 Principal / Admin', icon: '🏛️' },
    { id: 'teacher', label: '👩‍🏫 Faculty / Teacher', icon: '📖' },
    { id: 'accountant', label: '💳 Accountant / Bursar', icon: '💰' },
    { id: 'student', label: '🎒 Student & Parent', icon: '👨‍🎓' },
  ];

  return (
    <div>
      {/* Top Banner & Welcome */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Welcome back, {user?.firstName || 'Administrator'}
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Beacon Horizon Academy — Downtown Main Campus • Active Session 2026–2027
          </p>
        </div>

        {/* Role View Switcher */}
        <div style={{ backgroundColor: '#ffffff', padding: 4, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)' }}>
          <Tabs tabs={roleTabs} activeTab={activeRoleView} onChange={setActiveRoleView} />
        </div>
      </div>

      {/* Attention Alerts Banner if any */}
      {analyticsKpis?.attentionItems && analyticsKpis.attentionItems.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
          {analyticsKpis.attentionItems.map((item: any) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: item.severity === 'HIGH' ? '#fef2f2' : '#fffbeb',
                border: `1px solid ${item.severity === 'HIGH' ? '#fecaca' : '#fef3c7'}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>{item.severity === 'HIGH' ? '⚠️' : 'ℹ️'}</span>
                <div>
                  <strong style={{ color: item.severity === 'HIGH' ? '#b91c1c' : '#b45309', fontSize: '15px' }}>
                    {item.title}:
                  </strong>{' '}
                  <span style={{ color: '#334155', fontSize: '14px' }}>{item.message}</span>
                </div>
              </div>
              {item.actionUrl && (
                <Link href={item.actionUrl}>
                  <Button size="sm" variant="outline">Review →</Button>
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      {/* VIEW 1: SUPER ADMIN / PRINCIPAL VIEW */}
      {activeRoleView === 'principal' && (
        <>
          {/* KPI Cards Grid */}
          <div
            className="mobile-grid-1col"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 20,
              marginBottom: 28,
            }}
          >
            {isLoading ? (
              <>
                <KpiSkeleton />
                <KpiSkeleton />
                <KpiSkeleton />
                <KpiSkeleton />
              </>
            ) : (
              <>
                <Card padding="md">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Enrolled Students</span>
                    <span style={{ fontSize: '1.5rem' }}>🎒</span>
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                    {analyticsKpis?.totalStudents || 450}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Badge variant="success" size="sm">{analyticsKpis?.activeStudents || 450} Active</Badge>
                    <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>Current Session</span>
                  </div>
                </Card>

                <Card padding="md">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Attendance Rate</span>
                    <span style={{ fontSize: '1.5rem' }}>📅</span>
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--status-success)', marginBottom: 4 }}>
                    {attendanceSummary?.attendanceRate !== undefined ? `${attendanceSummary.attendanceRate}%` : '98.5%'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Badge variant="info" size="sm">Healthy</Badge>
                    <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>Downtown Campus</span>
                  </div>
                </Card>

                <Card padding="md" style={{ cursor: 'pointer' }} onClick={() => openDrillDown('OUTSTANDING_FEES', 'Overdue Accounts Receivable')}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Fee Collection</span>
                    <span style={{ fontSize: '1.5rem' }}>💳</span>
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--brand-primary)', marginBottom: 4 }}>
                    {feeSummary?.collectionRate !== undefined ? `${feeSummary.collectionRate}%` : '100%'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Badge variant="success" size="sm">On Target</Badge>
                    <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                      Total ${feeSummary?.totalCollected?.toLocaleString() || '1,200'}
                    </span>
                  </div>
                </Card>

                <Card padding="md">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Faculty & Staff</span>
                    <span style={{ fontSize: '1.5rem' }}>👩‍🏫</span>
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                    {analyticsKpis?.totalEmployees || 38}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Badge variant="neutral" size="sm">100% Staffed</Badge>
                    <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>Active Instructors</span>
                  </div>
                </Card>
              </>
            )}
          </div>

          {/* Time-Series Trends Section */}
          {trends && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '28px' }}>
              {/* Trend 1: Fee Collections */}
              <Card title="Monthly Fee Collections" subtitle="6-Month revenue realization trajectory">
                <div style={{ display: 'flex', alignItems: 'flex-end', height: '120px', gap: '12px', paddingTop: '16px' }}>
                  {trends.feeCollectionsTrend.map((pt: any) => (
                    <div key={pt.period} style={{ flex: 1, textAlign: 'center' }}>
                      <div
                        style={{
                          height: `${Math.min(100, Math.max(15, (pt.value / 2000) * 100))}px`,
                          backgroundColor: '#0284c7',
                          borderRadius: '4px 4px 0 0',
                          marginBottom: '6px',
                        }}
                        title={`$${pt.value}`}
                      />
                      <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>{pt.period}</div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Trend 2: Admissions */}
              <Card title="Student Admissions" subtitle="Monthly enrollment intake volume">
                <div style={{ display: 'flex', alignItems: 'flex-end', height: '120px', gap: '12px', paddingTop: '16px' }}>
                  {trends.studentAdmissionsTrend.map((pt: any) => (
                    <div key={pt.period} style={{ flex: 1, textAlign: 'center' }}>
                      <div
                        style={{
                          height: `${Math.min(100, Math.max(15, (pt.value / 20) * 100))}px`,
                          backgroundColor: '#16a34a',
                          borderRadius: '4px 4px 0 0',
                          marginBottom: '6px',
                        }}
                        title={`${pt.value} admissions`}
                      />
                      <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>{pt.period}</div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Trend 3: Attendance Rate */}
              <Card title="Attendance Rate %" subtitle="Cohort punctuality and roll-call benchmark">
                <div style={{ display: 'flex', alignItems: 'flex-end', height: '120px', gap: '12px', paddingTop: '16px' }}>
                  {trends.attendanceTrend.map((pt: any) => (
                    <div key={pt.period} style={{ flex: 1, textAlign: 'center' }}>
                      <div
                        style={{
                          height: `${pt.value}%`,
                          backgroundColor: '#f59e0b',
                          borderRadius: '4px 4px 0 0',
                          marginBottom: '6px',
                        }}
                        title={`${pt.value}%`}
                      />
                      <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>{pt.period}</div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* Quick Actions & Audit Trail Split */}
          <div className="mobile-grid-1col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Quick Action Shortcuts */}
            <Card title="Quick Institutional Actions" subtitle="Fast administrative workflows">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Link href="/portal/students" style={{ textDecoration: 'none' }}>
                  <div style={{ padding: '16px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--surface-canvas)', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.75rem', marginBottom: 6 }}>👤</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>Admit Student</div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: 2 }}>Intake & Registration</div>
                  </div>
                </Link>
                <Link href="/portal/attendance" style={{ textDecoration: 'none' }}>
                  <div style={{ padding: '16px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--surface-canvas)', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.75rem', marginBottom: 6 }}>📅</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>Roll Call</div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: 2 }}>Daily Classroom Roll</div>
                  </div>
                </Link>
                <Link href="/portal/examinations" style={{ textDecoration: 'none' }}>
                  <div style={{ padding: '16px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--surface-canvas)', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.75rem', marginBottom: 6 }}>📝</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>Schedule Exam</div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: 2 }}>Assessments & Tests</div>
                  </div>
                </Link>
                <Link href="/portal/fees" style={{ textDecoration: 'none' }}>
                  <div style={{ padding: '16px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--surface-canvas)', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.75rem', marginBottom: 6 }}>💵</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>Collect Fees</div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: 2 }}>Invoicing & Receipts</div>
                  </div>
                </Link>
              </div>
            </Card>

            {/* Audit Logs */}
            <Card
              title="Recent Security & Mutation Audit Trail"
              subtitle="Immutable log of system modifications"
              actions={
                <Link href="/portal/settings" style={{ fontSize: '0.85rem', color: 'var(--brand-primary)', textDecoration: 'none', fontWeight: 600 }}>
                  View All →
                </Link>
              }
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {auditLogs.length > 0 ? (
                  auditLogs.map((log) => (
                    <div
                      key={log.id}
                      style={{
                        padding: '12px 14px',
                        border: '1px solid var(--border-default)',
                        borderRadius: 'var(--radius-xs)',
                        backgroundColor: 'var(--surface-canvas)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Badge variant={log.action === 'DELETE' ? 'danger' : 'info'} size="sm">
                            {log.action}
                          </Badge>
                          <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{log.module}</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 3 }}>
                          By: {log.user?.firstName ? `${log.user.firstName} ${log.user.lastName}` : 'System'} ({log.user?.email || 'automated'})
                        </div>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    No recent mutation events recorded.
                  </div>
                )}
              </div>
            </Card>
          </div>
        </>
      )}

      {/* VIEW 2: TEACHER / FACULTY VIEW */}
      {activeRoleView === 'teacher' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
          <div>
            <Card title="Today's Classroom Schedule" subtitle="Grade 10 — Section A">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ padding: 14, backgroundColor: 'var(--surface-subtle)', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>Period 1: Mathematics</div>
                    <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: 2 }}>09:00 AM – 10:00 AM • Room 101</div>
                  </div>
                  <Link href="/portal/attendance">
                    <Button variant="primary" size="sm">Mark Attendance</Button>
                  </Link>
                </div>
                <div style={{ padding: 14, backgroundColor: 'var(--surface-subtle)', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>Period 3: Advanced Calculus</div>
                    <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: 2 }}>11:15 AM – 12:15 PM • Room 104</div>
                  </div>
                  <Badge variant="neutral" size="sm">Upcoming</Badge>
                </div>
              </div>
            </Card>
          </div>
          <div>
            <Card title="Grading & Assessments" subtitle="Pending Exam Results">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ padding: 14, border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Mid-Term Mathematics Exam</div>
                  <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: '4px 0 10px' }}>Grade 10 • Max Marks: 100</div>
                  <Link href="/portal/examinations">
                    <Button variant="secondary" size="sm" style={{ width: '100%' }}>Enter Marks</Button>
                  </Link>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* VIEW 3: ACCOUNTANT / BURSAR VIEW */}
      {activeRoleView === 'accountant' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 24 }}>
            <Card padding="md">
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>TOTAL INVOICED</div>
              <div style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--text-primary)', margin: '4px 0' }}>
                ${feeSummary?.totalInvoiced?.toLocaleString() || '1,200.00'}
              </div>
              <Badge variant="info" size="sm">AY 2026–2027</Badge>
            </Card>
            <Card padding="md">
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>TOTAL COLLECTED</div>
              <div style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--status-success)', margin: '4px 0' }}>
                ${feeSummary?.totalCollected?.toLocaleString() || '1,200.00'}
              </div>
              <Badge variant="success" size="sm">{feeSummary?.collectionRate || 100}% Collection</Badge>
            </Card>
            <Card padding="md">
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>OUTSTANDING BALANCE</div>
              <div style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--status-danger)', margin: '4px 0' }}>
                ${feeSummary?.outstandingBalance?.toLocaleString() || '0.00'}
              </div>
              <Badge variant="neutral" size="sm">Current term</Badge>
            </Card>
          </div>

          <Card
            title="Receivables Management"
            subtitle="Recent tuition invoice transactions"
            actions={
              <Link href="/portal/fees">
                <Button variant="primary" size="sm">Open Invoices Ledger</Button>
              </Link>
            }
          >
            <div style={{ padding: '16px', backgroundColor: 'var(--surface-subtle)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
              <p style={{ margin: '0 0 12px', fontSize: '0.925rem', color: 'var(--text-secondary)' }}>
                Fee ledger active. Manage fee structures, issue batch student invoices, and record payments with receipt numbers.
              </p>
              <Link href="/portal/fees">
                <Button variant="secondary" size="sm">Record Fee Payment</Button>
              </Link>
            </div>
          </Card>
        </div>
      )}

      {/* VIEW 4: STUDENT & PARENT VIEW */}
      {activeRoleView === 'student' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <Card title="Academic Profile & Attendance" subtitle="John Doe (Admission # 2026-0001)">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: 12, borderBottom: '1px solid var(--border-default)', fontSize: '0.925rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Class & Section</span>
                <strong>Grade 10 — Section A</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: 12, borderBottom: '1px solid var(--border-default)', fontSize: '0.925rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Overall Attendance</span>
                <Badge variant="success">98.5% (PRESENT)</Badge>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: 12, fontSize: '0.925rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Fee Status</span>
                <Badge variant="success">PAID ($1,200.00)</Badge>
              </div>
            </div>
          </Card>

          <Card title="Latest Examination Report" subtitle="Mid-Term Examination 2026">
            <div style={{ padding: 16, backgroundColor: 'var(--surface-subtle)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <strong style={{ fontSize: '1rem' }}>Mathematics</strong>
                <span style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--brand-primary)' }}>85 / 100</span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Badge variant="success">Grade A</Badge>
                <Badge variant="info">85.0%</Badge>
                <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>Rank: 1st in Section</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Drill-down Drawer */}
      <Drawer
        isOpen={!!drillDownKey}
        onClose={() => setDrillDownKey(null)}
        title={drillDownTitle}
        subtitle="Granular record drill-down"
        size="md"
      >
        <div style={{ padding: '16px' }}>
          {isDrillDownLoading ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#64748b', fontSize: '0.95rem' }}>Loading records...</div>
          ) : drillDownRecords.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#64748b', fontSize: '0.95rem' }}>No records found.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {drillDownRecords.map((r) => (
                <div
                  key={r.id}
                  style={{
                    padding: '14px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    backgroundColor: '#f8fafc',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '15px' }}>{r.title}</div>
                    <div style={{ fontSize: '13px', color: '#475569', marginTop: 2 }}>{r.subtitle}</div>
                  </div>
                  {r.amount !== undefined && (
                    <div style={{ fontWeight: 700, color: '#dc2626', fontSize: '15px' }}>${r.amount}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Drawer>
    </div>
  );
}
