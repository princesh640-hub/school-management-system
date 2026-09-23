export enum AppModule {
  AUTH = 'auth',
  USERS = 'users',
  ROLES = 'roles',
  PERMISSIONS = 'permissions',
  STUDENTS = 'students',
  GUARDIANS = 'guardians',
  TEACHERS = 'teachers',
  EMPLOYEES = 'employees',
  ACADEMICS = 'academics',
  ATTENDANCE = 'attendance',
  TIMETABLE = 'timetable',
  EXAMINATIONS = 'examinations',
  GRADING = 'grading',
  FEES = 'fees',
  PAYROLL = 'payroll',
  HR = 'hr',
  LIBRARY = 'library',
  TRANSPORT = 'transport',
  HOSTEL = 'hostel',
  INVENTORY = 'inventory',
  PROCUREMENT = 'procurement',
  ACCOUNTS = 'accounts',
  COMMUNICATION = 'communication',
  NOTIFICATIONS = 'notifications',
  REPORTS = 'reports',
  DOCUMENTS = 'documents',
  AUDIT = 'audit',
  SETTINGS = 'settings',
}

export enum AppAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  EXPORT = 'export',
  IMPORT = 'import',
  APPROVE = 'approve',
  MANAGE = 'manage',
}

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  HALF_DAY = 'HALF_DAY',
  EXCUSED = 'EXCUSED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}
