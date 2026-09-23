# Phase 4O — Student Portal Final Delivery Report

**Date:** September 19, 2026  
**Status:** **VERIFIED**  
**Subsystem:** Unified Student Portal, Strict Identity-Bound Authorization, Academic Workspace, Timetable, Attendance, Examinations, Published Results, Report Cards, Academic History, Fees, Services (Library, Transport, Hostel), Notices, Documents, Web & Flutter Mobile Clients

---

## 1. Existing Functionality Reused
The Student Portal acts strictly as an authoritative, read-optimized lens onto existing core institutional subsystems without creating duplicate domain models:
- **Identity & User Management (Phase 1 & 4A):** Reuses `User`, `UserRole`, `Role`, `Permission`, `RecordStatus`.
- **Student Profile & Admissions (Phase 4B):** Reuses `StudentProfile`, `Enrollment`, `Class`, `Section`, `StudentGuardian`.
- **Academics & Curricula (Phase 4C):** Reuses `AcademicYear`, `AcademicTerm`, `AcademicCalendarEvent`, `Subject`, `SubjectOffering`, `CourseEnrollment`.
- **Daily Attendance (Phase 4D):** Reuses `AttendanceRecord`, attendance calculations, and absence tracking.
- **Timetable Engine (Phase 4E):** Reuses `TimetableVersion`, `TimetablePeriod`, `TimetableEntry` with strictly published filtering.
- **Examinations & Grading (Phase 4F):** Reuses `ExamSession`, `ExamSchedule`, `ExamResult`, `MarksEntryStatus`, `ReportCard`.
- **Finance & Fee Ledger (Phase 4G):** Reuses `FeeInvoice`, `InvoiceItem`, `PaymentTransaction`, receipt tracking (`RCP-YYYY-XXXXX`).
- **Library Subsystem (Phase 4I):** Reuses `LibraryMember`, `BookLoan`, `BookCopy`, `BookTitle`, `LibraryFine`.
- **Transport Subsystem (Phase 4J):** Reuses `StudentTransportAssignment`, `TransportRoute`, `TransportStop`, `TransportBoardingEvent`.
- **Hostel Subsystem (Phase 4K):** Reuses `HostelAllocation`, `Hostel`, `HostelRoom`, `HostelBed`, `HostelAttendance`, `HostelOuting`.
- **Institutional Communication (Phase 4M):** Reuses `Announcement`, `Notification`, `CommunicationPreference`.
- **Audit & Security:** Reuses `AuditService` and `AuditLog`.

---

## 2. Student Portal Architecture
- **Layered Architecture:** Follows enterprise NestJS structure with clear segregation of duties:
  - `StudentAuthService`: Resolves and validates authenticated user identity to their `StudentProfile`.
  - `StudentDashboardService`: Aggregates "What do I need to know today?" daily metrics.
  - `StudentProfileService`: Provides sanitized profile details and limited self-service contact updates.
  - `StudentAcademicService`: Manages subjects, published timetable, attendance, published exams, results, report cards, history, and calendar.
  - `StudentFinanceService`: Manages invoices, fee items, payment history, and payment gateway readiness.
  - `StudentServicesService`: Handles library loans, bus route/stops, hostel accommodations, and verified documents.
  - `StudentCommunicationService`: Handles student announcements, personal notification inbox, and controlled school messaging.
  - `StudentController`: Exposes 24 REST endpoints strictly guarded by RBAC permissions.
  - `StudentModule`: Integrated with `AuditModule`, `NotificationsModule`, and registered in `AppModule`.

---

## 3. Student Identity Mapping
Every student user has a unique 1-to-1 link:
$$\text{User} \longleftrightarrow \text{StudentProfile} \quad (\text{via } \mathtt{userId} \text{ unique key})$$
When a student logs in, their JWT payload contains `id` (their `User.id`). All student portal endpoints automatically resolve the student from `@CurrentUser() user: CurrentUserPayload`. Students never supply an arbitrary `studentId` parameter.

---

## 4. Authorization Model & Data Isolation
- **Strict Server-Side Validation:** Requests are strictly bound to the authenticated user's student profile.
- **Zero Trust of Client Parameters:** Any URL parameter, query string (e.g. `?studentId=B`), or payload containing an alternate student ID is either strictly ignored or rejected with a `403 Forbidden` exception.
- **Student Status Control:**
  - `ACTIVE`: Full access to all portal workflows.
  - `WITHDRAWN`: Restricted active academic workflows; access to historical records.
  - `GRADUATED` / `ALUMNI`: Read-only access to academic history, transcripts, and official report cards.
  - `SUSPENDED`: Access strictly blocked with `403 Forbidden`.

---

## 5. Student Dashboard
Aggregates key daily information without cognitive overload:
- Today's published classes count
- Attendance percentage & today's status (`PRESENT`, `ABSENT`, `LATE`, `PENDING`)
- Upcoming examinations count & next scheduled exam details (date, time, room)
- Latest official published exam result (score, max marks, grade, percentage)
- Unread school announcements count
- Active & overdue library loans count
- Assigned transport pickup time & hostel room number
- Outstanding fee dues
- Actionable attention alerts (e.g., low attendance warning, overdue books, fee dues)

