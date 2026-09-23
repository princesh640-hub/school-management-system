# Enterprise School Management System — Feature Status Register

| Domain / Module | Sub-Module / Feature | Phase | Status | Verified Date | Notes & Scope |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Identity & Admin** | Organization Profile Expansion | 4A | **VERIFIED** | 2026-09-17 | Address, taxId, contact, branding |
| **Identity & Admin** | Multi-Campus Management & Switcher | 4A | **VERIFIED** | 2026-09-17 | CRUD, status toggle, campus filtering |
| **Identity & Admin** | Department Hierarchy & Management | 4A | **VERIFIED** | 2026-09-17 | CRUD, campus link, staff mapping |
| **Identity & Admin** | Designation Catalog & Hierarchy | 4A | **VERIFIED** | 2026-09-17 | CRUD, title, code, department mapping |
| **Identity & Admin** | Academic Years & Terms / Semesters | 4A | **VERIFIED** | 2026-09-17 | Multi-term support, current term flag |
| **Identity & Admin** | User Lifecycle (Activate/Suspend/Archive) | 4A | **VERIFIED** | 2026-09-17 | State machine, session invalidation, audit |
| **Identity & Admin** | Role & Permission Matrix Management | 4A | **VERIFIED** | 2026-09-17 | Custom roles, permission assign, system role lock |
| **Identity & Admin** | Active Session & Login Management | 4A | **VERIFIED** | 2026-09-17 | Session tracking, remote revoke, audit |
| **Identity & Admin** | Audit Trail & Security Query Engine | 4A | **VERIFIED** | 2026-09-17 | Multi-criteria filter, diff inspection |
| **Admissions** | Online Application & Status Tracking | 4B | **VERIFIED** | 2026-09-17 | Multi-status tracking, collision-safe numbering |
| **Admissions** | Admission Review, Approval & Enroll | 4B | **VERIFIED** | 2026-09-17 | Review notes, idempotent student conversion |
| **Student Lifecycle** | Multi-Guardian Linking & Contacts | 4B | **VERIFIED** | 2026-09-17 | Primary/emergency contacts, pickup rights |
| **Student Lifecycle** | Class Promotion, Transfer & Alumni | 4B | **VERIFIED** | 2026-09-17 | Section/campus transfer, bulk promotion, alumni |
| **Academics** | Course & Curriculum Structures | 4C | **VERIFIED** | 2026-09-19 | Streams, electives, credit hours, curricula, study plans |
| **Academics** | Teacher & Subject Class Assignments | 4C | **VERIFIED** | 2026-09-19 | Class teacher history, workload, audited capacity overrides |
| **Academics** | Academic Calendar & Events | 4C | **VERIFIED** | 2026-09-19 | Holidays, terms, exam windows, audience targeting |
| **Attendance** | Student Daily Attendance & Roll Call | 4D | **VERIFIED** | 2026-09-19 | Sessions, lock control, corrections workflow, streaks |
| **Attendance** | Employee / Faculty Attendance & Timesheet | 4D | **VERIFIED** | 2026-09-19 | Clock-in/out punch guard, daily roster, department filters |
| **Leave Management** | Staff Leave Balances & Approval Workflow | 4D | **VERIFIED** | 2026-09-19 | Leave types, quota ledger, calendar holidays integration |
| **Timetable** | Period Definition & Room Allocation | 4E | **VERIFIED** | 2026-09-19 | Day slots, teaching/break periods, room capacity & type |
| **Timetable** | Deterministic Conflict Detection & Heuristic Solver | 4E | **VERIFIED** | 2026-09-19 | Multi-dimensional collision engine, backtracking solver, diagnostics, publishing |
| **Examinations** | Exam Sessions, Types & Scheduling | 4F | **VERIFIED** | 2026-09-19 | Term exams, midterms, unit tests, room & invigilator assignments |
| **Grading** | Marks Entry & Teacher Approval Workflow | 4F | **VERIFIED** | 2026-09-19 | Weighting, dynamic grade scales, pass/fail rules, audited corrections |
| **Grading** | Report Cards & Transcripts Generation | 4F | **VERIFIED** | 2026-09-19 | Print-ready, Phase 4D attendance integration, multi-year transcript, rankings |
| **Finance & Fees** | Fee Structures, Schedules & Concessions | 4G | **VERIFIED** | 2026-09-19 | Student fee assignments, scholarships, discounts, late fee policy |
| **Finance & Fees** | Invoicing, Sequential Receipts & Payments | 4G | **VERIFIED** | 2026-09-19 | INV/RCP numbering, idempotency key, line items, cashier shifts |
| **Finance & Fees** | Reversals, Running Ledger & Aging Reports | 4G | **VERIFIED** | 2026-09-19 | Audited refunds, credit/debit adjustments, 30-day bucket defaulters |
| **HR & Payroll** | Employee Records, Contracts & Docs | 4H | **VERIFIED** | 2026-09-19 | Full lifecycle status, contracts (CNT-), documents vault, self-service |
| **HR & Payroll** | Configurable Salary Structures & Payroll | 4H | **VERIFIED** | 2026-09-19 | Versioned effective structures, loans (LOAN-), batch run (PAY-), gate lock, PSL- payslips |
| **Library** | Cataloging, Books & Copies Management | 4I | **VERIFIED** | 2026-09-19 | Title vs Copy separation, accession (ACC-), barcodes, authors, publishers, locations |
| **Library** | Circulation Desk, Holds, Fines & Slips | 4I | **VERIFIED** | 2026-09-19 | Multi-criteria eligibility, loans (LOAN-), hold queue (RES-), overdue fines (FINE-), slips |
| **Transport** | Vehicles, Drivers, Routes & Assignments | 4J | **VERIFIED** | 2026-09-19 | Fleet registry, personnel, routes/stops, student assignments, schedules, boarding events, maintenance, fuel, incidents, reports |
| **Transport** | Schedules, Boarding Events, Incidents & Maintenance | 4J | **VERIFIED** | 2026-09-19 | Conflict detection (vehicle/driver), boarding records, MNT-/INC- numbered, fuel tracking, expiry alerts |
| **Hostel** | Hostels, Buildings, Rooms, Beds & Allocations | 4K | **VERIFIED** | 2026-09-19 | Hierarchy, capacity rules, bed states, ALLOC- numbered, check-in/out, transfers |
| **Inventory** | Items, Units & Stock Movement Ledger | 4L | **VERIFIED** | 2026-09-19 | Stock in/out, stores, locations, transfers (TRF-), adjustments, physical audits (STK-), reorders |
| **Procurement** | Purchase Requests & Purchase Orders | 4L | **VERIFIED** | 2026-09-19 | Suppliers (SUP-), PRs (PR-), POs (PO-), GRN receipts (GRN-), invoice refs (SINV-), finance boundary |
| **Communication** | Notification Engine & Queue (BullMQ) | 4M | **VERIFIED** | 2026-09-19 | Multi-channel (In-App, Email, SMS, Push, WhatsApp), templates, versioning, audiences, quiet hours, delivery ledger |
| **Parent Portal** | Multi-Child Dashboard & Student Access | 4N | **VERIFIED** | 2026-09-19 | Verified parent-child access isolation, multi-child switcher, published-only academic data, honest gateway, web & Flutter mobile |
| **Student Portal** | Timetable, Results, Fees & Attendance | 4O | **VERIFIED** | 2026-09-19 | Identity-bound data isolation, published timetable/results/report cards, attendance gauge & alerts, fees, services, web & Flutter mobile |
| **Teacher Portal** | Faculty Workspace, Attendance & Marks | 4P | **VERIFIED** | 2026-09-19 | Strict assignment scope, fast attendance, marks entry/correction, timetable, self-service leave, web & Flutter mobile |
| **Documents** | Centralized Document Store & Uploads | 4Q | **VERIFIED** | 2026-09-20 | Sequential DOC- numbers, safe MIME validation, short-lived signed URLs, versioning, expiry tracking, audit sharing |
| **Certificates** | Printable Certificates & Public Verification | 4Q | **VERIFIED** | 2026-09-20 | CERT- numbers, safe variables, template versioning, approval workflow, revocation, public QR/token validator, BullMQ print engine |
| **Reports** | Cross-Domain Analytical Reporting & Dashboards | 4R | **VERIFIED** | 2026-09-20 | 12 domain categories, 36+ reports catalog, authoritative DB metrics, time-series trends, CSV/print exports, scheduled reports, role-based dashboards |
| **Integrations** | External Gateway Adapters (SMS, Mail) | 4S | **VERIFIED** | 2026-09-20 | Provider-agnostic adapters, encrypted server secrets, HMAC webhooks, data exchange pipeline |
| **Production QA** | Production Hardening & Global Audit | 4T | **VERIFIED** | 2026-09-20 | Zero fake data, sanitized errors, redacted audit logs, liveness/readiness probes, multi-client parity, disaster recovery runbooks, 60-point hardening audit |

