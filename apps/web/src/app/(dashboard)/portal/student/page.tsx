'use client';

// =============================================================================
// Phase 4O: Student Portal Command Center & Academic Workspace
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
  IStudentDashboardOverview,
  IStudentProfile,
  IStudentAcademicDetails,
  IStudentSubject,
  IStudentTimetable,
  IStudentAttendanceSummary,
  IStudentExamSchedule,
  IStudentExamResult,
  IStudentReportCard,
  IStudentAcademicHistory,
  IStudentFeeSummary,
  IStudentLibraryInfo,
  IStudentTransportInfo,
  IStudentHostelInfo,
  IStudentNotice,
  IStudentDocument,
  IStudentPreferencesDto,
} from '@school/shared-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export default function StudentPortalPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'danger' | 'warning'; text: string } | null>(null);

  // Student portal states
  const [overview, setOverview] = useState<IStudentDashboardOverview | null>(null);
  const [profile, setProfile] = useState<IStudentProfile | null>(null);
  const [academics, setAcademics] = useState<IStudentAcademicDetails | null>(null);
  const [subjects, setSubjects] = useState<IStudentSubject[]>([]);
  const [timetable, setTimetable] = useState<IStudentTimetable | null>(null);
  const [selectedTimetableDay, setSelectedTimetableDay] = useState<string>('MONDAY');
  const [attendance, setAttendance] = useState<IStudentAttendanceSummary | null>(null);
  const [exams, setExams] = useState<IStudentExamSchedule[]>([]);
  const [results, setResults] = useState<IStudentExamResult[]>([]);
  const [reportCards, setReportCards] = useState<IStudentReportCard[]>([]);
  const [history, setHistory] = useState<IStudentAcademicHistory | null>(null);
  const [fees, setFees] = useState<IStudentFeeSummary | null>(null);
  const [library, setLibrary] = useState<IStudentLibraryInfo | null>(null);
  const [transport, setTransport] = useState<IStudentTransportInfo | null>(null);
  const [hostel, setHostel] = useState<IStudentHostelInfo | null>(null);
  const [notices, setNotices] = useState<IStudentNotice[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [documents, setDocuments] = useState<IStudentDocument[]>([]);
  const [preferences, setPreferences] = useState<IStudentPreferencesDto | null>(null);

  // Modals & form states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [messageSubject, setMessageSubject] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [messageRecipient, setMessageRecipient] = useState<'CLASS_TEACHER' | 'ADMINISTRATION'>('CLASS_TEACHER');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editEmergencyPhone, setEditEmergencyPhone] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const getAuthToken = () =>
    typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;

  // 1. Fetch Overview & Essential Profile
  const fetchInitialData = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const [overviewRes, profileRes] = await Promise.all([
        fetch(`${API_URL}/student/overview`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/student/profile`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (overviewRes.ok) {
        const data: IStudentDashboardOverview = await overviewRes.json();
        setOverview(data);
      }
      if (profileRes.ok) {
        const data: IStudentProfile = await profileRes.json();
        setProfile(data);
        setEditPhone(data.phone || '');
        setEditAddress(data.address || '');
        setEditEmergencyPhone(data.emergencyContactPhone || '');
      }
    } catch {
      setFeedback({ type: 'danger', text: 'Failed to connect to student portal service.' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // 2. Fetch Tab-Specific Data On-Demand
  const fetchTabData = useCallback(async (tab: string) => {
    const token = getAuthToken();
    if (!token) return;

    try {
      if (tab === 'academics') {
        const [acadRes, subRes] = await Promise.all([
          fetch(`${API_URL}/student/academics`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/student/subjects`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (acadRes.ok) setAcademics(await acadRes.json());
        if (subRes.ok) setSubjects(await subRes.json());
      } else if (tab === 'timetable') {
        const res = await fetch(`${API_URL}/student/timetable`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data: IStudentTimetable = await res.json();
          setTimetable(data);
          const daysOfWeek = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
          const today = daysOfWeek[new Date().getDay()];
          setSelectedTimetableDay(today === 'SUNDAY' ? 'MONDAY' : today);
        }
      } else if (tab === 'attendance') {
        const res = await fetch(`${API_URL}/student/attendance`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setAttendance(await res.json());
      } else if (tab === 'exams') {
        const [exRes, resRes, rcRes] = await Promise.all([
          fetch(`${API_URL}/student/exams`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/student/results`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/student/report-cards`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (exRes.ok) setExams(await exRes.json());
        if (resRes.ok) setResults(await resRes.json());
        if (rcRes.ok) setReportCards(await rcRes.json());
      } else if (tab === 'history') {
        const res = await fetch(`${API_URL}/student/history`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setHistory(await res.json());
      } else if (tab === 'fees') {
        const res = await fetch(`${API_URL}/student/fees`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setFees(await res.json());
      } else if (tab === 'services') {
        const [libRes, transRes, hostRes] = await Promise.all([
          fetch(`${API_URL}/student/library`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/student/transport`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/student/hostel`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (libRes.ok) setLibrary(await libRes.json());
        if (transRes.ok) setTransport(await transRes.json());
        if (hostRes.ok) setHostel(await hostRes.json());
      } else if (tab === 'notices') {
        const [noticesRes, notifRes] = await Promise.all([
          fetch(`${API_URL}/student/notices`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/student/notifications`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (noticesRes.ok) setNotices(await noticesRes.json());
        if (notifRes.ok) {
          const data = await notifRes.json();
          setNotifications(data.notifications || []);
          setUnreadNotificationsCount(data.unreadCount || 0);
        }
      } else if (tab === 'documents') {
        const res = await fetch(`${API_URL}/student/documents`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setDocuments(await res.json());
      } else if (tab === 'settings') {
        const res = await fetch(`${API_URL}/student/preferences`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setPreferences(await res.json());
      }
    } catch {
      // Fallback
    }
  }, []);

  useEffect(() => {
    if (activeTab !== 'overview') {
      fetchTabData(activeTab);
    }
  }, [activeTab, fetchTabData]);

  // Handle Payment Initiation
  const handleInitiatePayment = async () => {
    if (!selectedInvoice) return;
    const token = getAuthToken();
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/student/fees/${selectedInvoice.id}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedback({
          type: 'warning',
          text: data.message || 'ONLINE PAYMENT NOT CONFIGURED: Please pay at the school cashier.',
        });
      } else {
        setFeedback({
          type: 'success',
          text: 'Payment initiated successfully.',
        });
      }
    } catch {
      setFeedback({
        type: 'warning',
        text: 'ONLINE PAYMENT NOT CONFIGURED: Unable to process payment gateway transaction.',
      });
    } finally {
      setShowPaymentModal(false);
    }
  };

  // Handle Student Message Submission
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageSubject.trim() || !messageContent.trim()) return;
    const token = getAuthToken();
    if (!token) return;

    setIsSendingMessage(true);
    try {
      const res = await fetch(`${API_URL}/student/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipientRole: messageRecipient,
          subject: messageSubject,
          content: messageContent,
        }),
      });

      if (res.ok) {
        setFeedback({ type: 'success', text: 'Message submitted to school administration successfully.' });
        setMessageSubject('');
        setMessageContent('');
      } else {
        setFeedback({ type: 'danger', text: 'Failed to send message.' });
      }
    } catch {
      setFeedback({ type: 'danger', text: 'Network error while sending message.' });
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Handle Profile Update
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getAuthToken();
    if (!token) return;

    setIsUpdatingProfile(true);
    try {
      const res = await fetch(`${API_URL}/student/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          phone: editPhone,
          address: editAddress,
          emergencyContactPhone: editEmergencyPhone,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setProfile(updated);
        setFeedback({ type: 'success', text: 'Profile contact details updated successfully.' });
      } else {
        setFeedback({ type: 'danger', text: 'Failed to update profile.' });
      }
    } catch {
      setFeedback({ type: 'danger', text: 'Network error during profile update.' });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const tabsList = [
    { id: 'overview', label: '🏠 Overview' },
    { id: 'academics', label: '🎓 Academics & Subjects' },
    { id: 'timetable', label: '🕒 Timetable' },
    { id: 'attendance', label: '📅 Attendance' },
    { id: 'exams', label: '📝 Exams & Results' },
    { id: 'history', label: '📜 Academic History' },
    { id: 'fees', label: '💳 Fees & Receipts' },
    { id: 'services', label: '📚 Services' },
    { id: 'notices', label: '📢 Notices & Inbox' },
    { id: 'documents', label: '📁 Documents' },
    { id: 'settings', label: '⚙️ Settings' },
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
              { label: 'Student Workspace', active: true },
            ]}
          />
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white mt-1">
            Welcome, {overview?.fullName || profile?.firstName || 'Student'}! 👋
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Enrolled in {overview?.className} • Section {overview?.sectionName} • Admission #{overview?.admissionNumber}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={overview?.attendancePercentage && overview.attendancePercentage >= 75 ? 'success' : 'warning'}>
            Attendance: {overview?.attendancePercentage ?? 100}%
          </Badge>
          <Badge variant="primary">
            {profile?.lifecycleStatus || 'ACTIVE'}
          </Badge>
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
          TAB 1: OVERVIEW (WHAT DO I NEED TO KNOW TODAY?)
         ===================================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Actionable Attention Alerts */}
          {overview && overview.attentionItems.length > 0 && (
            <div className="space-y-2">
              {overview.attentionItems.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-lg flex items-start justify-between border ${
                    item.severity === 'danger'
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-200 text-red-800 dark:text-red-300'
                      : item.severity === 'warning'
                      ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 text-amber-800 dark:text-amber-300'
                      : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 text-blue-800 dark:text-blue-300'
                  }`}
                >
                  <div>
                    <h4 className="font-semibold text-sm">{item.title}</h4>
                    <p className="text-sm mt-0.5">{item.message}</p>
                  </div>
                  {item.linkTab && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab(item.linkTab!)}
                    >
                      View
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* KPI Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 border-l-4 border-indigo-500">
              <span className="text-xs font-medium text-gray-500 uppercase">Today's Classes</span>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {overview?.todayClassesCount || 0}
              </p>
              <span className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 block">Scheduled Periods</span>
            </Card>

            <Card className="p-4 border-l-4 border-emerald-500">
              <span className="text-xs font-medium text-gray-500 uppercase">Attendance</span>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {overview?.attendancePercentage}%
              </p>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 block">
                Today: {overview?.todayAttendanceStatus || 'Pending'}
              </span>
            </Card>

            <Card className="p-4 border-l-4 border-amber-500">
              <span className="text-xs font-medium text-gray-500 uppercase">Upcoming Exams</span>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {overview?.upcomingExamsCount || 0}
              </p>
              <span className="text-xs text-amber-600 dark:text-amber-400 mt-1 block">Scheduled Sessions</span>
            </Card>

            <Card className="p-4 border-l-4 border-rose-500">
              <span className="text-xs font-medium text-gray-500 uppercase">Outstanding Balance</span>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                ${overview?.feeBalanceOutstanding.toFixed(2) || '0.00'}
              </p>
              <span className="text-xs text-rose-600 dark:text-rose-400 mt-1 block">
                {overview?.feeBalanceOutstanding === 0 ? 'Fully Cleared' : 'Pending Payment'}
              </span>
            </Card>
          </div>

          {/* Quick Focus Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Next Exam Focus */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  Next Examination
                </h3>
                <Badge variant="primary">Upcoming</Badge>
              </div>
              {overview?.nextExam ? (
                <div className="space-y-2 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                  <p className="font-bold text-lg text-gray-900 dark:text-white">
                    {overview.nextExam.subjectName}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
                    <span>📅 {overview.nextExam.examDate}</span>
                    <span>🕒 {overview.nextExam.startTime}</span>
                    {overview.nextExam.roomName && <span>🚪 Room {overview.nextExam.roomName}</span>}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No examinations currently scheduled.</p>
              )}
            </Card>

            {/* Latest Result Focus */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  Latest Published Grade
                </h3>
                <Badge variant="success">Official</Badge>
              </div>
              {overview?.latestResult ? (
                <div className="space-y-2 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <p className="font-bold text-lg text-gray-900 dark:text-white">
                      {overview.latestResult.subjectName}
                    </p>
                    <Badge variant="success" size="lg">
                      Grade {overview.latestResult.grade || 'PASS'}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Exam: {overview.latestResult.examName} • Score: {overview.latestResult.marksObtained} / {overview.latestResult.maxMarks} ({overview.latestResult.percentage}%)
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No examination results released yet.</p>
              )}
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Quick Navigation</h3>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setActiveTab('timetable')}>
                🕒 View Full Timetable
              </Button>
              <Button variant="outline" size="sm" onClick={() => setActiveTab('attendance')}>
                📅 Attendance History
              </Button>
              <Button variant="outline" size="sm" onClick={() => setActiveTab('exams')}>
                📝 Exam Schedules & Results
              </Button>
              <Button variant="outline" size="sm" onClick={() => setActiveTab('fees')}>
                💳 View Invoices & Receipts
              </Button>
              <Button variant="outline" size="sm" onClick={() => setActiveTab('services')}>
                📚 Library & Bus Route
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* =====================================================================
          TAB 2: ACADEMICS & SUBJECTS
         ===================================================================== */}
      {activeTab === 'academics' && (
        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Current Academic Enrollment
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500 block">Class & Section</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {academics?.className} - {academics?.sectionName}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block">Roll Number</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {academics?.rollNumber || 'Not assigned'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block">Academic Year</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {academics?.academicYear}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block">Class Teacher</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {academics?.classTeacher ? academics.classTeacher.name : 'Unassigned'}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Enrolled Subjects ({subjects.length})
            </h3>
            {subjects.length === 0 ? (
              <EmptyState title="No enrolled subjects found" description="Subjects will appear here once registered." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-medium">
                    <tr>
                      <th className="p-3">Code</th>
                      <th className="p-3">Subject Name</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Weekly Periods</th>
                      <th className="p-3">Assigned Teacher</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {subjects.map((sub) => (
                      <tr key={sub.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="p-3 font-mono text-xs">{sub.subjectCode}</td>
                        <td className="p-3 font-medium text-gray-900 dark:text-white">{sub.subjectName}</td>
                        <td className="p-3"><Badge variant="default">{sub.category}</Badge></td>
                        <td className="p-3">{sub.weeklyPeriods} periods / week</td>
                        <td className="p-3 text-gray-600 dark:text-gray-300">{sub.teacherName || 'TBA'}</td>
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
          TAB 3: TIMETABLE
         ===================================================================== */}
      {activeTab === 'timetable' && (
        <div className="space-y-6">
          {/* Day Selector Buttons */}
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
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedTimetableDay.charAt(0) + selectedTimetableDay.slice(1).toLowerCase()} Schedule
              </h3>
              <Badge variant="success">PUBLISHED TIMETABLE</Badge>
            </div>

            {timetable && timetable.weeklyEntries[selectedTimetableDay]?.length > 0 ? (
              <div className="space-y-3">
                {timetable.weeklyEntries[selectedTimetableDay].map((entry, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg border flex flex-col md:flex-row md:items-center md:justify-between gap-3 ${
                      entry.isBreak
                        ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 text-amber-800 dark:text-amber-300'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="w-16 text-xs font-mono font-bold text-gray-500">
                        Period {entry.periodNumber}
                      </span>
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {entry.subjectName}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {entry.startTime} – {entry.endTime}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      {entry.roomNumber && <Badge variant="outline">Room {entry.roomNumber}</Badge>}
                      <span className="text-gray-600 dark:text-gray-300 font-medium">
                        {entry.teacherName || 'Teacher TBA'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No scheduled classes"
                description={`There are no classes scheduled for ${selectedTimetableDay.toLowerCase()}.`}
              />
            )}
          </Card>
        </div>
      )}

      {/* =====================================================================
          TAB 4: ATTENDANCE
         ===================================================================== */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          {/* Attendance Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="p-4 text-center">
              <span className="text-xs text-gray-500 block">Total Days</span>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {attendance?.totalDays ?? 0}
              </p>
            </Card>
            <Card className="p-4 text-center">
              <span className="text-xs text-emerald-600 block">Present Days</span>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                {attendance?.presentDays ?? 0}
              </p>
            </Card>
            <Card className="p-4 text-center">
              <span className="text-xs text-rose-600 block">Absent Days</span>
              <p className="text-2xl font-bold text-rose-600 mt-1">
                {attendance?.absentDays ?? 0}
              </p>
            </Card>
            <Card className="p-4 text-center">
              <span className="text-xs text-amber-600 block">Late Days</span>
              <p className="text-2xl font-bold text-amber-600 mt-1">
                {attendance?.lateDays ?? 0}
              </p>
            </Card>
            <Card className="p-4 text-center">
              <span className="text-xs text-indigo-600 block">Percentage</span>
              <p className="text-2xl font-bold text-indigo-600 mt-1">
                {attendance?.attendancePercentage ?? 100}%
              </p>
            </Card>
          </div>

          {/* Attendance Alerts */}
          {attendance?.alerts && attendance.alerts.length > 0 && (
            <div className="space-y-2">
              {attendance.alerts.map((al, idx) => (
                <Alert
                  key={idx}
                  type={al.severity}
                  message={al.message}
                />
              ))}
            </div>
          )}

          {/* Recent Records Log */}
          <Card className="p-5">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Attendance Records Log
            </h3>
            {attendance?.recentRecords && attendance.recentRecords.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-medium">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {attendance.recentRecords.map((rec, idx) => (
                      <tr key={idx}>
                        <td className="p-3 font-mono">{rec.date}</td>
                        <td className="p-3">
                          <Badge
                            variant={
                              rec.status === 'PRESENT'
                                ? 'success'
                                : rec.status === 'ABSENT'
                                ? 'danger'
                                : rec.status === 'LATE'
                                ? 'warning'
                                : 'default'
                            }
                          >
                            {rec.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-gray-500">{rec.remarks || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="No attendance logs recorded" description="Attendance will be recorded by class teachers." />
            )}
          </Card>
        </div>
      )}

      {/* =====================================================================
          TAB 5: EXAMINATIONS & PUBLISHED RESULTS
         ===================================================================== */}
      {activeTab === 'exams' && (
        <div className="space-y-6">
          {/* Upcoming Exams Section */}
          <Card className="p-5">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Upcoming Examinations ({exams.length})
            </h3>
            {exams.length === 0 ? (
              <EmptyState title="No upcoming exams" description="Published examination schedules will appear here." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {exams.map((ex) => (
                  <div key={ex.id} className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800/40">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white">{ex.subjectName}</h4>
                        <p className="text-xs text-gray-500">{ex.examSessionName}</p>
                      </div>
                      <Badge variant="primary">{ex.subjectCode}</Badge>
                    </div>
                    <div className="mt-3 text-sm space-y-1 text-gray-600 dark:text-gray-300">
                      <div>📅 <strong>Date:</strong> {ex.examDate}</div>
                      <div>🕒 <strong>Time:</strong> {ex.startTime} – {ex.endTime}</div>
                      {ex.roomName && <div>🚪 <strong>Room:</strong> {ex.roomName}</div>}
                      <div>📊 <strong>Max Marks:</strong> {ex.maxMarks} (Pass: {ex.passingMarks})</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Published Results Section */}
          <Card className="p-5">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Official Published Results ({results.length})
            </h3>
            {results.length === 0 ? (
              <EmptyState title="No published results" description="Official results will be displayed once released." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-medium">
                    <tr>
                      <th className="p-3">Subject</th>
                      <th className="p-3">Session</th>
                      <th className="p-3">Score</th>
                      <th className="p-3">Percentage</th>
                      <th className="p-3">Grade</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {results.map((r) => (
                      <tr key={r.id}>
                        <td className="p-3 font-medium text-gray-900 dark:text-white">
                          {r.subjectName} <span className="text-xs text-gray-500">({r.subjectCode})</span>
                        </td>
                        <td className="p-3">{r.examSessionName}</td>
                        <td className="p-3">{r.marksObtained} / {r.maxMarks}</td>
                        <td className="p-3 font-semibold">{r.percentage}%</td>
                        <td className="p-3"><Badge variant="default">{r.grade}</Badge></td>
                        <td className="p-3">
                          <Badge variant={r.isPassed ? 'success' : 'danger'}>
                            {r.isPassed ? 'PASS' : 'FAIL'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Report Cards Section */}
          <Card className="p-5">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Official Published Report Cards ({reportCards.length})
            </h3>
            {reportCards.length === 0 ? (
              <EmptyState title="No published report cards" description="Report cards will appear here once officially issued." />
            ) : (
              <div className="space-y-3">
                {reportCards.map((rc) => (
                  <div key={rc.id} className="p-4 border rounded-lg flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white">{rc.examSessionName}</h4>
                      <p className="text-xs text-gray-500">Academic Year: {rc.academicYear} • Issued: {rc.issueDate}</p>
                      {rc.principalRemarks && (
                        <p className="text-xs italic text-gray-600 dark:text-gray-300 mt-1">"{rc.principalRemarks}"</p>
                      )}
                    </div>
                    <Button variant="outline" size="sm">
                      📜 Download PDF
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* =====================================================================
          TAB 6: ACADEMIC HISTORY
         ===================================================================== */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Past Enrollments & Progression
            </h3>
            {history && history.pastEnrollments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-medium">
                    <tr>
                      <th className="p-3">Academic Year</th>
                      <th className="p-3">Class</th>
                      <th className="p-3">Section</th>
                      <th className="p-3">Roll Number</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {history.pastEnrollments.map((en, idx) => (
                      <tr key={idx}>
                        <td className="p-3 font-semibold">{en.academicYear}</td>
                        <td className="p-3">{en.className}</td>
                        <td className="p-3">{en.sectionName}</td>
                        <td className="p-3">{en.rollNumber || '—'}</td>
                        <td className="p-3"><Badge variant="default">{en.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="No historical records" description="Prior academic year records will be retained here." />
            )}
          </Card>
        </div>
      )}

      {/* =====================================================================
          TAB 7: FEES & RECEIPTS
         ===================================================================== */}
      {activeTab === 'fees' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <span className="text-xs text-gray-500 uppercase">Total Invoiced</span>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                ${fees?.totalInvoiced.toFixed(2) ?? '0.00'}
              </p>
            </Card>
            <Card className="p-4">
              <span className="text-xs text-emerald-600 uppercase">Total Paid</span>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                ${fees?.totalPaid.toFixed(2) ?? '0.00'}
              </p>
            </Card>
            <Card className="p-4">
              <span className="text-xs text-rose-600 uppercase">Outstanding Dues</span>
              <p className="text-2xl font-bold text-rose-600 mt-1">
                ${fees?.balanceOutstanding.toFixed(2) ?? '0.00'}
              </p>
            </Card>
          </div>

          <Card className="p-5">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Fee Invoices ({fees?.invoices.length || 0})
            </h3>
            {fees && fees.invoices.length > 0 ? (
              <div className="space-y-4">
                {fees.invoices.map((inv) => (
                  <div key={inv.id} className="p-4 border rounded-lg space-y-3 bg-gray-50 dark:bg-gray-800/40">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white">
                          Invoice #{inv.invoiceNumber}
                        </h4>
                        <p className="text-xs text-gray-500">Due Date: {inv.dueDate}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={inv.remainingBalance === 0 ? 'success' : 'warning'}>
                          {inv.status}
                        </Badge>
                        {inv.remainingBalance > 0 && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setShowPaymentModal(true);
                            }}
                          >
                            Pay Online (${inv.remainingBalance.toFixed(2)})
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Line Items */}
                    <div className="border-t pt-2 text-xs space-y-1 text-gray-600 dark:text-gray-300">
                      {inv.lineItems.map((item) => (
                        <div key={item.id} className="flex justify-between">
                          <span>{item.description}</span>
                          <span>${item.amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Receipts */}
                    {inv.payments.length > 0 && (
                      <div className="border-t pt-2 text-xs text-emerald-700 dark:text-emerald-400 space-y-1">
                        <span className="font-semibold">Receipts:</span>
                        {inv.payments.map((p) => (
                          <div key={p.transactionId} className="flex justify-between">
                            <span>🧾 {p.receiptNumber} ({p.paymentDate} via {p.paymentMethod})</span>
                            <span>+${p.amount.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No fee invoices" description="All institutional fees are cleared." />
            )}
          </Card>
        </div>
      )}

      {/* =====================================================================
          TAB 8: SERVICES (LIBRARY, TRANSPORT, HOSTEL)
         ===================================================================== */}
      {activeTab === 'services' && (
        <div className="space-y-6">
          {/* Library Section */}
          <Card className="p-5">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">📚 Library Services</h3>
              {library?.hasMembership && (
                <Badge variant="outline">Member #{library.membershipNumber}</Badge>
              )}
            </div>
            {library?.activeLoans && library.activeLoans.length > 0 ? (
              <div className="space-y-2">
                {library.activeLoans.map((l) => (
                  <div key={l.id} className="p-3 border rounded-lg flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-sm text-gray-900 dark:text-white">{l.bookTitle}</h4>
                      <p className="text-xs text-gray-500">Due Date: {l.dueDate}</p>
                    </div>
                    <Badge variant={l.isOverdue ? 'danger' : 'success'}>
                      {l.isOverdue ? 'OVERDUE' : 'ACTIVE'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No active book loans.</p>
            )}
          </Card>

          {/* Transport Section */}
          <Card className="p-5">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">🚌 Transport Services</h3>
            {transport?.hasAssignment && transport.assignment ? (
              <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800/40 text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="font-semibold">{transport.assignment.routeName}</span>
                  <Badge variant="primary">{transport.assignment.routeCode}</Badge>
                </div>
                <p className="text-xs text-gray-500">
                  Stop: {transport.assignment.stopName} • Pickup: {transport.assignment.pickupTime || 'TBA'}
                </p>
                <p className="text-xs text-gray-500">
                  Bus: {transport.assignment.vehicleNumber} • Driver: {transport.assignment.driverName || 'Assigned'}
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Not assigned to institutional bus transport.</p>
            )}
          </Card>

          {/* Hostel Section */}
          <Card className="p-5">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">🏠 Hostel Services</h3>
            {hostel?.hasAllocation && hostel.allocation ? (
              <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800/40 text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="font-semibold">{hostel.allocation.hostelName}</span>
                  <Badge variant="success">RESIDENT</Badge>
                </div>
                <p className="text-xs text-gray-500">
                  Room: {hostel.allocation.roomNumber} • Bed: {hostel.allocation.bedNumber} • Check-in: {hostel.allocation.checkInDate}
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Day scholar student (not enrolled in boarding hostel).</p>
            )}
          </Card>
        </div>
      )}

      {/* =====================================================================
          TAB 9: NOTICES & NOTIFICATIONS
         ===================================================================== */}
      {activeTab === 'notices' && (
        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              School Circulars & Announcements ({notices.length})
            </h3>
            {notices.length === 0 ? (
              <EmptyState title="No notices" description="School circulars will appear here." />
            ) : (
              <div className="space-y-3">
                {notices.map((n) => (
                  <div key={n.id} className="p-4 border rounded-lg space-y-2 bg-gray-50 dark:bg-gray-800/30">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-gray-900 dark:text-white">{n.title}</h4>
                      <Badge variant={n.priority === 'URGENT' ? 'danger' : 'default'}>{n.priority}</Badge>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{n.content}</p>
                    <p className="text-xs text-gray-500">Published by {n.authorName} on {n.publishedAt.split('T')[0]}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Send Message Form */}
          <Card className="p-5">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Send Message to School
            </h3>
            <form onSubmit={handleSendMessage} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Recipient</label>
                  <select
                    className="w-full text-sm border rounded-lg p-2 dark:bg-gray-800 dark:border-gray-700"
                    value={messageRecipient}
                    onChange={(e: any) => setMessageRecipient(e.target.value)}
                  >
                    <option value="CLASS_TEACHER">Class Teacher</option>
                    <option value="ADMINISTRATION">School Administration</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Subject</label>
                  <Input
                    value={messageSubject}
                    onChange={(e) => setMessageSubject(e.target.value)}
                    placeholder="Enter message subject..."
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Content</label>
                <textarea
                  className="w-full text-sm border rounded-lg p-2 dark:bg-gray-800 dark:border-gray-700"
                  rows={4}
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  placeholder="Type your message here..."
                  required
                />
              </div>
              <Button type="submit" disabled={isSendingMessage}>
                {isSendingMessage ? 'Sending...' : 'Send Message'}
              </Button>
            </form>
          </Card>
        </div>
      )}

      {/* =====================================================================
          TAB 10: DOCUMENTS
         ===================================================================== */}
      {activeTab === 'documents' && (
        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Verified Student Documents ({documents.length})
            </h3>
            {documents.length === 0 ? (
              <EmptyState title="No documents verified" description="Verified school certificates will be listed here." />
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div key={doc.id} className="p-4 border rounded-lg flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white">{doc.fileName}</h4>
                      <p className="text-xs text-gray-500">Type: {doc.documentType} • Verified: {doc.verifiedAt?.split('T')[0] || 'Yes'}</p>
                    </div>
                    <Button variant="outline" size="sm">
                      📥 Download
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* =====================================================================
          TAB 11: SETTINGS & PROFILE
         ===================================================================== */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              My Profile Details
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-6">
              <div>
                <span className="text-gray-500 block">Full Name</span>
                <span className="font-semibold text-gray-900 dark:text-white">{profile?.firstName} {profile?.lastName}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Admission Number</span>
                <span className="font-mono font-semibold text-gray-900 dark:text-white">{profile?.admissionNumber}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Email</span>
                <span className="font-semibold text-gray-900 dark:text-white">{profile?.email}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Date of Birth</span>
                <span className="font-semibold text-gray-900 dark:text-white">{profile?.dateOfBirth}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Blood Group</span>
                <span className="font-semibold text-gray-900 dark:text-white">{profile?.bloodGroup || 'Not specified'}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Campus</span>
                <span className="font-semibold text-gray-900 dark:text-white">{profile?.campusName}</span>
              </div>
            </div>

            {/* Self-service updates */}
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white border-t pt-4 mb-3">
              Update Contact Details
            </h4>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Phone Number</label>
                  <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Emergency Contact Phone</label>
                  <Input value={editEmergencyPhone} onChange={(e) => setEditEmergencyPhone(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Residential Address</label>
                  <Input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} />
                </div>
              </div>
              <Button type="submit" disabled={isUpdatingProfile}>
                {isUpdatingProfile ? 'Saving...' : 'Save Profile Changes'}
              </Button>
            </form>
          </Card>
        </div>
      )}

      {/* Online Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Online Fee Payment</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Invoice #{selectedInvoice.invoiceNumber} • Remaining Balance: <strong>${selectedInvoice.remainingBalance.toFixed(2)}</strong>
            </p>
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 rounded text-xs">
              <strong>Notice:</strong> If the school online payment gateway is unconfigured, payments should be made directly at the school cashier or via authorized institutional bank account.
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowPaymentModal(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleInitiatePayment}>Proceed to Pay</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
