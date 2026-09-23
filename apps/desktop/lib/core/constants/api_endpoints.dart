class ApiEndpoints {
  static const String apiVersion = 'v1';
  static const String health = '/api/$apiVersion/health';
  static const String healthLive = '/api/$apiVersion/health/live';
  static const String healthReady = '/api/$apiVersion/health/ready';
  static const String login = '/api/$apiVersion/auth/login';
  static const String refreshToken = '/api/$apiVersion/auth/refresh';
  static const String students = '/api/$apiVersion/students';
  static const String attendance = '/api/$apiVersion/attendance';
  static const String examinations = '/api/$apiVersion/examinations';
  static const String fees = '/api/$apiVersion/fees';
  static const String notifications = '/api/$apiVersion/notifications';

  // Parent Portal
  static const String parent = '/api/$apiVersion/parent';
  static const String parentChildren = '/api/$apiVersion/parent/children';
  static const String parentNotices = '/api/$apiVersion/parent/notices';
  static const String parentProfile = '/api/$apiVersion/parent/profile';

  // Student Portal
  static const String student = '/api/$apiVersion/student';
  static const String studentDashboard = '/api/$apiVersion/student/dashboard';
  static const String studentProfile = '/api/$apiVersion/student/profile';
  static const String studentTimetable = '/api/$apiVersion/student/timetable';
  static const String studentAttendance = '/api/$apiVersion/student/attendance';
  static const String studentResults = '/api/$apiVersion/student/results';
  static const String studentFees = '/api/$apiVersion/student/fees';
  static const String studentNotices = '/api/$apiVersion/student/notices';

  // Teacher Portal
  static const String teacher = '/api/$apiVersion/teacher';
  static const String teacherDashboard = '/api/$apiVersion/teacher/dashboard';
  static const String teacherProfile = '/api/$apiVersion/teacher/profile';
  static const String teacherClasses = '/api/$apiVersion/teacher/classes';
  static const String teacherSubjects = '/api/$apiVersion/teacher/subjects';
  static const String teacherStudents = '/api/$apiVersion/teacher/students';
  static const String teacherTimetable = '/api/$apiVersion/teacher/timetable';
  static const String teacherAttendance = '/api/$apiVersion/teacher/attendance';
  static const String teacherExams = '/api/$apiVersion/teacher/exams';
  static const String teacherMarks = '/api/$apiVersion/teacher/marks';
  static const String teacherLeave = '/api/$apiVersion/teacher/leave';
  static const String teacherNotices = '/api/$apiVersion/teacher/notices';

  // Phase 4Q: Documents, Certificates & Printing
  static const String documents = '/api/$apiVersion/documents';
  static const String documentCategories = '/api/$apiVersion/documents/categories/all';
  static const String documentTypes = '/api/$apiVersion/documents/types/all';
  static const String documentOverview = '/api/$apiVersion/documents/dashboard/overview';
  static const String certificates = '/api/$apiVersion/certificates';
  static const String certificateTypes = '/api/$apiVersion/certificates/types';
  static const String issuedCertificates = '/api/$apiVersion/certificates/issued';
  static const String verifyCertificate = '/api/$apiVersion/certificates/verify';
  static const String printingJobs = '/api/$apiVersion/printing/jobs';

  // Phase 4R: Reports, Analytics & Dashboards
  static const String reports = '/api/$apiVersion/reports';
  static const String reportsCatalog = '/api/$apiVersion/reports/catalog';
  static const String reportsExecute = '/api/$apiVersion/reports/execute';
  static const String reportsExport = '/api/$apiVersion/reports/export';
  static const String analyticsDashboard = '/api/$apiVersion/reports/analytics/dashboard';
  static const String analyticsTrends = '/api/$apiVersion/reports/analytics/trends';

  // Phase 4S: Integrations & External Services
  static const String integrations = '/api/$apiVersion/integrations';
  static const String integrationsCatalog = '/api/$apiVersion/integrations/catalog';
  static const String integrationsHealth = '/api/$apiVersion/integrations/health/overview';
  static const String dataExchangeTemplates = '/api/$apiVersion/integrations/data-exchange/templates';
  static const String calendarFeed = '/api/$apiVersion/integrations/calendar/feed';
}

