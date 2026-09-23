# Phase 4P — Teacher Portal Specification

**Date:** September 19, 2026  
**Status:** **IN SPECIFICATION & IMPLEMENTATION**  
**Subsystem:** Unified Teacher Portal, Assignment-Scoped Authorization, Teaching Workload, Classes & Sections Workspace, Subjects, Student Directory, Published Timetable, Fast Daily Attendance, Attendance Corrections, Examinations & Marks Entry, Marks Correction Requests, Results Analysis, Leave Self-Service, Staff Attendance Timesheet, Notices & Class Announcements, Web & Flutter Mobile Clients

---

## 1. Scope & System Boundary

Phase 4P establishes the **Teacher Portal** as the primary digital workspace for instructional faculty across API, Web, and Mobile environments.

### 1.1 Core Principles & Integrity Constraints
1. **Critical Assignment-Based Server-Side Authorization:**
   A teacher may **ONLY** access students, classes, sections, subjects, examinations, marks, and attendance workflows for which they hold an active assignment (`ClassTeacherAssignment`, `SubjectOffering`, `SubjectTeacher`, `ExamInvigilator`). Authorization occurs strictly server-side:
   $$\text{User} \longrightarrow \text{TeacherProfile} \longrightarrow \text{Active Teaching Assignment} \longrightarrow \text{Scope Validation} \longrightarrow \text{Authorized Data}$$
   Any request attempting to access an unassigned section, student, or exam (via URL parameter manipulation, query parameters, or payload injection) is immediately rejected with `403 Forbidden`.
2. **Zero Duplicate Domain Models:**
   The Teacher Portal is an authoritative, operational lens onto existing domain systems (`TeacherProfile`, `EmployeeProfile`, `User`, `SubjectOffering`, `SubjectTeacher`, `ClassTeacherAssignment`, `Section`, `Class`, `Subject`, `Enrollment`, `StudentProfile`, `TimetableEntry`, `AttendanceRecord`, `AttendanceCorrection`, `ExamSchedule`, `ExamResult`, `ReportCard`, `LeaveApplication`, `LeaveBalance`, `Announcement`, `Notification`). No duplicate teacher, student, attendance, or result entities are created.
3. **Fast Attendance Marking Workflow:**
   Optimized touch and keyboard workflow for daily roll-calls:
   $$\text{Select Section} \longrightarrow \text{Load Roster} \longrightarrow \text{Mark All Present} \longrightarrow \text{Adjust Exceptions} \longrightarrow \text{Save \& Confirm}$$
   Includes integration with Phase 4D's `AttendanceCorrection` workflow for retroactive adjustments to locked dates.
4. **Controlled Marks Entry & Correction Lifecycle:**
   Teachers manage marks within their assigned subjects and exams:
   $$\text{Draft Marks Entry} \longrightarrow \text{Validation (0} \le \text{Marks} \le \text{Max)} \longrightarrow \text{Review} \longrightarrow \text{Submit}$$
   After submission, results enter formal grading review (`SUBMITTED` / `APPROVED` / `LOCKED`). Modifications require audited marks correction requests via Phase 4F integration.
5. **Student Privacy & Minimal Disclosure:**
   Teachers see educational information (attendance, performance, enrolled subjects, academic remarks). Teachers **never** receive access to family fee invoices, payroll, employee HR files, private guardian contact details, or administrative audit logs.
6. **Dual Faculty / Employee Integration:**
   Teachers access their personal employee self-service (leave applications, leave balances, own staff attendance/timesheets) cleanly segregated from student academic operations.

---

## 2. Feature Inventory & Gap Analysis

### EXISTING
- **Prisma Schema Models:**
  - `User`: Identity with role `TEACHER`, communication preferences, device registrations.
  - `TeacherProfile`: Linked to `User` via `userId`, `employeeCode`, `specialization`, `qualification`, `joiningDate`, `status`.
  - `EmployeeProfile`: Linked to `User` via `userId`, department, designation, employment status, timesheets.
  - `ClassTeacherAssignment`: Explicit link between `TeacherProfile` and `Section` (`isCurrent`, `status`).
  - `SubjectOffering` & `SubjectTeacher`: Explicit links between `TeacherProfile`, `Subject`, and `Section`.
  - `Section`, `Class`, `Subject`: Academic hierarchy and course offerings.
  - `Enrollment` & `StudentProfile`: Enrolled students within sections.
  - `TimetableVersion` & `TimetableEntry`: Teaching timetable slots (`PUBLISHED`).
  - `AttendanceRecord` & `AttendanceCorrection`: Daily student attendance and adjustment workflow.
  - `StaffAttendanceRecord`: Teacher's own clock-in/out records.
  - `ExamSchedule`, `ExamInvigilator`, `ExamResult`, `MarksEntryStatus`: Scheduled exams, invigilation duties, student marks entry, and marks corrections.
  - `LeaveApplication` & `LeaveBalance`: Teacher's personal leave quota and applications.
  - `Announcement` & `Notification`: Institutional circulars and personal notification inbox.
- **Backend Modules:**
  - `TeachersModule`: Administrative directory management (`teachers:read`, `teachers:create`).
  - `AttendanceModule`: Student and employee attendance engines.
  - `ExaminationsModule`: Exam schedules, marks entry, and report card generators.
  - `HrModule` / `AttendanceModule`: Leave policies and applications.
  - `CommunicationModule`: Multi-channel notifications and announcements.

