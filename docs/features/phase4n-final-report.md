# Phase 4N: Parent & Guardian Portal — Final Report

**Date:** September 19, 2026  
**Status:** **VERIFIED**  
**Subsystem:** Unified Parent & Guardian Portal, Server-Side Child Authorization, Multi-Child Switching, Academic Progress, Attendance, Timetable, Exams & Results, Report Cards, Fees & Invoices, Transport, Hostel, Library, Notices, Messaging, Web & Flutter Mobile Clients

---

## 1. Executive Summary

Phase 4N establishes a complete, secure, modern, and production-grade **Parent & Guardian Portal**. Built on a strict privacy-first foundation, every child-scoped request is validated server-side against authorized `StudentGuardian` links. Direct URL tampering, client-side assumption of child identity, or attempts to access another family's student are rejected immediately with `403 Forbidden`.

The portal provides an intuitive multi-child switching experience across web and mobile Flutter clients. When a guardian switches between children, all child-scoped state is cleared and refreshed to guarantee zero cross-child data leakage. Academic data adheres to a strict published-only policy, and payment processing honestly indicates when an external gateway is unconfigured rather than fabricating transactions.

---

## 2. Architectural Deliverables

### 2.1 Centralized Parent Authorization Policy (`parent-auth.service.ts`)
- **`validateGuardianStudentAccess(userId, studentId)`**:
  1. Resolves authenticated user to active `GuardianProfile`.
  2. Queries active `StudentGuardian` linkage for `(guardianId, studentId)`.
  3. Rejects unauthorized requests with `ForbiddenException`.
  4. Resolves verified `StudentProfile` with active enrollment and campus context.
- **`getAuthorizedStudentIds(userId)`**:
  Returns all verified child IDs linked to the requesting guardian.

### 2.2 Modular Backend Services (`apps/api/src/modules/parent/`)
1. **`ParentChildrenService`:**
   - `getChildren(userId)`: Authorized children roster with avatar, admission number, grade, section, campus, and status.
   - `getChildProfile(userId, studentId)`: Comprehensive student identity and authorized emergency/guardian contacts (internal admin notes stripped).
   - `getChildOverview(userId, studentId)`: Consolidated dashboard metrics (today's attendance, monthly attendance %, fee balances, upcoming timetable, upcoming exams, latest exam result, and dynamic attention items).
2. **`ParentAcademicService`:**
   - `getChildAttendance(userId, studentId, startDate, endDate)`: Attendance calculation, statistics (present, absent, late, half-day, excused, percentage), and daily records.
   - `getChildTimetable(userId, studentId)`: Weekly schedule strictly filtered by `TimetableStatus.PUBLISHED`.
   - `getChildExams(userId, studentId)`: Upcoming eligible examinations with session, subject, date, time, and marks.
   - `getChildResults(userId, studentId)`: Official examination marks, percentage, grade point, and pass/fail status (withholding unpublished marks).
   - `getChildReportCards(userId, studentId)`: Official published term report cards with attendance %, teacher remarks, and principal remarks.
3. **`ParentFinanceService`:**
   - `getChildFeeSummary(userId, studentId)`: Invoices, line items, payments, receipts (`RCP-YYYY-XXXXX`), and balance calculation.
   - `initiateOnlinePayment(userId, studentId, invoiceId)`: Server-side balance validation. Checks gateway keys (`STRIPE_SECRET_KEY`, `PAYMENT_GATEWAY_API_KEY`) and honestly reports `NOT_CONFIGURED` without simulating payments.
4. **`ParentServicesService`:**
   - `getChildTransport(userId, studentId)`: Assigned bus route, pickup/drop stops, bus driver info, and boarding events.
   - `getChildHostel(userId, studentId)`: Room/bed allocation, night roll call attendance, and outing records.
   - `getChildLibrary(userId, studentId)`: Active book loans, due dates, and outstanding fine balances.
   - `getChildDocuments(userId, studentId)`: Authorized student documents and certificates.
5. **`ParentCommunicationService`:**
   - `getParentNotices(userId)`: Announcements targeted to parents or the specific grades of enrolled children.
   - `getParentNotifications(userId)`: Notification inbox.
   - `sendSchoolMessage(userId, dto)`: In-system inquiry messaging retaining child context (`studentId`).
6. **`ParentProfileService`:**
   - `getGuardianProfile(userId)`: Guardian contact info and linked children summary.
   - `updateGuardianProfile(userId, dto)`: Contact update protecting relationship integrity.
   - `getParentPreferences(userId)`: Notification channel opt-ins and quiet hours.
7. **`ParentController` & `ParentModule`:**
   - 25+ REST endpoints protected by `JwtAuthGuard`, `PermissionsGuard`, and `@RequirePermissions`.
   - Registered in `AppModule`.

### 2.3 Web Workspace (`apps/web/src/app/(dashboard)/portal/parent/page.tsx`)
- **Multi-Child Selector:** Responsive chip bar displaying children's names, avatars, admission numbers, and classes.
- **Zero-Bleed State Flushing:** Immediately flushes child data on switch before refetching.
- **10 Core Tabs:**
  1. 🏠 **Overview:** Attention alerts (absent today, fee overdue, exam tomorrow), KPI cards, schedule preview.
  2. 👤 **Child Profile:** Identity, academic year, campus, emergency contacts, guardians roster.
  3. 📅 **Attendance:** Monthly attendance percentage, present/absent/late counts, daily log.
  4. 🕒 **Timetable:** Published weekly class periods, teachers, and rooms.
  5. 📝 **Exams & Results:** Upcoming exams and official published marks.
  6. 📜 **Report Cards:** Official term report cards with GPA, remarks, and download actions.
  7. 💳 **Fees & Receipts:** Invoices, remaining balances, payment receipts, and honest gateway notice.
  8. 🚌 **Transport & Hostel:** Bus route, designated stop, schedule, hostel room/bed, roll calls.
  9. 📢 **Notices & Messaging:** Targeted school circulars and child-scoped inquiry messaging.
  10. ⚙️ **My Profile:** Guardian profile details, contact updates, and quiet hours.
- **Sidebar Integration:** Added `Parent Portal` to navigation under `Administration & HR`.

### 2.4 Mobile Flutter Client (`apps/mobile/lib/features/parent/parent_portal_screen.dart`)
- Mobile-native child selector chips.
- Card-based overview with attendance pill, fee balance, timetable preview, and published results.
- Network resilience with pull-to-refresh and connection error retry states.
- Endpoints configured in `ApiEndpoints.dart`.

---

## 3. Verification & Regression Summary

- **Phase 4N Suite (`verify-phase4n.cjs`):** Comprehensive automated checks covering schema relationships, shared types, centralized authorization, all backend services, controller routes, permissions, web UI state isolation, and Flutter mobile implementation.
- **Regression Testing:** All previous phases (Phase 1, 2, 3, 4A–4M + Acceptance QA) remain 100% operational.
