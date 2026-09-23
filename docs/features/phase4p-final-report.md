# Phase 4P — Teacher Portal Final Delivery Report

**Date:** September 19, 2026  
**Status:** **VERIFIED**  
**Subsystem:** Unified Teacher Portal, Strict Teaching Assignment-Scoped Authorization, Educational Class Rosters, Timetable, Fast Daily Attendance Marking, Attendance Corrections, Examinations & Invigilation, Marks Entry & Validation, Draft/Lock Workflow, Marks Correction Requests, Employee Self-Service (Leave Balances & Timesheets), Class Announcements, Web Command Center & Flutter Mobile Clients

---

## 1. Existing Functionality Reused
The Teacher Portal operates strictly as an authoritative, action-oriented digital workspace onto existing core domain systems without creating duplicate database models:
- **Identity & User Management (Phase 1 & 4A):** Reuses `User`, `UserRole`, `Role`, `Permission`, `RecordStatus`.
- **Teacher & Employee Profile (Phase 4B & 4H):** Reuses `TeacherProfile`, `EmployeeProfile`, `EmployeeLifecycleStatus`, `Department`, `Designation`.
- **Academic Structure & Teaching Assignments (Phase 4C):** Reuses `ClassTeacherAssignment`, `SubjectOffering`, `SubjectTeacher`, `Section`, `Class`, `Subject`.
- **Student Profile & Enrollments (Phase 4B):** Reuses `StudentProfile`, `Enrollment`, `EnrollmentStatus`.
- **Daily Attendance Subsystem (Phase 4D):** Reuses `AttendanceRecord`, `AttendanceStatus`, `AttendanceCorrection`, `AttendanceCorrectionStatus`.
- **Timetable Engine (Phase 4E):** Reuses `TimetableVersion`, `TimetablePeriod`, `TimetableEntry`.
- **Examinations & Grading (Phase 4F):** Reuses `ExamSession`, `ExamSchedule`, `ExamResult`, `MarksEntryStatus`, `ExamInvigilator`.
- **HR & Leave Subsystem (Phase 4H):** Reuses `LeaveBalance`, `LeaveApplication`, `LeaveType`, `EmployeeAttendance`.
- **Institutional Communication (Phase 4M):** Reuses `Announcement`, `Notification`, `NotificationDelivery`.
- **Audit & Security:** Reuses `AuditService` and `AuditLog`.

---

## 2. Teacher Portal Architecture
- **Layered Architecture:** Follows enterprise NestJS structure with clear segregation of responsibilities:
  - `TeacherAuthService` / `TeacherScopeService`: Resolves the teacher profile and enforces strict assignment-scoped authorization across classes, sections, subjects, students, and exams.
  - `TeacherDashboardService`: Aggregates the teacher's daily operational command center ("What do I need to do today?").
  - `TeacherClassesService`: Manages teacher profiles, assigned section rosters, subject offerings, educational student rosters, and sanitized student detail views.
  - `TeacherAcademicsService`: Coordinates the published weekly timetable, fast daily attendance roll call, attendance correction requests, scheduled exam tasks, marks entry rosters with boundary validation ($0 \le \text{marks} \le \text{maxMarks}$), draft saving, formal submission/locking, marks correction workflow, and class exam result summaries.
  - `TeacherSelfServiceService`: Manages personal employee leave entitlements, applications, and staff attendance timesheets.
  - `TeacherCommunicationService`: Handles school announcements, personal notifications, and controlled section-wide communications.
  - `TeacherController`: Exposes 24 REST endpoints strictly guarded by RBAC permissions and verified assignments.
  - `TeacherModule`: Integrated with `AuditModule`, `NotificationsModule`, `AttendanceModule`, `ExaminationsModule`, and registered in `AppModule`.

---

## 3. Teacher Identity & Teaching Assignment Scoping
Every educator user has a unique 1-to-1 link:
$$\text{User} \longleftrightarrow \text{TeacherProfile} \quad (\text{via } \mathtt{userId} \text{ unique key})$$
All teacher portal endpoints automatically resolve the teacher profile from `@CurrentUser() user: CurrentUserPayload`.

