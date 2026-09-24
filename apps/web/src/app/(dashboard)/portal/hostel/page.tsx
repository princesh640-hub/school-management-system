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
import { Tabs } from '@/components/ui/Tabs';
import { DataTable, Column } from '@/components/data-table/DataTable';
import { TableSkeleton } from '@/components/feedback/LoadingSkeleton';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const parseArr = (json: any) => Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : (Array.isArray(json?.items) ? json.items : []));

// Tab Configuration
const HOSTEL_TABS = [
  { id: 'overview', label: '🏨 Hostel Overview' },
  { id: 'hostels', label: 'Hostels & Wings' },
  { id: 'rooms', label: 'Rooms & Beds' },
  { id: 'residents', label: 'Residents & Allocations' },
  { id: 'attendance', label: 'Night Roll Call' },
  { id: 'outings', label: 'Outings & Curfew' },
  { id: 'visitors', label: 'Visitors' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'incidents', label: 'Incidents' },
  { id: 'wardens', label: 'Wardens & Staff' },
];

export default function HostelPage() {
  const [activeTab, setActiveTab] = useState('overview');

  // Global State
  const [dashboardSummary, setDashboardSummary] = useState<any | null>(null);
  const [hostels, setHostels] = useState<any[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [beds, setBeds] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [attendanceRoster, setAttendanceRoster] = useState<any[]>([]);
  const [outings, setOutings] = useState<any[]>([]);
  const [visitors, setVisitors] = useState<any[]>([]);
  const [maintenances, setMaintenances] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [wardens, setWardens] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [globalMsg, setGlobalMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  // Selected filters
  const [selectedHostelId, setSelectedHostelId] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);

  // Modals
  const [showHostelModal, setShowHostelModal] = useState(false);
  const [hName, setHName] = useState('');
  const [hCode, setHCode] = useState('');
  const [hType, setHType] = useState('COED');
  const [hCapacity, setHCapacity] = useState('');
  const [isSubmittingHostel, setIsSubmittingHostel] = useState(false);

  const [showRoomModal, setShowRoomModal] = useState(false);
  const [rHostelId, setRHostelId] = useState('');
  const [rNumber, setRNumber] = useState('');
  const [rType, setRType] = useState('SHARED_ROOM');
  const [rGender, setRGender] = useState('ANY');
  const [rCapacity, setRCapacity] = useState('2');
  const [rFee, setRFee] = useState('');
  const [rAutoBeds, setRAutoBeds] = useState(true);
  const [isSubmittingRoom, setIsSubmittingRoom] = useState(false);

  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [aStudentId, setAStudentId] = useState('');
  const [aRoomId, setARoomId] = useState('');
  const [aEffectiveFrom, setAEffectiveFrom] = useState(new Date().toISOString().split('T')[0]);
  const [aOverride, setAOverride] = useState(false);
  const [aOverrideReason, setAOverrideReason] = useState('');
  const [isSubmittingAllocate, setIsSubmittingAllocate] = useState(false);

  const [showOutingModal, setShowOutingModal] = useState(false);
  const [oStudentId, setOStudentId] = useState('');
  const [oHostelId, setOHostelId] = useState('');
  const [oType, setOType] = useState('DAY_OUTING');
  const [oStart, setOStart] = useState('');
  const [oReturn, setOReturn] = useState('');
  const [oDestination, setODestination] = useState('');
  const [oReason, setOReason] = useState('');
  const [isSubmittingOuting, setIsSubmittingOuting] = useState(false);

  const [showVisitorModal, setShowVisitorModal] = useState(false);
  const [vStudentId, setVStudentId] = useState('');
  const [vHostelId, setVHostelId] = useState('');
  const [vName, setVName] = useState('');
  const [vRelationship, setVRelationship] = useState('');
  const [vPurpose, setVPurpose] = useState('');
  const [vPhone, setVPhone] = useState('');
  const [isSubmittingVisitor, setIsSubmittingVisitor] = useState(false);

  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [mHostelId, setMHostelId] = useState('');
  const [mCategory, setMCategory] = useState('Plumbing');
  const [mDescription, setMDescription] = useState('');
  const [mPriority, setMPriority] = useState('MEDIUM');
  const [isSubmittingMaint, setIsSubmittingMaint] = useState(false);

  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [iHostelId, setIHostelId] = useState('');
  const [iCategory, setICategory] = useState('Discipline');
  const [iDescription, setIDescription] = useState('');
  const [iSeverity, setISeverity] = useState('LOW');
  const [isSubmittingIncident, setIsSubmittingIncident] = useState(false);

  const getToken = () =>
    typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;

  const fetchAllData = async () => {
    setIsLoading(true);
    const token = getToken();
    if (!token) { setIsLoading(false); return; }
    const h = { Authorization: `Bearer ${token}` };

    try {
      const [
        summaryRes, hostelsRes, buildingsRes, roomsRes, bedsRes,
        allocRes, outingsRes, visitorsRes, maintRes, incRes, wardensRes,
      ] = await Promise.all([
        fetch(`${API_URL}/hostel/reports/dashboard`, { headers: h }).catch(() => null),
        fetch(`${API_URL}/hostel/hostels`, { headers: h }).catch(() => null),
        fetch(`${API_URL}/hostel/buildings`, { headers: h }).catch(() => null),
        fetch(`${API_URL}/hostel/rooms`, { headers: h }).catch(() => null),
        fetch(`${API_URL}/hostel/beds`, { headers: h }).catch(() => null),
        fetch(`${API_URL}/hostel/allocations`, { headers: h }).catch(() => null),
        fetch(`${API_URL}/hostel/outings`, { headers: h }).catch(() => null),
        fetch(`${API_URL}/hostel/visitors`, { headers: h }).catch(() => null),
        fetch(`${API_URL}/hostel/maintenance`, { headers: h }).catch(() => null),
        fetch(`${API_URL}/hostel/incidents`, { headers: h }).catch(() => null),
        fetch(`${API_URL}/hostel/wardens`, { headers: h }).catch(() => null),
      ]);

      if (summaryRes?.ok) setDashboardSummary(await summaryRes.json());
      if (hostelsRes?.ok) {
        const hData = parseArr(await hostelsRes.json());
        setHostels(hData);
        if (hData.length && !selectedHostelId) {
          setSelectedHostelId(hData[0].id);
        }
      }
      if (buildingsRes?.ok) setBuildings(parseArr(await buildingsRes.json()));
      if (roomsRes?.ok) setRooms(parseArr(await roomsRes.json()));
      if (bedsRes?.ok) setBeds(parseArr(await bedsRes.json()));
      if (allocRes?.ok) setAllocations(parseArr(await allocRes.json()));
      if (outingsRes?.ok) setOutings(parseArr(await outingsRes.json()));
      if (visitorsRes?.ok) setVisitors(parseArr(await visitorsRes.json()));
      if (maintRes?.ok) setMaintenances(parseArr(await maintRes.json()));
      if (incRes?.ok) setIncidents(parseArr(await incRes.json()));
      if (wardensRes?.ok) setWardens(parseArr(await wardensRes.json()));
    } catch (err) {
      console.error('Hostel data fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRoster = async (hostelId: string, date: string) => {
    if (!hostelId) return;
    const token = getToken();
    try {
      const res = await fetch(`${API_URL}/hostel/attendance/roster?hostelId=${hostelId}&date=${date}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setAttendanceRoster(parseArr(await res.json()));
    } catch (e) {
      console.error('Roster error:', e);
    }
  };

  useEffect(() => { fetchAllData(); }, []);

  useEffect(() => {
    if (selectedHostelId) fetchRoster(selectedHostelId, attendanceDate);
  }, [selectedHostelId, attendanceDate]);

  const authPost = async (url: string, body: any) => {
    const token = getToken();
    const res = await fetch(`${API_URL}${url}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Request failed');
    }
    return res.json();
  };

  const authPatch = async (url: string, body: any = {}) => {
    const token = getToken();
    const res = await fetch(`${API_URL}${url}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Request failed');
    }
    return res.json();
  };

  // Handlers
  const handleCreateHostel = async () => {
    if (!hName || !hCode) {
      setGlobalMsg({ type: 'danger', text: 'Name and Code are required.' });
      return;
    }
    setIsSubmittingHostel(true);
    try {
      await authPost('/hostel/hostels', {
        name: hName,
        code: hCode,
        hostelType: hType,
        capacity: hCapacity ? parseInt(hCapacity) : 0,
      });
      setGlobalMsg({ type: 'success', text: 'Hostel created successfully.' });
      setShowHostelModal(false);
      setHName(''); setHCode(''); setHCapacity('');
      fetchAllData();
    } catch (e: any) {
      setGlobalMsg({ type: 'danger', text: e.message });
    } finally {
      setIsSubmittingHostel(false);
    }
  };

  const handleCreateRoom = async () => {
    if (!rHostelId || !rNumber || !rCapacity) {
      setGlobalMsg({ type: 'danger', text: 'Hostel, Room Number, and Capacity are required.' });
      return;
    }
    setIsSubmittingRoom(true);
    try {
      await authPost('/hostel/rooms', {
        hostelId: rHostelId,
        roomNumber: rNumber,
        roomType: rType,
        genderEligibility: rGender,
        capacity: parseInt(rCapacity),
        feeAmount: rFee ? parseFloat(rFee) : undefined,
        autoCreateBeds: rAutoBeds,
      });
      setGlobalMsg({ type: 'success', text: 'Room created with beds.' });
      setShowRoomModal(false);
      setRNumber(''); setRFee('');
      fetchAllData();
    } catch (e: any) {
      setGlobalMsg({ type: 'danger', text: e.message });
    } finally {
      setIsSubmittingRoom(false);
    }
  };

  const handleAllocateStudent = async () => {
    if (!aStudentId || !aRoomId || !aEffectiveFrom) {
      setGlobalMsg({ type: 'danger', text: 'Student, Room, and Effective Date are required.' });
      return;
    }
    setIsSubmittingAllocate(true);
    try {
      await authPost('/hostel/allocations', {
        studentId: aStudentId,
        roomId: aRoomId,
        effectiveFrom: aEffectiveFrom,
        isOverride: aOverride,
        overrideReason: aOverride ? aOverrideReason : undefined,
      });
      setGlobalMsg({ type: 'success', text: 'Student allocated to room.' });
      setShowAllocateModal(false);
      setAStudentId(''); setARoomId(''); setAOverride(false); setAOverrideReason('');
      fetchAllData();
    } catch (e: any) {
      setGlobalMsg({ type: 'danger', text: e.message });
    } finally {
      setIsSubmittingAllocate(false);
    }
  };

  const handleCheckIn = async (id: string) => {
    try {
      await authPatch(`/hostel/allocations/${id}/check-in`);
      setGlobalMsg({ type: 'success', text: 'Resident checked in.' });
      fetchAllData();
    } catch (e: any) {
      setGlobalMsg({ type: 'danger', text: e.message });
    }
  };

  const handleCheckOut = async (id: string) => {
    const reason = prompt('Enter check-out reason:');
    if (!reason) return;
    try {
      await authPatch(`/hostel/allocations/${id}/check-out`, { reason });
      setGlobalMsg({ type: 'success', text: 'Resident checked out and bed released.' });
      fetchAllData();
    } catch (e: any) {
      setGlobalMsg({ type: 'danger', text: e.message });
    }
  };

  const handleMarkAllPresent = async () => {
    if (!attendanceRoster.length) return;
    try {
      const records = attendanceRoster.map((r) => ({
        studentId: r.studentId,
        roomId: r.roomId,
        status: 'PRESENT',
      }));
      await authPost('/hostel/attendance/bulk', {
        hostelId: selectedHostelId,
        date: attendanceDate,
        session: 'NIGHT_ROLL_CALL',
        records,
      });
      setGlobalMsg({ type: 'success', text: 'All residents marked PRESENT for tonight.' });
      fetchRoster(selectedHostelId, attendanceDate);
      fetchAllData();
    } catch (e: any) {
      setGlobalMsg({ type: 'danger', text: e.message });
    }
  };

  const handleCreateOuting = async () => {
    if (!oStudentId || !oHostelId || !oStart || !oReturn || !oReason) {
      setGlobalMsg({ type: 'danger', text: 'Please fill all required fields.' });
      return;
    }
    setIsSubmittingOuting(true);
    try {
      await authPost('/hostel/outings', {
        studentId: oStudentId,
        hostelId: oHostelId,
        outingType: oType,
        startDate: oStart,
        expectedReturn: oReturn,
        destination: oDestination || undefined,
        reason: oReason,
      });
      setGlobalMsg({ type: 'success', text: 'Outing request submitted.' });
      setShowOutingModal(false);
      setOStudentId(''); setOReason(''); setODestination('');
      fetchAllData();
    } catch (e: any) {
      setGlobalMsg({ type: 'danger', text: e.message });
    } finally {
      setIsSubmittingOuting(false);
    }
  };

  const handleApproveOuting = async (id: string, approved: boolean) => {
    try {
      await authPatch(`/hostel/outings/${id}/approve`, { approved });
      setGlobalMsg({ type: 'success', text: `Outing ${approved ? 'approved' : 'rejected'}.` });
      fetchAllData();
    } catch (e: any) {
      setGlobalMsg({ type: 'danger', text: e.message });
    }
  };

  const handleOutingReturn = async (id: string) => {
    try {
      await authPatch(`/hostel/outings/${id}/return`);
      setGlobalMsg({ type: 'success', text: 'Resident return recorded.' });
      fetchAllData();
    } catch (e: any) {
      setGlobalMsg({ type: 'danger', text: e.message });
    }
  };

  const handleCreateVisitor = async () => {
    if (!vStudentId || !vHostelId || !vName || !vPurpose) {
      setGlobalMsg({ type: 'danger', text: 'Please fill all required fields.' });
      return;
    }
    setIsSubmittingVisitor(true);
    try {
      await authPost('/hostel/visitors', {
        studentId: vStudentId,
        hostelId: vHostelId,
        visitorName: vName,
        relationship: vRelationship || undefined,
        contactPhone: vPhone || undefined,
        visitDate: new Date().toISOString(),
        purpose: vPurpose,
      });
      setGlobalMsg({ type: 'success', text: 'Visitor registered.' });
      setShowVisitorModal(false);
      setVName(''); setVPurpose('');
      fetchAllData();
    } catch (e: any) {
      setGlobalMsg({ type: 'danger', text: e.message });
    } finally {
      setIsSubmittingVisitor(false);
    }
  };

  const handleCreateMaintenance = async () => {
    if (!mHostelId || !mDescription) {
      setGlobalMsg({ type: 'danger', text: 'Hostel and description are required.' });
      return;
    }
    setIsSubmittingMaint(true);
    try {
      await authPost('/hostel/maintenance', {
        hostelId: mHostelId,
        issueCategory: mCategory,
        description: mDescription,
        priority: mPriority,
      });
      setGlobalMsg({ type: 'success', text: 'Maintenance request created.' });
      setShowMaintenanceModal(false);
      setMDescription('');
      fetchAllData();
    } catch (e: any) {
      setGlobalMsg({ type: 'danger', text: e.message });
    } finally {
      setIsSubmittingMaint(false);
    }
  };

  const handleCreateIncident = async () => {
    if (!iHostelId || !iDescription) {
      setGlobalMsg({ type: 'danger', text: 'Hostel and description are required.' });
      return;
    }
    setIsSubmittingIncident(true);
    try {
      await authPost('/hostel/incidents', {
        hostelId: iHostelId,
        incidentDate: new Date().toISOString(),
        category: iCategory,
        description: iDescription,
        severity: iSeverity,
      });
      setGlobalMsg({ type: 'success', text: 'Incident reported.' });
      setShowIncidentModal(false);
      setIDescription('');
      fetchAllData();
    } catch (e: any) {
      setGlobalMsg({ type: 'danger', text: e.message });
    } finally {
      setIsSubmittingIncident(false);
    }
  };

  // Columns
  const hostelColumns: Column<any>[] = [
    { key: 'code', header: 'Code', render: (r) => <code>{r.code}</code> },
    { key: 'name', header: 'Hostel Name', render: (r) => <strong>{r.name}</strong> },
    { key: 'hostelType', header: 'Type', render: (r) => <Badge variant="info" text={r.hostelType} /> },
    { key: 'capacity', header: 'Capacity', render: (r) => `${r.capacity} Beds` },
    { key: 'roomsCount', header: 'Rooms', render: (r) => r._count?.rooms ?? '—' },
    { key: 'status', header: 'Status', render: (r) => <Badge variant={r.status === 'ACTIVE' ? 'success' : 'warning'} text={r.status} /> },
  ];

  const roomColumns: Column<any>[] = [
    { key: 'roomNumber', header: 'Room No.', render: (r) => <strong>{r.roomNumber}</strong> },
    { key: 'hostel', header: 'Hostel', render: (r) => r.hostel?.name || '—' },
    { key: 'roomType', header: 'Type', render: (r) => <Badge variant="info" text={r.roomType?.replace('_', ' ')} /> },
    { key: 'gender', header: 'Eligibility', render: (r) => r.genderEligibility },
    { key: 'capacity', header: 'Capacity', render: (r) => `${r._count?.allocations || 0} / ${r.capacity} Beds` },
    { key: 'status', header: 'Status', render: (r) => (
      <Badge
        variant={r.status === 'AVAILABLE' ? 'success' : r.status === 'FULL' ? 'warning' : 'danger'}
        text={r.status}
      />
    )},
  ];

  const residentColumns: Column<any>[] = [
    { key: 'allocNo', header: 'Allocation No.', render: (r) => <code>{r.allocationNumber}</code> },
    { key: 'student', header: 'Student', render: (r) => r.student?.user ? `${r.student.user.firstName} ${r.student.user.lastName}` : '—' },
    { key: 'admission', header: 'Adm No.', render: (r) => r.student?.admissionNumber || '—' },
    { key: 'hostel', header: 'Hostel', render: (r) => r.hostel?.name || '—' },
    { key: 'room', header: 'Room / Bed', render: (r) => `${r.room?.roomNumber || '—'} / ${r.bed?.bedNumber || 'No Bed'}` },
    { key: 'status', header: 'Status', render: (r) => (
      <Badge
        variant={r.status === 'ACTIVE' ? 'success' : r.status === 'RESERVED' ? 'info' : 'neutral'}
        text={r.status}
      />
    )},
    { key: 'actions', header: 'Actions', render: (r) => (
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {r.status === 'RESERVED' && (
          <Button size="sm" variant="outline" onClick={() => handleCheckIn(r.id)}>Check In</Button>
        )}
        {r.status === 'ACTIVE' && (
          <Button size="sm" variant="outline" onClick={() => handleCheckOut(r.id)}>Check Out</Button>
        )}
      </div>
    )},
  ];

  const outingColumns: Column<any>[] = [
    { key: 'outingNo', header: 'Outing No.', render: (r) => <code>{r.outingNumber}</code> },
    { key: 'student', header: 'Student', render: (r) => r.student?.user ? `${r.student.user.firstName} ${r.student.user.lastName}` : '—' },
    { key: 'type', header: 'Type', render: (r) => <Badge variant="info" text={r.outingType?.replace('_', ' ')} /> },
    { key: 'return', header: 'Expected Return', render: (r) => new Date(r.expectedReturn).toLocaleString() },
    { key: 'status', header: 'Status', render: (r) => (
      <Badge
        variant={r.status === 'RETURNED' ? 'success' : r.status === 'LATE_RETURN' ? 'danger' : r.status === 'OUT' ? 'warning' : 'info'}
        text={r.status}
      />
    )},
    { key: 'actions', header: 'Actions', render: (r) => (
      <div style={{ display: 'flex', gap: '0.25rem' }}>
        {r.status === 'SUBMITTED' && (
          <>
            <Button size="sm" variant="outline" onClick={() => handleApproveOuting(r.id, true)}>Approve</Button>
            <Button size="sm" variant="outline" onClick={() => handleApproveOuting(r.id, false)}>Reject</Button>
          </>
        )}
        {r.status === 'OUT' && (
          <Button size="sm" variant="outline" onClick={() => handleOutingReturn(r.id)}>Record Return</Button>
        )}
      </div>
    )},
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <Breadcrumbs
            items={[
              { label: 'Portal', href: '/portal/dashboard' },
              { label: 'Operations', href: '/portal/operations' },
              { label: 'Hostel & Housing' },
            ]}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--neutral-900)', margin: 0 }}>
              Hostel Management
            </h1>
            <Badge variant="success" text="Phase 4K — Active" />
          </div>
          <p style={{ color: 'var(--neutral-500)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Buildings, rooms, bed allocations, night roll-call attendance, curfews, visitors, and facility maintenance.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Button variant="outline" onClick={fetchAllData}>↻ Refresh</Button>
          <Button variant="primary" onClick={() => setShowAllocateModal(true)}>+ Allocate Resident</Button>
        </div>
      </div>

      {globalMsg && (
        <Alert variant={globalMsg.type} onClose={() => setGlobalMsg(null)}>{globalMsg.text}</Alert>
      )}

      {/* Tabs */}
      <Card bodyStyle={{ padding: '0.75rem 1rem 0' }}>
        <Tabs tabs={HOSTEL_TABS} activeTab={activeTab} onChange={setActiveTab} />
      </Card>

      {/* ========== TAB: OVERVIEW ========== */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            {[
              { label: 'Hostels', value: dashboardSummary?.totalHostels ?? '—', sub: `${dashboardSummary?.totalBuildings ?? 0} Wings/Blocks`, color: 'var(--neutral-900)' },
              { label: 'Bed Capacity', value: dashboardSummary?.totalBeds ?? '—', sub: `${dashboardSummary?.totalRooms ?? 0} Total Rooms`, color: 'var(--primary-600)' },
              { label: 'Occupied Beds', value: dashboardSummary?.occupiedBeds ?? '—', sub: `${dashboardSummary?.occupancyRate ?? 0}% Occupancy Rate`, color: 'var(--warning-600)' },
              { label: 'Available Beds', value: dashboardSummary?.availableBeds ?? '—', sub: 'Ready for allocation', color: 'var(--success-600)' },
              { label: 'Students on Outing', value: dashboardSummary?.studentsOnOuting ?? '—', sub: `${dashboardSummary?.pendingOutings ?? 0} Pending Approval`, color: 'var(--info-600)' },
              { label: 'Open Incidents', value: dashboardSummary?.openIncidents ?? '—', sub: `${dashboardSummary?.openMaintenanceRequests ?? 0} Maintenance Requests`, color: 'var(--danger-600)' },
            ].map((kpi, i) => (
              <Card key={i}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--neutral-500)', textTransform: 'uppercase' }}>{kpi.label}</div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: kpi.color, margin: '0.25rem 0' }}>{kpi.value}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--neutral-400)' }}>{kpi.sub}</div>
              </Card>
            ))}
          </div>

          <Card title="Quick Actions">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              <Button variant="outline" onClick={() => { setActiveTab('hostels'); setShowHostelModal(true); }}>+ New Hostel</Button>
              <Button variant="outline" onClick={() => { setActiveTab('rooms'); setShowRoomModal(true); }}>+ Add Room</Button>
              <Button variant="outline" onClick={() => { setActiveTab('residents'); setShowAllocateModal(true); }}>+ Allocate Bed</Button>
              <Button variant="outline" onClick={() => setActiveTab('attendance')}>📋 Night Roll Call</Button>
              <Button variant="outline" onClick={() => { setActiveTab('outings'); setShowOutingModal(true); }}>🚶 Request Outing</Button>
              <Button variant="outline" onClick={() => { setActiveTab('visitors'); setShowVisitorModal(true); }}>👤 Log Visitor</Button>
              <Button variant="outline" onClick={() => { setActiveTab('maintenance'); setShowMaintenanceModal(true); }}>🔧 Maintenance</Button>
              <Button variant="outline" onClick={() => { setActiveTab('incidents'); setShowIncidentModal(true); }}>⚠ Report Incident</Button>
            </div>
          </Card>
        </div>
      )}

      {/* ========== TAB: HOSTELS ========== */}
      {activeTab === 'hostels' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Card
            title="Hostel Facilities"
            subtitle="Campus boarding institutions"
            headerAction={<Button variant="primary" size="sm" onClick={() => setShowHostelModal(true)}>+ New Hostel</Button>}
          >
            {isLoading ? <TableSkeleton rows={4} /> : (
              <DataTable data={hostels} columns={hostelColumns} emptyText="No hostels configured." />
            )}
          </Card>
        </div>
      )}

      {/* ========== TAB: ROOMS ========== */}
      {activeTab === 'rooms' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Card
            title="Room Inventory"
            subtitle="Dormitories and shared quarters"
            headerAction={<Button variant="primary" size="sm" onClick={() => setShowRoomModal(true)}>+ Add Room</Button>}
          >
            {isLoading ? <TableSkeleton rows={5} /> : (
              <DataTable data={rooms} columns={roomColumns} emptyText="No rooms configured." />
            )}
          </Card>
        </div>
      )}

      {/* ========== TAB: RESIDENTS ========== */}
      {activeTab === 'residents' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Card
            title="Resident Allocations"
            subtitle="Active student room assignments"
            headerAction={<Button variant="primary" size="sm" onClick={() => setShowAllocateModal(true)}>+ Allocate Student</Button>}
          >
            {isLoading ? <TableSkeleton rows={6} /> : (
              <DataTable data={allocations} columns={residentColumns} emptyText="No allocations found." />
            )}
          </Card>
        </div>
      )}

      {/* ========== TAB: ATTENDANCE ========== */}
      {activeTab === 'attendance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Card
            title="Night Roll Call Sheet"
            subtitle="Daily evening hostel presence check"
            headerAction={
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <Input type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} />
                <Button variant="primary" size="sm" onClick={handleMarkAllPresent}>Mark All Present</Button>
              </div>
            }
          >
            {isLoading ? <TableSkeleton rows={6} /> : (
              <DataTable
                data={attendanceRoster}
                columns={[
                  { key: 'adm', header: 'Adm No.', render: (r) => r.admissionNumber },
                  { key: 'name', header: 'Student Name', render: (r) => <strong>{r.studentName}</strong> },
                  { key: 'room', header: 'Room / Bed', render: (r) => `${r.roomNumber} / ${r.bedNumber || '—'}` },
                  { key: 'status', header: 'Status', render: (r) => (
                    <Badge
                      variant={r.status === 'PRESENT' ? 'success' : r.status === 'OUT' ? 'warning' : 'danger'}
                      text={r.status}
                    />
                  )},
                ]}
                emptyText="No residents in selected hostel."
              />
            )}
          </Card>
        </div>
      )}

      {/* ========== TAB: OUTINGS ========== */}
      {activeTab === 'outings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Card
            title="Outing & Curfew Logs"
            subtitle="Student departure and return tracking"
            headerAction={<Button variant="primary" size="sm" onClick={() => setShowOutingModal(true)}>+ Request Outing</Button>}
          >
            {isLoading ? <TableSkeleton rows={5} /> : (
              <DataTable data={outings} columns={outingColumns} emptyText="No outing requests." />
            )}
          </Card>
        </div>
      )}

      {/* ========== TAB: VISITORS ========== */}
      {activeTab === 'visitors' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Card
            title="Hostel Visitor Register"
            subtitle="Authorized guest entries"
            headerAction={<Button variant="primary" size="sm" onClick={() => setShowVisitorModal(true)}>+ Log Visitor</Button>}
          >
            {isLoading ? <TableSkeleton rows={5} /> : (
              <DataTable
                data={visitors}
                columns={[
                  { key: 'visNo', header: 'Visitor No.', render: (r) => <code>{r.visitorNumber}</code> },
                  { key: 'name', header: 'Visitor Name', render: (r) => <strong>{r.visitorName}</strong> },
                  { key: 'relation', header: 'Relation', render: (r) => r.relationship || '—' },
                  { key: 'student', header: 'Student Visited', render: (r) => r.student?.user ? `${r.student.user.firstName} ${r.student.user.lastName}` : '—' },
                  { key: 'purpose', header: 'Purpose', render: (r) => r.purpose },
                  { key: 'status', header: 'Status', render: (r) => <Badge variant={r.status === 'CHECKED_IN' ? 'success' : 'info'} text={r.status} /> },
                ]}
                emptyText="No visitor logs recorded."
              />
            )}
          </Card>
        </div>
      )}

      {/* ========== TAB: MAINTENANCE ========== */}
      {activeTab === 'maintenance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Card
            title="Hostel Maintenance Requests"
            subtitle="Facility repairs and plumbing/electrical issues"
            headerAction={<Button variant="primary" size="sm" onClick={() => setShowMaintenanceModal(true)}>+ Report Issue</Button>}
          >
            {isLoading ? <TableSkeleton rows={5} /> : (
              <DataTable
                data={maintenances}
                columns={[
                  { key: 'reqNo', header: 'Req No.', render: (r) => <code>{r.requestNumber}</code> },
                  { key: 'hostel', header: 'Hostel', render: (r) => r.hostel?.name || '—' },
                  { key: 'room', header: 'Room', render: (r) => r.room?.roomNumber || 'Common Area' },
                  { key: 'category', header: 'Category', render: (r) => r.issueCategory },
                  { key: 'desc', header: 'Description', render: (r) => r.description?.slice(0, 50) + (r.description?.length > 50 ? '...' : '') },
                  { key: 'priority', header: 'Priority', render: (r) => (
                    <Badge
                      variant={r.priority === 'URGENT' ? 'danger' : r.priority === 'HIGH' ? 'warning' : 'info'}
                      text={r.priority}
                    />
                  )},
                  { key: 'status', header: 'Status', render: (r) => <Badge variant={r.status === 'RESOLVED' ? 'success' : 'warning'} text={r.status} /> },
                ]}
                emptyText="No maintenance requests."
              />
            )}
          </Card>
        </div>
      )}

      {/* ========== TAB: INCIDENTS ========== */}
      {activeTab === 'incidents' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Card
            title="Hostel Safety & Disciplinary Incidents"
            subtitle="Confidential safety records"
            headerAction={<Button variant="danger" size="sm" onClick={() => setShowIncidentModal(true)}>⚠ Report Incident</Button>}
          >
            {isLoading ? <TableSkeleton rows={4} /> : (
              <DataTable
                data={incidents}
                columns={[
                  { key: 'incNo', header: 'Incident No.', render: (r) => <code>{r.incidentNumber}</code> },
                  { key: 'date', header: 'Date', render: (r) => new Date(r.incidentDate).toLocaleDateString() },
                  { key: 'category', header: 'Category', render: (r) => r.category },
                  { key: 'desc', header: 'Description', render: (r) => r.description?.slice(0, 60) },
                  { key: 'severity', header: 'Severity', render: (r) => (
                    <Badge
                      variant={r.severity === 'CRITICAL' ? 'danger' : r.severity === 'HIGH' ? 'warning' : 'info'}
                      text={r.severity}
                    />
                  )},
                  { key: 'status', header: 'Status', render: (r) => <Badge variant={r.status === 'RESOLVED' ? 'success' : 'danger'} text={r.status} /> },
                ]}
                emptyText="No incidents reported."
              />
            )}
          </Card>
        </div>
      )}

      {/* ========== TAB: WARDENS ========== */}
      {activeTab === 'wardens' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Card title="Warden & Supervisory Staff" subtitle="Assigned hostel custodians">
            {isLoading ? <TableSkeleton rows={4} /> : (
              <DataTable
                data={wardens}
                columns={[
                  { key: 'name', header: 'Staff Member', render: (r) => r.employee?.user ? `${r.employee.user.firstName} ${r.employee.user.lastName}` : '—' },
                  { key: 'role', header: 'Role', render: (r) => <Badge variant="info" text={r.role} /> },
                  { key: 'hostel', header: 'Assigned Hostel', render: (r) => r.hostel?.name || '—' },
                  { key: 'status', header: 'Status', render: (r) => <Badge variant={r.status === 'ACTIVE' ? 'success' : 'neutral'} text={r.status} /> },
                ]}
                emptyText="No wardens assigned."
              />
            )}
          </Card>
        </div>
      )}

      {/* ==================== MODALS ==================== */}

      {/* Hostel Modal */}
      <Modal
        isOpen={showHostelModal}
        onClose={() => setShowHostelModal(false)}
        title="Create New Hostel"
        footer={
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button variant="outline" onClick={() => setShowHostelModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateHostel} disabled={isSubmittingHostel}>
              {isSubmittingHostel ? 'Creating...' : 'Create Hostel'}
            </Button>
          </div>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Input label="Hostel Name *" value={hName} onChange={(e) => setHName(e.target.value)} placeholder="e.g. North Wing Boys Hostel" />
          <Input label="Hostel Code *" value={hCode} onChange={(e) => setHCode(e.target.value)} placeholder="e.g. HST-NORTH" />
          <Select
            label="Hostel Type"
            value={hType}
            onChange={(e) => setHType(e.target.value)}
            options={['BOYS', 'GIRLS', 'COED', 'STAFF', 'OTHER'].map((t) => ({ value: t, label: t }))}
          />
          <Input label="Bed Capacity" type="number" value={hCapacity} onChange={(e) => setHCapacity(e.target.value)} placeholder="e.g. 150" />
        </div>
      </Modal>

      {/* Room Modal */}
      <Modal
        isOpen={showRoomModal}
        onClose={() => setShowRoomModal(false)}
        title="Add Room to Hostel"
        footer={
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button variant="outline" onClick={() => setShowRoomModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateRoom} disabled={isSubmittingRoom}>
              {isSubmittingRoom ? 'Adding...' : 'Add Room'}
            </Button>
          </div>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Select
            label="Hostel *"
            value={rHostelId}
            onChange={(e) => setRHostelId(e.target.value)}
            options={[{ value: '', label: 'Select Hostel' }, ...hostels.map((h: any) => ({ value: h.id, label: h.name }))]}
          />
          <Input label="Room Number *" value={rNumber} onChange={(e) => setRNumber(e.target.value)} placeholder="e.g. 101" />
          <Select
            label="Room Type"
            value={rType}
            onChange={(e) => setRType(e.target.value)}
            options={['DORMITORY', 'SHARED_ROOM', 'SINGLE_ROOM', 'SPECIAL'].map((t) => ({ value: t, label: t.replace('_', ' ') }))}
          />
          <Select
            label="Gender Eligibility"
            value={rGender}
            onChange={(e) => setRGender(e.target.value)}
            options={['ANY', 'MALE', 'FEMALE'].map((g) => ({ value: g, label: g }))}
          />
          <Input label="Capacity (Beds) *" type="number" value={rCapacity} onChange={(e) => setRCapacity(e.target.value)} />
          <Input label="Term Fee (USD)" type="number" value={rFee} onChange={(e) => setRFee(e.target.value)} placeholder="Optional fee" />
        </div>
      </Modal>

      {/* Allocate Modal */}
      <Modal
        isOpen={showAllocateModal}
        onClose={() => setShowAllocateModal(false)}
        title="Allocate Student to Room"
        footer={
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button variant="outline" onClick={() => setShowAllocateModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleAllocateStudent} disabled={isSubmittingAllocate}>
              {isSubmittingAllocate ? 'Allocating...' : 'Allocate Bed'}
            </Button>
          </div>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Input label="Student Profile ID *" value={aStudentId} onChange={(e) => setAStudentId(e.target.value)} placeholder="UUID of student" />
          <Select
            label="Target Room *"
            value={aRoomId}
            onChange={(e) => setARoomId(e.target.value)}
            options={[{ value: '', label: 'Select Room' }, ...rooms.map((r: any) => ({ value: r.id, label: `${r.hostel?.name} — Room ${r.roomNumber} (${r._count?.allocations || 0}/${r.capacity})` }))]}
          />
          <Input label="Effective From *" type="date" value={aEffectiveFrom} onChange={(e) => setAEffectiveFrom(e.target.value)} />
        </div>
      </Modal>

      {/* Outing Modal */}
      <Modal
        isOpen={showOutingModal}
        onClose={() => setShowOutingModal(false)}
        title="Request Outing / Leave"
        footer={
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button variant="outline" onClick={() => setShowOutingModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateOuting} disabled={isSubmittingOuting}>
              {isSubmittingOuting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Input label="Student Profile ID *" value={oStudentId} onChange={(e) => setOStudentId(e.target.value)} />
          <Select
            label="Hostel *"
            value={oHostelId}
            onChange={(e) => setOHostelId(e.target.value)}
            options={[{ value: '', label: 'Select Hostel' }, ...hostels.map((h: any) => ({ value: h.id, label: h.name }))]}
          />
          <Input label="Departure Date/Time *" type="datetime-local" value={oStart} onChange={(e) => setOStart(e.target.value)} />
          <Input label="Expected Return *" type="datetime-local" value={oReturn} onChange={(e) => setOReturn(e.target.value)} />
          <Input label="Destination" value={oDestination} onChange={(e) => setODestination(e.target.value)} placeholder="City / Home" />
          <Input label="Reason *" value={oReason} onChange={(e) => setOReason(e.target.value)} placeholder="e.g. Family function" />
        </div>
      </Modal>

      {/* Visitor Modal */}
      <Modal
        isOpen={showVisitorModal}
        onClose={() => setShowVisitorModal(false)}
        title="Register Hostel Visitor"
        footer={
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button variant="outline" onClick={() => setShowVisitorModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateVisitor} disabled={isSubmittingVisitor}>
              {isSubmittingVisitor ? 'Logging...' : 'Log Visitor'}
            </Button>
          </div>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Input label="Visitor Name *" value={vName} onChange={(e) => setVName(e.target.value)} />
          <Input label="Relationship" value={vRelationship} onChange={(e) => setVRelationship(e.target.value)} placeholder="e.g. Parent" />
          <Input label="Student ID *" value={vStudentId} onChange={(e) => setVStudentId(e.target.value)} />
          <Select
            label="Hostel *"
            value={vHostelId}
            onChange={(e) => setVHostelId(e.target.value)}
            options={[{ value: '', label: 'Select Hostel' }, ...hostels.map((h: any) => ({ value: h.id, label: h.name }))]}
          />
          <div style={{ gridColumn: '1 / -1' }}>
            <Input label="Purpose of Visit *" value={vPurpose} onChange={(e) => setVPurpose(e.target.value)} />
          </div>
        </div>
      </Modal>

      {/* Maintenance Modal */}
      <Modal
        isOpen={showMaintenanceModal}
        onClose={() => setShowMaintenanceModal(false)}
        title="Report Facility Issue"
        footer={
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button variant="outline" onClick={() => setShowMaintenanceModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateMaintenance} disabled={isSubmittingMaint}>
              {isSubmittingMaint ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Select
            label="Hostel *"
            value={mHostelId}
            onChange={(e) => setMHostelId(e.target.value)}
            options={[{ value: '', label: 'Select Hostel' }, ...hostels.map((h: any) => ({ value: h.id, label: h.name }))]}
          />
          <Select
            label="Priority"
            value={mPriority}
            onChange={(e) => setMPriority(e.target.value)}
            options={['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => ({ value: p, label: p }))}
          />
          <div style={{ gridColumn: '1 / -1' }}>
            <Input label="Description *" value={mDescription} onChange={(e) => setMDescription(e.target.value)} placeholder="e.g. Room 102 bathroom faucet leaking" />
          </div>
        </div>
      </Modal>

      {/* Incident Modal */}
      <Modal
        isOpen={showIncidentModal}
        onClose={() => setShowIncidentModal(false)}
        title="Report Incident"
        footer={
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button variant="outline" onClick={() => setShowIncidentModal(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleCreateIncident} disabled={isSubmittingIncident}>
              {isSubmittingIncident ? 'Reporting...' : 'Report Incident'}
            </Button>
          </div>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Select
            label="Hostel *"
            value={iHostelId}
            onChange={(e) => setIHostelId(e.target.value)}
            options={[{ value: '', label: 'Select Hostel' }, ...hostels.map((h: any) => ({ value: h.id, label: h.name }))]}
          />
          <Select
            label="Severity"
            value={iSeverity}
            onChange={(e) => setISeverity(e.target.value)}
            options={['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((s) => ({ value: s, label: s }))}
          />
          <div style={{ gridColumn: '1 / -1' }}>
            <Input label="Description *" value={iDescription} onChange={(e) => setIDescription(e.target.value)} placeholder="Factual account of the incident" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
