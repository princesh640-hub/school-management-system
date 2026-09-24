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

// Tab Configuration
const TRANSPORT_TABS = [
  { id: 'overview', label: '🚌 Fleet Overview' },
  { id: 'vehicles', label: 'Vehicles' },
  { id: 'drivers', label: 'Drivers & Attendants' },
  { id: 'routes', label: 'Routes & Stops' },
  { id: 'assignments', label: 'Student Assignments' },
  { id: 'schedules', label: 'Schedules' },
  { id: 'maintenance', label: 'Maintenance & Fuel' },
  { id: 'incidents', label: 'Incidents' },
  { id: 'reports', label: 'Reports' },
];

export default function TransportPage() {
  const [activeTab, setActiveTab] = useState('overview');

  // Global state
  const [fleetSummary, setFleetSummary] = useState<any | null>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [attendants, setAttendants] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [maintenances, setMaintenances] = useState<any[]>([]);
  const [fuelRecords, setFuelRecords] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [expiryAlerts, setExpiryAlerts] = useState<any[]>([]);
  const [todaySummary, setTodaySummary] = useState<any | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [globalMsg, setGlobalMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  // Vehicle Modal
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [vVehicleNumber, setVVehicleNumber] = useState('');
  const [vRegistration, setVRegistration] = useState('');
  const [vType, setVType] = useState('BUS');
  const [vMake, setVMake] = useState('');
  const [vModel, setVModel] = useState('');
  const [vCapacity, setVCapacity] = useState('');
  const [vYear, setVYear] = useState('');
  const [vColor, setVColor] = useState('');
  const [vFuelType, setVFuelType] = useState('');
  const [isSubmittingVehicle, setIsSubmittingVehicle] = useState(false);
  const [vehicleMsg, setVehicleMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  // Driver Modal
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [dLicense, setDLicense] = useState('');
  const [dLicenseClass, setDLicenseClass] = useState('');
  const [dLicenseExpiry, setDLicenseExpiry] = useState('');
  const [dExperience, setDExperience] = useState('');
  const [dPhone, setDPhone] = useState('');
  const [isSubmittingDriver, setIsSubmittingDriver] = useState(false);
  const [driverMsg, setDriverMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  // Route Modal
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [rName, setRName] = useState('');
  const [rStart, setRStart] = useState('');
  const [rEnd, setREnd] = useState('');
  const [rDistance, setRDistance] = useState('');
  const [rMinutes, setRMinutes] = useState('');
  const [rFee, setRFee] = useState('');
  const [isSubmittingRoute, setIsSubmittingRoute] = useState(false);
  const [routeMsg, setRouteMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  // Assignment Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [aStudentId, setAStudentId] = useState('');
  const [aRouteId, setARouteId] = useState('');
  const [aType, setAType] = useState('BOTH');
  const [aFrom, setAFrom] = useState('');
  const [aPickupAddress, setAPickupAddress] = useState('');
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);
  const [assignMsg, setAssignMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  // Schedule Modal
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [sRouteId, setSRouteId] = useState('');
  const [sVehicleId, setSVehicleId] = useState('');
  const [sDriverId, setSDriverId] = useState('');
  const [sDate, setSDate] = useState('');
  const [sDeparture, setSDeparture] = useState('');
  const [sTripType, setSTripType] = useState('MORNING');
  const [isSubmittingSchedule, setIsSubmittingSchedule] = useState(false);
  const [scheduleMsg, setScheduleMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  // Maintenance Modal
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [mVehicleId, setMVehicleId] = useState('');
  const [mType, setMType] = useState('ROUTINE_SERVICE');
  const [mDesc, setMDesc] = useState('');
  const [mScheduledDate, setMScheduledDate] = useState('');
  const [mProvider, setMProvider] = useState('');
  const [isSubmittingMaint, setIsSubmittingMaint] = useState(false);
  const [maintMsg, setMaintMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  // Incident Modal
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [iVehicleId, setIVehicleId] = useState('');
  const [iDate, setIDate] = useState('');
  const [iDescription, setIDescription] = useState('');
  const [iSeverity, setISeverity] = useState('LOW');
  const [iLocation, setILocation] = useState('');
  const [isSubmittingIncident, setIsSubmittingIncident] = useState(false);
  const [incidentMsg, setIncidentMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  const getToken = () =>
    typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;

  const fetchAllData = async () => {
    setIsLoading(true);
    const token = getToken();
    if (!token) { setIsLoading(false); return; }
    const h = { Authorization: `Bearer ${token}` };

    try {
      const [
        summaryRes, vehicleRes, driverRes, attRes, routeRes,
        assignRes, scheduleRes, mainRes, fuelRes, incidentRes,
        alertRes, todayRes,
      ] = await Promise.all([
        fetch(`${API_URL}/transport/reports/fleet-summary`, { headers: h }).catch(() => null),
        fetch(`${API_URL}/transport/vehicles`, { headers: h }).catch(() => null),
        fetch(`${API_URL}/transport/drivers`, { headers: h }).catch(() => null),
        fetch(`${API_URL}/transport/attendants`, { headers: h }).catch(() => null),
        fetch(`${API_URL}/transport/routes`, { headers: h }).catch(() => null),
        fetch(`${API_URL}/transport/assignments`, { headers: h }).catch(() => null),
        fetch(`${API_URL}/transport/schedules`, { headers: h }).catch(() => null),
        fetch(`${API_URL}/transport/maintenance`, { headers: h }).catch(() => null),
        fetch(`${API_URL}/transport/fuel`, { headers: h }).catch(() => null),
        fetch(`${API_URL}/transport/incidents`, { headers: h }).catch(() => null),
        fetch(`${API_URL}/transport/vehicles/alerts/expiry`, { headers: h }).catch(() => null),
        fetch(`${API_URL}/transport/schedules/today-summary`, { headers: h }).catch(() => null),
      ]);

      const parseArr = (json: any) => Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : (Array.isArray(json?.items) ? json.items : []));

      if (summaryRes?.ok) setFleetSummary(await summaryRes.json());
      if (vehicleRes?.ok) setVehicles(parseArr(await vehicleRes.json()));
      if (driverRes?.ok) setDrivers(parseArr(await driverRes.json()));
      if (attRes?.ok) setAttendants(parseArr(await attRes.json()));
      if (routeRes?.ok) setRoutes(parseArr(await routeRes.json()));
      if (assignRes?.ok) setAssignments(parseArr(await assignRes.json()));
      if (scheduleRes?.ok) setSchedules(parseArr(await scheduleRes.json()));
      if (mainRes?.ok) setMaintenances(parseArr(await mainRes.json()));
      if (fuelRes?.ok) setFuelRecords(parseArr(await fuelRes.json()));
      if (incidentRes?.ok) setIncidents(parseArr(await incidentRes.json()));
      if (alertRes?.ok) setExpiryAlerts(parseArr(await alertRes.json()));
      if (todayRes?.ok) setTodaySummary(await todayRes.json());
    } catch (err) {
      console.error('Transport data fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchAllData(); }, []);

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

  // ---- Submit handlers ----

  const handleRegisterVehicle = async () => {
    if (!vVehicleNumber || !vRegistration || !vCapacity) {
      setVehicleMsg({ type: 'danger', text: 'Vehicle number, registration and capacity are required.' });
      return;
    }
    setIsSubmittingVehicle(true);
    setVehicleMsg(null);
    try {
      await authPost('/transport/vehicles', {
        vehicleNumber: vVehicleNumber,
        registrationNumber: vRegistration,
        vehicleType: vType,
        make: vMake || undefined,
        model: vModel || undefined,
        year: vYear ? parseInt(vYear) : undefined,
        color: vColor || undefined,
        capacity: parseInt(vCapacity),
        fuelType: vFuelType || undefined,
      });
      setVehicleMsg({ type: 'success', text: 'Vehicle registered successfully.' });
      setVVehicleNumber(''); setVRegistration(''); setVType('BUS'); setVMake('');
      setVModel(''); setVCapacity(''); setVYear(''); setVColor(''); setVFuelType('');
      fetchAllData();
      setTimeout(() => setShowVehicleModal(false), 1500);
    } catch (e: any) {
      setVehicleMsg({ type: 'danger', text: e.message });
    } finally {
      setIsSubmittingVehicle(false);
    }
  };

  const handleRegisterDriver = async () => {
    if (!dLicense) {
      setDriverMsg({ type: 'danger', text: 'License number is required.' });
      return;
    }
    setIsSubmittingDriver(true);
    setDriverMsg(null);
    try {
      await authPost('/transport/drivers', {
        licenseNumber: dLicense,
        licenseClass: dLicenseClass || undefined,
        licenseExpiry: dLicenseExpiry || undefined,
        experienceYears: dExperience ? parseInt(dExperience) : 0,
        contactPhone: dPhone || undefined,
      });
      setDriverMsg({ type: 'success', text: 'Driver registered successfully.' });
      setDLicense(''); setDLicenseClass(''); setDLicenseExpiry(''); setDExperience(''); setDPhone('');
      fetchAllData();
      setTimeout(() => setShowDriverModal(false), 1500);
    } catch (e: any) {
      setDriverMsg({ type: 'danger', text: e.message });
    } finally {
      setIsSubmittingDriver(false);
    }
  };

  const handleCreateRoute = async () => {
    if (!rName) {
      setRouteMsg({ type: 'danger', text: 'Route name is required.' });
      return;
    }
    setIsSubmittingRoute(true);
    setRouteMsg(null);
    try {
      await authPost('/transport/routes', {
        name: rName,
        startLocation: rStart || undefined,
        endLocation: rEnd || undefined,
        totalDistance: rDistance ? parseFloat(rDistance) : undefined,
        estimatedMinutes: rMinutes ? parseInt(rMinutes) : undefined,
        feeAmount: rFee ? parseFloat(rFee) : undefined,
      });
      setRouteMsg({ type: 'success', text: 'Route created successfully.' });
      setRName(''); setRStart(''); setREnd(''); setRDistance(''); setRMinutes(''); setRFee('');
      fetchAllData();
      setTimeout(() => setShowRouteModal(false), 1500);
    } catch (e: any) {
      setRouteMsg({ type: 'danger', text: e.message });
    } finally {
      setIsSubmittingRoute(false);
    }
  };

  const handleAssignStudent = async () => {
    if (!aStudentId || !aRouteId || !aFrom) {
      setAssignMsg({ type: 'danger', text: 'Student ID, route and effective date are required.' });
      return;
    }
    setIsSubmittingAssign(true);
    setAssignMsg(null);
    try {
      await authPost('/transport/assignments', {
        studentId: aStudentId,
        routeId: aRouteId,
        assignmentType: aType,
        effectiveFrom: aFrom,
        pickupAddress: aPickupAddress || undefined,
      });
      setAssignMsg({ type: 'success', text: 'Student assigned to route.' });
      setAStudentId(''); setARouteId(''); setAType('BOTH'); setAFrom(''); setAPickupAddress('');
      fetchAllData();
      setTimeout(() => setShowAssignModal(false), 1500);
    } catch (e: any) {
      setAssignMsg({ type: 'danger', text: e.message });
    } finally {
      setIsSubmittingAssign(false);
    }
  };

  const handleCreateSchedule = async () => {
    if (!sRouteId || !sDate) {
      setScheduleMsg({ type: 'danger', text: 'Route and date are required.' });
      return;
    }
    setIsSubmittingSchedule(true);
    setScheduleMsg(null);
    try {
      await authPost('/transport/schedules', {
        routeId: sRouteId,
        vehicleId: sVehicleId || undefined,
        driverId: sDriverId || undefined,
        scheduleDate: sDate,
        departureTime: sDeparture || undefined,
        tripType: sTripType,
      });
      setScheduleMsg({ type: 'success', text: 'Schedule created.' });
      setSRouteId(''); setSVehicleId(''); setSDriverId(''); setSDate(''); setSDeparture('');
      fetchAllData();
      setTimeout(() => setShowScheduleModal(false), 1500);
    } catch (e: any) {
      setScheduleMsg({ type: 'danger', text: e.message });
    } finally {
      setIsSubmittingSchedule(false);
    }
  };

  const handleScheduleMaintenance = async () => {
    if (!mVehicleId || !mDesc) {
      setMaintMsg({ type: 'danger', text: 'Vehicle and description are required.' });
      return;
    }
    setIsSubmittingMaint(true);
    setMaintMsg(null);
    try {
      await authPost('/transport/maintenance', {
        vehicleId: mVehicleId,
        maintenanceType: mType,
        description: mDesc,
        scheduledDate: mScheduledDate || undefined,
        serviceProvider: mProvider || undefined,
      });
      setMaintMsg({ type: 'success', text: 'Maintenance scheduled.' });
      setMVehicleId(''); setMType('ROUTINE_SERVICE'); setMDesc(''); setMScheduledDate(''); setMProvider('');
      fetchAllData();
      setTimeout(() => setShowMaintenanceModal(false), 1500);
    } catch (e: any) {
      setMaintMsg({ type: 'danger', text: e.message });
    } finally {
      setIsSubmittingMaint(false);
    }
  };

  const handleReportIncident = async () => {
    if (!iDate || !iDescription) {
      setIncidentMsg({ type: 'danger', text: 'Date and description are required.' });
      return;
    }
    setIsSubmittingIncident(true);
    setIncidentMsg(null);
    try {
      await authPost('/transport/incidents', {
        vehicleId: iVehicleId || undefined,
        incidentDate: iDate,
        description: iDescription,
        severity: iSeverity,
        location: iLocation || undefined,
      });
      setIncidentMsg({ type: 'success', text: 'Incident reported.' });
      setIVehicleId(''); setIDate(''); setIDescription(''); setISeverity('LOW'); setILocation('');
      fetchAllData();
      setTimeout(() => setShowIncidentModal(false), 1500);
    } catch (e: any) {
      setIncidentMsg({ type: 'danger', text: e.message });
    } finally {
      setIsSubmittingIncident(false);
    }
  };

  // ---- Column definitions ----

  const vehicleColumns: Column<any>[] = [
    { key: 'vehicleNumber', header: 'Vehicle No.', render: (r) => <strong>{r.vehicleNumber}</strong> },
    { key: 'vehicleType', header: 'Type', render: (r) => <Badge variant="info" text={r.vehicleType} /> },
    { key: 'makeModel', header: 'Make / Model', render: (r) => `${r.make || '—'} ${r.model || ''}`.trim() || '—' },
    { key: 'capacity', header: 'Capacity', render: (r) => r.capacity },
    { key: 'status', header: 'Status', render: (r) => (
      <Badge
        variant={r.status === 'ACTIVE' ? 'success' : r.status === 'MAINTENANCE' ? 'warning' : 'danger'}
        text={r.status}
      />
    )},
    { key: 'registrationNumber', header: 'Reg. No.', render: (r) => <span style={{ fontFamily: 'monospace' }}>{r.registrationNumber}</span> },
    { key: 'facility', header: 'Facility', render: (r) => r.facility?.name || '—' },
  ];

  const driverColumns: Column<any>[] = [
    { key: 'driverCode', header: 'Code', render: (r) => <code>{r.driverCode}</code> },
    { key: 'licenseNumber', header: 'License No.', render: (r) => r.licenseNumber },
    { key: 'licenseClass', header: 'Class', render: (r) => r.licenseClass || '—' },
    { key: 'licenseExpiry', header: 'License Expiry', render: (r) => r.licenseExpiry ? new Date(r.licenseExpiry).toLocaleDateString() : '—' },
    { key: 'experience', header: 'Experience', render: (r) => `${r.experienceYears || 0} yr(s)` },
    { key: 'vehicle', header: 'Assigned Vehicle', render: (r) => r.vehicle?.vehicleNumber || '—' },
    { key: 'status', header: 'Status', render: (r) => <Badge variant={r.status === 'ACTIVE' ? 'success' : 'warning'} text={r.status} /> },
  ];

  const routeColumns: Column<any>[] = [
    { key: 'routeCode', header: 'Code', render: (r) => <code>{r.routeCode}</code> },
    { key: 'name', header: 'Route Name', render: (r) => <strong>{r.name}</strong> },
    { key: 'startLocation', header: 'Start', render: (r) => r.startLocation || '—' },
    { key: 'endLocation', header: 'End', render: (r) => r.endLocation || '—' },
    { key: 'stops', header: 'Stops', render: (r) => r.stops?.length ?? r._count?.stops ?? '—' },
    { key: 'feeAmount', header: 'Fee', render: (r) => r.feeAmount ? `$${r.feeAmount}` : '—' },
    { key: 'isActive', header: 'Active', render: (r) => <Badge variant={r.isActive ? 'success' : 'neutral'} text={r.isActive ? 'Active' : 'Inactive'} /> },
  ];

  const assignmentColumns: Column<any>[] = [
    { key: 'student', header: 'Student', render: (r) => r.student ? `${r.student.user?.firstName} ${r.student.user?.lastName}` : '—' },
    { key: 'admissionNo', header: 'Admission No.', render: (r) => r.student?.admissionNumber || '—' },
    { key: 'route', header: 'Route', render: (r) => r.route ? `${r.route.routeCode} — ${r.route.name}` : '—' },
    { key: 'stop', header: 'Stop', render: (r) => r.stop?.stopName || '—' },
    { key: 'assignmentType', header: 'Type', render: (r) => <Badge variant="info" text={r.assignmentType} /> },
    { key: 'effectiveFrom', header: 'From', render: (r) => new Date(r.effectiveFrom).toLocaleDateString() },
    { key: 'isActive', header: 'Status', render: (r) => <Badge variant={r.isActive ? 'success' : 'neutral'} text={r.isActive ? 'Active' : 'Inactive'} /> },
  ];

  const scheduleColumns: Column<any>[] = [
    { key: 'scheduleDate', header: 'Date', render: (r) => new Date(r.scheduleDate).toLocaleDateString() },
    { key: 'tripType', header: 'Trip', render: (r) => <Badge variant="info" text={r.tripType} /> },
    { key: 'route', header: 'Route', render: (r) => r.route?.name || '—' },
    { key: 'vehicle', header: 'Vehicle', render: (r) => r.vehicle?.vehicleNumber || '—' },
    { key: 'driver', header: 'Driver', render: (r) => r.driver?.driverCode || '—' },
    { key: 'departure', header: 'Departure', render: (r) => r.departureTime || '—' },
    { key: 'status', header: 'Status', render: (r) => (
      <Badge
        variant={r.status === 'COMPLETED' ? 'success' : r.status === 'IN_PROGRESS' ? 'warning' : r.status === 'CANCELLED' ? 'danger' : 'info'}
        text={r.status}
      />
    )},
  ];

  const maintenanceColumns: Column<any>[] = [
    { key: 'maintenanceNumber', header: 'Ref. No.', render: (r) => <code>{r.maintenanceNumber}</code> },
    { key: 'vehicle', header: 'Vehicle', render: (r) => r.vehicle?.vehicleNumber || '—' },
    { key: 'maintenanceType', header: 'Type', render: (r) => <Badge variant="info" text={r.maintenanceType?.replace('_', ' ')} /> },
    { key: 'description', header: 'Description', render: (r) => r.description?.slice(0, 60) + (r.description?.length > 60 ? '...' : '') },
    { key: 'scheduledDate', header: 'Scheduled', render: (r) => r.scheduledDate ? new Date(r.scheduledDate).toLocaleDateString() : '—' },
    { key: 'cost', header: 'Cost', render: (r) => r.cost ? `$${r.cost}` : '—' },
    { key: 'isCompleted', header: 'Status', render: (r) => <Badge variant={r.isCompleted ? 'success' : 'warning'} text={r.isCompleted ? 'Completed' : 'Pending'} /> },
  ];

  const incidentColumns: Column<any>[] = [
    { key: 'incidentNumber', header: 'Ref. No.', render: (r) => <code>{r.incidentNumber}</code> },
    { key: 'incidentDate', header: 'Date', render: (r) => new Date(r.incidentDate).toLocaleDateString() },
    { key: 'vehicle', header: 'Vehicle', render: (r) => r.vehicle?.vehicleNumber || '—' },
    { key: 'severity', header: 'Severity', render: (r) => (
      <Badge
        variant={r.severity === 'CRITICAL' ? 'danger' : r.severity === 'HIGH' ? 'warning' : 'info'}
        text={r.severity}
      />
    )},
    { key: 'description', header: 'Description', render: (r) => r.description?.slice(0, 60) + (r.description?.length > 60 ? '...' : '') },
    { key: 'isResolved', header: 'Status', render: (r) => <Badge variant={r.isResolved ? 'success' : 'danger'} text={r.isResolved ? 'Resolved' : 'Open'} /> },
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
              { label: 'Transport Management' },
            ]}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--neutral-900)', margin: 0 }}>
              Transport Management
            </h1>
            <Badge variant="success" text="Phase 4J — Active" />
          </div>
          <p style={{ color: 'var(--neutral-500)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Fleet, routes, schedules, boarding, maintenance and transport analytics.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Button variant="outline" onClick={fetchAllData}>↻ Refresh</Button>
          <Button variant="primary" onClick={() => setShowVehicleModal(true)}>+ Register Vehicle</Button>
        </div>
      </div>

      {globalMsg && (
        <Alert variant={globalMsg.type} onClose={() => setGlobalMsg(null)}>{globalMsg.text}</Alert>
      )}

      {/* Expiry Alerts */}
      {expiryAlerts.length > 0 && (
        <Alert variant="warning" title={`${expiryAlerts.length} Document Expiry Alert(s)`}>
          {expiryAlerts.slice(0, 3).map((a, i) => (
            <div key={i} style={{ fontSize: '0.8125rem' }}>
              <strong>{a.vehicleNumber}</strong> — {a.alertType} expires in <strong>{a.daysUntilExpiry} days</strong> ({new Date(a.expiryDate).toLocaleDateString()})
            </div>
          ))}
        </Alert>
      )}

      {/* Navigation Tabs */}
      <Card bodyStyle={{ padding: '0.75rem 1rem 0' }}>
        <Tabs tabs={TRANSPORT_TABS} activeTab={activeTab} onChange={setActiveTab} />
      </Card>

      {/* ========== TAB: OVERVIEW ========== */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            {[
              { label: 'Total Vehicles', value: fleetSummary?.totalVehicles ?? '—', sub: `${fleetSummary?.activeVehicles ?? 0} Active`, color: 'var(--neutral-900)' },
              { label: 'In Maintenance', value: fleetSummary?.maintenanceVehicles ?? '—', sub: `${fleetSummary?.outOfServiceVehicles ?? 0} Out of Service`, color: 'var(--warning-600)' },
              { label: 'Active Drivers', value: fleetSummary?.activeDrivers ?? '—', sub: `of ${fleetSummary?.totalDrivers ?? 0} total`, color: 'var(--primary-600)' },
              { label: 'Active Routes', value: fleetSummary?.activeRoutes ?? '—', sub: `${fleetSummary?.totalRoutes ?? 0} configured`, color: 'var(--info-600)' },
              { label: 'Assigned Students', value: fleetSummary?.totalAssignedStudents ?? '—', sub: 'with active assignments', color: 'var(--success-600)' },
              { label: "Today's Trips", value: fleetSummary?.scheduledToday ?? '—', sub: 'scheduled (not cancelled)', color: 'var(--neutral-700)' },
            ].map((kpi, i) => (
              <Card key={i}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--neutral-500)', textTransform: 'uppercase' }}>{kpi.label}</div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: kpi.color, margin: '0.25rem 0' }}>{kpi.value}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--neutral-400)' }}>{kpi.sub}</div>
              </Card>
            ))}
          </div>

          {/* Today's Boarding Summary */}
          {todaySummary && (
            <Card title="Today's Boarding Summary" subtitle={`Date: ${new Date(todaySummary.date || Date.now()).toLocaleDateString()}`}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                {[
                  { label: 'Scheduled Trips', value: todaySummary.totalScheduled, color: 'var(--info-600)' },
                  { label: 'Boarded', value: todaySummary.boarded, color: 'var(--success-600)' },
                  { label: 'Dropped Off', value: todaySummary.droppedOff, color: 'var(--primary-600)' },
                  { label: 'No-Show', value: todaySummary.noShow, color: 'var(--danger-600)' },
                ].map((s, i) => (
                  <div key={i} style={{ textAlign: 'center', padding: '1rem', border: '1px solid var(--neutral-200)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: '1.75rem', fontWeight: 700, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--neutral-500)' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Quick Actions */}
          <Card title="Quick Actions">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              <Button variant="outline" onClick={() => { setActiveTab('vehicles'); setShowVehicleModal(true); }}>+ Register Vehicle</Button>
              <Button variant="outline" onClick={() => { setActiveTab('drivers'); setShowDriverModal(true); }}>+ Add Driver</Button>
              <Button variant="outline" onClick={() => { setActiveTab('routes'); setShowRouteModal(true); }}>+ Create Route</Button>
              <Button variant="outline" onClick={() => { setActiveTab('assignments'); setShowAssignModal(true); }}>+ Assign Student</Button>
              <Button variant="outline" onClick={() => { setActiveTab('schedules'); setShowScheduleModal(true); }}>+ Create Schedule</Button>
              <Button variant="outline" onClick={() => { setActiveTab('maintenance'); setShowMaintenanceModal(true); }}>+ Schedule Maintenance</Button>
              <Button variant="outline" onClick={() => { setActiveTab('incidents'); setShowIncidentModal(true); }}>⚠ Report Incident</Button>
            </div>
          </Card>
        </div>
      )}

      {/* ========== TAB: VEHICLES ========== */}
      {activeTab === 'vehicles' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Card
            title="Fleet Registry"
            subtitle="All registered vehicles"
            headerAction={<Button variant="primary" size="sm" onClick={() => setShowVehicleModal(true)}>+ Register Vehicle</Button>}
          >
            {isLoading ? <TableSkeleton rows={6} /> : (
              <DataTable data={vehicles} columns={vehicleColumns} emptyText="No vehicles registered yet." />
            )}
          </Card>
        </div>
      )}

      {/* ========== TAB: DRIVERS & ATTENDANTS ========== */}
      {activeTab === 'drivers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Card
            title="Drivers Registry"
            subtitle="Licensed drivers assigned to fleet"
            headerAction={<Button variant="primary" size="sm" onClick={() => setShowDriverModal(true)}>+ Add Driver</Button>}
          >
            {isLoading ? <TableSkeleton rows={5} /> : (
              <DataTable data={drivers} columns={driverColumns} emptyText="No drivers registered." />
            )}
          </Card>
          <Card title="Transport Attendants" subtitle="Conductors and attendants">
            {isLoading ? <TableSkeleton rows={4} /> : (
              <DataTable
                data={attendants}
                columns={[
                  { key: 'attendantCode', header: 'Code', render: (r) => <code>{r.attendantCode}</code> },
                  { key: 'vehicle', header: 'Assigned Vehicle', render: (r) => r.vehicle?.vehicleNumber || '—' },
                  { key: 'phone', header: 'Phone', render: (r) => r.contactPhone || '—' },
                  { key: 'status', header: 'Status', render: (r) => <Badge variant={r.status === 'ACTIVE' ? 'success' : 'warning'} text={r.status} /> },
                ]}
                emptyText="No attendants registered."
              />
            )}
          </Card>
        </div>
      )}

      {/* ========== TAB: ROUTES ========== */}
      {activeTab === 'routes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Card
            title="Route Network"
            subtitle="Configured transport routes"
            headerAction={<Button variant="primary" size="sm" onClick={() => setShowRouteModal(true)}>+ Create Route</Button>}
          >
            {isLoading ? <TableSkeleton rows={5} /> : (
              <DataTable data={routes} columns={routeColumns} emptyText="No routes configured." />
            )}
          </Card>
        </div>
      )}

      {/* ========== TAB: STUDENT ASSIGNMENTS ========== */}
      {activeTab === 'assignments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Card
            title="Student Transport Assignments"
            subtitle="Students assigned to routes"
            headerAction={<Button variant="primary" size="sm" onClick={() => setShowAssignModal(true)}>+ Assign Student</Button>}
          >
            {isLoading ? <TableSkeleton rows={6} /> : (
              <DataTable data={assignments} columns={assignmentColumns} emptyText="No student assignments found." />
            )}
          </Card>
        </div>
      )}

      {/* ========== TAB: SCHEDULES ========== */}
      {activeTab === 'schedules' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Card
            title="Trip Schedules"
            subtitle="All scheduled and past transport trips"
            headerAction={<Button variant="primary" size="sm" onClick={() => setShowScheduleModal(true)}>+ Create Schedule</Button>}
          >
            {isLoading ? <TableSkeleton rows={6} /> : (
              <DataTable data={schedules} columns={scheduleColumns} emptyText="No schedules found." />
            )}
          </Card>
        </div>
      )}

      {/* ========== TAB: MAINTENANCE & FUEL ========== */}
      {activeTab === 'maintenance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Card
            title="Maintenance Records"
            subtitle="Scheduled and completed vehicle maintenance"
            headerAction={<Button variant="primary" size="sm" onClick={() => setShowMaintenanceModal(true)}>+ Schedule Maintenance</Button>}
          >
            {isLoading ? <TableSkeleton rows={5} /> : (
              <DataTable data={maintenances} columns={maintenanceColumns} emptyText="No maintenance records." />
            )}
          </Card>
          <Card title="Fuel Records" subtitle="Vehicle fuel fill-up history">
            {isLoading ? <TableSkeleton rows={4} /> : (
              <DataTable
                data={fuelRecords}
                columns={[
                  { key: 'fuelDate', header: 'Date', render: (r) => new Date(r.fuelDate).toLocaleDateString() },
                  { key: 'vehicle', header: 'Vehicle', render: (r) => r.vehicle?.vehicleNumber || '—' },
                  { key: 'liters', header: 'Liters', render: (r) => `${r.liters} L` },
                  { key: 'totalCost', header: 'Total Cost', render: (r) => r.totalCost ? `$${r.totalCost}` : '—' },
                  { key: 'odometer', header: 'Odometer', render: (r) => r.odometer ? `${r.odometer} km` : '—' },
                  { key: 'fuelStation', header: 'Station', render: (r) => r.fuelStation || '—' },
                ]}
                emptyText="No fuel records found."
              />
            )}
          </Card>
        </div>
      )}

      {/* ========== TAB: INCIDENTS ========== */}
      {activeTab === 'incidents' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Card
            title="Transport Incidents"
            subtitle="All reported incidents"
            headerAction={<Button variant="danger" size="sm" onClick={() => setShowIncidentModal(true)}>⚠ Report Incident</Button>}
          >
            {isLoading ? <TableSkeleton rows={5} /> : (
              <DataTable data={incidents} columns={incidentColumns} emptyText="No incidents reported." />
            )}
          </Card>
        </div>
      )}

      {/* ========== TAB: REPORTS ========== */}
      {activeTab === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {fleetSummary && (
            <Card title="Fleet Summary Report" subtitle="Current operational status">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                {Object.entries(fleetSummary).map(([k, v]) => (
                  <div key={k} style={{ padding: '0.75rem', background: 'var(--surface-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--neutral-200)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                      {k.replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{String(v)}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}
          <Card title="Report Actions">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              <Button variant="outline" onClick={async () => {
                const token = getToken();
                const res = await fetch(`${API_URL}/transport/reports/maintenance-cost`, { headers: { Authorization: `Bearer ${token}` } });
                if (res.ok) { const d = await res.json(); alert(`Total Maintenance Cost: $${d.totalCost}\nRecords: ${d.records?.length}`); }
              }}>Maintenance Cost Report</Button>
              <Button variant="outline" onClick={async () => {
                const token = getToken();
                const res = await fetch(`${API_URL}/transport/reports/fuel-consumption`, { headers: { Authorization: `Bearer ${token}` } });
                if (res.ok) { const d = await res.json(); alert(`Total Fuel: ${d.totalLiters}L\nTotal Cost: $${d.totalCost}`); }
              }}>Fuel Consumption Report</Button>
              <Button variant="outline" onClick={async () => {
                const token = getToken();
                const res = await fetch(`${API_URL}/transport/reports/incidents`, { headers: { Authorization: `Bearer ${token}` } });
                if (res.ok) { const d = await res.json(); alert(`Total Incidents: ${d.total}\nResolved: ${d.resolved}\nOpen: ${d.unresolved}`); }
              }}>Incident Report</Button>
              <Button variant="outline" onClick={async () => {
                const token = getToken();
                const res = await fetch(`${API_URL}/transport/reports/defaulters`, { headers: { Authorization: `Bearer ${token}` } });
                if (res.ok) { const d = await res.json(); alert(`Students not boarding in last 3 days: ${d.length}`); }
              }}>Non-Boarding Students</Button>
            </div>
          </Card>
        </div>
      )}

      {/* ====================== MODALS ====================== */}

      {/* Vehicle Modal */}
      <Modal
        isOpen={showVehicleModal}
        onClose={() => { setShowVehicleModal(false); setVehicleMsg(null); }}
        title="Register Vehicle"
        size="lg"
        footer={
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button variant="outline" onClick={() => setShowVehicleModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleRegisterVehicle} disabled={isSubmittingVehicle}>
              {isSubmittingVehicle ? 'Registering...' : 'Register Vehicle'}
            </Button>
          </div>
        }
      >
        {vehicleMsg && <Alert variant={vehicleMsg.type} style={{ marginBottom: '1rem' }}>{vehicleMsg.text}</Alert>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Input label="Vehicle Number *" value={vVehicleNumber} onChange={(e) => setVVehicleNumber(e.target.value)} placeholder="e.g. BUS-001" />
          <Input label="Registration Number *" value={vRegistration} onChange={(e) => setVRegistration(e.target.value)} placeholder="e.g. ABC-1234" />
          <Select label="Vehicle Type" value={vType} onChange={(e) => setVType(e.target.value)}
            options={['BUS', 'MINI_BUS', 'VAN', 'CAR', 'BIKE', 'OTHER'].map((v) => ({ value: v, label: v }))} />
          <Input label="Capacity *" type="number" value={vCapacity} onChange={(e) => setVCapacity(e.target.value)} placeholder="e.g. 40" />
          <Input label="Make" value={vMake} onChange={(e) => setVMake(e.target.value)} placeholder="e.g. Toyota" />
          <Input label="Model" value={vModel} onChange={(e) => setVModel(e.target.value)} placeholder="e.g. Coaster" />
          <Input label="Year" type="number" value={vYear} onChange={(e) => setVYear(e.target.value)} placeholder="e.g. 2022" />
          <Input label="Color" value={vColor} onChange={(e) => setVColor(e.target.value)} placeholder="e.g. White" />
          <Input label="Fuel Type" value={vFuelType} onChange={(e) => setVFuelType(e.target.value)} placeholder="e.g. Diesel" />
        </div>
      </Modal>

      {/* Driver Modal */}
      <Modal
        isOpen={showDriverModal}
        onClose={() => { setShowDriverModal(false); setDriverMsg(null); }}
        title="Register Driver"
        footer={
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button variant="outline" onClick={() => setShowDriverModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleRegisterDriver} disabled={isSubmittingDriver}>
              {isSubmittingDriver ? 'Registering...' : 'Register Driver'}
            </Button>
          </div>
        }
      >
        {driverMsg && <Alert variant={driverMsg.type} style={{ marginBottom: '1rem' }}>{driverMsg.text}</Alert>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Input label="License Number *" value={dLicense} onChange={(e) => setDLicense(e.target.value)} placeholder="License number" />
          <Input label="License Class" value={dLicenseClass} onChange={(e) => setDLicenseClass(e.target.value)} placeholder="e.g. Heavy" />
          <Input label="License Expiry" type="date" value={dLicenseExpiry} onChange={(e) => setDLicenseExpiry(e.target.value)} />
          <Input label="Experience (years)" type="number" value={dExperience} onChange={(e) => setDExperience(e.target.value)} placeholder="0" />
          <Input label="Contact Phone" value={dPhone} onChange={(e) => setDPhone(e.target.value)} placeholder="+1234567890" />
        </div>
      </Modal>

      {/* Route Modal */}
      <Modal
        isOpen={showRouteModal}
        onClose={() => { setShowRouteModal(false); setRouteMsg(null); }}
        title="Create Transport Route"
        footer={
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button variant="outline" onClick={() => setShowRouteModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateRoute} disabled={isSubmittingRoute}>
              {isSubmittingRoute ? 'Creating...' : 'Create Route'}
            </Button>
          </div>
        }
      >
        {routeMsg && <Alert variant={routeMsg.type} style={{ marginBottom: '1rem' }}>{routeMsg.text}</Alert>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <Input label="Route Name *" value={rName} onChange={(e) => setRName(e.target.value)} placeholder="e.g. North Campus — City Center" />
          </div>
          <Input label="Start Location" value={rStart} onChange={(e) => setRStart(e.target.value)} placeholder="Departure point" />
          <Input label="End Location" value={rEnd} onChange={(e) => setREnd(e.target.value)} placeholder="Destination" />
          <Input label="Distance (km)" type="number" value={rDistance} onChange={(e) => setRDistance(e.target.value)} placeholder="e.g. 15.5" />
          <Input label="Estimated Minutes" type="number" value={rMinutes} onChange={(e) => setRMinutes(e.target.value)} placeholder="e.g. 45" />
          <Input label="Fee Amount" type="number" value={rFee} onChange={(e) => setRFee(e.target.value)} placeholder="e.g. 500" />
        </div>
      </Modal>

      {/* Assignment Modal */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => { setShowAssignModal(false); setAssignMsg(null); }}
        title="Assign Student to Route"
        footer={
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button variant="outline" onClick={() => setShowAssignModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleAssignStudent} disabled={isSubmittingAssign}>
              {isSubmittingAssign ? 'Assigning...' : 'Assign Student'}
            </Button>
          </div>
        }
      >
        {assignMsg && <Alert variant={assignMsg.type} style={{ marginBottom: '1rem' }}>{assignMsg.text}</Alert>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Input label="Student ID *" value={aStudentId} onChange={(e) => setAStudentId(e.target.value)} placeholder="StudentProfile ID" />
          <Select
            label="Route *"
            value={aRouteId}
            onChange={(e) => setARouteId(e.target.value)}
            options={[{ value: '', label: 'Select Route' }, ...routes.map((r: any) => ({ value: r.id, label: `${r.routeCode} — ${r.name}` }))]}
          />
          <Select
            label="Assignment Type"
            value={aType}
            onChange={(e) => setAType(e.target.value)}
            options={[{ value: 'BOTH', label: 'Both (Pickup & Drop)' }, { value: 'PICKUP', label: 'Pickup only' }, { value: 'DROP', label: 'Drop only' }]}
          />
          <Input label="Effective From *" type="date" value={aFrom} onChange={(e) => setAFrom(e.target.value)} />
          <div style={{ gridColumn: '1 / -1' }}>
            <Input label="Pickup Address" value={aPickupAddress} onChange={(e) => setAPickupAddress(e.target.value)} placeholder="Student's pickup address" />
          </div>
        </div>
      </Modal>

      {/* Schedule Modal */}
      <Modal
        isOpen={showScheduleModal}
        onClose={() => { setShowScheduleModal(false); setScheduleMsg(null); }}
        title="Create Transport Schedule"
        footer={
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button variant="outline" onClick={() => setShowScheduleModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateSchedule} disabled={isSubmittingSchedule}>
              {isSubmittingSchedule ? 'Creating...' : 'Create Schedule'}
            </Button>
          </div>
        }
      >
        {scheduleMsg && <Alert variant={scheduleMsg.type} style={{ marginBottom: '1rem' }}>{scheduleMsg.text}</Alert>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Select
            label="Route *"
            value={sRouteId}
            onChange={(e) => setSRouteId(e.target.value)}
            options={[{ value: '', label: 'Select Route' }, ...routes.map((r: any) => ({ value: r.id, label: `${r.routeCode} — ${r.name}` }))]}
          />
          <Select
            label="Vehicle"
            value={sVehicleId}
            onChange={(e) => setSVehicleId(e.target.value)}
            options={[{ value: '', label: 'No Vehicle' }, ...(Array.isArray(vehicles) ? vehicles : []).filter((v: any) => v.status === 'ACTIVE').map((v: any) => ({ value: v.id, label: v.vehicleNumber }))]}
          />
          <Select
            label="Driver"
            value={sDriverId}
            onChange={(e) => setSDriverId(e.target.value)}
            options={[{ value: '', label: 'No Driver' }, ...(Array.isArray(drivers) ? drivers : []).filter((d: any) => d.status === 'ACTIVE').map((d: any) => ({ value: d.id, label: d.driverCode }))]}
          />
          <Select
            label="Trip Type"
            value={sTripType}
            onChange={(e) => setSTripType(e.target.value)}
            options={['MORNING', 'AFTERNOON', 'EVENING', 'SPECIAL'].map((t) => ({ value: t, label: t }))}
          />
          <Input label="Schedule Date *" type="date" value={sDate} onChange={(e) => setSDate(e.target.value)} />
          <Input label="Departure Time" type="time" value={sDeparture} onChange={(e) => setSDeparture(e.target.value)} />
        </div>
      </Modal>

      {/* Maintenance Modal */}
      <Modal
        isOpen={showMaintenanceModal}
        onClose={() => { setShowMaintenanceModal(false); setMaintMsg(null); }}
        title="Schedule Vehicle Maintenance"
        footer={
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button variant="outline" onClick={() => setShowMaintenanceModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleScheduleMaintenance} disabled={isSubmittingMaint}>
              {isSubmittingMaint ? 'Scheduling...' : 'Schedule Maintenance'}
            </Button>
          </div>
        }
      >
        {maintMsg && <Alert variant={maintMsg.type} style={{ marginBottom: '1rem' }}>{maintMsg.text}</Alert>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Select
            label="Vehicle *"
            value={mVehicleId}
            onChange={(e) => setMVehicleId(e.target.value)}
            options={[{ value: '', label: 'Select Vehicle' }, ...vehicles.map((v: any) => ({ value: v.id, label: v.vehicleNumber }))]}
          />
          <Select
            label="Maintenance Type"
            value={mType}
            onChange={(e) => setMType(e.target.value)}
            options={['ROUTINE_SERVICE', 'REPAIR', 'INSPECTION', 'TYRE', 'OIL', 'OTHER'].map((t) => ({ value: t, label: t.replace('_', ' ') }))}
          />
          <Input label="Scheduled Date" type="date" value={mScheduledDate} onChange={(e) => setMScheduledDate(e.target.value)} />
          <Input label="Service Provider" value={mProvider} onChange={(e) => setMProvider(e.target.value)} placeholder="Garage name" />
          <div style={{ gridColumn: '1 / -1' }}>
            <Input label="Description *" value={mDesc} onChange={(e) => setMDesc(e.target.value)} placeholder="Describe the maintenance work" />
          </div>
        </div>
      </Modal>

      {/* Incident Modal */}
      <Modal
        isOpen={showIncidentModal}
        onClose={() => { setShowIncidentModal(false); setIncidentMsg(null); }}
        title="Report Transport Incident"
        footer={
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button variant="outline" onClick={() => setShowIncidentModal(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleReportIncident} disabled={isSubmittingIncident}>
              {isSubmittingIncident ? 'Reporting...' : 'Report Incident'}
            </Button>
          </div>
        }
      >
        {incidentMsg && <Alert variant={incidentMsg.type} style={{ marginBottom: '1rem' }}>{incidentMsg.text}</Alert>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Select
            label="Vehicle"
            value={iVehicleId}
            onChange={(e) => setIVehicleId(e.target.value)}
            options={[{ value: '', label: 'No specific vehicle' }, ...vehicles.map((v: any) => ({ value: v.id, label: v.vehicleNumber }))]}
          />
          <Select
            label="Severity"
            value={iSeverity}
            onChange={(e) => setISeverity(e.target.value)}
            options={['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((s) => ({ value: s, label: s }))}
          />
          <Input label="Incident Date *" type="date" value={iDate} onChange={(e) => setIDate(e.target.value)} />
          <Input label="Location" value={iLocation} onChange={(e) => setILocation(e.target.value)} placeholder="Where did it occur?" />
          <div style={{ gridColumn: '1 / -1' }}>
            <Input label="Description *" value={iDescription} onChange={(e) => setIDescription(e.target.value)} placeholder="Describe what happened" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