### Strict Assignment Authorization Rules:
1. **Class Teacher Assignment:** Verified via `ClassTeacherAssignment` where `status = ACTIVE` and `isCurrent = true`.
2. **Subject Teacher Assignment:** Verified via `SubjectTeacher` records attached to `SubjectOffering` for the specific section.
3. **Exam Invigilator Assignment:** Verified via `ExamInvigilator` linked to `ExamSchedule`.
4. **Out-of-Scope Protection:**
   - A teacher attempting to view a section they do not teach is rejected with `403 Forbidden`.
   - A teacher attempting to take attendance for an unassigned section is rejected with `403 Forbidden`.
   - A teacher attempting to enter marks for an exam they are not assigned to evaluate is rejected with `403 Forbidden`.
   - A teacher requesting records of a student not enrolled in any of their assigned classes is rejected with `403 Forbidden`.

---

## 4. Student Data Privacy & Sanitization
The Teacher Portal delivers student rosters tailored strictly for instructional and pastoral duties:
- **Included Fields:** Student full name, roll number, admission number, gender, date of birth, blood group, profile photo, enrolled class/section, and verified emergency contact phone number.
- **Strictly Stripped Data:**
  - Family fee invoices, billing accounts, payment transactions, and defaulter status.
  - Guardian financial and employment details.
  - Unrelated private guardian contacts.
  - Administrative HR remarks and internal salary records.

---

## 5. Daily Faculty Dashboard
Aggregates operational responsibilities for the day:
- **Profile Summary:** Full name, employee number, designation, department, primary role.
- **Workload Metrics:** Assigned sections count, assigned subjects count, today's teaching periods count, pending tasks count.
- **Urgent Action Alerts:**
  - `PENDING_ATTENDANCE`: Highlights assigned sections where daily roll call has not yet been taken for today.
  - `PENDING_MARKS`: Highlights scheduled examinations whose marks have not yet been submitted.
- **Today's Class Schedule:** Chronological list of today's periods with start/end time, subject code, room number, and section.
- **Upcoming Examinations:** Evaluator and invigilator duties with exam date, subject, and time slots.
- **Actionable Notification Feed:** High-priority circulars, administrative alerts, and pending action reminders.

---

## 6. Fast Attendance Marking & Correction Workflow
Designed for rapid classroom roll call with minimum taps:
- **Fast Roll Call:**
  - One-tap "Mark All Present".
  - Exception adjustments (`PRESENT`, `ABSENT`, `LATE`, `EXCUSED`, `HALF_DAY`).
  - Optional remarks per student (e.g. "Arrived 15 mins late").
  - Auto-locks upon final submission to maintain audit integrity.
- **Attendance Correction Requests:**
  - If a mistake was made or a late student arrives, teachers submit an audited correction request with a required justification.
  - Corrections are routed to `AttendanceCorrection` for academic admin review.

---

## 7. Examination Marks Entry & Result Workflow
- **Scheduled Exam Tasks:** Filtered to exams matching the teacher's assigned subjects and sections, or where assigned as invigilator.
- **Marks Validation Rules:**
  $$0 \le \text{marksObtained} \le \text{maxMarks}$$
  Entries exceeding `maxMarks` or below zero are rejected both client-side and server-side with descriptive validation errors.
- **Draft Saving vs Formal Submission:**
  - `Save Draft`: Saves intermediate scores with `MarksEntryStatus = IN_PROGRESS` without finalizing.
  - `Submit Marks`: Locks marks roster and updates `MarksEntryStatus = SUBMITTED`, notifying exam controllers.
- **Marks Correction:**
  - Once submitted, direct modification is prevented.
  - Teachers submit formal correction requests (`oldMarks`, `newMarks`, `reason`) for academic coordinator review.
- **Class Result Summary:**
  - Aggregate statistics: total evaluated, passed count, failed count, class average marks, and highest score.

