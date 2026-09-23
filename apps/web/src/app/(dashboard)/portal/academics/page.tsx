'use client';

import React, { useState, useEffect } from 'react';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable, ColumnDef } from '@/components/data-table/DataTable';
import { Tabs, TabItem } from '@/components/ui/Tabs';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export default function AcademicsPage() {
  const [activeTab, setActiveTab] = useState<string>('structure');
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedSectionName, setSelectedSectionName] = useState<string>('');
  const [roster, setRoster] = useState<any[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [isLoadingRoster, setIsLoadingRoster] = useState(false);

  // Additional Academic Domains
  const [subjects, setSubjects] = useState<any[]>([]);
  const [curricula, setCurricula] = useState<any[]>([]);
  const [offerings, setOfferings] = useState<any[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [overview, setOverview] = useState<any>(null);

  // Modals & Feedback
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showAssignTeacherModal, setShowAssignTeacherModal] = useState(false);
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  // Form states
  const [newClassData, setNewClassData] = useState({ name: '', code: '', orderIndex: 0 });
  const [newSectionData, setNewSectionData] = useState({ classId: '', name: '', capacity: 40, roomNumber: '' });
  const [newSubjectData, setNewSubjectData] = useState({ name: '', code: '', shortName: '', category: 'CORE', creditHours: 3 });
  const [newEventData, setNewEventData] = useState({
    title: '',
    description: '',
    category: 'EVENT',
    startDate: '',
    endDate: '',
    isHoliday: false,
    targetAudience: 'ALL',
    academicYearId: '',
  });
  const [assignTeacherData, setAssignTeacherData] = useState({ sectionId: '', teacherId: '', academicYearId: '' });

  const getAuthToken = () => {
    return typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;
  };

  const fetchOverview = async () => {
    const token = getAuthToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/academics/overview`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOverview(data);
      }
    } catch {
      // ignore
    }
  };

  const fetchClasses = async () => {
    setIsLoadingClasses(true);
    const token = getAuthToken();
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/academics/classes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setClasses(data);
        if (data.length > 0 && data[0].sections?.length > 0) {
          const firstSec = data[0].sections[0];
          setSelectedSection(firstSec.id);
          setSelectedSectionName(`${data[0].name} — Section ${firstSec.name}`);
          loadRoster(firstSec.id, token);
        }
      }
    } catch {
      // Fallback
    } finally {
      setIsLoadingClasses(false);
    }
  };

  const loadRoster = async (sectionId: string, tokenParam?: string) => {
    setSelectedSection(sectionId);
    setIsLoadingRoster(true);
    const token = tokenParam || getAuthToken();
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/academics/sections/${sectionId}/roster`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRoster(data.students || data || []);
      }
    } catch {
      // Ignore
    } finally {
      setIsLoadingRoster(false);
    }
  };

  const fetchSubjects = async () => {
    const token = getAuthToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/academics/subjects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setSubjects(await res.json());
    } catch {}
  };

  const fetchCurricula = async () => {
    const token = getAuthToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/academics/curricula`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setCurricula(await res.json());
    } catch {}
  };

  const fetchOfferings = async () => {
    const token = getAuthToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/academics/offerings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setOfferings(await res.json());
    } catch {}
  };

  const fetchCalendar = async () => {
    const token = getAuthToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/academics/calendar`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setCalendarEvents(await res.json());
    } catch {}
  };

  useEffect(() => {
    fetchClasses();
    fetchOverview();
  }, []);

  useEffect(() => {
    if (activeTab === 'curriculum') {
      fetchSubjects();
      fetchCurricula();
    } else if (activeTab === 'offerings') {
      fetchOfferings();
    } else if (activeTab === 'calendar') {
      fetchCalendar();
    }
  }, [activeTab]);

  // Handlers
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getAuthToken();
    try {
      const res = await fetch(`${API_URL}/academics/classes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newClassData),
      });
      if (res.ok) {
        setAlertMsg({ type: 'success', text: `Class ${newClassData.name} created successfully.` });
        setShowAddClassModal(false);
        setNewClassData({ name: '', code: '', orderIndex: 0 });
        fetchClasses();
        fetchOverview();
      } else {
        const err = await res.json();
        setAlertMsg({ type: 'danger', text: err.message || 'Failed to create class' });
      }
    } catch {
      setAlertMsg({ type: 'danger', text: 'Error submitting class form' });
    }
  };

  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getAuthToken();
    try {
      const res = await fetch(`${API_URL}/academics/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newSectionData),
      });
      if (res.ok) {
        setAlertMsg({ type: 'success', text: `Section ${newSectionData.name} created.` });
        setShowAddSectionModal(false);
        setNewSectionData({ classId: '', name: '', capacity: 40, roomNumber: '' });
        fetchClasses();
      } else {
        const err = await res.json();
        setAlertMsg({ type: 'danger', text: err.message || 'Failed to create section' });
      }
    } catch {
      setAlertMsg({ type: 'danger', text: 'Error submitting section' });
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getAuthToken();
    try {
      const res = await fetch(`${API_URL}/academics/subjects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newSubjectData),
      });
      if (res.ok) {
        setAlertMsg({ type: 'success', text: `Subject ${newSubjectData.name} added to catalog.` });
        setShowAddSubjectModal(false);
        setNewSubjectData({ name: '', code: '', shortName: '', category: 'CORE', creditHours: 3 });
        fetchSubjects();
        fetchOverview();
      } else {
        const err = await res.json();
        setAlertMsg({ type: 'danger', text: err.message || 'Failed to add subject' });
      }
    } catch {
      setAlertMsg({ type: 'danger', text: 'Error adding subject' });
    }
  };

  const handleCreateCalendarEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getAuthToken();
    try {
      const res = await fetch(`${API_URL}/academics/calendar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newEventData),
      });
      if (res.ok) {
        setAlertMsg({ type: 'success', text: `Calendar event "${newEventData.title}" scheduled.` });
        setShowAddEventModal(false);
        setNewEventData({
          title: '',
          description: '',
          category: 'EVENT',
          startDate: '',
          endDate: '',
          isHoliday: false,
          targetAudience: 'ALL',
          academicYearId: '',
        });
        fetchCalendar();
        fetchOverview();
      } else {
        const err = await res.json();
        setAlertMsg({ type: 'danger', text: err.message || 'Failed to schedule event' });
      }
    } catch {
      setAlertMsg({ type: 'danger', text: 'Error scheduling event' });
    }
  };

  const handleAssignClassTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getAuthToken();
    try {
      const res = await fetch(`${API_URL}/academics/sections/${assignTeacherData.sectionId}/class-teacher`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          teacherId: assignTeacherData.teacherId,
          academicYearId: assignTeacherData.academicYearId || overview?.activeYear?.id,
        }),
      });
      if (res.ok) {
        setAlertMsg({ type: 'success', text: 'Class teacher assigned successfully.' });
        setShowAssignTeacherModal(false);
        fetchClasses();
      } else {
        const err = await res.json();
        setAlertMsg({ type: 'danger', text: err.message || 'Failed to assign class teacher' });
      }
    } catch {
      setAlertMsg({ type: 'danger', text: 'Error assigning class teacher' });
    }
  };

  // Columns Definitions
  const rosterColumns: ColumnDef<any>[] = [
    {
      key: 'rollNumber',
      header: 'Roll #',
      sortable: true,
      width: '80px',
      render: (row) => (
        <span style={{ fontWeight: 600, color: 'var(--brand-primary)' }}>{row.rollNumber || 'N/A'}</span>
      ),
    },
    {
      key: 'admissionNumber',
      header: 'Admission #',
      sortable: true,
      width: '130px',
      render: (row) => (
        <span style={{ fontFamily: 'var(--font-mono)' }}>{row.admissionNumber || row.student?.admissionNumber}</span>
      ),
    },
    {
      key: 'studentName',
      header: 'Student Name',
      sortable: true,
      render: (row) => (
        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
          {row.name || `${row.student?.user?.firstName || ''} ${row.student?.user?.lastName || ''}`}
        </div>
      ),
    },
    {
      key: 'gender',
      header: 'Gender',
      width: '90px',
      render: (row) => (
        <span style={{ textTransform: 'capitalize', color: 'var(--text-secondary)' }}>
          {row.gender || row.student?.user?.gender || row.student?.gender || '-'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Enrollment Status',
      width: '120px',
      render: (row) => <Badge variant="success" size="sm" dot>{row.status || 'ACTIVE'}</Badge>,
    },
  ];

  const subjectsColumns: ColumnDef<any>[] = [
    { key: 'code', header: 'Subject Code', width: '110px', render: (r) => <strong style={{ fontFamily: 'var(--font-mono)' }}>{r.code}</strong> },
    { key: 'name', header: 'Subject Name', sortable: true },
    { key: 'shortName', header: 'Short Name', width: '100px', render: (r) => r.shortName || '-' },
    {
      key: 'category',
      header: 'Category',
      width: '120px',
      render: (r) => (
        <Badge variant={r.category === 'CORE' ? 'brand' : r.category === 'SCIENCE' ? 'info' : 'neutral'} size="sm">
          {r.category}
        </Badge>
      ),
    },
    { key: 'creditHours', header: 'Credits', width: '90px', render: (r) => r.creditHours || '3.0' },
    { key: 'isElective', header: 'Type', width: '100px', render: (r) => (r.isElective ? 'Elective' : 'Core') },
  ];

  const offeringsColumns: ColumnDef<any>[] = [
    { key: 'subject', header: 'Subject', render: (r) => <strong>{r.subject?.name} ({r.subject?.code})</strong> },
    { key: 'class', header: 'Class Grade', render: (r) => r.class?.name || '-' },
    { key: 'section', header: 'Section', render: (r) => r.section?.name || '-' },
    {
      key: 'teacher',
      header: 'Assigned Teacher',
      render: (r) =>
        r.primaryTeacher?.user ? (
          <span>{r.primaryTeacher.user.firstName} {r.primaryTeacher.user.lastName}</span>
        ) : (
          <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>
        ),
    },
    { key: 'weeklyPeriods', header: 'Weekly Periods', width: '120px', render: (r) => `${r.weeklyPeriods || 4} hrs/wk` },
    {
      key: 'status',
      header: 'Status',
      width: '100px',
      render: (r) => <Badge variant={r.status === 'ACTIVE' ? 'success' : 'neutral'} size="sm">{r.status}</Badge>,
    },
  ];

  const calendarColumns: ColumnDef<any>[] = [
    {
      key: 'dates',
      header: 'Event Dates',
      width: '180px',
      render: (r) => (
        <span style={{ fontSize: '0.8125rem' }}>
          {new Date(r.startDate).toLocaleDateString()} — {new Date(r.endDate).toLocaleDateString()}
        </span>
      ),
    },
    { key: 'title', header: 'Event Title', render: (r) => <strong>{r.title}</strong> },
    {
      key: 'category',
      header: 'Category',
      width: '130px',
      render: (r) => {
        const map: Record<string, any> = {
          HOLIDAY: 'danger',
          EXAMINATION: 'warning',
          EVENT: 'success',
          TERM_START: 'brand',
          TERM_END: 'brand',
        };
        return <Badge variant={map[r.category] || 'neutral'} size="sm">{r.category}</Badge>;
      },
    },
    {
      key: 'targetAudience',
      header: 'Audience',
      width: '110px',
      render: (r) => <span style={{ textTransform: 'capitalize' }}>{r.targetAudience?.toLowerCase()}</span>,
    },
    {
      key: 'isHoliday',
      header: 'Holiday?',
      width: '90px',
      render: (r) => (r.isHoliday ? <Badge variant="danger" size="sm">Holiday</Badge> : 'No'),
    },
  ];

  const tabs: TabItem[] = [
    { id: 'structure', label: 'Classes, Sections & Rosters', count: classes.length },
    { id: 'curriculum', label: 'Curriculum & Subjects', count: subjects.length },
    { id: 'offerings', label: 'Teacher Assignments & Offerings', count: offerings.length },
    { id: 'calendar', label: 'Academic Calendar & Events', count: calendarEvents.length },
  ];

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Academics & Rosters' }]} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Academic Command Center
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Multi-Campus Grade Levels, Sections, Curricula, Course Allocations & Academic Events
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button variant="secondary" size="sm" onClick={() => setShowAddClassModal(true)}>
            + Add Class
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShowAddSectionModal(true)}>
            + Add Section
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShowAddSubjectModal(true)}>
            + Add Subject
          </Button>
          <Button variant="primary" size="sm" onClick={() => setShowAddEventModal(true)}>
            + Calendar Event
          </Button>
        </div>
      </div>

      {alertMsg && (
        <Alert
          variant={alertMsg.type}
          title={alertMsg.type === 'success' ? 'Success' : 'Error'}
          style={{ marginBottom: 16 }}
        >
          {alertMsg.text}
        </Alert>
      )}

      {/* KPI Overview Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <Card padding="sm">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
            Academic Session
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
            {overview?.activeYear?.name || 'Active Term'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
            {overview?.totalYears || 1} Total Sessions Configured
          </div>
        </Card>

        <Card padding="sm">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
            Classes & Sections
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--brand-primary)', marginTop: 4 }}>
            {overview?.totalClasses || classes.length} Grades / {overview?.totalSections || 0} Secs
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Organized Across Campus
          </div>
        </Card>

        <Card padding="sm">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
            Subjects & Offerings
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#059669', marginTop: 4 }}>
            {overview?.totalSubjects || subjects.length} Master / {overview?.totalOfferings || 0} Active
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Curriculum & Electives
          </div>
        </Card>

        <Card padding="sm">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
            Scheduled Events
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#d97706', marginTop: 4 }}>
            {overview?.upcomingEventsCount || calendarEvents.length} Upcoming
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Holidays, Terms & Exams
          </div>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} style={{ marginBottom: 20 }} />

      {/* TAB 1: STRUCTURE & ROSTERS */}
      {activeTab === 'structure' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) 2fr', gap: 24 }}>
          {/* Classes Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                Grade Levels & Sections
              </h2>
            </div>

            {classes.length > 0 ? (
              classes.map((cls) => (
                <Card key={cls.id} padding="sm">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                        {cls.name}
                      </span>
                      <span style={{ marginLeft: 6, fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        ({cls.code})
                      </span>
                    </div>
                    {cls.nextClass && (
                      <Badge variant="brand" size="sm">Next: {cls.nextClass.name}</Badge>
                    )}
                  </div>

                  <div style={{ fontSize: '0.785rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                    Sections: {cls.sections?.length || 0} | Curriculum:{' '}
                    {cls.curricula?.[0]?.name || 'Standard Curriculum'}
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {cls.sections?.map((sec: any) => {
                      const isSelected = selectedSection === sec.id;
                      return (
                        <button
                          key={sec.id}
                          type="button"
                          onClick={() => {
                            setSelectedSectionName(`${cls.name} — Section ${sec.name}`);
                            loadRoster(sec.id);
                          }}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 'var(--radius-xs)',
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            border: `1px solid ${isSelected ? 'var(--brand-primary)' : 'var(--border-default)'}`,
                            backgroundColor: isSelected ? 'var(--brand-primary)' : 'var(--surface-subtle)',
                            color: isSelected ? '#ffffff' : 'var(--text-primary)',
                            cursor: 'pointer',
                          }}
                        >
                          Section {sec.name} ({sec._count?.enrollments || 0}/{sec.capacity || 40})
                        </button>
                      );
                    })}
                  </div>

                  {cls.sections?.length > 0 && (
                    <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px dashed var(--border-subtle)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Class Teacher:{' '}
                      <strong>
                        {cls.sections[0]?.classTeacher?.user
                          ? `${cls.sections[0].classTeacher.user.firstName} ${cls.sections[0].classTeacher.user.lastName}`
                          : 'Not assigned'}
                      </strong>
                    </div>
                  )}
                </Card>
              ))
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                {isLoadingClasses ? 'Loading academic classes...' : 'No classes configured.'}
              </div>
            )}
          </div>

          {/* Section Roster Column */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                Enrolled Roster: {selectedSectionName || 'Select a section'}
              </h2>
              {selectedSection && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setAssignTeacherData((prev) => ({ ...prev, sectionId: selectedSection }));
                    setShowAssignTeacherModal(true);
                  }}
                >
                  Assign Class Teacher
                </Button>
              )}
            </div>

            <DataTable
              columns={rosterColumns}
              data={roster}
              isLoading={isLoadingRoster}
              searchPlaceholder="Search enrolled students by name or roll number..."
              emptyTitle="No students in this section"
              emptyDescription="There are currently no active student enrollments assigned to this section."
            />
          </div>
        </div>
      )}

      {/* TAB 2: CURRICULUM & SUBJECTS */}
      {activeTab === 'curriculum' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Master Course & Subject Catalog
            </h2>
            <Button variant="primary" size="sm" onClick={() => setShowAddSubjectModal(true)}>
              + Add New Subject
            </Button>
          </div>

          <DataTable
            columns={subjectsColumns}
            data={subjects}
            searchPlaceholder="Search catalog by name, subject code, or category..."
            emptyTitle="No subjects registered"
            emptyDescription="Create your institution's core curriculum and elective courses."
          />

          {curricula.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12 }}>Grade-Level Curricula</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                {curricula.map((curr) => (
                  <Card key={curr.id} padding="sm">
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{curr.name} ({curr.code})</div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                      Grade: {curr.class?.name} | Version: {curr.version}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Allocated Courses: {curr.subjects?.length || 0}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: OFFERINGS & ASSIGNMENTS */}
      {activeTab === 'offerings' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                Subject Offerings & Teacher Teaching Loads
              </h2>
              <p style={{ margin: '2px 0 0', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                Course instances offered per section with primary educators and weekly teaching periods
              </p>
            </div>
          </div>

          <DataTable
            columns={offeringsColumns}
            data={offerings}
            searchPlaceholder="Search course offerings by subject or teacher..."
            emptyTitle="No subject offerings initialized"
            emptyDescription="Initialize subject offerings across class sections to schedule periods."
          />
        </div>
      )}

      {/* TAB 4: ACADEMIC CALENDAR */}
      {activeTab === 'calendar' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                Institutional Academic Calendar
              </h2>
              <p style={{ margin: '2px 0 0', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                Term dates, examination windows, school events, and public holidays
              </p>
            </div>
            <Button variant="primary" size="sm" onClick={() => setShowAddEventModal(true)}>
              + Schedule Calendar Event
            </Button>
          </div>

          <DataTable
            columns={calendarColumns}
            data={calendarEvents}
            searchPlaceholder="Search events by title or category..."
            emptyTitle="No calendar events scheduled"
            emptyDescription="Add examination dates, holidays, and academic milestone events."
          />
        </div>
      )}

      {/* MODAL: ADD CLASS */}
      <Modal isOpen={showAddClassModal} onClose={() => setShowAddClassModal(false)} title="Create Grade Level Class">
        <form onSubmit={handleCreateClass} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            label="Class Name"
            placeholder="e.g. Grade 10"
            required
            value={newClassData.name}
            onChange={(e) => setNewClassData({ ...newClassData, name: e.target.value })}
          />
          <Input
            label="Class Code"
            placeholder="e.g. G10"
            required
            value={newClassData.code}
            onChange={(e) => setNewClassData({ ...newClassData, code: e.target.value })}
          />
          <Input
            label="Progression Order Index"
            type="number"
            value={newClassData.orderIndex}
            onChange={(e) => setNewClassData({ ...newClassData, orderIndex: parseInt(e.target.value, 10) || 0 })}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
            <Button variant="secondary" onClick={() => setShowAddClassModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Create Class</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: ADD SECTION */}
      <Modal isOpen={showAddSectionModal} onClose={() => setShowAddSectionModal(false)} title="Add Section to Class">
        <form onSubmit={handleCreateSection} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Select
            label="Grade Level Class"
            required
            value={newSectionData.classId}
            onChange={(e) => setNewSectionData({ ...newSectionData, classId: e.target.value })}
            options={[{ label: 'Select Grade Class', value: '' }, ...classes.map((c) => ({ label: c.name, value: c.id }))]}
          />
          <Input
            label="Section Name / Code"
            placeholder="e.g. Section A"
            required
            value={newSectionData.name}
            onChange={(e) => setNewSectionData({ ...newSectionData, name: e.target.value })}
          />
          <Input
            label="Maximum Student Capacity"
            type="number"
            required
            value={newSectionData.capacity}
            onChange={(e) => setNewSectionData({ ...newSectionData, capacity: parseInt(e.target.value, 10) || 40 })}
          />
          <Input
            label="Room / Classroom Number"
            placeholder="e.g. Room 302"
            value={newSectionData.roomNumber}
            onChange={(e) => setNewSectionData({ ...newSectionData, roomNumber: e.target.value })}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
            <Button variant="secondary" onClick={() => setShowAddSectionModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Create Section</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: ADD SUBJECT */}
      <Modal isOpen={showAddSubjectModal} onClose={() => setShowAddSubjectModal(false)} title="Register Catalog Subject">
        <form onSubmit={handleCreateSubject} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            label="Subject Name"
            placeholder="e.g. Advanced Physics"
            required
            value={newSubjectData.name}
            onChange={(e) => setNewSubjectData({ ...newSubjectData, name: e.target.value })}
          />
          <Input
            label="Subject Code"
            placeholder="e.g. PHY-201"
            required
            value={newSubjectData.code}
            onChange={(e) => setNewSubjectData({ ...newSubjectData, code: e.target.value })}
          />
          <Input
            label="Short Name / Acronym"
            placeholder="e.g. PHY"
            value={newSubjectData.shortName}
            onChange={(e) => setNewSubjectData({ ...newSubjectData, shortName: e.target.value })}
          />
          <Select
            label="Academic Category"
            value={newSubjectData.category}
            onChange={(e) => setNewSubjectData({ ...newSubjectData, category: e.target.value })}
            options={[
              { label: 'Core Academic', value: 'CORE' },
              { label: 'Elective', value: 'ELECTIVE' },
              { label: 'Science & Lab', value: 'SCIENCE' },
              { label: 'Language & Literature', value: 'LANGUAGE' },
              { label: 'Humanities & Social', value: 'HUMANITIES' },
              { label: 'Computing & Tech', value: 'COMPUTING' },
              { label: 'Co-Curricular', value: 'CO_CURRICULAR' },
            ]}
          />
          <Input
            label="Credit Hours"
            type="number"
            step="0.5"
            value={newSubjectData.creditHours}
            onChange={(e) => setNewSubjectData({ ...newSubjectData, creditHours: parseFloat(e.target.value) || 3 })}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
            <Button variant="secondary" onClick={() => setShowAddSubjectModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Save Subject</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: ADD CALENDAR EVENT */}
      <Modal isOpen={showAddEventModal} onClose={() => setShowAddEventModal(false)} title="Schedule Academic Calendar Event">
        <form onSubmit={handleCreateCalendarEvent} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            label="Event Title"
            placeholder="e.g. Mid-Term Examinations"
            required
            value={newEventData.title}
            onChange={(e) => setNewEventData({ ...newEventData, title: e.target.value })}
          />
          <Select
            label="Category"
            value={newEventData.category}
            onChange={(e) => setNewEventData({ ...newEventData, category: e.target.value })}
            options={[
              { label: 'General Event', value: 'EVENT' },
              { label: 'Official Holiday', value: 'HOLIDAY' },
              { label: 'Examination Period', value: 'EXAMINATION' },
              { label: 'Term Commencement', value: 'TERM_START' },
              { label: 'Term Conclusion', value: 'TERM_END' },
              { label: 'Staff Development', value: 'STAFF_DEVELOPMENT' },
            ]}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input
              label="Start Date"
              type="date"
              required
              value={newEventData.startDate}
              onChange={(e) => setNewEventData({ ...newEventData, startDate: e.target.value })}
            />
            <Input
              label="End Date"
              type="date"
              required
              value={newEventData.endDate}
              onChange={(e) => setNewEventData({ ...newEventData, endDate: e.target.value })}
            />
          </div>
          <Select
            label="Target Audience"
            value={newEventData.targetAudience}
            onChange={(e) => setNewEventData({ ...newEventData, targetAudience: e.target.value })}
            options={[
              { label: 'Entire Institution (All)', value: 'ALL' },
              { label: 'Students Only', value: 'STUDENTS' },
              { label: 'Faculty & Teachers', value: 'TEACHERS' },
              { label: 'Parents', value: 'PARENTS' },
            ]}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={newEventData.isHoliday}
              onChange={(e) => setNewEventData({ ...newEventData, isHoliday: e.target.checked })}
            />
            <span>Designate as Official School Holiday (No Classes)</span>
          </label>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
            <Button variant="secondary" onClick={() => setShowAddEventModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Schedule Event</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: ASSIGN CLASS TEACHER */}
      <Modal isOpen={showAssignTeacherModal} onClose={() => setShowAssignTeacherModal(false)} title="Assign Class Teacher">
        <form onSubmit={handleAssignClassTeacher} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            label="Teacher Profile ID / Employee Code"
            placeholder="Enter Teacher Profile ID"
            required
            value={assignTeacherData.teacherId}
            onChange={(e) => setAssignTeacherData({ ...assignTeacherData, teacherId: e.target.value })}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
            <Button variant="secondary" onClick={() => setShowAssignTeacherModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Confirm Assignment</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
