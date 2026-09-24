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
import { DataTable, ColumnDef } from '@/components/data-table/DataTable';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

type ExamTab =
  | 'SESSIONS_SCHEDULES'
  | 'GRADE_SHEET'
  | 'REVIEW_PUBLICATION'
  | 'REPORT_CARDS'
  | 'SCALES_ANALYTICS';

export default function ExaminationsPage() {
  const [activeTab, setActiveTab] = useState<ExamTab>('SESSIONS_SCHEDULES');
  const [isLoading, setIsLoading] = useState(true);

  // Core Data Lists
  const [schedules, setSchedules] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [examTypes, setExamTypes] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [gradeScales, setGradeScales] = useState<any[]>([]);

  // Selection states
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [selectedSchedule, setSelectedSchedule] = useState<any | null>(null);
  const [resultsData, setResultsData] = useState<any | null>(null);
  const [isResultsLoading, setIsResultsLoading] = useState(false);

  // Forms / Modals
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showInvigilatorModal, setShowInvigilatorModal] = useState(false);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [showScaleModal, setShowScaleModal] = useState(false);
  const [showTranscriptModal, setShowTranscriptModal] = useState(false);

  // Schedule Form State
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [examName, setExamName] = useState('Final Term Exam 2026');
  const [examDate, setExamDate] = useState('2026-11-20');
  const [startTime, setStartTime] = useState('09:00 AM');
  const [endTime, setEndTime] = useState('12:00 PM');
  const [maxMarks, setMaxMarks] = useState(100);
  const [passingMarks, setPassingMarks] = useState(40);
  const [formMsg, setFormMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Session Form State
  const [sessionName, setSessionName] = useState('Annual Examination 2026-27');
  const [sessionTypeId, setSessionTypeId] = useState('');
  const [sessionStartDate, setSessionStartDate] = useState('2026-11-15');
  const [sessionEndDate, setSessionEndDate] = useState('2026-11-30');

  // Invigilator Form State
  const [invigilatorTeacherId, setInvigilatorTeacherId] = useState('');
  const [invigilatorRole, setInvigilatorRole] = useState('PRIMARY');

  // Marks Entry Interactive Grid State
  const [marksGrid, setMarksGrid] = useState<
    Array<{
      studentId: string;
      studentName: string;
      admissionNumber: string;
      marksObtained: number;
      isAbsent: boolean;
      isExempt: boolean;
      remarks: string;
      percentage: number;
      grade: string;
    }>
  >([]);

  // Correction Form State
  const [correctionStudent, setCorrectionStudent] = useState<any | null>(null);
  const [requestedMarks, setRequestedMarks] = useState<number>(0);
  const [correctionReason, setCorrectionReason] = useState<string>('');

  // Report Card & Transcript States
  const [reportCardData, setReportCardData] = useState<any | null>(null);
  const [transcriptData, setTranscriptData] = useState<any | null>(null);
  const [reportTeacherRemarks, setReportTeacherRemarks] = useState('Exemplary work demonstrated throughout.');
  const [reportPrincipalRemarks, setReportPrincipalRemarks] = useState('Promoted with high academic distinction.');

  // Analytics & Distribution
  const [analyticsData, setAnalyticsData] = useState<any | null>(null);

  // ---------------------------------------------------------------------------
  // Data Fetching
  // ---------------------------------------------------------------------------

  const fetchInitialData = async () => {
    setIsLoading(true);
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const [schRes, clsRes, yrRes, sessRes, typesRes, roomsRes, scalesRes] = await Promise.all([
        fetch(`${API_URL}/examinations/schedules`, { headers }).catch(() => null),
        fetch(`${API_URL}/academics/classes`, { headers }).catch(() => null),
        fetch(`${API_URL}/academics/years`, { headers }).catch(() => null),
        fetch(`${API_URL}/examinations/sessions`, { headers }).catch(() => null),
        fetch(`${API_URL}/examinations/types`, { headers }).catch(() => null),
        fetch(`${API_URL}/timetable/rooms`, { headers }).catch(() => null),
        fetch(`${API_URL}/examinations/grading/scales`, { headers }).catch(() => null),
      ]);

      if (schRes && schRes.ok) {
        const json = await schRes.json();
        const data = Array.isArray(json) ? json : json.data || [];
        setSchedules(Array.isArray(data) ? data : []);
      }
      if (yrRes && yrRes.ok) {
        const json = await yrRes.json();
        const years = Array.isArray(json) ? json : json.data || [];
        setAcademicYears(Array.isArray(years) ? years : []);
        if (Array.isArray(years) && years.length > 0 && !selectedYear) setSelectedYear(years[0].id);
      }
      if (clsRes && clsRes.ok) {
        const json = await clsRes.json();
        const classes = Array.isArray(json) ? json : json.data || [];
        const allSubs: any[] = [];
        if (Array.isArray(classes)) {
          classes.forEach((c: any) => {
            (c.subjects || []).forEach((s: any) => {
              allSubs.push({ id: s.id, name: `${c.name} — ${s.name}`, classId: c.id });
            });
          });
        }
        setSubjects(allSubs);
        if (allSubs.length > 0 && !selectedSubject) setSelectedSubject(allSubs[0].id);
      }
      if (sessRes && sessRes.ok) {
        const json = await sessRes.json();
        const sList = Array.isArray(json) ? json : json.data || [];
        setSessions(Array.isArray(sList) ? sList : []);
        if (Array.isArray(sList) && sList.length > 0 && !selectedSessionId) setSelectedSessionId(sList[0].id);
      }
      if (typesRes && typesRes.ok) {
        const json = await typesRes.json();
        const tList = Array.isArray(json) ? json : json.data || [];
        setExamTypes(Array.isArray(tList) ? tList : []);
        if (Array.isArray(tList) && tList.length > 0 && !sessionTypeId) setSessionTypeId(tList[0].id);
      }
      if (roomsRes && roomsRes.ok) {
        const json = await roomsRes.json();
        const rList = Array.isArray(json) ? json : json.data || [];
        setRooms(Array.isArray(rList) ? rList : []);
      }
      if (scalesRes && scalesRes.ok) {
        const json = await scalesRes.json();
        const scList = Array.isArray(json) ? json : json.data || [];
        setGradeScales(Array.isArray(scList) ? scList : []);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Fetch results and populate marks grid when schedule is selected
  const loadResults = async (schedule: any) => {
    setSelectedSchedule(schedule);
    setIsResultsLoading(true);
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await fetch(`${API_URL}/examinations/schedules/${schedule.id}/results`, { headers });
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        setResultsData(data);

        // Build interactive marks grid
        const resultsList = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
        const grid = resultsList.map((r: any) => ({
          studentId: r.studentId,
          studentName: r.studentName,
          admissionNumber: r.admissionNumber,
          marksObtained: Number(r.marksObtained ?? 0),
          isAbsent: Boolean(r.isAbsent),
          isExempt: Boolean(r.isExempt),
          remarks: r.remarks || '',
          percentage: r.percentage ?? 0,
          grade: r.grade || '—',
        }));
        setMarksGrid(grid);
      }
    } catch {
      // Fallback
    } finally {
      setIsResultsLoading(false);
    }
  };

  // Fetch Analytics when tab or session changes
  const fetchAnalytics = async (sessionId: string) => {
    if (!sessionId) return;
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;
    try {
      const res = await fetch(`${API_URL}/examinations/analytics/session/${sessionId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        setAnalyticsData(json.data || json);
      }
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    if (activeTab === 'SCALES_ANALYTICS' || activeTab === 'REVIEW_PUBLICATION') {
      if (selectedSessionId) fetchAnalytics(selectedSessionId);
    }
  }, [activeTab, selectedSessionId]);

  // ---------------------------------------------------------------------------
  // Action Handlers
  // ---------------------------------------------------------------------------

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormMsg(null);
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;

    try {
      const res = await fetch(`${API_URL}/examinations/schedules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          academicYearId: selectedYear,
          subjectId: selectedSubject,
          name: examName,
          examDate,
          startTime,
          endTime,
          maxMarks: Number(maxMarks),
          passingMarks: Number(passingMarks),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setFormMsg({ type: 'success', text: 'Exam schedule created successfully!' });
        fetchInitialData();
        setTimeout(() => setShowScheduleModal(false), 1200);
      } else {
        setFormMsg({ type: 'danger', text: data.message || 'Failed to create exam schedule' });
      }
    } catch (err: any) {
      setFormMsg({ type: 'danger', text: err.message || 'Network error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormMsg(null);
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;

    try {
      const res = await fetch(`${API_URL}/examinations/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          academicYearId: selectedYear,
          examTypeId: sessionTypeId,
          name: sessionName,
          startDate: sessionStartDate,
          endDate: sessionEndDate,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setFormMsg({ type: 'success', text: 'Exam session created successfully!' });
        fetchInitialData();
        setTimeout(() => setShowSessionModal(false), 1200);
      } else {
        setFormMsg({ type: 'danger', text: data.message || 'Failed to create exam session' });
      }
    } catch (err: any) {
      setFormMsg({ type: 'danger', text: err.message || 'Network error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateMarksGrid = (index: number, field: string, val: any) => {
    const updated = [...marksGrid];
    const item = { ...updated[index], [field]: val };

    const max = selectedSchedule ? Number(selectedSchedule.maxMarks) : 100;
    if (field === 'marksObtained') {
      const score = Math.max(0, Math.min(max, Number(val) || 0));
      item.marksObtained = score;
      item.percentage = Math.round((score / max) * 1000) / 10;
      if (score >= 90) item.grade = 'A+';
      else if (score >= 80) item.grade = 'A';
      else if (score >= 70) item.grade = 'B';
      else if (score >= 60) item.grade = 'C';
      else if (score >= 50) item.grade = 'D';
      else item.grade = 'F';
    } else if (field === 'isAbsent' && val === true) {
      item.marksObtained = 0;
      item.grade = 'AB';
    } else if (field === 'isExempt' && val === true) {
      item.grade = 'EX';
    }

    updated[index] = item;
    setMarksGrid(updated);
  };

  const handleSaveMarksBatch = async (isSubmit = false) => {
    if (!selectedSchedule) return;
    setIsSubmitting(true);
    setFormMsg(null);
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;

    try {
      const payload = {
        examScheduleId: selectedSchedule.id,
        results: marksGrid.map((m) => ({
          studentId: m.studentId,
          marksObtained: m.marksObtained,
          isAbsent: m.isAbsent,
          isExempt: m.isExempt,
          remarks: m.remarks,
        })),
      };

      const res = await fetch(`${API_URL}/examinations/marks/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        if (isSubmit) {
          await fetch(`${API_URL}/examinations/marks/submit`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ examScheduleId: selectedSchedule.id }),
          });
          setFormMsg({ type: 'success', text: 'Marks successfully entered and submitted for review!' });
        } else {
          setFormMsg({ type: 'success', text: 'Marks draft saved successfully!' });
        }
        loadResults(selectedSchedule);
      } else {
        const err = await res.json();
        setFormMsg({ type: 'danger', text: err.message || 'Failed to save marks' });
      }
    } catch (e: any) {
      setFormMsg({ type: 'danger', text: e.message || 'Network error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCalculateSessionResults = async () => {
    if (!selectedSessionId) return;
    setIsSubmitting(true);
    setFormMsg(null);
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;

    try {
      const res = await fetch(`${API_URL}/examinations/results/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ examSessionId: selectedSessionId }),
      });

      const data = await res.json();
      if (res.ok) {
        setFormMsg({ type: 'success', text: data.message || 'Session results calculated!' });
        fetchAnalytics(selectedSessionId);
      } else {
        setFormMsg({ type: 'danger', text: data.message || 'Calculation failed' });
      }
    } catch (e: any) {
      setFormMsg({ type: 'danger', text: e.message || 'Network error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveSessionResults = async () => {
    if (!selectedSessionId) return;
    setIsSubmitting(true);
    setFormMsg(null);
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;

    try {
      const res = await fetch(`${API_URL}/examinations/results/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ examSessionId: selectedSessionId }),
      });

      const data = await res.json();
      if (res.ok) {
        setFormMsg({ type: 'success', text: data.message || 'Results approved!' });
        fetchInitialData();
      } else {
        setFormMsg({ type: 'danger', text: data.message || 'Approval failed' });
      }
    } catch (e: any) {
      setFormMsg({ type: 'danger', text: e.message || 'Network error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublishResults = async () => {
    if (!selectedSessionId) return;
    setIsSubmitting(true);
    setFormMsg(null);
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;

    try {
      const res = await fetch(`${API_URL}/examinations/results/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ examSessionId: selectedSessionId }),
      });

      const data = await res.json();
      if (res.ok) {
        setFormMsg({ type: 'success', text: 'Examination results published to portals!' });
        fetchInitialData();
      } else {
        setFormMsg({ type: 'danger', text: data.message || 'Publication failed' });
      }
    } catch (e: any) {
      setFormMsg({ type: 'danger', text: e.message || 'Network error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateReportCard = async (studentId: string) => {
    if (!selectedSessionId || !studentId) return;
    setIsSubmitting(true);
    setFormMsg(null);
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;

    try {
      const res = await fetch(`${API_URL}/examinations/report-cards/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          examSessionId: selectedSessionId,
          studentId,
          teacherRemarks: reportTeacherRemarks,
          principalRemarks: reportPrincipalRemarks,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setReportCardData(data);
        setActiveTab('REPORT_CARDS');
      } else {
        setFormMsg({ type: 'danger', text: data.message || 'Failed to generate report card' });
      }
    } catch (e: any) {
      setFormMsg({ type: 'danger', text: e.message || 'Network error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateTranscript = async (studentId: string) => {
    if (!studentId) return;
    setIsSubmitting(true);
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;

    try {
      const res = await fetch(`${API_URL}/examinations/transcripts/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ studentId }),
      });

      if (res.ok) {
        setTranscriptData(await res.json());
        setShowTranscriptModal(true);
      }
    } catch {
      // Fallback
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Table Columns
  // ---------------------------------------------------------------------------

  const scheduleColumns: ColumnDef<any>[] = [
    {
      key: 'name',
      header: 'Exam Title',
      sortable: true,
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.name}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {row.startTime} – {row.endTime} {row.room ? `• Room: ${row.room.name}` : ''}
          </div>
        </div>
      ),
    },
    {
      key: 'subject',
      header: 'Subject & Class',
      sortable: true,
      render: (row) => (
        <span>
          {row.subject?.name} ({row.subject?.class?.name})
        </span>
      ),
    },
    {
      key: 'examDate',
      header: 'Date',
      sortable: true,
      render: (row) => <span>{new Date(row.examDate).toLocaleDateString()}</span>,
    },
    {
      key: 'marks',
      header: 'Max / Pass',
      align: 'center',
      render: (row) => (
        <span style={{ fontWeight: 600 }}>
          {row.maxMarks} / <span style={{ color: 'var(--text-muted)' }}>{row.passingMarks}</span>
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
          <Button
            variant={selectedSchedule?.id === row.id ? 'primary' : 'outline'}
            size="sm"
            onClick={() => {
              loadResults(row);
              setActiveTab('GRADE_SHEET');
            }}
          >
            Enter Marks ({row._count?.examResults || 0})
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedSchedule(row);
              setShowInvigilatorModal(true);
            }}
          >
            Invigilation
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Examinations & Assessments' }]} />

      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Examinations, Grading & Assessment Hub
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Enterprise academic evaluations, marks validation, dynamic grading, and print-ready report cards
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Button
            variant="outline"
            leftIcon="📋"
            onClick={() => {
              setShowSessionModal(true);
              setFormMsg(null);
            }}
          >
            New Exam Session
          </Button>
          <Button
            variant="primary"
            leftIcon="➕"
            onClick={() => {
              setShowScheduleModal(true);
              setFormMsg(null);
            }}
          >
            Schedule Examination
          </Button>
        </div>
      </div>

      {formMsg && (
        <Alert variant={formMsg.type} style={{ marginBottom: 16 }}>
          {formMsg.text}
        </Alert>
      )}

      {/* Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          borderBottom: '1px solid var(--border-default)',
          marginBottom: 20,
          overflowX: 'auto',
        }}
      >
        {[
          { key: 'SESSIONS_SCHEDULES', label: 'Sessions & Schedules', icon: '📅' },
          { key: 'GRADE_SHEET', label: 'Grade Sheet & Marks Entry', icon: '📝' },
          { key: 'REVIEW_PUBLICATION', label: 'Review & Publication', icon: '🔒' },
          { key: 'REPORT_CARDS', label: 'Report Cards & Transcripts', icon: '🎓' },
          { key: 'SCALES_ANALYTICS', label: 'Grading Scales & Analytics', icon: '📊' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as ExamTab)}
            style={{
              padding: '10px 16px',
              border: 'none',
              background: 'transparent',
              borderBottom: activeTab === tab.key ? '2px solid var(--brand-primary)' : '2px solid transparent',
              color: activeTab === tab.key ? 'var(--brand-primary)' : 'var(--text-secondary)',
              fontWeight: activeTab === tab.key ? 600 : 400,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: '0.875rem',
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: SESSIONS & SCHEDULES */}
      {/* ===================================================================== */}
      {activeTab === 'SESSIONS_SCHEDULES' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
          {/* Active Sessions Strip */}
          <Card title="Institutional Exam Sessions" subtitle="Select active session to filter examinations">
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
              {Array.isArray(sessions) && sessions.length > 0 ? (
                sessions.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => {
                      setSelectedSessionId(s.id);
                      fetchAnalytics(s.id);
                    }}
                    style={{
                      padding: '12px 16px',
                      borderRadius: 8,
                      border: selectedSessionId === s.id ? '2px solid var(--brand-primary)' : '1px solid var(--border-default)',
                      background: selectedSessionId === s.id ? 'var(--brand-primary-light, #eef2ff)' : 'var(--surface-subtle)',
                      cursor: 'pointer',
                      minWidth: 220,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{s.name}</span>
                      <Badge
                        variant={
                          s.status === 'PUBLISHED'
                            ? 'success'
                            : s.status === 'APPROVED' || s.status === 'LOCKED'
                            ? 'primary'
                            : 'neutral'
                        }
                        size="sm"
                      >
                        {s.status}
                      </Badge>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(s.startDate).toLocaleDateString()} – {new Date(s.endDate).toLocaleDateString()}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                      {s.academicYear?.name} • {s._count?.schedules || 0} Exams
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  No examination sessions registered. Click "New Exam Session" to begin.
                </div>
              )}
            </div>
          </Card>

          {/* Exam Schedules Table */}
          <Card title="Scheduled Examinations" subtitle="Assessments, subject offerings, and invigilator assignments">
            <DataTable
              columns={scheduleColumns}
              data={schedules}
              isLoading={isLoading}
              searchPlaceholder="Search exams by title, subject, or class..."
            />
          </Card>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: GRADE SHEET & MARKS ENTRY */}
      {/* ===================================================================== */}
      {activeTab === 'GRADE_SHEET' && (
        <div>
          {selectedSchedule ? (
            <Card
              title={`${selectedSchedule.name} — Marks Recording Grid`}
              subtitle={`Subject: ${selectedSchedule.subject?.name} • Max Marks: ${selectedSchedule.maxMarks} • Passing Marks: ${selectedSchedule.passingMarks}`}
              actions={
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button variant="outline" size="sm" onClick={() => handleSaveMarksBatch(false)} isLoading={isSubmitting}>
                    Save Draft
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => handleSaveMarksBatch(true)} isLoading={isSubmitting}>
                    Submit for Review
                  </Button>
                </div>
              }
            >
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--surface-subtle)', borderBottom: '1px solid var(--border-default)' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'start' }}>Student</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>Marks Obtained</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>%</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>Grade</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>Status Flags</th>
                      <th style={{ padding: '8px 12px', textAlign: 'start' }}>Remarks</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marksGrid.length > 0 ? (
                      marksGrid.map((row, idx) => (
                        <tr key={row.studentId} style={{ borderBottom: '1px solid var(--border-default)' }}>
                          <td style={{ padding: '8px 12px' }}>
                            <div style={{ fontWeight: 600 }}>{row.studentName}</div>
                            <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>{row.admissionNumber}</div>
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', width: 130 }}>
                            <input
                              type="number"
                              min="0"
                              max={selectedSchedule.maxMarks}
                              value={row.marksObtained}
                              disabled={row.isAbsent}
                              onChange={(e) => handleUpdateMarksGrid(idx, 'marksObtained', e.target.value)}
                              style={{
                                width: '80px',
                                padding: '4px 8px',
                                textAlign: 'center',
                                borderRadius: 4,
                                border: '1px solid var(--border-default)',
                                fontWeight: 600,
                              }}
                            />
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            {row.percentage}%
                          </td>
                          <td
                            style={{
                              padding: '8px 12px',
                              textAlign: 'center',
                              fontWeight: 700,
                              color: row.grade === 'F' || row.grade === 'AB' ? '#ef4444' : 'var(--brand-primary)',
                            }}
                          >
                            {row.grade}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                              <button
                                type="button"
                                onClick={() => handleUpdateMarksGrid(idx, 'isAbsent', !row.isAbsent)}
                                style={{
                                  padding: '2px 6px',
                                  fontSize: '0.725rem',
                                  borderRadius: 4,
                                  border: '1px solid var(--border-default)',
                                  background: row.isAbsent ? '#fee2e2' : '#ffffff',
                                  color: row.isAbsent ? '#b91c1c' : 'inherit',
                                  cursor: 'pointer',
                                }}
                              >
                                AB
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateMarksGrid(idx, 'isExempt', !row.isExempt)}
                                style={{
                                  padding: '2px 6px',
                                  fontSize: '0.725rem',
                                  borderRadius: 4,
                                  border: '1px solid var(--border-default)',
                                  background: row.isExempt ? '#e0e7ff' : '#ffffff',
                                  color: row.isExempt ? '#3730a3' : 'inherit',
                                  cursor: 'pointer',
                                }}
                              >
                                EX
                              </button>
                            </div>
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            <input
                              type="text"
                              value={row.remarks}
                              placeholder="Notes..."
                              onChange={(e) => handleUpdateMarksGrid(idx, 'remarks', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '4px 8px',
                                borderRadius: 4,
                                border: '1px solid var(--border-default)',
                                fontSize: '0.8rem',
                              }}
                            />
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setCorrectionStudent(row);
                                  setRequestedMarks(row.marksObtained);
                                  setShowCorrectionModal(true);
                                }}
                              >
                                Correct
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleGenerateReportCard(row.studentId)}
                              >
                                Report
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          {isResultsLoading ? 'Loading marks sheet...' : 'No marks or enrolled students loaded.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <Card title="Marks Recording" subtitle="Select an examination from the list below to begin entering marks">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {Array.isArray(schedules) && schedules.length > 0 ? (
                  schedules.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => loadResults(s)}
                      style={{
                        padding: '12px 16px',
                        borderRadius: 8,
                        border: '1px solid var(--border-default)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600 }}>{s.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {s.subject?.name} • {new Date(s.examDate).toLocaleDateString()} • {s.startTime} – {s.endTime}
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Open Grade Sheet
                    </Button>
                  </div>
                ))
              ) : (
                <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  No examination schedules recorded.
                </div>
              )}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: REVIEW & PUBLICATION */}
      {/* ===================================================================== */}
      {activeTab === 'REVIEW_PUBLICATION' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <Card
            title="Administrative Session Review Gates"
            subtitle="Consolidate student marks across subjects, compute rankings, approve and publish results"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div
                style={{
                  padding: 14,
                  borderRadius: 8,
                  background: 'var(--surface-subtle)',
                  border: '1px solid var(--border-default)',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 4 }}>1. Compute Overall Session Results & Ranking</div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 10px' }}>
                  Aggregates all subject exam scores, checks passing criteria, computes GPA and assign rankings.
                </p>
                <Button variant="primary" size="sm" onClick={handleCalculateSessionResults} isLoading={isSubmitting}>
                  Run Calculation Engine
                </Button>
              </div>

              <div
                style={{
                  padding: 14,
                  borderRadius: 8,
                  background: 'var(--surface-subtle)',
                  border: '1px solid var(--border-default)',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 4 }}>2. Academic Approval Gate</div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 10px' }}>
                  Signs off on consolidated scores and sets individual exam result statuses to APPROVED.
                </p>
                <Button variant="outline" size="sm" onClick={handleApproveSessionResults} isLoading={isSubmitting}>
                  Approve Consolidated Results
                </Button>
              </div>

              <div
                style={{
                  padding: 14,
                  borderRadius: 8,
                  background: 'var(--surface-subtle)',
                  border: '1px solid var(--border-default)',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 4 }}>3. Publication to Student & Parent Portals</div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 10px' }}>
                  Makes official report cards and grades viewable to parents and learners. Notifies stakeholders.
                </p>
                <Button variant="primary" size="sm" onClick={handlePublishResults} isLoading={isSubmitting}>
                  Publish Session Results Live
                </Button>
              </div>
            </div>
          </Card>

          <Card title="Session Performance Summary" subtitle="Evaluated metrics and distribution for active session">
            {analyticsData ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div style={{ padding: 12, background: 'var(--surface-subtle)', borderRadius: 6 }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Evaluated Students</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{analyticsData.totalStudents}</div>
                  </div>
                  <div style={{ padding: 12, background: 'var(--surface-subtle)', borderRadius: 6 }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pass Percentage</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#16a34a' }}>
                      {analyticsData.passPercentage}%
                    </div>
                  </div>
                  <div style={{ padding: 12, background: 'var(--surface-subtle)', borderRadius: 6 }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Average Score</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{analyticsData.averageScore}</div>
                  </div>
                  <div style={{ padding: 12, background: 'var(--surface-subtle)', borderRadius: 6 }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Highest / Lowest</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                      {analyticsData.highestScore} / {analyticsData.lowestScore}
                    </div>
                  </div>
                </div>

                <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 8 }}>Grade Distribution:</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {analyticsData.gradeDistribution?.map((gd: any) => (
                    <div key={gd.grade} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem' }}>
                      <span style={{ width: 30, fontWeight: 700 }}>{gd.grade}</span>
                      <div
                        style={{
                          flex: 1,
                          height: 14,
                          background: 'var(--surface-subtle)',
                          borderRadius: 4,
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${gd.percentage}%`,
                            height: '100%',
                            background: 'var(--brand-primary)',
                          }}
                        />
                      </div>
                      <span style={{ width: 60, textAlign: 'end', color: 'var(--text-muted)' }}>
                        {gd.count} ({gd.percentage}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
                No computed session analytics. Click "Run Calculation Engine" to generate analytics.
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: REPORT CARDS & TRANSCRIPTS */}
      {/* ===================================================================== */}
      {activeTab === 'REPORT_CARDS' && (
        <div>
          {reportCardData ? (
            <Card
              title="Official Student Report Card Preview"
              subtitle={`Issued by: ${reportCardData.institution.name} • Issue Date: ${new Date(reportCardData.issueDate).toLocaleDateString()}`}
              actions={
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button variant="outline" size="sm" onClick={() => window.print()}>
                    Print Report Card
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleGenerateTranscript(reportCardData.student.id)}
                  >
                    View Multi-Year Transcript
                  </Button>
                </div>
              }
            >
              {/* Report Card Sheet Container */}
              <div
                style={{
                  border: '2px solid var(--border-default)',
                  borderRadius: 8,
                  padding: 24,
                  background: '#ffffff',
                }}
              >
                {/* Header */}
                <div style={{ textAlign: 'center', borderBottom: '2px solid var(--border-default)', paddingBottom: 16, marginBottom: 16 }}>
                  <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--brand-primary)' }}>
                    {reportCardData.institution.name}
                  </h2>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {reportCardData.session.name} • Academic Year {reportCardData.session.academicYear}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', marginTop: 4 }}>
                    STUDENT PROGRESS & ACADEMIC EVALUATION REPORT
                  </div>
                </div>

                {/* Demographic & Attendance Summary */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20, fontSize: '0.875rem' }}>
                  <div>
                    <div><strong>Student Name:</strong> {reportCardData.student.fullName}</div>
                    <div><strong>Admission No:</strong> {reportCardData.student.admissionNumber}</div>
                    <div><strong>Class & Section:</strong> {reportCardData.student.className} - {reportCardData.student.sectionName}</div>
                  </div>
                  <div style={{ background: 'var(--surface-subtle)', padding: 10, borderRadius: 6 }}>
                    <div><strong>Attendance Performance:</strong> {reportCardData.attendance.attendancePercentage}%</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Days Present: {reportCardData.attendance.daysPresent} • Days Absent: {reportCardData.attendance.daysAbsent}
                    </div>
                    <div style={{ marginTop: 4 }}>
                      <strong>Overall Result:</strong>{' '}
                      <Badge variant={reportCardData.summary.resultStatus === 'PASS' ? 'success' : 'danger'}>
                        {reportCardData.summary.resultStatus}
                      </Badge>
                      {reportCardData.summary.rank && ` • Rank: #${reportCardData.summary.rank}`}
                    </div>
                  </div>
                </div>

                {/* Subject Scores Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginBottom: 20 }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-subtle)', borderBottom: '2px solid var(--border-default)' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'start' }}>Subject Offering</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>Max Marks</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>Marks Obtained</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>%</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>Grade</th>
                      <th style={{ padding: '8px 12px', textAlign: 'start' }}>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportCardData.subjects.map((s: any) => (
                      <tr key={s.subjectId} style={{ borderBottom: '1px solid var(--border-default)' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 600 }}>{s.subjectName}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>{s.maxMarks}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600 }}>{s.marksObtained}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>{s.percentage}%</td>
                        <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: 'var(--brand-primary)' }}>
                          {s.grade}
                        </td>
                        <td style={{ padding: '8px 12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {s.remarks || 'Satisfactory'}
                        </td>
                      </tr>
                    ))}
                    <tr style={{ fontWeight: 700, background: 'var(--surface-subtle)' }}>
                      <td style={{ padding: '8px 12px' }}>Total Summary</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>{reportCardData.summary.totalMaxMarks}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>{reportCardData.summary.totalMarksObtained}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>{reportCardData.summary.percentage}%</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--brand-primary)' }}>
                        {reportCardData.summary.grade}
                      </td>
                      <td style={{ padding: '8px 12px' }}>GPA: {reportCardData.summary.gpa || 'N/A'}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Faculty Remarks */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
                  <div style={{ border: '1px solid var(--border-default)', padding: 12, borderRadius: 6 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: 4 }}>Class Teacher Remarks:</div>
                    <div style={{ fontSize: '0.85rem', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                      "{reportCardData.remarks.teacher}"
                    </div>
                  </div>
                  <div style={{ border: '1px solid var(--border-default)', padding: 12, borderRadius: 6 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: 4 }}>Principal / Head of School:</div>
                    <div style={{ fontSize: '0.85rem', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                      "{reportCardData.remarks.principal}"
                    </div>
                  </div>
                </div>

                {/* Signatures */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 40, paddingTop: 16, borderTop: '1px dashed var(--border-default)', fontSize: '0.8rem' }}>
                  <div>Teacher Signature: __________________</div>
                  <div>Principal Signature: __________________</div>
                  <div>Official School Seal: [ SEAL ]</div>
                </div>
              </div>
            </Card>
          ) : (
            <Card title="Student Report Card Assembly" subtitle="Select a student from a grade sheet or directory to generate official report card">
              <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                Please navigate to the <strong>Grade Sheet & Marks Entry</strong> tab and click <strong>Report</strong> next to any student to generate their print-ready evaluation.
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 5: SCALES & ANALYTICS */}
      {/* ===================================================================== */}
      {activeTab === 'SCALES_ANALYTICS' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <Card
            title="Institutional Grade Scales"
            subtitle="Configurable grade boundary rules and GPA scales"
            actions={
              <Button variant="outline" size="sm" onClick={() => setShowScaleModal(true)}>
                Add Scale
              </Button>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {Array.isArray(gradeScales) && gradeScales.length > 0 ? (
                gradeScales.map((scale) => (
                <div
                  key={scale.id}
                  style={{
                    padding: 12,
                    border: '1px solid var(--border-default)',
                    borderRadius: 6,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontWeight: 600 }}>{scale.name} ({scale.code})</span>
                    {scale.isDefault && <Badge variant="success" size="sm">Default</Badge>}
                  </div>
                  <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--surface-subtle)' }}>
                        <th style={{ padding: '4px 6px', textAlign: 'start' }}>Grade</th>
                        <th style={{ padding: '4px 6px', textAlign: 'center' }}>Range</th>
                        <th style={{ padding: '4px 6px', textAlign: 'center' }}>GPA Point</th>
                        <th style={{ padding: '4px 6px', textAlign: 'center' }}>Pass/Fail</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(scale.rules || []).map((r: any) => (
                        <tr key={r.id} style={{ borderBottom: '1px solid var(--border-default)' }}>
                          <td style={{ padding: '4px 6px', fontWeight: 600 }}>{r.grade}</td>
                          <td style={{ padding: '4px 6px', textAlign: 'center' }}>{r.minPercentage}% – {r.maxPercentage}%</td>
                          <td style={{ padding: '4px 6px', textAlign: 'center' }}>{r.gradePoint}</td>
                          <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                            <Badge variant={r.isPass ? 'success' : 'danger'} size="sm">
                              {r.isPass ? 'PASS' : 'FAIL'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))
              ) : (
                <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  No grading scales registered.
                </div>
              )}
            </div>
          </Card>

          <Card title="Assessment Analytics & Histogram" subtitle="Class-wide distributions and pass rates">
            {analyticsData ? (
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 8 }}>
                  Section: {analyticsData.className || 'General'} {analyticsData.sectionName || ''}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
                  <div style={{ padding: 10, background: 'var(--surface-subtle)', borderRadius: 6 }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Evaluated</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{analyticsData.totalStudents}</div>
                  </div>
                  <div style={{ padding: 10, background: 'var(--surface-subtle)', borderRadius: 6 }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Pass %</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#16a34a' }}>{analyticsData.passPercentage}%</div>
                  </div>
                  <div style={{ padding: 10, background: 'var(--surface-subtle)', borderRadius: 6 }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Average</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{analyticsData.averageScore}</div>
                  </div>
                </div>

                <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 8 }}>Grade Histogram:</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {analyticsData.gradeDistribution?.map((gd: any) => (
                    <div key={gd.grade}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 2 }}>
                        <span>Grade {gd.grade}</span>
                        <span>{gd.count} students ({gd.percentage}%)</span>
                      </div>
                      <div style={{ height: 8, background: 'var(--surface-subtle)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: `${gd.percentage}%`, height: '100%', background: 'var(--brand-primary)' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                Select an active exam session to view distribution analytics.
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODALS */}
      {/* ===================================================================== */}

      {/* Schedule Modal */}
      <Modal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        title="Schedule New Examination"
        maxWidth={520}
      >
        <form onSubmit={handleCreateSchedule} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input
            label="Examination Title"
            required
            value={examName}
            onChange={(e) => setExamName(e.target.value)}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Select
              label="Academic Year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              options={(Array.isArray(academicYears) ? academicYears : []).map((y) => ({ value: y.id, label: y.name }))}
            />
            <Select
              label="Course / Class Subject"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              options={(Array.isArray(subjects) ? subjects : []).map((s) => ({ value: s.id, label: s.name }))}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <Input
              label="Exam Date"
              type="date"
              required
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
            />
            <Input
              label="Start Time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
            <Input
              label="End Time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input
              label="Maximum Marks"
              type="number"
              required
              value={maxMarks}
              onChange={(e) => setMaxMarks(Number(e.target.value))}
            />
            <Input
              label="Passing Marks"
              type="number"
              required
              value={passingMarks}
              onChange={(e) => setPassingMarks(Number(e.target.value))}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
            <Button type="button" variant="outline" onClick={() => setShowScheduleModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Publish Schedule
            </Button>
          </div>
        </form>
      </Modal>

      {/* Session Modal */}
      <Modal
        isOpen={showSessionModal}
        onClose={() => setShowSessionModal(false)}
        title="Create Examination Session"
        maxWidth={480}
      >
        <form onSubmit={handleCreateSession} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input
            label="Session Name"
            required
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Select
              label="Exam Type"
              value={sessionTypeId}
              onChange={(e) => setSessionTypeId(e.target.value)}
              options={(Array.isArray(examTypes) ? examTypes : []).map((t) => ({ value: t.id, label: t.name }))}
            />
            <Select
              label="Academic Year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              options={(Array.isArray(academicYears) ? academicYears : []).map((y) => ({ value: y.id, label: y.name }))}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input
              label="Start Date"
              type="date"
              required
              value={sessionStartDate}
              onChange={(e) => setSessionStartDate(e.target.value)}
            />
            <Input
              label="End Date"
              type="date"
              required
              value={sessionEndDate}
              onChange={(e) => setSessionEndDate(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
            <Button type="button" variant="outline" onClick={() => setShowSessionModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Create Session
            </Button>
          </div>
        </form>
      </Modal>

      {/* Invigilator Modal */}
      <Modal
        isOpen={showInvigilatorModal}
        onClose={() => setShowInvigilatorModal(false)}
        title={`Assign Invigilator — ${selectedSchedule?.name || ''}`}
        maxWidth={460}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
            Assign faculty member for exam room invigilation with collision detection.
          </p>
          <Input
            label="Teacher Staff ID"
            value={invigilatorTeacherId}
            placeholder="Enter teacher ID or search..."
            onChange={(e) => setInvigilatorTeacherId(e.target.value)}
          />
          <Select
            label="Invigilation Role"
            value={invigilatorRole}
            onChange={(e) => setInvigilatorRole(e.target.value)}
            options={[
              { value: 'PRIMARY', label: 'Primary Invigilator' },
              { value: 'ASSISTANT', label: 'Assistant Invigilator' },
              { value: 'RELIEVER', label: 'Reliever' },
            ]}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
            <Button variant="outline" onClick={() => setShowInvigilatorModal(false)}>
              Close
            </Button>
            <Button
              variant="primary"
              onClick={async () => {
                if (!selectedSchedule || !invigilatorTeacherId) return;
                const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;
                await fetch(`${API_URL}/examinations/schedules/${selectedSchedule.id}/invigilators`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                  },
                  body: JSON.stringify({
                    teacherId: invigilatorTeacherId,
                    role: invigilatorRole,
                  }),
                });
                setShowInvigilatorModal(false);
              }}
            >
              Assign
            </Button>
          </div>
        </div>
      </Modal>

      {/* Marks Correction Modal */}
      <Modal
        isOpen={showCorrectionModal}
        onClose={() => setShowCorrectionModal(false)}
        title="Request Marks Correction"
        maxWidth={460}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
            Submit an audited marks amendment request for student <strong>{correctionStudent?.studentName}</strong>.
          </p>
          <Input
            label="Current Marks"
            disabled
            value={correctionStudent?.marksObtained || 0}
          />
          <Input
            label="Requested New Marks"
            type="number"
            value={requestedMarks}
            onChange={(e) => setRequestedMarks(Number(e.target.value))}
          />
          <Input
            label="Reason for Correction"
            required
            value={correctionReason}
            placeholder="e.g. Recounting of Section B answers"
            onChange={(e) => setCorrectionReason(e.target.value)}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
            <Button variant="outline" onClick={() => setShowCorrectionModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={async () => {
                const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;
                await fetch(`${API_URL}/examinations/marks/corrections`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                  },
                  body: JSON.stringify({
                    examResultId: correctionStudent?.studentId,
                    requestedMarks,
                    reason: correctionReason,
                  }),
                });
                setShowCorrectionModal(false);
              }}
            >
              Submit Correction Request
            </Button>
          </div>
        </div>
      </Modal>

      {/* Cumulative Transcript Modal */}
      <Modal
        isOpen={showTranscriptModal}
        onClose={() => setShowTranscriptModal(false)}
        title="Official Multi-Year Academic Transcript"
        maxWidth={650}
      >
        {transcriptData ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: '0.85rem' }}>
            <div style={{ borderBottom: '1px solid var(--border-default)', paddingBottom: 10 }}>
              <div><strong>Student:</strong> {transcriptData.transcriptData?.studentInfo?.fullName}</div>
              <div><strong>Admission No:</strong> {transcriptData.transcriptData?.studentInfo?.admissionNumber}</div>
              <div><strong>Cumulative GPA:</strong> {transcriptData.cumulativeGpa}</div>
              <div><strong>Total Assessment Credits:</strong> {transcriptData.totalCredits}</div>
              <div><strong>Status:</strong> {transcriptData.overallOutcome}</div>
            </div>

            <div style={{ maxHeight: 350, overflowY: 'auto' }}>
              {(transcriptData.transcriptData?.academicHistory || []).map((h: any, idx: number) => (
                <div key={idx} style={{ marginBottom: 14, padding: 10, background: 'var(--surface-subtle)', borderRadius: 6 }}>
                  <div style={{ fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                    <span>{h.sessionName} ({h.academicYear})</span>
                    <span>GPA: {h.gpa || 'N/A'} • {h.grade}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                    Class: {h.className} - {h.sectionName}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {h.subjects?.map((sub: any, sidx: number) => (
                      <span key={sidx} style={{ padding: '2px 6px', background: '#ffffff', borderRadius: 4, fontSize: '0.75rem' }}>
                        {sub.name}: <strong>{sub.marksObtained}/{sub.maxMarks} ({sub.grade})</strong>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
              <Button variant="outline" onClick={() => setShowTranscriptModal(false)}>
                Close
              </Button>
              <Button variant="primary" onClick={() => window.print()}>
                Print Transcript
              </Button>
            </div>
          </div>
        ) : (
          <div>Loading transcript...</div>
        )}
      </Modal>
    </div>
  );
}
