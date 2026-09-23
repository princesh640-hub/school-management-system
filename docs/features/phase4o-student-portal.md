# Phase 4O — Student Portal Specification

**Date:** September 19, 2026  
**Status:** **IN SPECIFICATION & IMPLEMENTATION**  
**Subsystem:** Unified Student Portal, Strict Identity-Bound Authorization, Academic Workspace, Class & Section, Subjects & Teachers, Timetable, Attendance & Alerts, Examinations, Published Results, Report Cards, Academic History, Calendar, Notices & Notifications, Library, Transport, Hostel, Fees & Honest Payments, Documents, Communication, Web & Mobile Clients

---

## 1. Scope & System Boundary

Phase 4O establishes a complete, secure, modern, and production-grade **Student Portal** providing every enrolled student with a personalized, privacy-first academic workspace.

### 1.1 Core Principles & Integrity Constraints
1. **Strict Identity-Bound Server-Side Authorization (Zero Trust):**
   A student may **ONLY** access their own student record and resources associated with their authenticated identity. Every student-scoped request strictly resolves:
   $$\text{Authenticated User} \longrightarrow \text{Student Identity} \longrightarrow \text{Requested Resource} \longrightarrow \text{Ownership / Authorization} \longrightarrow \text{Return Authorized Data}$$
   Any URL parameter (e.g. `?studentId=ANOTHER_STUDENT`), request body manipulation, or forged client-side state is strictly ignored or rejected with `403 Forbidden`. Student A can never access Student B's data under any circumstances.
2. **Zero Duplicate Domain Models:**
   The Student Portal functions strictly as an authoritative, read-optimized lens onto existing domain systems (`StudentProfile`, `Enrollment`, `Class`, `Section`, `SubjectOffering`, `TimetableEntry`, `AttendanceRecord`, `ExamSchedule`, `ExamResult`, `ReportCard`, `FeeInvoice`, `PaymentTransaction`, `LibraryMember`, `BookLoan`, `StudentTransportAssignment`, `HostelAllocation`, `Announcement`, `Notification`). No duplicate student, academic, or financial records are created.
3. **Published-Only Academic Information:**
   - **Timetable:** Strictly `status: PUBLISHED` timetable versions (drafts, conflicts, and scheduling administration hidden).
   - **Examinations & Results:** Strictly `PUBLISHED` exam sessions and results with `status in ['APPROVED', 'LOCKED']` (draft or in-progress marks withheld).
   - **Report Cards:** Strictly `isPublished: true`.
4. **Honest Payment Readiness:**
   If external payment gateways (Stripe, payment processor) are unconfigured, the portal explicitly displays `ONLINE PAYMENT NOT CONFIGURED` and instructs students to use institutional cashier channels. Phantom or simulated transactions are strictly banned.
5. **Coursework / Assignment Transparency:**
   Because an LMS coursework/assignment backend is not yet part of the core schema, the system never fabricates mock assignments. It presents an honest status indicating that coursework management is managed in classroom sessions or pending LMS module activation.
6. **Student Status Lifecycle Control:**
   - `ACTIVE`: Full portal access.
   - `WITHDRAWN`: Restricted active academic workflows; access to historical records.
   - `GRADUATED` / `ALUMNI`: Read-only access to academic history, transcripts, and official report cards.
   - `SUSPENDED`: Access denied with `403 Forbidden`.

---

## 2. Feature Inventory & Gap Analysis

### EXISTING
- **Prisma Schema Models:**
  - `User`: Identity with role `STUDENT`, communication preferences, device registrations.
  - `StudentProfile`: Unique 1-to-1 link to `User` via `userId`, admission number, date of birth, blood group, emergency contacts, `lifecycleStatus` (`ACTIVE`, `WITHDRAWN`, `GRADUATED`, etc.), `status` (`RecordStatus`).
  - `Enrollment` & `CourseEnrollment`: Links student to `AcademicYear`, `Section`, `Class`, and enrolled `SubjectOffering`s.
  - `Class`, `Section`, `Subject`, `SubjectOffering`: Academic structure, weekly periods, and assigned teachers.
  - `TimetableVersion` & `TimetableEntry`: Weekly schedules with periods, rooms, and teachers.
  - `AttendanceRecord`: Daily attendance entries (`PRESENT`, `ABSENT`, `LATE`, `HALF_DAY`, `EXCUSED`), dates, remarks.
  - `ExamSession`, `ExamSchedule`, `ExamResult`, `ExamOverallResult`: Assessment schedules, marks obtained, percentage, grade, `MarksEntryStatus`.
  - `ReportCard`: Published student term report cards, attendance stats, teacher/principal remarks.
  - `AcademicCalendarEvent`: School events and holidays with `EventAudience` targeting.
  - `FeeInvoice`, `PaymentTransaction`, `InvoiceItem`: Student fee billing, line items, receipts (`RCP-YYYY-XXXXX`).
  - `LibraryMember`, `BookLoan`, `BookReservation`, `LibraryFine`: Student borrowing records, due dates, fines.
  - `StudentTransportAssignment`, `TransportRoute`, `TransportStop`, `TransportBoardingEvent`: Bus routes, stops, boarding logs.
  - `HostelAllocation`, `HostelAttendance`, `HostelOuting`: Room/bed assignments, night roll-calls, outing requests.
  - `Announcement` & `Notification`: Institutional circulars and personal notification inbox.
  - `StudentDocument`: Uploaded student certificates and verification statuses.
  - `AuditLog`: System audit trail.

