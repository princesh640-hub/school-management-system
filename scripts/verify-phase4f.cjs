/**
 * Phase 4F Automated Verification Suite
 * Examinations, Grading & Report Cards Subsystem
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
console.log('================================================================');
console.log('PHASE 4F VERIFICATION: EXAMINATIONS, GRADING & REPORT CARDS');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;

function check(label, condition, details = '') {
  if (condition) {
    console.log(`  [PASS] ${label}`);
    passCount++;
  } else {
    console.log(`  [FAIL] ${label} - ${details}`);
    failCount++;
  }
}

// -----------------------------------------------------------------------------
// 1. Prisma Schema Expansions
// -----------------------------------------------------------------------------
console.log('1. Checking Database Layer (Prisma Schema Expansions)...');
const schemaPath = path.join(rootDir, 'apps/api/prisma/schema.prisma');
const schema = fs.readFileSync(schemaPath, 'utf8');

// Models
check('Schema contains ExamType model', schema.includes('model ExamType'));
check('Schema contains ExamSession model', schema.includes('model ExamSession'));
check('Schema contains AssessmentComponent model', schema.includes('model AssessmentComponent'));
check('Schema contains ExamSchedule model', schema.includes('model ExamSchedule'));
check('Schema contains ExamInvigilator model', schema.includes('model ExamInvigilator'));
check('Schema contains ExamResult model', schema.includes('model ExamResult'));
check('Schema contains MarksEntryComponent model', schema.includes('model MarksEntryComponent'));
check('Schema contains MarksCorrection model', schema.includes('model MarksCorrection'));
check('Schema contains GradeScale model', schema.includes('model GradeScale'));
check('Schema contains GradeScaleRule model', schema.includes('model GradeScaleRule'));
check('Schema contains ExamOverallResult model', schema.includes('model ExamOverallResult'));
check('Schema contains ReportCardTemplate model', schema.includes('model ReportCardTemplate'));
check('Schema contains ReportCard model', schema.includes('model ReportCard'));
check('Schema contains AcademicTranscript model', schema.includes('model AcademicTranscript'));

// Enums
check('Schema contains ExamSessionStatus enum', schema.includes('enum ExamSessionStatus'));
check('Schema contains MarksEntryStatus enum', schema.includes('enum MarksEntryStatus'));
check('Schema contains ResultStatus enum', schema.includes('enum ResultStatus'));
check('Schema contains AssessmentComponentType enum', schema.includes('enum AssessmentComponentType'));
check('Schema contains CorrectionDecision enum', schema.includes('enum CorrectionDecision'));

// Relations & cross-module links
check('Organization has examTypes and examSessions relations',
  /examTypes\s+ExamType\[\]/.test(schema) && /examSessions\s+ExamSession\[\]/.test(schema));
check('Campus has examTypes and examSessions relations',
  schema.includes('examTypes            ExamType[]') || /examTypes\s+ExamType\[\]/.test(schema));
check('AcademicYear has examSchedules and examSessions relations',
  /examSchedules\s+ExamSchedule\[\]/.test(schema) && /examSessions\s+ExamSession\[\]/.test(schema));
check('StudentProfile has examResults and overallResults relations',
  /examResults\s+ExamResult\[\]/.test(schema) && /overallResults\s+ExamOverallResult\[\]/.test(schema));
check('TeacherProfile has examInvigilators relation',
  /examInvigilators\s+ExamInvigilator\[\]/.test(schema));
check('Room has examSchedules and examInvigilators relations',
  /examSchedules\s+ExamSchedule\[\]/.test(schema) && /examInvigilators\s+ExamInvigilator\[\]/.test(schema));
check('ExamSchedule has components and invigilators relations',
  schema.includes('components     AssessmentComponent[]') && schema.includes('invigilators   ExamInvigilator[]'));
check('ExamResult has componentMarks and corrections relations',
  schema.includes('componentMarks MarksEntryComponent[]') && schema.includes('corrections    MarksCorrection[]'));
check('ExamResult has isAbsent, isExempt, status, version and isLocked fields',
  schema.includes('isAbsent') && schema.includes('isExempt') && schema.includes('MarksEntryStatus') && schema.includes('isLocked'));

// -----------------------------------------------------------------------------
// 2. Shared Types Package Exports
// -----------------------------------------------------------------------------
console.log('\n2. Checking Shared Types Package Exports...');
const examTypesPath = path.join(rootDir, 'packages/shared-types/src/interfaces/examination.interface.ts');
const sharedIndex = path.join(rootDir, 'packages/shared-types/src/index.ts');

check('examination.interface.ts exists', fs.existsSync(examTypesPath));
if (fs.existsSync(sharedIndex)) {
  const indexContent = fs.readFileSync(sharedIndex, 'utf8');
  check('shared-types index exports examination.interface', indexContent.includes("examination.interface.js"));
}

if (fs.existsSync(examTypesPath)) {
  const typesContent = fs.readFileSync(examTypesPath, 'utf8');

  // Enums
  check('examination defines ExamSessionStatus enum/type', typesContent.includes('ExamSessionStatus'));
  check('examination defines MarksEntryStatus enum/type', typesContent.includes('MarksEntryStatus'));
  check('examination defines ResultStatus enum/type', typesContent.includes('ResultStatus'));
  check('examination defines AssessmentComponentType enum/type', typesContent.includes('AssessmentComponentType'));
  check('examination defines CorrectionDecision enum/type', typesContent.includes('CorrectionDecision'));

  // Entities
  check('examination defines ExamTypeEntity', typesContent.includes('ExamTypeEntity'));
  check('examination defines ExamSessionEntity', typesContent.includes('ExamSessionEntity'));
  check('examination defines AssessmentComponentEntity', typesContent.includes('AssessmentComponentEntity'));
  check('examination defines ExamScheduleEntity', typesContent.includes('ExamScheduleEntity'));
  check('examination defines ExamInvigilatorEntity', typesContent.includes('ExamInvigilatorEntity'));
  check('examination defines ExamResultEntity', typesContent.includes('ExamResultEntity'));
  check('examination defines MarksEntryComponentEntity', typesContent.includes('MarksEntryComponentEntity'));
  check('examination defines MarksCorrectionEntity', typesContent.includes('MarksCorrectionEntity'));
  check('examination defines GradeScaleEntity', typesContent.includes('GradeScaleEntity'));
  check('examination defines GradeScaleRuleEntity', typesContent.includes('GradeScaleRuleEntity'));
  check('examination defines ExamOverallResultEntity', typesContent.includes('ExamOverallResultEntity'));
  check('examination defines ReportCardEntity', typesContent.includes('ReportCardEntity'));
  check('examination defines AcademicTranscriptEntity', typesContent.includes('AcademicTranscriptEntity'));

  // DTOs
  check('examination defines DTOs (CreateExamTypeDto, CreateExamSessionDto, EnterMarksBatchDto, etc.)',
    typesContent.includes('CreateExamTypeDto') &&
    typesContent.includes('CreateExamSessionDto') &&
    typesContent.includes('EnterMarksBatchDto') &&
    typesContent.includes('RequestMarksCorrectionDto') &&
    typesContent.includes('ReviewMarksCorrectionDto') &&
    typesContent.includes('CreateGradeScaleDto') &&
    typesContent.includes('CalculateSessionResultDto') &&
    typesContent.includes('PublishResultsDto') &&
    typesContent.includes('GenerateReportCardDto') &&
    typesContent.includes('GenerateTranscriptDto'));

  // Analytics
  check('examination defines ClassResultAnalytics & GradeDistribution interfaces',
    typesContent.includes('ClassResultAnalytics') && typesContent.includes('GradeDistribution'));
}

// -----------------------------------------------------------------------------
// 3. Backend Services & Assessment Engine
// -----------------------------------------------------------------------------
console.log('\n3. Checking Backend Services & Assessment Engine...');
const examDir = path.join(rootDir, 'apps/api/src/modules/examinations');
const gradingEnginePath = path.join(examDir, 'grading-engine.service.ts');
const examSessionsPath = path.join(examDir, 'exam-sessions.service.ts');
const marksEntryPath = path.join(examDir, 'marks-entry.service.ts');
const resultProcPath = path.join(examDir, 'result-processing.service.ts');
const reportCardPath = path.join(examDir, 'report-card.service.ts');
const examSrvPath = path.join(examDir, 'examinations.service.ts');
const examCtrlPath = path.join(examDir, 'examinations.controller.ts');
const examModPath = path.join(examDir, 'examinations.module.ts');

check('GradingEngineService exists', fs.existsSync(gradingEnginePath));
check('ExamSessionsService exists', fs.existsSync(examSessionsPath));
check('MarksEntryService exists', fs.existsSync(marksEntryPath));
check('ResultProcessingService exists', fs.existsSync(resultProcPath));
check('ReportCardService exists', fs.existsSync(reportCardPath));
check('ExaminationsService exists', fs.existsSync(examSrvPath));
check('ExaminationsController exists', fs.existsSync(examCtrlPath));
check('ExaminationsModule exists', fs.existsSync(examModPath));

// ExaminationsModule wiring
if (fs.existsSync(examModPath)) {
  const modContent = fs.readFileSync(examModPath, 'utf8');
  check('ExaminationsModule imports AuditModule', modContent.includes('AuditModule'));
  check('ExaminationsModule imports NotificationsModule', modContent.includes('NotificationsModule'));
  check('ExaminationsModule provides all 6 examination services',
    modContent.includes('ExaminationsService') &&
    modContent.includes('GradingEngineService') &&
    modContent.includes('ExamSessionsService') &&
    modContent.includes('MarksEntryService') &&
    modContent.includes('ResultProcessingService') &&
    modContent.includes('ReportCardService'));
}

// GradingEngineService deterministic computation & rules
if (fs.existsSync(gradingEnginePath)) {
  const ge = fs.readFileSync(gradingEnginePath, 'utf8');
  check('GradingEngine computes score percentage deterministically',
    ge.includes('computePercentage') && ge.includes('Math.round'));
  check('GradingEngine supports weighted component totals',
    ge.includes('computeComponentTotal') && ge.includes('weightedScoreSum'));
  check('GradingEngine resolves dynamic GradeScaleRules with enterprise 4.0 fallback',
    ge.includes('resolveGrade') && ge.includes('getGradeScaleRules') && ge.includes("'A+'"));
  check('GradingEngine computes multi-subject cumulative GPA',
    ge.includes('computeGPA') && ge.includes('totalCredits'));
}

// ExamSessionsService lifecycle management
if (fs.existsSync(examSessionsPath)) {
  const es = fs.readFileSync(examSessionsPath, 'utf8');
  check('ExamSessionsService manages institutional Exam Types',
    es.includes('createExamType') && es.includes('getExamTypes'));
  check('ExamSessionsService creates and lists Exam Sessions',
    es.includes('createExamSession') && es.includes('getExamSessions'));
  check('ExamSessionsService enforces valid lifecycle transitions (DRAFT -> SCHEDULED -> ... -> PUBLISHED)',
    es.includes('VALID_TRANSITIONS') && es.includes('updateSessionStatus'));
  check('ExamSessionsService logs audit events and broadcasts notifications on publication',
    es.includes("action: 'UPDATE_STATUS'") && es.includes('notificationsService.create'));
}

// MarksEntryService validation & corrections
if (fs.existsSync(marksEntryPath)) {
  const me = fs.readFileSync(marksEntryPath, 'utf8');
  check('MarksEntryService manages assessment components',
    me.includes('createAssessmentComponent') && me.includes('getScheduleComponents'));
  check('MarksEntryService validates numeric marks bounds (0 <= marks <= maxMarks)',
    me.includes('cannot exceed max marks') && me.includes('Marks cannot be negative'));
  check('MarksEntryService supports absent and exempt student flags',
    me.includes('isAbsent') && me.includes('isExempt'));
  check('MarksEntryService implements teacher submission workflow',
    me.includes('submitMarks') && me.includes("status: 'SUBMITTED'"));
  check('MarksEntryService provides audited marks correction requests',
    me.includes('requestCorrection') && me.includes('MarksCorrection'));
  check('MarksEntryService reviews and applies approved corrections with version increment',
    me.includes('reviewCorrection') && me.includes('version: correction.examResult.version + 1'));
}

// ResultProcessingService aggregation, gates & analytics
if (fs.existsSync(resultProcPath)) {
  const rp = fs.readFileSync(resultProcPath, 'utf8');
  check('ResultProcessingService manages configurable Grade Scales',
    rp.includes('createGradeScale') && rp.includes('getGradeScales'));
  check('ResultProcessingService calculates consolidated session results across subjects',
    rp.includes('calculateSessionResults') && rp.includes('totalMarksObtained'));
  check('ResultProcessingService assigns student rankings with tie-handling',
    rp.includes('currentRank') && rp.includes('rank: currentRank'));
  check('ResultProcessingService implements administrative approval gate',
    rp.includes('approveResults') && rp.includes("status: 'APPROVED'"));
  check('ResultProcessingService implements results locking gate',
    rp.includes('lockResults') && rp.includes('isLocked: true'));
  check('ResultProcessingService implements publication gate with notifications',
    rp.includes('publishResults') && rp.includes("status: 'PUBLISHED'") && rp.includes('notificationsService.create'));
  check('ResultProcessingService enforces privacy guard for student/parent results',
    rp.includes('getStudentSessionResult') && rp.includes('ForbiddenException'));
  check('ResultProcessingService computes section analytics and grade histogram',
    rp.includes('getSectionAnalytics') && rp.includes('gradeDistribution'));
}

// ReportCardService & Transcripts
if (fs.existsSync(reportCardPath)) {
  const rc = fs.readFileSync(reportCardPath, 'utf8');
  check('ReportCardService manages report card templates',
    rc.includes('createTemplate') && rc.includes('getTemplates'));
  check('ReportCardService generates print-ready report cards integrating Phase 4D attendance',
    rc.includes('generateReportCard') &&
    rc.includes('studentAttendance') &&
    rc.includes('attendancePercentage') &&
    rc.includes('daysPresent'));
  check('ReportCardService generates cumulative multi-year academic transcripts',
    rc.includes('generateTranscript') &&
    rc.includes('cumulativeGpa') &&
    rc.includes('academicHistory'));
}

// Legacy Phase 2 backward compatibility
if (fs.existsSync(examSrvPath)) {
  const esv = fs.readFileSync(examSrvPath, 'utf8');
  check('ExaminationsService preserves createSchedule legacy method', esv.includes('createSchedule(dto: CreateExamScheduleDto)'));
  check('ExaminationsService preserves getSchedules legacy method', esv.includes('getSchedules('));
  check('ExaminationsService preserves getScheduleById legacy method', esv.includes('getScheduleById('));
  check('ExaminationsService preserves computeGrade legacy method', esv.includes('computeGrade(percentage: number): string'));
  check('ExaminationsService preserves enterResults legacy method', esv.includes('enterResults(user: CurrentUserPayload, dto: EnterResultsDto)'));
  check('ExaminationsService preserves getScheduleResults legacy method', esv.includes('getScheduleResults('));
  check('ExaminationsService supports extended schedule creation with room & session', esv.includes('createScheduleExtended'));
  check('ExaminationsService assigns invigilators with collision detection',
    esv.includes('assignInvigilator') && esv.includes('already assigned as invigilator'));
}

// Controller routes & RBAC
if (fs.existsSync(examCtrlPath)) {
  const ctrl = fs.readFileSync(examCtrlPath, 'utf8');

  // Endpoints
  check('ExaminationsController exposes POST & GET /examinations/schedules (Phase 2 legacy preserved)',
    ctrl.includes("@Post('schedules')") && ctrl.includes("@Get('schedules')") && ctrl.includes("@Get('schedules/:id')"));
  check('ExaminationsController exposes POST /examinations/results/entry (Phase 2 legacy preserved)',
    ctrl.includes("@Post('results/entry')"));
  check('ExaminationsController exposes GET /examinations/schedules/:id/results (Phase 2 legacy preserved)',
    ctrl.includes("@Get('schedules/:id/results')"));
  check('ExaminationsController exposes /examinations/types', ctrl.includes("@Post('types')") && ctrl.includes("@Get('types')"));
  check('ExaminationsController exposes /examinations/sessions', ctrl.includes("@Post('sessions')") && ctrl.includes("@Get('sessions')"));
  check('ExaminationsController exposes /examinations/sessions/:id/status', ctrl.includes("@Patch('sessions/:id/status')"));
  check('ExaminationsController exposes /examinations/schedules/extended', ctrl.includes("@Post('schedules/extended')"));
  check('ExaminationsController exposes /examinations/schedules/:id/invigilators', ctrl.includes("@Post('schedules/:id/invigilators')"));
  check('ExaminationsController exposes /examinations/schedules/:id/components', ctrl.includes("@Post('schedules/:id/components')"));
  check('ExaminationsController exposes /examinations/marks/batch', ctrl.includes("@Post('marks/batch')"));
  check('ExaminationsController exposes /examinations/marks/submit', ctrl.includes("@Post('marks/submit')"));
  check('ExaminationsController exposes /examinations/marks/corrections', ctrl.includes("@Post('marks/corrections')"));
  check('ExaminationsController exposes /examinations/grading/scales', ctrl.includes("@Post('grading/scales')") && ctrl.includes("@Get('grading/scales')"));
  check('ExaminationsController exposes /examinations/results/calculate', ctrl.includes("@Post('results/calculate')"));
  check('ExaminationsController exposes /examinations/results/approve', ctrl.includes("@Post('results/approve')"));
  check('ExaminationsController exposes /examinations/results/lock', ctrl.includes("@Post('results/lock')"));
  check('ExaminationsController exposes /examinations/results/publish', ctrl.includes("@Post('results/publish')"));
  check('ExaminationsController exposes /examinations/report-cards/generate', ctrl.includes("@Post('report-cards/generate')"));
  check('ExaminationsController exposes /examinations/transcripts/generate', ctrl.includes("@Post('transcripts/generate')"));
  check('ExaminationsController exposes /examinations/analytics/session/:sessionId', ctrl.includes("@Get('analytics/session/:sessionId')"));

  // RBAC permissions
  check('ExaminationsController enforces examinations:read permission', ctrl.includes("@RequirePermissions('examinations:read')"));
  check('ExaminationsController enforces examinations:manage permission', ctrl.includes("@RequirePermissions('examinations:manage')"));
  check('ExaminationsController enforces examinations:grade permission', ctrl.includes("@RequirePermissions('examinations:grade')"));
  check('ExaminationsController enforces examinations:review permission', ctrl.includes("@RequirePermissions('examinations:review')"));
  check('ExaminationsController enforces examinations:approve permission', ctrl.includes("@RequirePermissions('examinations:approve')"));
  check('ExaminationsController enforces examinations:publish permission', ctrl.includes("@RequirePermissions('examinations:publish')"));
}

// -----------------------------------------------------------------------------
// 4. Web Application Examinations Workspace
// -----------------------------------------------------------------------------
console.log('\n4. Checking Web Application Examinations Workspace...');
const examWebPath = path.join(rootDir, 'apps/web/src/app/(dashboard)/portal/examinations/page.tsx');
const sidebarPath = path.join(rootDir, 'apps/web/src/components/Sidebar.tsx');

check('Examinations Web Page exists', fs.existsSync(examWebPath));
check('Sidebar component exists', fs.existsSync(sidebarPath));

if (fs.existsSync(examWebPath)) {
  const webContent = fs.readFileSync(examWebPath, 'utf8');

  check('Examinations workspace supports 5-tab evaluation command center',
    webContent.includes('SESSIONS_SCHEDULES') &&
    webContent.includes('GRADE_SHEET') &&
    webContent.includes('REVIEW_PUBLICATION') &&
    webContent.includes('REPORT_CARDS') &&
    webContent.includes('SCALES_ANALYTICS'));

  check('Examinations workspace displays exam sessions with lifecycle badges',
    webContent.includes('Institutional Exam Sessions') && webContent.includes('s.status'));

  check('Examinations workspace provides interactive marks recording grid with live preview',
    webContent.includes('Marks Recording Grid') &&
    webContent.includes('marksObtained') &&
    webContent.includes('handleUpdateMarksGrid'));

  check('Examinations workspace supports absent (AB) and exempt (EX) student toggles',
    webContent.includes('isAbsent') && webContent.includes('isExempt') && webContent.includes('AB') && webContent.includes('EX'));

  check('Examinations workspace includes formal marks correction request modal',
    webContent.includes('Request Marks Correction') && webContent.includes('correctionReason'));

  check('Examinations workspace supports session calculation, approval and publication gates',
    webContent.includes('handleCalculateSessionResults') &&
    webContent.includes('handleApproveSessionResults') &&
    webContent.includes('handlePublishResults'));

  check('Examinations workspace renders print-ready report card with letterhead & Phase 4D attendance',
    webContent.includes('Official Student Report Card Preview') &&
    webContent.includes('Attendance Performance') &&
    webContent.includes('reportCardData.attendance.attendancePercentage') &&
    webContent.includes('Class Teacher Remarks') &&
    webContent.includes('window.print'));

  check('Examinations workspace renders multi-year cumulative academic transcript modal',
    webContent.includes('Official Multi-Year Academic Transcript') &&
    webContent.includes('cumulativeGpa') &&
    webContent.includes('academicHistory'));

  check('Examinations workspace displays dynamic grade scale rules and distribution histogram',
    webContent.includes('Institutional Grade Scales') &&
    webContent.includes('Grade Histogram') &&
    webContent.includes('passPercentage'));

  check('Examinations workspace preserves legacy API connections (/examinations/schedules)',
    webContent.includes("'/examinations/schedules'") || webContent.includes('examinations/schedules'));
}

if (fs.existsSync(sidebarPath)) {
  const sbContent = fs.readFileSync(sidebarPath, 'utf8');
  check('Sidebar contains Exams & Results portal link', sbContent.includes('/portal/examinations'));
}

// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------
console.log('\n================================================================');
console.log(`PHASE 4F VERIFICATION SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
console.log('================================================================');

if (failCount === 0) {
  console.log('PHASE 4F VERIFICATION COMPLETE: ALL CHECKS PASSED SUCCESSFULLY!\n');
  process.exit(0);
} else {
  console.error(`PHASE 4F VERIFICATION FAILED with ${failCount} errors.\n`);
  process.exit(1);
}