---

## 8. Faculty Self-Service & Personal Timesheets
Staff records are cleanly segregated from student data:
- **Leave Balances:** Annual, casual, medical, and bereavement entitlements showing total, used, and remaining days.
- **Leave Applications:** Self-service submission with leave type, start/end dates, reason, and substitute teacher notes.
- **Timesheet History:** Personal employee attendance records with check-in, check-out, and status.

---

## 9. Class Communication & Institutional Notices
- **Notices Feed:** Institutional announcements targeted to `TEACHER` or `ALL` audiences.
- **Section Announcements:** Authorized teachers can broadcast announcements directly to students and parents of their assigned sections.

---

## 10. Multi-Platform Delivery
1. **Web Command Center (`apps/web`):**
   - Implemented in `apps/web/src/app/(dashboard)/portal/teacher/page.tsx` with 10 dedicated tabs:
     - Today & Schedule
     - Assigned Classes & Sections
     - Student Rosters & Details
     - Weekly Timetable
     - Fast Attendance Entry
     - Exam Tasks & Marks Entry
     - Class Results Overview
     - Employee Leave & Timesheets
     - School Notices & Class Messaging
     - Faculty Profile & Workload
   - Integrated into web navigation under `Academics & Faculty` in `Sidebar.tsx`.
2. **Mobile Client (`apps/mobile`):**
   - Created `apps/mobile/lib/features/teacher/teacher_portal_screen.dart` with touch-friendly fast attendance chips (`P`, `L`, `A`), date pickers, "Mark All Present", exam marks entry with boundary checks, offline retry states, and bottom navigation.
   - Registered endpoints in `apps/mobile/lib/core/constants/api_endpoints.dart`.

---

## 11. Security & Permissions Matrix
| Endpoint | Method | Required Permission | Scoped Check |
|---|---|---|---|
| `/api/v1/teacher/dashboard` | `GET` | `teacher:read` | Verified Teacher Profile |
| `/api/v1/teacher/profile` | `GET` | `teacher:read` | Verified Teacher Profile |
| `/api/v1/teacher/classes` | `GET` | `teacher:read` | Assigned Sections Only |
| `/api/v1/teacher/classes/:sectionId/students` | `GET` | `teacher:read` | Assigned Section Check |
| `/api/v1/teacher/students/:studentId` | `GET` | `teacher:read` | Assigned Student Check |
| `/api/v1/teacher/subjects` | `GET` | `teacher:read` | Assigned Subjects Only |
| `/api/v1/teacher/timetable` | `GET` | `teacher:read` | Published Schedule Only |
| `/api/v1/teacher/attendance` | `GET` | `attendance:read` | Assigned Section Check |
| `/api/v1/teacher/attendance` | `POST` | `attendance:mark` | Assigned Section Check |
| `/api/v1/teacher/attendance/corrections` | `POST` | `attendance:correct` | Assigned Section Check |
| `/api/v1/teacher/exams` | `GET` | `examinations:read` | Assigned Exam/Subject Only |
| `/api/v1/teacher/marks/:examScheduleId` | `GET` | `examinations:read` | Assigned Evaluator Only |
| `/api/v1/teacher/marks` | `POST` | `examinations:marks-enter` | Assigned Evaluator + Validation |
| `/api/v1/teacher/marks/corrections` | `POST` | `examinations:marks-edit` | Assigned Evaluator Only |
| `/api/v1/teacher/leave` | `GET` | `leave:read` | Personal Employee Only |
| `/api/v1/teacher/leave/apply` | `POST` | `leave:apply` | Personal Employee Only |
| `/api/v1/teacher/notices` | `GET` | `teacher:read` | Teacher Targeted Only |
| `/api/v1/teacher/communication/send` | `POST` | `communication:send` | Assigned Section Check |

---

## 12. Conclusion & Readiness
All requirements for **Phase 4P — Teacher Portal** are comprehensively implemented, tested, and verified.
The platform is locked and prepared for **Phase 4Q — Document Management & Verification**.