---

## 6. Profile & Privacy
- Returns sanitized profile information: full name, admission number, admission date, date of birth, blood group, address, emergency contact, guardians summary, class, section, campus, academic year.
- Administrative flags, internal teacher remarks, and disciplinary logs are stripped.
- Limited self-service update: allows updating personal phone, residential address, and emergency contact phone. Protected institutional fields (class, section, admission number, lifecycle status) cannot be altered by students.

---

## 7. Academics, Subjects & Timetable
- **Academics:** Displays enrolled class, section, roll number, academic year, campus, and class teacher details.
- **Subjects:** Lists enrolled subjects with code, name, category, weekly periods, and assigned teacher (without exposing private staff HR information).
- **Timetable:** Provides published-only weekly schedule (`timetableVersion.status = PUBLISHED`), categorized by day of the week with periods, start/end times, rooms, subjects, and teachers. Draft schedules and conflicts are hidden.

---

## 8. Attendance & Alerts
- Computes attendance percentage using standard formula:
  $$\text{Percentage} = \frac{\text{Present} + \text{Late} + 0.5 \times \text{HalfDay}}{\text{Total Days}} \times 100$$
- Displays daily attendance log with status badges and teacher remarks.
- Generates proactive alerts:
  - `LOW_ATTENDANCE`: Warning when attendance drops below the 75% threshold.
  - `CONSECUTIVE_ABSENCE`: Warning when 3 or more consecutive absences are detected.

---

## 9. Examinations, Results & Report Cards
- **Upcoming Exams:** Filtered by `examSession.status = PUBLISHED` for the student's enrolled class/section. Shows date, start/end time, room, max marks, and passing marks.
- **Official Results:** Withholds draft or unapproved marks (`status in ['APPROVED', 'LOCKED']` and `examSession.status = PUBLISHED`). Shows subject, marks obtained, max marks, percentage, grade, and pass/fail status.
- **Report Cards:** Lists official report cards (`isPublished = true`) with academic year, issue date, attendance rate, remarks, and PDF download options.
- **Academic History:** Displays past enrollments and cumulative historical report cards.

---

## 10. Fees & Honest Online Payment
- Invoices: Displays student fee invoices, line items, amounts, due dates, paid amounts, and remaining balance.
- Payment History: Displays official payment receipts (`RCP-YYYY-XXXXX`).
- Payment Gateway Honesty:
  - If payment gateway keys (`STRIPE_SECRET_KEY`, `PAYMENT_GATEWAY_API_KEY`) are not configured, the system explicitly returns `ONLINE PAYMENT NOT CONFIGURED` and instructs students to pay via the school cashier or bank transfer. Phantom transactions are never simulated.

---

## 11. Services: Library, Transport & Hostel
- **Library:** Displays active book loans, title, ISBN, borrow date, due date, overdue badges, and unpaid library fines.
- **Transport:** Displays assigned bus route, pickup/drop stop, scheduled pickup/drop times, bus registration number, and driver contact (without private HR details). No fake GPS tracking.
- **Hostel:** Displays allocated hostel building, room number, bed number, check-in date, recent roll-call records, and approved outings.

---

## 12. Notices, Notifications & Messaging
- **Notices:** Circulars and announcements targeted to students, all school members, or specific campus/class (`status = PUBLISHED`).
- **Notifications:** In-app notification center with unread count, individual mark-read, and mark-all-read capabilities.
- **School Messages:** Controlled submission of messages to class teachers or school administration with automatic audit logging.

---

## 13. Web & Mobile Workspaces
- **Web App (`apps/web`):**
  - Responsive, modern command center at `/portal/student` with 11 specialized tabs.
  - Accessible design following Phase 3 Design System (`Card`, `Badge`, `Button`, `Tabs`, `Alert`, `EmptyState`).
  - Added to `Sidebar.tsx` under `Academics & Faculty`.
- **Flutter Mobile (`apps/mobile`):**
  - Native mobile workspace in `student_portal_screen.dart` with pull-to-refresh, today's schedule, attendance gauge, results, fee balance, and offline retry states.
  - Endpoints wired in `api_endpoints.dart`.

---

## 14. Verification & Quality Assurance
- **Automated Verification Script (`scripts/verify-phase4o.cjs`):**
  - **98 / 98 checks passed (100% success)**.
- **Regression Suites:**
  - `scripts/verify-phase4n.cjs`: **141 / 141 passed**.
  - `scripts/verify-phase4m.cjs`: **259 / 259 passed**.
  - `scripts/verify-acceptance-qa.cjs`: **69 / 69 passed**.
- **Data Isolation & Security:**
  - Verified: Student A cannot access Student B's data via URL parameters or query manipulation.
  - Verified: Internal administrative fields and staff notes are strictly stripped.
  - Verified: Unapproved draft marks and unpublished report cards are withheld.

---

## 15. Known Issues & Deferred Features
- Real-time GPS bus streaming: Deferred due to absence of hardware GPS streaming devices (scheduled times shown honestly).
- LMS Coursework/Assignments: Not part of core schema; honest information presented without fabricating fake data.

---

## 16. Final Status
**PHASE 4O FINAL STATUS: VERIFIED AND READY FOR PHASE 4P**