### MISSING
- **Dedicated Backend Module (`apps/api/src/modules/teacher`):**
  - No unified `TeacherModule` or `TeacherController` providing `/api/v1/teacher/*` endpoints.
  - No centralized `TeacherScopeService` enforcing assignment-based scope validation across sections, subjects, students, and exams.
  - No teacher dashboard aggregation endpoint (`/teacher/dashboard` or `/teacher/overview`) resolving "What do I need to do today?" (pending attendance, pending marks, upcoming exams, today's schedule).
  - No assignment-scoped student roster endpoint stripping private family fee and HR data.
  - No dedicated marks entry controller endpoint verifying subject teacher authorization.
  - No class announcement composer endpoint restricted to assigned sections.
- **Shared Types:**
  - No `teacher-portal.interface.ts` in `packages/shared-types` defining teacher view models, assignment cards, fast attendance DTOs, and marks entry payloads.
- **Web Workspace (`apps/web`):**
  - No dedicated `/portal/teacher/page.tsx` workspace offering the comprehensive teacher experience with assignment-scoped navigation.
  - No teacher portal entry in `Sidebar.tsx`.
- **Mobile Experience (`apps/mobile`):**
  - No teacher portal route constants in `api_endpoints.dart`.
  - No dedicated Flutter mobile teacher screen (`teacher_portal_screen.dart`) optimized for mobile attendance and classroom operations.

### TO IMPLEMENT
1. **Shared Types (`packages/shared-types`):**
   - Create `teacher-portal.interface.ts` exporting:
     - `ITeacherDashboardOverview`, `ITeacherProfile`, `ITeachingAssignment`, `ITeacherSectionWorkspace`, `ITeacherSubjectWorkspace`, `ITeacherStudentSummary`, `ITeacherStudentDetail`, `ITeacherTimetable`, `ITeacherTimetableSlot`, `ITeacherAttendanceRoster`, `ITeacherMarkAttendanceDto`, `ITeacherExamTask`, `ITeacherMarksRoster`, `ITeacherSubmitMarksDto`, `ITeacherLeaveSummary`, `ITeacherNotice`, `ITeacherClassMessageDto`.
   - Export in `packages/shared-types/src/index.ts`.
2. **Backend Architecture (`apps/api/src/modules/teacher`):**
   - `teacher-auth.service.ts`: Resolves `User.id -> TeacherProfile`, verifies active status, and provides assignment scope checking (`TeacherScopeService`).
   - `teacher-dashboard.service.ts`: Aggregates today's schedule, pending attendance sections, pending marks entry tasks, upcoming exams, unread notices, and teaching load summary.
   - `teacher-classes.service.ts`: Resolves assigned classes/sections, student rosters (with minimal necessary educational data), and subject workspaces.
   - `teacher-academics.service.ts`: Resolves published timetable, section attendance history, marks entry rosters, marks submission, and marks correction requests.
   - `teacher-self-service.service.ts`: Teacher's own leave balances, leave applications, leave cancellation, and own staff attendance/timesheets.
   - `teacher-communication.service.ts`: School announcements, personal notifications, and class announcements targeted strictly to assigned sections.
   - `teacher.controller.ts`: 24+ REST endpoints guarded by RBAC permissions (`teacher:portal:view`, `teacher:classes:view`, `teacher:attendance:mark`, `teacher:marks:enter`, `teacher:leave:apply`, etc.).
   - `teacher.module.ts`: Registered with `AuditModule`, `NotificationsModule`, `AttendanceModule`, and `AppModule`.
3. **Web Experience (`apps/web`):**
   - Create `/portal/teacher/page.tsx` featuring 10 tabs:
     1. 🏠 **Today / Overview:** Schedule timeline, pending attendance, pending marks, upcoming exams, tasks.
     2. 🏫 **My Classes & Sections:** Assigned sections, student counts, subject breakdown.
     3. 👥 **Students:** Educational student roster with attendance % and subject performance.
     4. 🕒 **Timetable:** Published daily and weekly teaching schedule.
     5. 📅 **Attendance:** Fast roll-call workspace (Mark All Present, exceptions, save, correction requests).
     6. 📝 **Examinations & Marks:** Exam schedule, marks entry roster, save draft, submit, correction requests.
     7. 📊 **Results & Performance:** Pass/fail rates, class averages, missing marks summaries.
     8. 🏖️ **Leave & Self-Service:** Leave balances, leave application modal, staff attendance timesheet.
     9. 📢 **Notices & Communication:** Circulars, notifications, and class announcement composer.
     10. ⚙️ **Profile & Settings:** Teacher identity, qualifications, and notification preferences.
   - Add `Teacher Portal` to `Sidebar.tsx` under `Academics & Faculty`.
4. **Mobile Experience (`apps/mobile`):**
   - Update `api_endpoints.dart` with teacher routes.
   - Create `apps/mobile/lib/features/teacher/teacher_portal_screen.dart` with mobile-first fast attendance marking, touch-friendly "Mark All Present", today's timetable cards, and offline retry states.
5. **Testing & Verification:**
   - Create `scripts/verify-phase4p.cjs` validating all Prisma relations, shared types, backend services, controller endpoints, RBAC permissions, web workspace, mobile screen, and documentation.
   - Run regression test suites (`verify-phase4o.cjs`, `verify-phase4n.cjs`, `verify-phase4m.cjs`, `verify-acceptance-qa.cjs`).

### DEFERRED
- Automated psychometric/predictive AI "student intelligence" modeling (strictly rejected to maintain factual grading integrity).
- Direct unmediated SMS/WhatsApp carrier broadcasts by teachers (must flow through Phase 4M controlled institutional channels).
- Global cross-campus financial/HR reporting for teachers.
