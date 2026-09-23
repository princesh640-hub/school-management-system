'use client';

// =============================================================================
// Phase 4P: Teacher Portal Command Center & Academic Workspace
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
  ITeacherDashboardOverview,
  ITeacherProfile,
  ITeacherSectionWorkspace,
  ITeacherStudentSummary,
  ITeacherTimetable,
  ITeacherAttendanceRoster,
  ITeacherExamTask,
  ITeacherMarksRoster,
  ITeacherResultSummary,
  ITeacherLeaveSummary,
  ITeacherNotice,
} from '@school/shared-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export default function TeacherPortalPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'danger' | 'warning'; text: string } | null>(null);

  // Core teacher state
  const [overview, setOverview] = useState<ITeacherDashboardOverview | null>(null);
  const [profile, setProfile] = useState<ITeacherProfile | null>(null);
  const [sections, setSections] = useState<ITeacherSectionWorkspace[]>([]);
  const [students, setStudents] = useState<ITeacherStudentSummary[]>([]);
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>('');
  const [timetable, setTimetable] = useState<ITeacherTimetable | null>(null);
  const [selectedTimetableDay, setSelectedTimetableDay] = useState<string>('MONDAY');
  const [examTasks, setExamTasks] = useState<ITeacherExamTask[]>([]);
  const [leaveSummary, setLeaveSummary] = useState<ITeacherLeaveSummary | null>(null);
  const [notices, setNotices] = useState<ITeacherNotice[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Fast Attendance State
  const [attendanceSectionId, setAttendanceSectionId] = useState<string>('');
  const [attendanceDate, setAttendanceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [attendanceRoster, setAttendanceRoster] = useState<ITeacherAttendanceRoster | null>(null);
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);

  // Marks Entry State
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [marksRoster, setMarksRoster] = useState<ITeacherMarksRoster | null>(null);
  const [isSavingMarks, setIsSavingMarks] = useState(false);
  const [resultSummary, setResultSummary] = useState<ITeacherResultSummary | null>(null);

  // Leave Form State
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveTypeId, setLeaveTypeId] = useState('casual');
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [isApplyingLeave, setIsApplyingLeave] = useState(false);

  // Class Announcement State
  const [announcementSectionId, setAnnouncementSectionId] = useState('');
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');
  const [isPostingAnnouncement, setIsPostingAnnouncement] = useState(false);

  const getAuthToken = () =>
    typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;

  // 1. Initial Overview & Profile Load
  const fetchInitialData = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const [ovRes, profRes, secRes] = await Promise.all([
        fetch(`${API_URL}/teacher/overview`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/teacher/profile`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/teacher/classes`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (ovRes.ok) setOverview(await ovRes.json());
      if (profRes.ok) setProfile(await profRes.json());
      if (secRes.ok) {
        const secs: ITeacherSectionWorkspace[] = await secRes.json();
        setSections(secs);
        if (secs.length > 0) {
          setAttendanceSectionId(secs[0].sectionId);
          setAnnouncementSectionId(secs[0].sectionId);
        }
      }
    } catch {
      setFeedback({ type: 'danger', text: 'Unable to connect to teacher portal services.' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // 2. Fetch Tab Specific Data
  const fetchTabData = useCallback(async (tab: string) => {
    const token = getAuthToken();
    if (!token) return;

    try {
      if (tab === 'students') {
        const url = selectedSectionFilter
          ? `${API_URL}/teacher/students?sectionId=${selectedSectionFilter}`
          : `${API_URL}/teacher/students`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setStudents(await res.json());
      } else if (tab === 'timetable') {
        const res = await fetch(`${API_URL}/teacher/timetable`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data: ITeacherTimetable = await res.json();
          setTimetable(data);
          const daysOfWeek = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
          const today = daysOfWeek[new Date().getDay()];
          setSelectedTimetableDay(today === 'SUNDAY' ? 'MONDAY' : today);
        }
      } else if (tab === 'attendance') {
        if (attendanceSectionId) {
          fetchAttendanceRoster(attendanceSectionId, attendanceDate);
        }
      } else if (tab === 'exams') {
        const res = await fetch(`${API_URL}/teacher/exams`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setExamTasks(await res.json());
      } else if (tab === 'leave') {
        const res = await fetch(`${API_URL}/teacher/leave`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setLeaveSummary(await res.json());
      } else if (tab === 'notices') {
        const [notRes, notifRes] = await Promise.all([
          fetch(`${API_URL}/teacher/notices`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/teacher/notifications`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (notRes.ok) setNotices(await notRes.json());
        if (notifRes.ok) {
          const data = await notifRes.json();
          setNotifications(data.notifications || []);
        }
      }
    } catch {
      // Fallback
    }
  }, [selectedSectionFilter, attendanceSectionId, attendanceDate]);

  useEffect(() => {
    if (activeTab !== 'overview') {
      fetchTabData(activeTab);
    }
  }, [activeTab, fetchTabData]);

  // Fast Attendance: Fetch Roster
  const fetchAttendanceRoster = async (secId: string, dt: string) => {
    const token = getAuthToken();
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/teacher/attendance/roster?sectionId=${secId}&date=${dt}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setAttendanceRoster(await res.json());
      }
    } catch {
      setFeedback({ type: 'danger', text: 'Failed to load attendance roster.' });
    }
  };

  // Fast Attendance: Mark All Present
  const handleMarkAllPresent = () => {
    if (!attendanceRoster) return;
    setAttendanceRoster({
      ...attendanceRoster,
      students: attendanceRoster.students.map((s) => ({ ...s, status: 'PRESENT' })),
    });
  };

  const markAllAttendance = (status: 'PRESENT' | 'ABSENT' | 'LATE' = 'PRESENT') => {
    if (!attendanceRoster) return;
    setAttendanceRoster({
      ...attendanceRoster,
      students: attendanceRoster.students.map((s) => ({ ...s, status })),
    });
  };

  // Fast Attendance: Toggle Student Status
  const handleToggleStudentStatus = (studentId: string, newStatus: any) => {
    if (!attendanceRoster) return;
    setAttendanceRoster({
      ...attendanceRoster,
      students: attendanceRoster.students.map((s) =>
        s.studentId === studentId ? { ...s, status: newStatus } : s,
      ),
    });
  };

  // Fast Attendance: Save
  const handleSaveAttendance = async () => {
    if (!attendanceRoster) return;
    const token = getAuthToken();
    if (!token) return;

    setIsSavingAttendance(true);
    try {
      const res = await fetch(`${API_URL}/teacher/attendance/mark`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sectionId: attendanceRoster.sectionId,
          date: attendanceRoster.date,
          records: attendanceRoster.students.map((s) => ({
            studentId: s.studentId,
            status: s.status,
            remarks: s.remarks,
          })),
        }),
      });

      if (res.ok) {
        setFeedback({ type: 'success', text: 'Daily attendance saved and confirmed successfully.' });
        setAttendanceRoster({ ...attendanceRoster, isMarked: true });
      } else {
        const err = await res.json();
        setFeedback({ type: 'danger', text: err.message || 'Failed to save attendance.' });
      }
    } catch {
      setFeedback({ type: 'danger', text: 'Network error while saving attendance.' });
    } finally {
      setIsSavingAttendance(false);
    }
  };

  // Marks Entry: Load Exam Roster
  const handleOpenMarksRoster = async (examScheduleId: string) => {
    setSelectedExamId(examScheduleId);
    const token = getAuthToken();
    if (!token) return;

    try {
      const [rosterRes, summaryRes] = await Promise.all([
        fetch(`${API_URL}/teacher/exams/${examScheduleId}/roster`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/teacher/results/${examScheduleId}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (rosterRes.ok) setMarksRoster(await rosterRes.json());
      if (summaryRes.ok) setResultSummary(await summaryRes.json());
    } catch {
      setFeedback({ type: 'danger', text: 'Failed to load examination marks roster.' });
    }
  };

  // Marks Entry: Save Draft or Submit Final
  const handleSaveMarks = async (submitFinal: boolean) => {
    if (!marksRoster || !selectedExamId) return;
    const token = getAuthToken();
    const roster = marksRoster;
    for (const s of roster.students) {
      if (s.marksObtained !== null && s.marksObtained !== undefined && !s.isAbsent) {
        const numVal = Number(s.marksObtained);
        if (numVal < 0 || numVal > roster.maxMarks) {
          setFeedback({
            type: 'danger',
            text: `Invalid marks for ${s.fullName}: ${numVal}. Must be between 0 and ${roster.maxMarks}.`,
          });
          return;
        }
      }
    }

    setIsSavingMarks(true);
    try {
      const res = await fetch(`${API_URL}/teacher/marks/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          examScheduleId: selectedExamId,
          records: marksRoster.students.map((s) => ({
            studentId: s.studentId,
            marksObtained: s.marksObtained ?? undefined,
            isAbsent: s.isAbsent,
            isExempt: s.isExempt,
            remarks: s.remarks || undefined,
          })),
          submitFinal,
        }),
      });

      if (res.ok) {
        setFeedback({
          type: 'success',
          text: submitFinal
            ? 'Marks submitted successfully for administrative review.'
            : 'Marks draft saved successfully.',
        });
        if (submitFinal) {
          setMarksRoster({ ...marksRoster, isSubmitted: true });
        }
      } else {
        const err = await res.json();
        setFeedback({ type: 'danger', text: err.message || 'Failed to submit marks.' });
      }
    } catch {
      setFeedback({ type: 'danger', text: 'Network error while submitting marks.' });
    } finally {
      setIsSavingMarks(false);
    }
  };

  // Leave: Apply
  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getAuthToken();
    if (!token) return;

    setIsApplyingLeave(true);
    try {
      const res = await fetch(`${API_URL}/teacher/leave/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          leaveTypeId,
          startDate: leaveStartDate,
          endDate: leaveEndDate,
          reason: leaveReason,
        }),
      });

      if (res.ok) {
        setFeedback({ type: 'success', text: 'Leave application submitted for approval.' });
        setShowLeaveModal(false);
        fetchTabData('leave');
      } else {
        const err = await res.json();
        setFeedback({ type: 'danger', text: err.message || 'Failed to submit leave.' });
      }
    } catch {
      setFeedback({ type: 'danger', text: 'Network error during leave application.' });
    } finally {
      setIsApplyingLeave(false);
    }
  };

  // Class Announcement: Post
  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementTitle.trim() || !announcementContent.trim()) return;
    const token = getAuthToken();
    if (!token) return;

    setIsPostingAnnouncement(true);
    try {
      const res = await fetch(`${API_URL}/teacher/notices/class`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sectionId: announcementSectionId,
          title: announcementTitle,
          content: announcementContent,
        }),
      });

      if (res.ok) {
        setFeedback({ type: 'success', text: 'Class announcement posted successfully.' });
        setAnnouncementTitle('');
        setAnnouncementContent('');
      } else {
        const err = await res.json();
        setFeedback({ type: 'danger', text: err.message || 'Failed to post announcement.' });
      }
    } catch {
      setFeedback({ type: 'danger', text: 'Network error during announcement dispatch.' });
    } finally {
      setIsPostingAnnouncement(false);
    }
  };

  const tabsList = [
    { id: 'overview', label: '🏠 Today & Tasks' },
    { id: 'classes', label: '🏫 Classes & Sections' },
    { id: 'students', label: '👥 Students' },
    { id: 'timetable', label: '🕒 Timetable' },
    { id: 'attendance', label: '📅 Attendance' },
    { id: 'exams', label: '📝 Exams & Marks' },
    { id: 'leave', label: '🏖️ Leave & Self-Service' },
    { id: 'notices', label: '📢 Notices & Inbox' },
    { id: 'settings', label: '⚙️ Profile' },
  ];

  if (isLoading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-4">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 animate-pulse rounded w-1/4" />
        <div className="h-32 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg" />
        <div className="h-64 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* 1. Header & Breadcrumbs */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <Breadcrumbs
            items={[
              { label: 'Portal', href: '/portal/dashboard' },
              { label: 'Teacher Workspace', active: true },
            ]}
          />
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white mt-1">
            Faculty Workspace — {overview?.fullName || profile?.firstName || 'Teacher'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {profile?.designationTitle} • Code: {overview?.employeeCode} • {profile?.campusName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="primary">{overview?.totalAssignedSections ?? 0} Sections</Badge>
          <Badge variant="default">{overview?.totalAssignedSubjects ?? 0} Subjects</Badge>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <Alert
          type={feedback.type}
          message={feedback.text}
          onClose={() => setFeedback(null)}
        />
      )}

      {/* 2. Navigation Tabs */}
      <Tabs tabs={tabsList} activeTab={activeTab} onChange={setActiveTab} />

      {/* =====================================================================
          TAB 1: TODAY & TASKS (OVERVIEW)
         ===================================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Actionable Pending Tasks */}
          {overview && overview.pendingTasks.length > 0 && (
            <div className="space-y-2">
              {overview.pendingTasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-4 rounded-lg flex items-start justify-between border ${
                    task.severity === 'danger'
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-200 text-red-800 dark:text-red-300'
                      : task.severity === 'warning'
                      ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 text-amber-800 dark:text-amber-300'
                      : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 text-blue-800 dark:text-blue-300'
                  }`}
                >
                  <div>
                    <h4 className="font-semibold text-sm">{task.title}</h4>
                    <p className="text-sm mt-0.5">{task.description}</p>
                  </div>
                  {task.actionTab && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (task.referenceId && task.actionTab === 'attendance') {
                          setAttendanceSectionId(task.referenceId);
                        }
                        setActiveTab(task.actionTab!);
                      }}
                    >
                      Take Action
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Workload Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 border-l-4 border-indigo-500">
              <span className="text-xs font-medium text-gray-500 uppercase">Today's Classes</span>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {overview?.todayClassesCount || 0}
              </p>
              <span className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 block">Scheduled Periods</span>
            </Card>

            <Card className="p-4 border-l-4 border-rose-500">
              <span className="text-xs font-medium text-gray-500 uppercase">Attendance Pending</span>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {overview?.pendingAttendanceSectionsCount || 0}
              </p>
              <span className="text-xs text-rose-600 dark:text-rose-400 mt-1 block">Sections Awaiting Roll-Call</span>
            </Card>

            <Card className="p-4 border-l-4 border-amber-500">
              <span className="text-xs font-medium text-gray-500 uppercase">Marks Pending</span>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {overview?.pendingMarksExamsCount || 0}
              </p>
              <span className="text-xs text-amber-600 dark:text-amber-400 mt-1 block">Exams In Draft</span>
            </Card>

            <Card className="p-4 border-l-4 border-emerald-500">
              <span className="text-xs font-medium text-gray-500 uppercase">Weekly Periods</span>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {overview?.weeklyTeachingPeriods || 0}
              </p>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 block">Total Teaching Load</span>
            </Card>
          </div>

          {/* Today's Schedule Timeline */}
          <Card className="p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Today's Teaching Schedule
              </h3>
              <Badge variant="primary">Published Timetable</Badge>
            </div>

            {overview?.todaySchedule && overview.todaySchedule.length > 0 ? (
              <div className="space-y-3">
                {overview.todaySchedule.map((slot, idx) => (
                  <div
                    key={idx}
                    className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800/40 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                  >
                    <div className="flex items-center gap-4">
                      <span className="w-16 font-mono text-xs font-bold text-gray-500">
                        Period {slot.periodNumber}
                      </span>
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white">
                          {slot.subjectName} — {slot.className} ({slot.sectionName})
                        </h4>
                        <p className="text-xs text-gray-500">
                          {slot.startTime} – {slot.endTime}
                        </p>
                      </div>
                    </div>
                    <div>
                      {slot.roomNumber && <Badge variant="outline">Room {slot.roomNumber}</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No classes scheduled today" description="Enjoy your planning or preparation period." />
            )}
          </Card>
        </div>
      )}

      {/* =====================================================================
          TAB 2: MY CLASSES & SECTIONS
         ===================================================================== */}
      {activeTab === 'classes' && (
        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Assigned Classes & Sections ({sections.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sections.map((sec) => (
                <div key={sec.sectionId} className="p-5 border rounded-lg bg-gray-50 dark:bg-gray-800/40 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                        {sec.className} - {sec.sectionName}
                      </h4>
                      <p className="text-xs text-gray-500">{sec.studentCount} enrolled students</p>
                    </div>
                    {sec.isClassTeacher && <Badge variant="success">Class Teacher</Badge>}
                  </div>

                  <div className="text-xs space-y-1 text-gray-600 dark:text-gray-300">
                    <span className="font-semibold">Subjects Taught:</span>
                    {sec.subjectsTaught.map((sub) => (
                      <div key={sub.subjectId} className="flex justify-between">
                        <span>{sub.subjectName} ({sub.subjectCode})</span>
                        <span>{sub.weeklyPeriods} periods/wk</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        setAttendanceSectionId(sec.sectionId);
                        setActiveTab('attendance');
                      }}
                    >
                      📅 Roll-Call
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedSectionFilter(sec.sectionId);
                        setActiveTab('students');
                      }}
                    >
                      👥 View Roster
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* =====================================================================
          TAB 3: STUDENTS DIRECTORY
         ===================================================================== */}
      {activeTab === 'students' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Enrolled Students ({students.length})
            </h3>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">Filter Section:</label>
              <select
                className="text-sm border rounded-lg p-2 dark:bg-gray-800 dark:border-gray-700"
                value={selectedSectionFilter}
                onChange={(e) => setSelectedSectionFilter(e.target.value)}
              >
                <option value="">All Assigned Sections</option>
                {sections.map((s) => (
                  <option key={s.sectionId} value={s.sectionId}>
                    {s.className} - {s.sectionName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Card className="p-5">
            {students.length === 0 ? (
              <EmptyState title="No students found" description="Select an assigned section to view students." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-medium">
                    <tr>
                      <th className="p-3">Roll #</th>
                      <th className="p-3">Student Name</th>
                      <th className="p-3">Admission #</th>
                      <th className="p-3">Class & Section</th>
                      <th className="p-3">Attendance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {students.map((st) => (
                      <tr key={st.studentId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="p-3 font-mono text-xs">{st.rollNumber || '—'}</td>
                        <td className="p-3 font-semibold text-gray-900 dark:text-white">{st.fullName}</td>
                        <td className="p-3 font-mono text-xs text-gray-500">{st.admissionNumber}</td>
                        <td className="p-3">{st.className} - {st.sectionName}</td>
                        <td className="p-3">
                          <Badge variant={st.attendancePercentage >= 75 ? 'success' : 'danger'}>
                            {st.attendancePercentage}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* =====================================================================
          TAB 4: TIMETABLE
         ===================================================================== */}
      {activeTab === 'timetable' && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'].map((day) => (
              <Button
                key={day}
                variant={selectedTimetableDay === day ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setSelectedTimetableDay(day)}
              >
                {day.charAt(0) + day.slice(1).toLowerCase()}
              </Button>
            ))}
          </div>

          <Card className="p-5">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {selectedTimetableDay.charAt(0) + selectedTimetableDay.slice(1).toLowerCase()} Timetable
            </h3>
            {timetable && timetable.weeklyEntries[selectedTimetableDay]?.length > 0 ? (
              <div className="space-y-3">
                {timetable.weeklyEntries[selectedTimetableDay].map((slot, idx) => (
                  <div key={idx} className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800/40 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="w-16 font-mono text-xs font-bold text-gray-500">Period {slot.periodNumber}</span>
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white">
                          {slot.subjectName} — {slot.className} ({slot.sectionName})
                        </h4>
                        <p className="text-xs text-gray-500">{slot.startTime} – {slot.endTime}</p>
                      </div>
                    </div>
                    {slot.roomNumber && <Badge variant="outline">Room {slot.roomNumber}</Badge>}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No teaching slots" description="No scheduled periods for this day." />
            )}
          </Card>
        </div>
      )}

      {/* =====================================================================
          TAB 5: FAST ATTENDANCE
         ===================================================================== */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Section:</label>
                <select
                  className="text-sm border rounded-lg p-2 dark:bg-gray-800 dark:border-gray-700"
                  value={attendanceSectionId}
                  onChange={(e) => {
                    setAttendanceSectionId(e.target.value);
                    fetchAttendanceRoster(e.target.value, attendanceDate);
                  }}
                >
                  {sections.map((s) => (
                    <option key={s.sectionId} value={s.sectionId}>
                      {s.className} - {s.sectionName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Date:</label>
                <Input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => {
                    setAttendanceDate(e.target.value);
                    fetchAttendanceRoster(attendanceSectionId, e.target.value);
                  }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleMarkAllPresent}>
                ✅ Mark All Present
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={isSavingAttendance || attendanceRoster?.isLocked}
                onClick={handleSaveAttendance}
              >
                {isSavingAttendance ? 'Saving...' : '💾 Save Attendance'}
              </Button>
            </div>
          </div>

          <Card className="p-5">
            {attendanceRoster?.isLocked && (
              <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 rounded text-xs">
                ⚠️ Attendance for this date is finalized and locked. Changes require an administrative correction request.
              </div>
            )}

            {attendanceRoster?.students && attendanceRoster.students.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-medium">
                    <tr>
                      <th className="p-3">Roll #</th>
                      <th className="p-3">Student Name</th>
                      <th className="p-3">Status Selection</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {attendanceRoster.students.map((st) => (
                      <tr key={st.studentId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="p-3 font-mono text-xs">{st.rollNumber || '—'}</td>
                        <td className="p-3 font-semibold text-gray-900 dark:text-white">{st.fullName}</td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'EXCUSED'].map((status) => (
                              <button
                                key={status}
                                type="button"
                                disabled={attendanceRoster.isLocked}
                                onClick={() => handleToggleStudentStatus(st.studentId, status)}
                                className={`px-2.5 py-1 text-xs font-semibold rounded transition ${
                                  st.status === status
                                    ? status === 'PRESENT'
                                      ? 'bg-emerald-600 text-white'
                                      : status === 'ABSENT'
                                      ? 'bg-rose-600 text-white'
                                      : status === 'LATE'
                                      ? 'bg-amber-600 text-white'
                                      : 'bg-indigo-600 text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                                }`}
                              >
                                {status}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="No students in roster" description="Select an assigned section to load students." />
            )}
          </Card>
        </div>
      )}

      {/* =====================================================================
          TAB 6: EXAMS & MARKS ENTRY
         ===================================================================== */}
      {activeTab === 'exams' && (
        <div className="space-y-6">
          {!marksRoster ? (
            <Card className="p-5">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Assigned Examination Tasks ({examTasks.length})
              </h3>
              {examTasks.length === 0 ? (
                <EmptyState title="No exam tasks" description="No scheduled examinations currently assigned." />
              ) : (
                <div className="space-y-3">
                  {examTasks.map((task) => (
                    <div key={task.examScheduleId} className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800/40 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white">
                          {task.subjectName} — {task.className} ({task.sectionName})
                        </h4>
                        <p className="text-xs text-gray-500">
                          {task.examSessionName} • Date: {task.examDate} • Max Marks: {task.maxMarks}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={task.isSubmitted ? 'success' : 'warning'}>
                          {task.isSubmitted ? 'SUBMITTED' : 'IN PROGRESS'}
                        </Badge>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleOpenMarksRoster(task.examScheduleId)}
                        >
                          📝 Enter Marks
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Button variant="outline" size="sm" onClick={() => setMarksRoster(null)}>
                    ← Back to Exam Tasks
                  </Button>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-2">
                    Marks Entry: {marksRoster.subjectName} — {marksRoster.className} ({marksRoster.sectionName})
                  </h3>
                  <p className="text-xs text-gray-500">Max Marks: {marksRoster.maxMarks} • Pass: {marksRoster.passingMarks}</p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isSavingMarks || marksRoster.isSubmitted}
                    onClick={() => handleSaveMarks(false)}
                  >
                    💾 Save Draft
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={isSavingMarks || marksRoster.isSubmitted}
                    onClick={() => handleSaveMarks(true)}
                  >
                    🚀 Submit Marks
                  </Button>
                </div>
              </div>

              {/* Performance Statistics if available */}
              {resultSummary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="p-3 text-center">
                    <span className="text-xs text-gray-500">Appeared</span>
                    <p className="text-xl font-bold">{resultSummary.totalAppeared}</p>
                  </Card>
                  <Card className="p-3 text-center">
                    <span className="text-xs text-emerald-600">Pass Rate</span>
                    <p className="text-xl font-bold text-emerald-600">{resultSummary.passPercentage}%</p>
                  </Card>
                  <Card className="p-3 text-center">
                    <span className="text-xs text-indigo-600">Average Score</span>
                    <p className="text-xl font-bold text-indigo-600">{resultSummary.averageMarks}</p>
                  </Card>
                  <Card className="p-3 text-center">
                    <span className="text-xs text-amber-600">Highest Score</span>
                    <p className="text-xl font-bold text-amber-600">{resultSummary.highestMarks}</p>
                  </Card>
                </div>
              )}

              {/* Marks Roster Table */}
              <Card className="p-5">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-medium">
                      <tr>
                        <th className="p-3">Roll #</th>
                        <th className="p-3">Student Name</th>
                        <th className="p-3">Marks Obtained (/{marksRoster.maxMarks})</th>
                        <th className="p-3">Absent</th>
                        <th className="p-3">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {marksRoster.students.map((st) => (
                        <tr key={st.studentId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="p-3 font-mono text-xs">{st.rollNumber || '—'}</td>
                          <td className="p-3 font-semibold text-gray-900 dark:text-white">{st.fullName}</td>
                          <td className="p-3">
                            <Input
                              type="number"
                              min={0}
                              max={marksRoster.maxMarks}
                              value={st.marksObtained ?? ''}
                              disabled={st.isAbsent || marksRoster.isSubmitted}
                              onChange={(e) => {
                                const val = e.target.value === '' ? null : Number(e.target.value);
                                setMarksRoster({
                                  ...marksRoster,
                                  students: marksRoster.students.map((s) =>
                                    s.studentId === st.studentId ? { ...s, marksObtained: val } : s,
                                  ),
                                });
                              }}
                              className="w-24 text-sm"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={st.isAbsent}
                              disabled={marksRoster.isSubmitted}
                              onChange={(e) => {
                                setMarksRoster({
                                  ...marksRoster,
                                  students: marksRoster.students.map((s) =>
                                    s.studentId === st.studentId
                                      ? { ...s, isAbsent: e.target.checked, marksObtained: e.target.checked ? 0 : s.marksObtained }
                                      : s,
                                  ),
                                });
                              }}
                            />
                          </td>
                          <td className="p-3">
                            <Input
                              value={st.remarks || ''}
                              disabled={marksRoster.isSubmitted}
                              onChange={(e) => {
                                setMarksRoster({
                                  ...marksRoster,
                                  students: marksRoster.students.map((s) =>
                                    s.studentId === st.studentId ? { ...s, remarks: e.target.value } : s,
                                  ),
                                });
                              }}
                              placeholder="Optional remarks..."
                              className="text-xs"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 7: LEAVE & SELF-SERVICE
         ===================================================================== */}
      {activeTab === 'leave' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Faculty Leave & Attendance Self-Service
            </h3>
            <Button variant="primary" size="sm" onClick={() => setShowLeaveModal(true)}>
              🏖️ Apply for Leave
            </Button>
          </div>

          {/* Leave Quota Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(leaveSummary?.leaveBalances || []).map((b) => (
              <Card key={b.leaveTypeId} className="p-4">
                <span className="text-xs font-semibold text-gray-500 uppercase">{b.leaveTypeName}</span>
                <p className="text-2xl font-bold text-indigo-600 mt-1">{b.remainingDays} Days Left</p>
                <span className="text-xs text-gray-500">Allocated: {b.allocatedDays} • Used: {b.usedDays}</span>
              </Card>
            ))}
          </div>

          {/* Leave Applications History */}
          <Card className="p-5">
            <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
              My Leave Application History
            </h4>
            {leaveSummary?.recentApplications && leaveSummary.recentApplications.length > 0 ? (
              <div className="space-y-3">
                {leaveSummary.recentApplications.map((app) => (
                  <div key={app.id} className="p-4 border rounded-lg flex items-center justify-between bg-gray-50 dark:bg-gray-800/40">
                    <div>
                      <h5 className="font-bold text-gray-900 dark:text-white">{app.leaveTypeName} ({app.daysCount} Days)</h5>
                      <p className="text-xs text-gray-500">{app.startDate} to {app.endDate} • Applied: {app.appliedAt}</p>
                      <p className="text-xs italic text-gray-600 dark:text-gray-300 mt-1">"{app.reason}"</p>
                    </div>
                    <Badge variant={app.status === 'APPROVED' ? 'success' : app.status === 'REJECTED' ? 'danger' : 'warning'}>
                      {app.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No leave records" description="You have not submitted any leave applications." />
            )}
          </Card>
        </div>
      )}

      {/* =====================================================================
          TAB 8: NOTICES & COMMUNICATION
         ===================================================================== */}
      {activeTab === 'notices' && (
        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              School Circulars & Announcements ({notices.length})
            </h3>
            {notices.length === 0 ? (
              <EmptyState title="No circulars" description="School announcements will appear here." />
            ) : (
              <div className="space-y-3">
                {notices.map((n) => (
                  <div key={n.id} className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800/40">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-gray-900 dark:text-white">{n.title}</h4>
                      <Badge variant={n.priority === 'URGENT' ? 'danger' : 'default'}>{n.priority}</Badge>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{n.content}</p>
                    <p className="text-xs text-gray-500 mt-2">By {n.authorName} on {n.publishedAt.split('T')[0]}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Post Class Announcement */}
          <Card className="p-5">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Post Section Announcement
            </h3>
            <form onSubmit={handlePostAnnouncement} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Target Section</label>
                  <select
                    className="w-full text-sm border rounded-lg p-2 dark:bg-gray-800 dark:border-gray-700"
                    value={announcementSectionId}
                    onChange={(e) => setAnnouncementSectionId(e.target.value)}
                  >
                    {sections.map((s) => (
                      <option key={s.sectionId} value={s.sectionId}>
                        {s.className} - {s.sectionName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Announcement Title</label>
                  <Input
                    value={announcementTitle}
                    onChange={(e) => setAnnouncementTitle(e.target.value)}
                    placeholder="E.g. Homework Reminder..."
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Content</label>
                <textarea
                  className="w-full text-sm border rounded-lg p-2 dark:bg-gray-800 dark:border-gray-700"
                  rows={3}
                  value={announcementContent}
                  onChange={(e) => setAnnouncementContent(e.target.value)}
                  placeholder="Type message to section students..."
                  required
                />
              </div>
              <Button type="submit" disabled={isPostingAnnouncement}>
                {isPostingAnnouncement ? 'Posting...' : '📢 Post to Section'}
              </Button>
            </form>
          </Card>
        </div>
      )}

      {/* =====================================================================
          TAB 9: PROFILE & SETTINGS
         ===================================================================== */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Faculty Profile Details
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-500 block">Full Name</span>
                <span className="font-semibold text-gray-900 dark:text-white">{profile?.firstName} {profile?.lastName}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Employee Code</span>
                <span className="font-mono font-semibold text-gray-900 dark:text-white">{profile?.employeeCode}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Email Address</span>
                <span className="font-semibold text-gray-900 dark:text-white">{profile?.email}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Department</span>
                <span className="font-semibold text-gray-900 dark:text-white">{profile?.departmentName || 'General Academics'}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Designation</span>
                <span className="font-semibold text-gray-900 dark:text-white">{profile?.designationTitle}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Specialization</span>
                <span className="font-semibold text-gray-900 dark:text-white">{profile?.specialization || 'Not specified'}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Qualification</span>
                <span className="font-semibold text-gray-900 dark:text-white">{profile?.qualification || 'Not specified'}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Joining Date</span>
                <span className="font-semibold text-gray-900 dark:text-white">{profile?.joiningDate}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Campus</span>
                <span className="font-semibold text-gray-900 dark:text-white">{profile?.campusName}</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Leave Application Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Apply for Faculty Leave</h3>
            <form onSubmit={handleApplyLeave} className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Start Date</label>
                <Input type="date" required value={leaveStartDate} onChange={(e) => setLeaveStartDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">End Date</label>
                <Input type="date" required value={leaveEndDate} onChange={(e) => setLeaveEndDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Reason</label>
                <textarea
                  className="w-full text-sm border rounded-lg p-2 dark:bg-gray-800 dark:border-gray-700"
                  rows={3}
                  required
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="Reason for leave request..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" type="button" onClick={() => setShowLeaveModal(false)}>Cancel</Button>
                <Button variant="primary" type="submit" disabled={isApplyingLeave}>
                  {isApplyingLeave ? 'Submitting...' : 'Submit Application'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
