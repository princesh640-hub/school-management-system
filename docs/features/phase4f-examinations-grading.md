# PHASE 4F — EXAMINATIONS, GRADING & REPORT CARDS: DOMAIN GAP ANALYSIS

**Subsystem:** Examinations, Grading & Academic Assessment  
**Date:** September 19, 2026  
**Status:** IMPLEMENTATION PLANNING & SPECIFICATION  

---

## 1. Executive Overview

The purpose of Phase 4F is to transform the foundational examination and result mechanism (created in Phase 2) into a production-grade, configurable, enterprise academic assessment subsystem. The system must support the complete evaluation lifecycle:

```
Exam Configuration (Types & Sessions)
  → Assessment Scheduling (Subjects, Rooms, Invigilators)
  → Student Eligibility & Grade Sheets
  → Marks Entry (Raw, Components, Absent/Exempt)
  → Validation & Teacher Submission
  → Review & Marks Correction Workflow
  → Configurable Grade Calculation (Scales, Weighted Components, Pass Rules)
  → Approval, Locking & Publication Gate
  → Report Cards & Academic Transcripts (Print & PDF)
  → Performance Analytics & Historical Archives
```

---

## 2. Existing Functionality (REUSED)

| Entity / Asset | Location | Existing Capabilities | Reuse Strategy in Phase 4F |
| :--- | :--- | :--- | :--- |
| `ExamSchedule` model | `apps/api/prisma/schema.prisma` | Stores `academicYearId`, `subjectId`, `name`, `examDate`, `startTime`, `endTime`, `maxMarks`, `passingMarks`. | Retain existing model fields; expand with `examSessionId`, `classId`, `sectionId`, `roomId`, and `status`. |
| `ExamResult` model | `apps/api/prisma/schema.prisma` | Stores `examScheduleId`, `studentId`, `marksObtained`, `grade`, `remarks`. | Retain existing model fields; expand with `isAbsent`, `isExempt`, `status`, `componentMarks`, and `resultStatus`. |
| `ExaminationsService` | `apps/api/src/modules/examinations` | `createSchedule`, `getSchedules`, `getScheduleById`, `enterResults`, `getScheduleResults`. | Preserve legacy method signatures and endpoints for 100% backward compatibility while adding enterprise services. |
| `ExaminationsController` | `apps/api/src/modules/examinations` | `/examinations/schedules`, `/examinations/results/entry`. | Preserve all routes; add modular controllers for sessions, grade scales, approval, report cards, transcripts. |
| Academic Structures | Phase 4C | `AcademicYear`, `Term`, `Class`, `Section`, `Subject`, `SubjectOffering`. | Source of truth for classroom cohorts and course allocations. No duplicate entities. |
| Room & Facilities | Phase 4E | `Room` model with capacities and room types (`CLASSROOM`, `LAB`). | Exam room scheduling and capacity validation. |
| Attendance Integration | Phase 4D | Student attendance records and rates. | Injected into report cards for term attendance summaries. |
| Audit & Notification | Core Modules | `AuditService`, `NotificationsService`. | Audit marks edits, approvals, locks, publications; broadcast alerts to teachers and parents. |
| Web UI Base | `portal/examinations/page.tsx` | Schedule table and basic grade sheet viewer. | Modernize into a 5-tab academic evaluation command center. |

---

## 3. Missing Functionality (TO IMPLEMENT)

### 3.1 Data Architecture & Prisma Models
1. **`ExamType`**: Master catalog of assessment types (`Monthly Test`, `Mid-Term`, `Final Exam`, `Practical`, `Oral`, `Assignment`, `Unit Test`) with code, description, weight, status.
2. **`ExamSession`**: Administrative exam session (e.g. "Annual Examination 2026–27", "Fall Mid-Term 2026") linking `AcademicYear`, `Term`, `Campus`, `ExamType`, with dates and status lifecycle (`DRAFT`, `SCHEDULED`, `IN_PROGRESS`, `COMPLETED`, `REVIEW`, `APPROVED`, `LOCKED`, `PUBLISHED`, `ARCHIVED`).
3. **`AssessmentComponent`**: Breakdown for multi-part assessments (e.g. `Theory`, `Practical`, `Viva`, `Coursework`) with maximum marks, passing marks, weight, and sequence.
4. **`ExamInvigilator`**: Invigilator assignments linking teachers to exam schedules and rooms, preventing teacher double-booking.
5. **`MarksCorrection`**: Formal amendment request and approval workflow tracking original marks, requested marks, reason, requester, reviewer, decision, and timestamp.
6. **`GradeScale` & `GradeScaleRule`**: Configurable grading policy defining grade codes (`A+`, `A`, `B`, `C`, etc.), percentage boundaries, grade points (for GPA), pass/fail criteria, and descriptions.
7. **`ExamOverallResult`**: Student-level consolidated session result tracking total marks, total max, aggregate percentage, overall grade, GPA, result status (`PASS`, `FAIL`, `INCOMPLETE`, `WITHHELD`), rank, version, and lock/publication state.
8. **`ReportCardTemplate` & `ReportCard`**: Institutional report card configuration and generated report card records with attendance snapshots and faculty remarks.
9. **`AcademicTranscript`**: Cumulative multi-year academic transcripts recording historical session achievements.

