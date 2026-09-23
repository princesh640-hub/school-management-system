# Phase 4E: Timetable & Scheduling Subsystem Specification

## 1. Domain Overview & Scope
Phase 4E establishes a comprehensive, constraint-aware, production-grade Timetable & Scheduling Subsystem for the Enterprise School Management System. It coordinates academic years, campuses, working days, periods, rooms, classes, sections, subjects, teachers, subject offerings, and room allocations.

The subsystem supports:
1. **Manual Scheduling:** Fine-grained manual creation, editing, moving, and deletion of timetable entries with instant server-side conflict detection.
2. **Deterministic Constraint-Aware Automated Scheduling:** Heuristic backtracking engine that respects hard constraints (no teacher/room/section collisions, availability windows, room types, subject teacher assignments) and optimizes soft constraints (balanced distribution, gap minimization), with explainable failure diagnostics for unschedulable cases.
3. **Controlled Versioning Lifecycle:** `DRAFT` &rarr; `REVIEW` &rarr; `PUBLISHED` &rarr; `ARCHIVED` workflow preventing unvetted modifications to active school schedules and maintaining historical auditability.
4. **Multi-Perspective Visualization:** Master campus, Section, Teacher, and Room timetable matrices with accessible schedule cards and mobile agenda views.

---

## 2. Gap Analysis

### EXISTING
- **Academic Hierarchy:** Multi-campus hierarchy, `Organization`, `Campus`, `AcademicYear`, `Term`, `Class`, `Section`, `Subject` (Phase 1, 2, 4A, 4C).
- **Academic Offerings & Allocations:** `SubjectOffering` with `weeklyPeriods`, `primaryTeacherId`, `sectionId`, `subjectId`, `academicYearId`, `termId` (Phase 4C).
- **Faculty Profiles:** `TeacherProfile` and `EmployeeProfile` with user relationships (Phase 1, 2, 4D).
- **Academic Calendar:** `AcademicCalendarEvent` with holiday flag and audience filters (Phase 4C).
- **Audit Logging:** System-wide immutable `AuditLog` via `AuditService` (Phase 1, 2, 4A-4D).
- **Notifications Engine:** `NotificationsService` with broadcast and unread tracking (Phase 2).
- **Basic Route Boundary:** `TimetableModule` and `TimetableController` scaffolded in API (Phase 1).
- **Visual Preview:** Static weekly schedule visualizer at `/portal/timetable` (Phase 3).

### MISSING
- Database models for `WorkingDayConfig`, `TimetablePeriod`, `Room`, `RoomAvailability`, `TeacherAvailability`, `TimetableTemplate`, `TimetableVersion`, `TimetableEntry`, `SchedulingConstraint`, `SchedulingRun`.
- Enums for `DayOfWeek`, `PeriodType`, `RoomType`, `TimetableStatus`, `SchedulingRunStatus`.
- TypeScript shared interfaces and DTOs in `@school/shared-types`.
- Backend services for period configuration, room management, availability constraints, version lifecycle, and validation.
- Real-time multi-dimensional conflict detection engine (Teacher, Room, Section, Capacity, Assignment).
- Deterministic constraint satisfaction scheduling solver.
- Drag-and-drop and copy workflows with server-side validation.
- Interactive multi-perspective Web UI with versioning, conflict badges, and automated generation diagnostics.

### TO IMPLEMENT (Phase 4E Core Deliverables)
1. **WP1: Prisma Schema Expansions:** Add 10 models and 5 enums for rooms, periods, versions, entries, constraints, and runs.
2. **WP2: Shared Types Package:** Define `timetable.interface.ts` and re-export in `packages/shared-types`.
3. **WP3: Backend Services & Controllers:**
   - `TimetableService`: CRUD for periods, rooms, availability, versions, and entries.
   - `TimetableConflictService`: Real-time collision detector for teachers, rooms, sections, and capacities.
   - `TimetableSolverService`: Deterministic constraint-aware scheduler.
   - `TimetableController`: REST endpoints guarded with RBAC permissions (`timetable:read`, `timetable:manage`, `timetable:publish`, `timetable:generate`).
4. **WP4: Modern Web UI Workspace:**
   - Multi-perspective switcher (Section, Teacher, Room, Master).
   - Version controller (Draft &rarr; Publish &rarr; Archive).
   - Interactive weekly scheduling grid and conflict alert drawer.
   - Automated Timetable Generator modal with diagnostic feedback.
   - Room and Period configuration panels.
5. **WP5: Automated Verification & Regression Master Suite:**
   - Write `scripts/verify-phase4e.cjs` covering all Phase 4E contracts.
   - Verify zero regressions across Phase 1, 2, 3, QA, 4A, 4B, 4C, 4D.
   - Update `docs/features/feature-status.md` and author `docs/features/phase4e-final-report.md`.

### DEFERRED
- Third-party commercial AI SaaS integrations (engine is fully self-contained, deterministic, and explainable).
- Automated hardware IoT door-badge unlock synchronizers.
- Native mobile drag-and-drop schedule editing (mobile prioritizes personalized agenda reading).

---

## 3. Core Scheduling Concepts & Data Model Hierarchy

```
Organization
  └── Campus
       ├── WorkingDayConfig (dayOfWeek, isWorking, startTime, endTime)
       ├── TimetablePeriod (sequence, name, startTime, endTime, duration, periodType)
       ├── Room (name, code, building, capacity, roomType, facilities)
       │    └── RoomAvailability (dayOfWeek, periodId, isAvailable, reason)
       ├── TeacherProfile
       │    └── TeacherAvailability (dayOfWeek, periodId, isAvailable, reason)
       ├── TimetableVersion (academicYearId, termId, name, versionNumber, status: DRAFT | PUBLISHED | ARCHIVED)
       │    └── TimetableEntry (dayOfWeek, periodId, sectionId, subjectOfferingId, teacherId, roomId)
       └── SchedulingRun (runId, startedAt, completedAt, status, conflictsCount, unscheduledCount, logs)
```

---

## 4. Conflict Engine Rules

1. **Teacher Conflict:** Teacher $T$ cannot be assigned to two distinct section entries at Day $D$ + Period $P$.
2. **Room Conflict:** Room $R$ cannot be assigned to two distinct section entries at Day $D$ + Period $P$.
3. **Section Conflict:** Section $S$ cannot be scheduled for two concurrent subjects at Day $D$ + Period $P$.
4. **Room Capacity Check:** If scheduled section enrolled count $> Room.capacity$, raise a `CAPACITY_EXCEEDED` warning. Overrides must be authorized and logged.
5. **Subject-Teacher Authorization:** Teacher $T$ must be authorized to teach Subject $Sub$ in Section $Sec$ via an existing `SubjectOffering` or `SubjectTeacher` record.
6. **Availability Constraints:** Teacher or Room marked unavailable for Day $D$ + Period $P$ cannot be scheduled without explicit override.
7. **Break Period Protection:** Non-teaching periods (`BREAK`, `LUNCH`, `ASSEMBLY`) do not produce false teaching collisions and are protected from academic assignments.
