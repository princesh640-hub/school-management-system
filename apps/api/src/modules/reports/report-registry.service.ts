// =============================================================================
// Phase 4R: Report Registry Service (Operational Catalog)
// =============================================================================
import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ReportCategory,
  IReportDefinition,
  IReportCatalogCategory,
} from '@school/shared-types';

@Injectable()
export class ReportRegistryService {
  private readonly reports: Map<string, IReportDefinition> = new Map();
  private readonly categories: Map<ReportCategory, { label: string; icon: string; description: string }> = new Map();

  constructor() {
    this.initializeCategories();
    this.initializeCatalog();
  }

  private initializeCategories() {
    this.categories.set('STUDENTS', {
      label: 'Student Demographic & Lifecycle',
      icon: '🎒',
      description: 'Master rosters, intake admissions, withdrawals, demographic breakdown, and family relationships.',
    });
    this.categories.set('ACADEMICS', {
      label: 'Academic Structure & Curriculum',
      icon: '🏫',
      description: 'Class/section sizes, subject offering enrollments, faculty teaching workload, and academic history.',
    });
    this.categories.set('ATTENDANCE', {
      label: 'Attendance & Punctuality',
      icon: '📅',
      description: 'Daily roll-calls, monthly attendance matrices, chronic absenteeism alerts, and staff timesheets.',
    });
    this.categories.set('EXAMINATIONS', {
      label: 'Examinations & Performance',
      icon: '📝',
      description: 'Class pass rates, grade distributions, GPA rankings, unentered marks audits, and report cards.',
    });
    this.categories.set('FINANCE', {
      label: 'Fees, Invoicing & Revenue',
      icon: '💳',
      description: 'Invoiced fee demands, realized collections, aging outstanding dues, concessions, and cashier reconciliations.',
    });
    this.categories.set('HR', {
      label: 'HR, Staff & Payroll',
      icon: '👥',
      description: 'Employee census by department, gross/net payroll summaries, and faculty leave utilization.',
    });
    this.categories.set('LIBRARY', {
      label: 'Library & Circulation Desk',
      icon: '📚',
      description: 'Book checkout loans, overdue return fines, catalog volume conditions, and hold queues.',
    });
    this.categories.set('TRANSPORT', {
      label: 'Transport, Fleet & Routes',
      icon: '🚌',
      description: 'Vehicle capacity utilization, student bus stops, boarding events, and fleet maintenance incidents.',
    });
    this.categories.set('HOSTEL', {
      label: 'Hostel & Residential Life',
      icon: '🛏️',
      description: 'Room and bed occupancy, capacity availability, roll-call attendance, and gate pass outings.',
    });
    this.categories.set('INVENTORY', {
      label: 'Inventory & Procurement',
      icon: '📦',
      description: 'Warehouse stock balances, reorder threshold alerts, purchase orders ledger, and goods received receipts.',
    });
    this.categories.set('COMMUNICATION', {
      label: 'Communication & Delivery Logs',
      icon: '📢',
      description: 'Announcements reach, multi-channel notification deliveries (Email, SMS, Push, WhatsApp), and failure logs.',
    });
    this.categories.set('DOCUMENTS', {
      label: 'Documents & Certificates',
      icon: '📜',
      description: 'Issued formal certificates ledger, revoked credentials audit, and proactive credential expiry alerts.',
    });
  }