### 3.2 Backend Assessment & Grading Services
1. **`ExamSessionsService`**: Session lifecycle state machine, validation of transition rules, and session-level locking/publication.
2. **`ExamSchedulingService`**: Schedule generation with conflict detection (section double-booking, room collision, invigilator collision, subject duplication).
3. **`MarksEntryService`**:
   - Validation against student eligibility (active enrollment in section, academic year, subject offering).
   - Numerical bounds validation (0 <= marks <= maxMarks), decimal precision control, absent/exempt handling.
   - Batch marks entry with transactional integrity.
   - Workflow transitions: `DRAFT` → `SUBMITTED` → `REVIEWED` → `APPROVED` → `LOCKED`.
4. **`MarksCorrectionService`**: Controlled amendment workflow ensuring finalized marks are never silently mutated without audit.
5. **`GradingEngineService`**:
   - Deterministic percentage calculation: `(Obtained / Max) * 100` (or component weighted sum).
   - Dynamic grade determination against active `GradeScale` rules (handling boundaries and edge cases).
   - Configurable pass/fail logic: subject-level passing, component-level passing, and session aggregate passing.
   - Optional GPA / Grade Point calculation.
6. **`ResultProcessingService`**:
   - Comprehensive result calculation, review checks, batch approval, locking, and publication.
   - Immutability enforcement: once published, results cannot be modified without a formal version bump.
   - Optional institutional ranking / position calculation (with documented tie-breaking, disabled by default).
7. **`ReportCardService`**:
   - Assembles student demographics, exam session subjects, scores, percentages, grades, attendance summaries, and teacher/principal remarks.
   - Generates print-ready HTML/PDF representations.
8. **`TranscriptService`**: Multi-year cumulative transcript aggregation.

### 3.3 Web Workspace (`portal/examinations/page.tsx`)
1. **Tab 1: Sessions & Schedules**: Exam sessions catalog with lifecycle status pills, schedule creation modal with room and invigilator assignment.
2. **Tab 2: Grade Sheet & Marks Entry**: Keyboard-friendly tabular grade sheet with student roll numbers, scores, absent/exempt toggles, live grade preview, draft saving, and final submission.
3. **Tab 3: Review & Publication**: Multi-level verification center displaying pass/fail metrics, missing marks alerts, marks correction approvals, result locking, and publication to parent/student portals.
4. **Tab 4: Report Cards & Transcripts**: Interactive report card viewer with school letterhead, subject tables, teacher remarks input, and print/download actions.
5. **Tab 5: Grading Scales & Analytics**: Grade scale manager and visual performance histograms (class average, pass percentage, grade distributions).

---

## 4. Features to Implement

- [x] Schema additions: `ExamType`, `ExamSession`, `AssessmentComponent`, `ExamInvigilator`, `MarksCorrection`, `GradeScale`, `GradeScaleRule`, `ExamOverallResult`, `ReportCard`, `AcademicTranscript`.
- [x] Domain Enums: `ExamSessionStatus`, `MarksEntryStatus`, `ResultStatus`, `AssessmentComponentType`, `CorrectionDecision`.
- [x] Shared TypeScript contracts in `packages/shared-types/src/interfaces/examination.interface.ts`.
- [x] Backend services: `ExamSessionsService`, `GradingEngineService`, `MarksEntryService`, `ResultProcessingService`, `ReportCardService`.
- [x] Granular RBAC permissions (`exams:*`, `marks:*`, `results:*`, `report-cards:*`, `transcripts:*`, `grading:*`).
- [x] Web UI workspace modernization with dense grade sheets, review gates, and print-ready report cards.
- [x] Automated verification suite (`scripts/verify-phase4f.cjs`) and master regression suite testing.

---

## 5. Deferred / Excluded Features

- **OMR Optical Mark Recognition Scanning**: Hardware optical scanner drivers are deferred to external peripheral integrations. CSV/Excel grade import is provided instead.
- **Online Student Testing / Computer-Based Testing (CBT)**: Real-time exam proctoring, lockdown browsers, and timed online quizzes are deferred to Phase 4 (LMS / Assessment extension). Phase 4F focuses on comprehensive academic assessment administration, grading, and reporting.
- **External Government Examination Board Sync**: Custom state board export adapters (CBSE, Cambridge, Edexcel XML) are deferred to Phase 4S (External Integrations).
