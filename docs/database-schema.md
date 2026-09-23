# Relational Database Architecture & Schema Specification

**Engine:** PostgreSQL 18  
**ORM:** Prisma 7 / 6.4+  
**Schema Location:** `apps/api/prisma/schema.prisma`

---

## 1. Domain Entities Overview

### A. Identity & Access Management (IAM)
* `organizations`: Root enterprise entity (currency, timezone, domain, branding).
* `campuses`: Physical school branches linked to an organization.
* `users`: Centralized authentication account (email, password hash, phone, profile).
* `roles`: Extensible role catalog (`SUPER_ADMIN`, `TEACHER`, `ACCOUNTANT`, etc.).
* `permissions`: Atomic action codes (`module:action` e.g. `students:create`, `fees:approve`).
* `user_roles`: Multi-role assignment junction table.
* `role_permissions`: Role to permission mapping junction table.
* `user_permission_overrides`: Direct user-level explicit grants or revokes.

### B. People Domain
* `student_profiles`: Admission number, date of birth, blood group, emergency contacts.
* `guardian_profiles`: Parent/guardian records, relationship, occupation.
* `student_guardians`: Many-to-many relationship with `is_primary` flag.
* `teacher_profiles`: Employee code, specialization, qualifications, joining date.
* `employee_profiles`: General staff, department mapping, designation, salary base.

### C. Academic Domain
* `academic_years`: Annual school sessions (`2026-2027`), with start/end dates and current session flags.
* `departments`: Academic & operational departments (e.g., Science Dept, Finance Dept).
* `classes`: Grade levels (e.g., Grade 10, Grade 11).
* `sections`: Sub-class batches (e.g., Section A, Section B) with designated class teacher.
* `subjects`: Course catalogue with credit hours and elective indicators.
* `subject_teachers`: Mapping teacher to subject and section.
* `enrollments`: Student registration into a specific section and academic year with roll numbers.
* `attendance_records`: Daily student attendance status (`PRESENT`, `ABSENT`, `LATE`, `HALF_DAY`, `EXCUSED`).
* `exam_schedules`: Planned examination periods with max and passing mark thresholds.
* `exam_results`: Grade and mark entries per student per exam schedule.

### D. Finance Domain
* `fee_structures`: Fee templates per campus (tuition, laboratory, admission, transport fees).
* `fee_invoices`: Student billing statements with due dates and payment tracking.
* `payment_transactions`: Cash, bank, card, or gateway transactions with receipt numbers.
* `payroll_records`: Monthly employee compensation calculations, basic salary, allowances, deductions.

### E. Auditing & Storage Metadata
* `audit_logs`: Mutation event log recording `organization_id`, `campus_id`, `user_id`, `action`, `module`, `old_values`, `new_values`, `ip_address`, `user_agent`.
* `file_metadata`: MinIO/S3 file index tracking bucket, object key, mime-type, size, and uploader.
* `system_settings`: Key-value organization-level configuration overrides.

---

## 2. Standard Audit Fields
All core data tables implement the standard audit fields:
* `created_at` (TIMESTAMP WITH TIME ZONE, DEFAULT NOW())
* `updated_at` (TIMESTAMP WITH TIME ZONE, AUTO-UPDATE)
* `created_by` (UUID REFERENCES users(id))
* `updated_by` (UUID REFERENCES users(id))
* `status` (ENUM: `ACTIVE`, `INACTIVE`, `SUSPENDED`, `PENDING_APPROVAL`, `ARCHIVED`)