### MISSING
- **Dedicated Backend Module (`apps/api/src/modules/student`):**
  - No `StudentModule` or `StudentController` providing unified `/api/v1/student/*` endpoints.
  - No dedicated `StudentAuthService` enforcing strict identity-bound resolution from `User.id -> StudentProfile` with lifecycle status verification.
  - No student dashboard aggregation endpoint (`/student/dashboard` or `/student/overview`) providing the student with "What do I need to know today?".
  - No student-specific endpoints for profile, subjects & teachers, timetable, attendance with alert thresholds, published results, report cards, academic history, calendar, library loans, transport, hostel, fee summary, verified documents, and notices.
- **Shared Types:**
  - No `student-portal.interface.ts` in `packages/shared-types` defining student portal DTOs and view models.
- **Web Workspace (`apps/web`):**
  - No dedicated `/portal/student/page.tsx` offering a responsive, student-centric academic workspace.
  - No student portal entry in `Sidebar.tsx`.
- **Mobile Experience (`apps/mobile`):**
  - No student portal routes in `api_endpoints.dart`.
  - No dedicated Flutter mobile student screen (`student_portal_screen.dart`).

### TO IMPLEMENT
1. **Shared Types (`packages/shared-types`):**
   - Create `student-portal.interface.ts` exporting:
     - `IStudentDashboardOverview`, `IStudentProfile`, `IStudentAcademicDetails`, `IStudentSubject`, `IStudentTimetable`, `IStudentTimetableEntry`, `IStudentAttendanceSummary`, `IStudentAttendanceRecord`, `IStudentAttendanceAlert`, `IStudentExamSchedule`, `IStudentExamResult`, `IStudentReportCard`, `IStudentAcademicHistory`, `IStudentCalendarEvent`, `IStudentNotice`, `IStudentLibraryInfo`, `IStudentTransportInfo`, `IStudentHostelInfo`, `IStudentFeeSummary`, `IStudentDocument`, `IUpdateStudentProfileDto`, `IStudentPreferencesDto`, `IStudentMessageDto`.
   - Export in `packages/shared-types/src/index.ts`.
2. **Backend Architecture (`apps/api/src/modules/student`):**
   - `student-auth.service.ts`: Resolves `User.id` to `StudentProfile`, verifies lifecycle status (`ACTIVE`, `WITHDRAWN`, `GRADUATED`, `ALUMNI`, `SUSPENDED`), and verifies ownership.
   - `student-dashboard.service.ts`: Aggregates today's timetable, today's attendance, upcoming exams, latest published results, unread notices, library due dates, transport/hostel summary, fee balance, and actionable attention items.
   - `student-profile.service.ts`: Returns sanitized student profile (excludes internal staff notes/admin comments), handles limited self-service contact updates, and manages preferences.
   - `student-academic.service.ts`: Provides class/section, enrolled subjects & teachers, published weekly timetable, attendance metrics & alerts, upcoming published exams, approved results, official report cards, academic history, and academic calendar.
   - `student-finance.service.ts`: Fee invoices, payment receipts, balance outstanding, and honest payment gateway readiness check.
   - `student-services.service.ts`: Library book loans & fines, transport assignment & stops, hostel room allocation & roll-calls, verified student documents.
   - `student-communication.service.ts`: Targeted announcements, personal notifications, and controlled school messaging.
   - `student.controller.ts`: 22+ REST endpoints secured with RBAC permissions (`student:portal:view`, `student:profile:view`, `student:timetable:view`, `student:attendance:view`, `student:results:view`, `student:fees:view`, `student:library:view`, etc.).
   - `student.module.ts`: Integrated with `AuditModule`, `NotificationsModule`, and registered in `AppModule`.
3. **Web Experience (`apps/web`):**
   - Create `/portal/student/page.tsx` featuring 11 tabs/views:
     1. 🏠 **Overview (Dashboard):** Today's classes, attendance gauge, next exam, latest result, attention alerts.
     2. 🎓 **Academics & Subjects:** Class, section, class teacher, enrolled subjects with teacher contacts.
     3. 🕒 **Timetable:** Interactive daily and weekly published schedules.
     4. 📅 **Attendance:** Monthly attendance calendar, statistics, and low attendance alerts.
     5. 📝 **Examinations & Results:** Upcoming exam dates, approved grades, percentages, marks, and report cards.
     6. 📜 **Academic History:** Past academic years, previous classes, and cumulative performance.
     7. 💳 **Fees & Receipts:** Invoices, line items, receipts, and payment gateway honest state.
     8. 📚 **Services (Library, Transport, Hostel):** Active book loans, bus routes & stops, hostel room & roll-calls.
     9. 📢 **Notices & Notifications:** Targeted circulars and personal notification center.
     10. 📁 **Documents:** Official certificates and verified documents with secure download.
     11. ⚙️ **Profile & Settings:** Student personal details, contact info update, and preferences.
   - Link `Student Portal` in `Sidebar.tsx`.
4. **Mobile Experience (`apps/mobile`):**
   - Update `api_endpoints.dart` with student routes.
   - Create `apps/mobile/lib/features/student/student_portal_screen.dart` with mobile-native cards, pull-to-refresh, and offline retry states.
5. **Testing & Verification:**
   - Create `scripts/verify-phase4o.cjs` checking Prisma models, shared types, backend services, controller endpoints, RBAC permissions, web workspace, mobile screens, and documentation.
   - Run regression test suites (`scripts/verify-phase4n.cjs`, `scripts/verify-phase4m.cjs`, `scripts/verify-acceptance-qa.cjs`).

### DEFERRED
- Hardware-level real-time GPS vehicle streaming (displays scheduled stop times and route info honestly).
- LMS assignment submission and grading engine (does not exist in core schema; honest placeholder maintained).
- External payment processor live webhooks (honest `ONLINE PAYMENT NOT CONFIGURED` state maintained).