  private initializeCatalog() {
    // 1. STUDENTS
    this.registerReport({
      key: 'STUDENT_MASTER',
      name: 'Student Master Roster',
      category: 'STUDENTS',
      description: 'Comprehensive student profile list with enrollment, campus, class, section, and contact details.',
      requiredPermission: 'reports:read',
      supportedFormats: ['JSON', 'CSV', 'PDF'],
      parameters: [
        { key: 'campusId', label: 'Campus', type: 'select', required: false, optionsSource: 'campuses' },
        { key: 'classId', label: 'Class', type: 'select', required: false, optionsSource: 'classes' },
        { key: 'status', label: 'Student Status', type: 'select', required: false, defaultValue: 'ACTIVE' },
      ],
      defaultColumns: [
        { key: 'admissionNumber', label: 'Admission #', type: 'string' },
        { key: 'studentName', label: 'Student Name', type: 'string' },
        { key: 'campusName', label: 'Campus', type: 'string' },
        { key: 'className', label: 'Class', type: 'string' },
        { key: 'sectionName', label: 'Section', type: 'string' },
        { key: 'gender', label: 'Gender', type: 'string' },
        { key: 'email', label: 'Email', type: 'string' },
        { key: 'status', label: 'Status', type: 'badge' },
      ],
    });

    this.registerReport({
      key: 'STUDENT_ADMISSIONS',
      name: 'Admissions & Intake Report',
      category: 'STUDENTS',
      description: 'Intake application statistics, offer status, and enrollment conversions across academic periods.',
      requiredPermission: 'reports:read',
      supportedFormats: ['JSON', 'CSV', 'PDF'],
      parameters: [
        { key: 'startDate', label: 'Start Date', type: 'date', required: false },
        { key: 'endDate', label: 'End Date', type: 'date', required: false },
      ],
      defaultColumns: [
        { key: 'applicationNumber', label: 'App #', type: 'string' },
        { key: 'applicantName', label: 'Applicant', type: 'string' },
        { key: 'appliedClass', label: 'Target Class', type: 'string' },
        { key: 'submissionDate', label: 'Applied On', type: 'date' },
        { key: 'admissionStatus', label: 'Status', type: 'badge' },
      ],
    });

    this.registerReport({
      key: 'STUDENT_DEMOGRAPHICS',
      name: 'Student Demographics & Diversity',
      category: 'STUDENTS',
      description: 'Distribution of students by gender, blood group, nationality, and enrollment year.',
      requiredPermission: 'reports:read',
      supportedFormats: ['JSON', 'CSV', 'PDF'],
      parameters: [
        { key: 'campusId', label: 'Campus', type: 'select', required: false },
      ],
      defaultColumns: [
        { key: 'groupKey', label: 'Demographic Group', type: 'string' },
        { key: 'maleCount', label: 'Male', type: 'number', align: 'right' },
        { key: 'femaleCount', label: 'Female', type: 'number', align: 'right' },
        { key: 'totalCount', label: 'Total', type: 'number', align: 'right' },
        { key: 'percentage', label: 'Percentage', type: 'percentage', align: 'right' },
      ],
    });

    // 2. ACADEMICS
    this.registerReport({
      key: 'CLASS_ENROLLMENT',
      name: 'Class & Section Capacity Report',
      category: 'ACADEMICS',
      description: 'Enrolled students vs maximum section capacity and teacher-to-student ratios.',
      requiredPermission: 'reports:read',
      supportedFormats: ['JSON', 'CSV', 'PDF'],
      parameters: [
        { key: 'campusId', label: 'Campus', type: 'select', required: false },
      ],
      defaultColumns: [
        { key: 'className', label: 'Class', type: 'string' },
        { key: 'sectionName', label: 'Section', type: 'string' },
        { key: 'enrolledCount', label: 'Enrolled', type: 'number', align: 'right' },
        { key: 'maxCapacity', label: 'Capacity', type: 'number', align: 'right' },
        { key: 'utilizationRate', label: 'Occupancy %', type: 'percentage', align: 'right' },
        { key: 'classTeacher', label: 'Class Teacher', type: 'string' },
      ],
    });

    this.registerReport({
      key: 'TEACHING_LOAD',
      name: 'Faculty Teaching Load Statement',
      category: 'ACADEMICS',
      description: 'Weekly assigned teaching hours, subjects, and sections per teacher.',
      requiredPermission: 'reports:read',
      supportedFormats: ['JSON', 'CSV', 'PDF'],
      parameters: [
        { key: 'departmentId', label: 'Department', type: 'select', required: false },
      ],
      defaultColumns: [
        { key: 'teacherName', label: 'Teacher', type: 'string' },
        { key: 'employeeNumber', label: 'Emp ID', type: 'string' },
        { key: 'department', label: 'Department', type: 'string' },
        { key: 'subjectsAssigned', label: 'Subjects', type: 'number', align: 'right' },
        { key: 'sectionsCount', label: 'Sections', type: 'number', align: 'right' },
        { key: 'weeklySlots', label: 'Weekly Slots', type: 'number', align: 'right' },
      ],
    });

    // 3. ATTENDANCE
    this.registerReport({
      key: 'DAILY_ATTENDANCE_SUMMARY',
      name: 'Daily Attendance Summary',
      category: 'ATTENDANCE',
      description: 'Roll-call totals, present counts, unexcused absences, and section attendance rates.',
      requiredPermission: 'reports:read',
      supportedFormats: ['JSON', 'CSV', 'PDF'],
      parameters: [
        { key: 'date', label: 'Date', type: 'date', required: false },
        { key: 'classId', label: 'Class', type: 'select', required: false },
      ],
      defaultColumns: [
        { key: 'className', label: 'Class', type: 'string' },
        { key: 'sectionName', label: 'Section', type: 'string' },
        { key: 'totalStudents', label: 'Total', type: 'number', align: 'right' },
        { key: 'presentCount', label: 'Present', type: 'number', align: 'right' },
        { key: 'absentCount', label: 'Absent', type: 'number', align: 'right' },
        { key: 'lateCount', label: 'Late', type: 'number', align: 'right' },
        { key: 'rate', label: 'Attendance %', type: 'percentage', align: 'right' },
      ],
    });

    this.registerReport({
      key: 'ABSENTEEISM_ALERTS',
      name: 'Chronic Absenteeism & Threshold Alerts',
      category: 'ATTENDANCE',
      description: 'Students falling below the mandatory 75% or 85% attendance regulatory thresholds.',
      requiredPermission: 'reports:read',
      supportedFormats: ['JSON', 'CSV', 'PDF'],
      parameters: [
        { key: 'threshold', label: 'Threshold %', type: 'number', required: false, defaultValue: 75 },
      ],
      defaultColumns: [
        { key: 'admissionNumber', label: 'Admission #', type: 'string' },
        { key: 'studentName', label: 'Student', type: 'string' },
        { key: 'className', label: 'Class', type: 'string' },
        { key: 'sectionName', label: 'Section', type: 'string' },
        { key: 'totalDays', label: 'Total Days', type: 'number', align: 'right' },
        { key: 'presentDays', label: 'Present', type: 'number', align: 'right' },
        { key: 'attendanceRate', label: 'Attendance %', type: 'percentage', align: 'right' },
        { key: 'riskLevel', label: 'Risk', type: 'badge' },
      ],
    });

    // 4. EXAMINATIONS
    this.registerReport({
      key: 'EXAM_RESULTS_SUMMARY',
      name: 'Class Exam Performance Summary',
      category: 'EXAMINATIONS',
      description: 'Aggregated pass percentages, highest scores, lowest scores, and averages across subjects.',
      requiredPermission: 'reports:read',
      supportedFormats: ['JSON', 'CSV', 'PDF'],
      parameters: [
        { key: 'examSessionId', label: 'Exam Session', type: 'select', required: false },
        { key: 'classId', label: 'Class', type: 'select', required: false },
      ],
      defaultColumns: [
        { key: 'subjectName', label: 'Subject', type: 'string' },
        { key: 'className', label: 'Class', type: 'string' },
        { key: 'studentsAppeared', label: 'Appeared', type: 'number', align: 'right' },
        { key: 'studentsPassed', label: 'Passed', type: 'number', align: 'right' },
        { key: 'averageMarks', label: 'Average', type: 'number', align: 'right' },
        { key: 'passRate', label: 'Pass Rate %', type: 'percentage', align: 'right' },
      ],
    });

    this.registerReport({
      key: 'PENDING_MARKS_AUDIT',
      name: 'Pending Marks Entry Audit',
      category: 'EXAMINATIONS',
      description: 'Audit tracking teacher marks entry deadlines, unsubmitted rosters, and unapproved grades.',
      requiredPermission: 'reports:read',
      supportedFormats: ['JSON', 'CSV', 'PDF'],
      parameters: [
        { key: 'examSessionId', label: 'Exam Session', type: 'select', required: false },
      ],
      defaultColumns: [
        { key: 'examTitle', label: 'Exam', type: 'string' },
        { key: 'subjectName', label: 'Subject', type: 'string' },
        { key: 'sectionName', label: 'Section', type: 'string' },
        { key: 'assignedTeacher', label: 'Assigned Teacher', type: 'string' },
        { key: 'pendingCount', label: 'Pending Students', type: 'number', align: 'right' },
        { key: 'status', label: 'Status', type: 'badge' },
      ],
    });

    // 5. FINANCE
    this.registerReport({
      key: 'FEE_DEMAND_STATEMENT',
      name: 'Fee Demand & Invoicing Ledger',
      category: 'FINANCE',
      description: 'Total fee demand generated by term, fee category, and class breakdown.',
      requiredPermission: 'reports:read',
      supportedFormats: ['JSON', 'CSV', 'PDF'],
      parameters: [
        { key: 'academicYearId', label: 'Academic Year', type: 'select', required: false },
      ],
      defaultColumns: [
        { key: 'invoiceNumber', label: 'Invoice #', type: 'string' },
        { key: 'studentName', label: 'Student', type: 'string' },
        { key: 'className', label: 'Class', type: 'string' },
        { key: 'totalAmount', label: 'Invoiced', type: 'currency', align: 'right' },
        { key: 'paidAmount', label: 'Paid', type: 'currency', align: 'right' },
        { key: 'balance', label: 'Balance', type: 'currency', align: 'right' },
        { key: 'dueDate', label: 'Due Date', type: 'date' },
        { key: 'status', label: 'Status', type: 'badge' },
      ],
    });

    this.registerReport({
      key: 'FEE_COLLECTION_LEDGER',
      name: 'Fee Collection & Settlement Ledger',
      category: 'FINANCE',
      description: 'Audited record of realized fee payments, cashier shifts, payment methods, and timestamps.',
      requiredPermission: 'reports:read',
      supportedFormats: ['JSON', 'CSV', 'PDF'],
      parameters: [
        { key: 'startDate', label: 'Start Date', type: 'date', required: false },
        { key: 'endDate', label: 'End Date', type: 'date', required: false },
        { key: 'paymentMethod', label: 'Method', type: 'select', required: false },
      ],
      defaultColumns: [
        { key: 'receiptNumber', label: 'Receipt #', type: 'string' },
        { key: 'studentName', label: 'Student', type: 'string' },
        { key: 'amount', label: 'Amount Paid', type: 'currency', align: 'right' },
        { key: 'paymentMethod', label: 'Method', type: 'string' },
        { key: 'paymentDate', label: 'Payment Date', type: 'date' },
        { key: 'cashierName', label: 'Cashier / Admin', type: 'string' },
      ],
    });

    this.registerReport({
      key: 'OUTSTANDING_BALANCES',
      name: 'Outstanding Balances & Defaulters',
      category: 'FINANCE',
      description: 'Overdue accounts receivable aging, unpaid tuition fees, and balance summaries per student.',
      requiredPermission: 'reports:read',
      supportedFormats: ['JSON', 'CSV', 'PDF'],
      parameters: [
        { key: 'classId', label: 'Class', type: 'select', required: false },
      ],
      defaultColumns: [
        { key: 'admissionNumber', label: 'Admission #', type: 'string' },
        { key: 'studentName', label: 'Student', type: 'string' },
        { key: 'className', label: 'Class', type: 'string' },
        { key: 'guardianContact', label: 'Guardian Phone', type: 'string' },
        { key: 'overdueAmount', label: 'Overdue Balance', type: 'currency', align: 'right' },
        { key: 'daysOverdue', label: 'Days Overdue', type: 'number', align: 'right' },
      ],
    });

    // 6. HR & PAYROLL
    this.registerReport({
      key: 'EMPLOYEE_MASTER',
      name: 'Employee & Staff Master Roster',
      category: 'HR',
      description: 'Active personnel directory by campus, department, designation, and employment type.',
      requiredPermission: 'reports:read',
      supportedFormats: ['JSON', 'CSV', 'PDF'],
      parameters: [
        { key: 'departmentId', label: 'Department', type: 'select', required: false },
      ],
      defaultColumns: [
        { key: 'employeeNumber', label: 'Emp #', type: 'string' },
        { key: 'fullName', label: 'Full Name', type: 'string' },
        { key: 'department', label: 'Department', type: 'string' },
        { key: 'designation', label: 'Designation', type: 'string' },
        { key: 'joiningDate', label: 'Joined On', type: 'date' },
        { key: 'status', label: 'Status', type: 'badge' },
      ],
    });

    this.registerReport({
      key: 'PAYROLL_SUMMARY',
      name: 'Monthly Payroll & Disbursements Statement',
      category: 'HR',
      description: 'Gross compensation, tax deductions, provident deductions, and net payable wages by payroll cycle.',
      requiredPermission: 'reports:read',
      supportedFormats: ['JSON', 'CSV', 'PDF'],
      parameters: [
        { key: 'month', label: 'Month / Year', type: 'string', required: false },
      ],
      defaultColumns: [
        { key: 'payrollPeriod', label: 'Period', type: 'string' },
        { key: 'employeeName', label: 'Employee', type: 'string' },
        { key: 'grossPay', label: 'Gross Pay', type: 'currency', align: 'right' },
        { key: 'totalDeductions', label: 'Deductions', type: 'currency', align: 'right' },
        { key: 'netPay', label: 'Net Payable', type: 'currency', align: 'right' },
        { key: 'status', label: 'Payment Status', type: 'badge' },
      ],
    });

    // 7. LIBRARY
    this.registerReport({
      key: 'LIBRARY_CIRCULATION',
      name: 'Library Book Circulation & Loans Ledger',
      category: 'LIBRARY',
      description: 'Active, returned, and overdue book issues with borrower attribution and due dates.',
      requiredPermission: 'reports:read',
      supportedFormats: ['JSON', 'CSV', 'PDF'],
      parameters: [
        { key: 'status', label: 'Loan Status', type: 'select', required: false },
      ],
      defaultColumns: [
        { key: 'loanNumber', label: 'Loan #', type: 'string' },
        { key: 'bookTitle', label: 'Book Title', type: 'string' },
        { key: 'accessionNumber', label: 'Accession #', type: 'string' },
        { key: 'borrowerName', label: 'Patron', type: 'string' },
        { key: 'borrowerType', label: 'Role', type: 'string' },
        { key: 'issueDate', label: 'Issued', type: 'date' },
        { key: 'dueDate', label: 'Due Date', type: 'date' },
        { key: 'loanStatus', label: 'Status', type: 'badge' },
      ],
    });

    // 8. TRANSPORT
    this.registerReport({
      key: 'FLEET_UTILIZATION',
      name: 'Transport Fleet & Route Occupancy',
      category: 'TRANSPORT',
      description: 'Vehicle passenger capacity, driver allocations, assigned students, and route coverage.',
      requiredPermission: 'reports:read',
      supportedFormats: ['JSON', 'CSV', 'PDF'],
      parameters: [],
      defaultColumns: [
        { key: 'registrationNumber', label: 'Reg #', type: 'string' },
        { key: 'vehicleType', label: 'Type', type: 'string' },
        { key: 'capacity', label: 'Capacity', type: 'number', align: 'right' },
        { key: 'assignedStudents', label: 'Assigned', type: 'number', align: 'right' },
        { key: 'occupancyRate', label: 'Occupancy %', type: 'percentage', align: 'right' },
        { key: 'driverName', label: 'Driver', type: 'string' },
      ],
    });

    // 9. HOSTEL
    this.registerReport({
      key: 'HOSTEL_OCCUPANCY',
      name: 'Hostel Building & Bed Occupancy',
      category: 'HOSTEL',
      description: 'Residential building occupancy, vacant bed capacity, and allocated student rosters.',
      requiredPermission: 'reports:read',
      supportedFormats: ['JSON', 'CSV', 'PDF'],
      parameters: [],
      defaultColumns: [
        { key: 'hostelName', label: 'Hostel', type: 'string' },
        { key: 'roomNumber', label: 'Room', type: 'string' },
        { key: 'totalBeds', label: 'Beds', type: 'number', align: 'right' },
        { key: 'occupiedBeds', label: 'Occupied', type: 'number', align: 'right' },
        { key: 'availableBeds', label: 'Available', type: 'number', align: 'right' },
        { key: 'occupancyRate', label: 'Occupancy %', type: 'percentage', align: 'right' },
      ],
    });

    // 10. INVENTORY & PROCUREMENT
    this.registerReport({
      key: 'STOCK_POSITION',
      name: 'Warehouse Stock Position & Reorder Alerts',
      category: 'INVENTORY',
      description: 'Current physical inventory balances, items below reorder levels, and stock unit valuations.',
      requiredPermission: 'reports:read',
      supportedFormats: ['JSON', 'CSV', 'PDF'],
      parameters: [],
      defaultColumns: [
        { key: 'itemCode', label: 'Item Code', type: 'string' },
        { key: 'itemName', label: 'Item Name', type: 'string' },
        { key: 'category', label: 'Category', type: 'string' },
        { key: 'currentQuantity', label: 'In Stock', type: 'number', align: 'right' },
        { key: 'reorderLevel', label: 'Reorder Level', type: 'number', align: 'right' },
        { key: 'stockStatus', label: 'Stock Health', type: 'badge' },
      ],
    });

    // 11. COMMUNICATION
    this.registerReport({
      key: 'NOTIFICATION_DELIVERY_AUDIT',
      name: 'Notification Delivery & Channel Performance',
      category: 'COMMUNICATION',
      description: 'Cross-channel delivery success rates, queue durations, and failure causes across Email, SMS, and Push.',
      requiredPermission: 'reports:read',
      supportedFormats: ['JSON', 'CSV', 'PDF'],
      parameters: [
        { key: 'channel', label: 'Channel', type: 'select', required: false },
      ],
      defaultColumns: [
        { key: 'channel', label: 'Channel', type: 'string' },
        { key: 'totalSent', label: 'Total Dispatched', type: 'number', align: 'right' },
        { key: 'deliveredCount', label: 'Delivered', type: 'number', align: 'right' },
        { key: 'failedCount', label: 'Failed', type: 'number', align: 'right' },
        { key: 'successRate', label: 'Success %', type: 'percentage', align: 'right' },
      ],
    });

    // 12. DOCUMENTS & CERTIFICATES
    this.registerReport({
      key: 'ISSUED_CERTIFICATES_LEDGER',
      name: 'Official Certificates Issued Ledger',
      category: 'DOCUMENTS',
      description: 'Formal institutional certificates issued, approved authorities, issue dates, and verification references.',
      requiredPermission: 'reports:read',
      supportedFormats: ['JSON', 'CSV', 'PDF'],
      parameters: [
        { key: 'status', label: 'Status', type: 'select', required: false },
      ],
      defaultColumns: [
        { key: 'certificateNumber', label: 'Cert #', type: 'string' },
        { key: 'certificateType', label: 'Type', type: 'string' },
        { key: 'recipientName', label: 'Recipient', type: 'string' },
        { key: 'issuedDate', label: 'Issue Date', type: 'date' },
        { key: 'verificationReference', label: 'Token Ref', type: 'string' },
        { key: 'status', label: 'Status', type: 'badge' },
      ],
    });

    this.registerReport({
      key: 'EXPIRING_DOCUMENTS_ALERT',
      name: 'Compliance & Expiring Documents Registry',
      category: 'DOCUMENTS',
      description: 'Institutional documents, vehicle fitness certificates, and teacher credentials approaching expiry.',
      requiredPermission: 'reports:read',
      supportedFormats: ['JSON', 'CSV', 'PDF'],
      parameters: [],
      defaultColumns: [
        { key: 'documentNumber', label: 'Doc #', type: 'string' },
        { key: 'title', label: 'Title', type: 'string' },
        { key: 'category', label: 'Category', type: 'string' },
        { key: 'entityName', label: 'Associated Entity', type: 'string' },
        { key: 'expiryDate', label: 'Expiry Date', type: 'date' },
        { key: 'daysRemaining', label: 'Days Remaining', type: 'number', align: 'right' },
      ],
    });
  }

  private registerReport(def: IReportDefinition) {
    this.reports.set(def.key, def);
  }

  getReportDefinition(key: string): IReportDefinition {
    const def = this.reports.get(key);
    if (!def) {
      throw new NotFoundException(`Report with key '${key}' not found in registry`);
    }
    return def;
  }

  getAllDefinitions(): IReportDefinition[] {
    return Array.from(this.reports.values());
  }

  getCatalog(): IReportCatalogCategory[] {
    const categories: IReportCatalogCategory[] = [];

    this.categories.forEach((catMeta, categoryKey) => {
      const reports = Array.from(this.reports.values()).filter((r) => r.category === categoryKey);
      categories.push({
        category: categoryKey,
        label: catMeta.label,
        icon: catMeta.icon,
        description: catMeta.description,
        reports,
      });
    });

    return categories;
  }
}
