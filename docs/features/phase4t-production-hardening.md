# Phase 4T: Global QA, Security, Performance & Production Hardening Specification

## Overview & Scope
Phase 4T represents the final hardening, verification, and release-readiness milestone for the Enterprise School Management System. It spans all 20 implemented modules across Phase 1, Phase 2, Phase 3, and Phase 4A through Phase 4S.

This specification details the authoritative **60-Point Production Hardening & Compliance Matrix**.

---

## The 60-Point Production Hardening & Compliance Matrix

### 1. Architecture, Codebase & Monorepo Hygiene (Points 1–6)
- **Point 01: Monorepo Cleanliness & Isolation:** Complete separation of concerns between backend (`apps/api`), web frontend (`apps/web`), mobile (`apps/mobile`), desktop (`apps/desktop`), and shared libraries (`packages/*`).
- **Point 02: Secret Quarantine & Git Hygiene:** Strict `.gitignore` policy preventing `.env`, secrets, `.pem`, `.key`, and database dumps from entering source control.
- **Point 03: Environment Variable Template Parity:** `.env.example` comprehensively documents all mandatory and optional environment variables across database, caching, storage, authentication, integrations, and observability.
- **Point 04: TypeScript & Dart Strong Typing:** Universal absence of arbitrary untyped bridges; unified domain contracts defined in `@school/shared-types` or Dart models.
- **Point 05: No Dead Code or Stale Prototypes:** All production controllers, services, and modules correspond to real database models and verified endpoints.
- **Point 06: Zero Mock Test Placeholders:** Verification scripts execute strict structural, semantic, and integration validations rather than mocked boolean returns.

### 2. Database Schema, Multi-Campus & Foreign Key Integrity (Points 7–12)
- **Point 07: Explicit Schema Mapping:** Every Prisma model maps to snake_case PostgreSQL tables with explicit `@@map()` and `@@index()` definitions.
- **Point 08: Multi-Campus & Organization Scoping:** Every operational record (Students, Fees, Attendance, Timetable, Exams, Library, Transport, Hostel, Inventory, Documents, Reports) is strictly bound to `campusId` or `organizationId`.
- **Point 09: Foreign Key Referential Cascades:** Relational integrity enforced via PostgreSQL foreign keys with explicit `onDelete: Cascade` or `onDelete: Restrict` where data preservation is required.
- **Point 10: Sequential Collision-Proof Numbering:** Standard business identifiers (`APP-`, `STU-`, `EMP-`, `INV-`, `RCP-`, `PAY-`, `ACC-`, `DOC-`, `CERT-`, `JOB-`) generated via collision-safe database sequences or atomic transactions.
- **Point 11: Comprehensive Indexing for Query Performance:** High-frequency filter columns (`campusId`, `status`, `studentId`, `date`, `createdAt`) are indexed to maintain sub-10ms query execution times.
- **Point 12: Soft-Delete & Historical Record Auditing:** Critical historical records implement audit timestamps (`createdAt`, `updatedAt`, `deletedAt`) preventing accidental data annihilation.

### 3. Authentication, RBAC & Session Security (Points 13–18)
- **Point 13: Cryptographic Password Hashing:** Passwords hashed with Argon2id (`argon2` v0.41.1; 64MB memory cost, 3 iterations, 4 parallelism); plain-text passwords never stored.
- **Point 14: Asymmetric/Dual JWT Token Strategy:** Short-lived access tokens (15m) paired with rotatable refresh tokens (7d) stored securely with device binding.
- **Point 15: Fine-Grained Role-Based Access Control:** Every API controller is guarded by `@UseGuards(JwtAuthGuard, RolesGuard)` or `@Permissions()`, preventing unauthorized vertical escalation.
- **Point 16: Multi-Tenant Data Isolation Guard:** Requests enforce contextual campus and organization tenancy, preventing cross-tenant horizontal escalation.
- **Point 17: Remote Session Invalidation:** Users can view active login sessions and remotely revoke compromised access tokens and refresh tokens.
- **Point 18: Account Lockout & Rate Limiting:** Brute force mitigation on authentication endpoints via Redis-backed rate limiting (`ThrottlerGuard`).

### 4. API Error Handling, Sanitization & Correlation (Points 19–24)
- **Point 19: Universal Exception Normalization:** All unhandled errors pass through `AllExceptionsFilter`, returning uniform error envelopes.
- **Point 20: Production Error Detail Sanitization:** In `production` mode, raw database error strings, SQL queries, and stack traces are suppressed from client responses.
- **Point 21: Distributed Correlation IDs:** Every client request receives or generates a unique `x-correlation-id` returned in response headers and logged for observability.
- **Point 22: Safe HTTP Status Codes:** Strict semantic HTTP statuses mapped (`400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `409 Conflict`, `422 Unprocessable`, `500 Internal`).
- **Point 23: Strict Payload Validation:** Incoming payloads validated via `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`.
- **Point 24: No Information Leakage via Headers:** Nginx and Fastify suppress `X-Powered-By`, `Server`, and revealing backend banners.

### 5. Audit Logging, Compliance & Redaction (Points 25–30)
- **Point 25: Comprehensive Audit Trail:** Critical mutations across identity, finances, grading, and configuration write immutable records to `audit_logs`.
- **Point 26: Sensitive Credential Scrubbing:** Passwords, tokens, refresh tokens, credit card numbers, and API keys are recursively redacted from audit logs (`[REDACTED]`).
- **Point 27: IP Address & User Agent Tracking:** Audit records capture originating IP, client user-agent, user ID, and target entity IDs.
- **Point 28: Tamper-Resistant Audit Records:** Audit log rows are append-only; standard application roles have no delete or update privileges on audit tables.
- **Point 29: Exportable Audit Reports:** Compliance officers can query and export filtered audit history by date, actor, entity, and action.
- **Point 30: GDPR / Data Privacy Compliance:** Student and guardian contact information access is restricted and traceable.

### 6. Object Storage, Media & Document Protection (Points 31–36)
- **Point 31: S3 / MinIO Object Storage Isolation:** File assets stored outside the web root in dedicated buckets (`school-documents`, `school-photos`, `school-reports`).
- **Point 32: Short-Lived Signed URLs:** Protected student documents, medical records, and certificates are accessible only via time-limited signed URLs (max 15 minutes).
- **Point 33: MIME Type & File Size Validation:** Upload endpoints strictly validate Magic Bytes / MIME types (`pdf`, `jpg`, `png`, `webp`) and enforce size limits (max 10MB).
- **Point 34: Sequential Document Identifiers:** Stored documents track sequential numbers (`DOC-000001`), version hashes, and uploader user IDs.
- **Point 35: Certificate Cryptographic Verification:** Issued certificates include tamper-evident cryptographic verification tokens and printable QR verification codes.
- **Point 36: Safe Document Deletion & Retention:** Document deletions mark soft-deletion state or queue storage garbage collection with audit justification.

### 7. Financial, Examination & Numerical Integrity (Points 37–42)
- **Point 37: Zero Floating-Point Currency Math:** Financial amounts (invoices, receipts, payments, concessions, payroll) stored and computed as precise Decimals or Integer Cents.
- **Point 38: Idempotent Payment Processing:** Fee collections enforce `Idempotency-Key` or unique transaction reference headers to prevent double billing.
- **Point 39: Sequential Accounting Vouchers:** Receipts (`RCP-`), Invoices (`INV-`), Payslips (`PSL-`), and Credit Notes follow strictly contiguous sequential numbering.
- **Point 40: Double-Entry Ledger Principles:** Reversals, adjustments, and refunds create balancing credit/debit records rather than hard-deleting historical transactions.
- **Point 41: Immutable Approved Grades:** Once marks are submitted and officially approved by the Head of Department, marks are locked against unauthorized alteration.
- **Point 42: Authoritative Dynamic Grading Calculations:** GPAs, ranks, percentage totals, and attendance percentages are calculated directly from authoritative database records.

### 8. Background Queues, Workers & Webhooks (Points 43–48)
- **Point 43: BullMQ + Redis Queue Engine:** Asynchronous operations (PDF generation, bulk SMS/email, data imports, export jobs) run in isolated worker processes.
- **Point 44: Automatic Exponential Retry:** Transient failures in worker jobs retry with exponential backoff and dead-letter queue (DLQ) routing.
- **Point 45: Outbound Webhook Delivery Ledger:** Outbound integration webhooks log payloads, attempt timestamps, response status codes, and latency in `integration_outbox`.
- **Point 46: Inbound Webhook Signature Verification:** External incoming webhooks (Stripe, Twilio, LMS) verify cryptographic HMAC signatures before execution.
- **Point 47: Idempotency Protection for Inbound Events:** Incoming external webhook events track unique provider IDs in `webhook_event_logs` to prevent replay attacks.
- **Point 48: Graceful Worker Shutdown:** Workers intercept `SIGTERM` and `SIGINT` to allow in-flight background jobs to complete cleanly.

### 9. Multi-Client Parity (Web, Mobile, Desktop) (Points 49–54)
- **Point 49: Full API Endpoint Synchronization:** Mobile (`apps/mobile/lib/core/constants/api_endpoints.dart`) and Desktop (`apps/desktop/lib/core/constants/api_endpoints.dart`) mirror the exact API route structure.
- **Point 50: Multi-Platform Role Matrix:** Web serves complete administrative and faculty portals; Mobile delivers optimized Parent, Student, and Teacher portals; Desktop serves high-volume administrative stations.
- **Point 51: Offline Tolerance & Network Resilience:** Mobile and Desktop clients handle network timeouts, backoff retries, and offline caching gracefully.
- **Point 52: Secure Client Credential Storage:** Mobile Flutter app uses `FlutterSecureStorage` (iOS Keychain / Android EncryptedSharedPreferences) for JWT tokens.
- **Point 53: Consistent UI Design Language:** Web and mobile clients conform to consistent branding, semantic colors (Success, Warning, Danger, Info), and responsive layouts.
- **Point 54: Responsive Viewport Compliance:** Web layouts support full desktop (1920x1080), tablet (768x1024), and mobile viewports (390x844).

### 10. Operational Monitoring, Disaster Recovery & Release Readiness (Points 55–60)
- **Point 55: Health Check Liveness Probe:** `GET /api/v1/health/live` reports process uptime and event-loop liveness.
- **Point 56: Health Check Readiness Probe:** `GET /api/v1/health/ready` verifies live PostgreSQL and Redis connectivity with HTTP 503 fallback.
- **Point 57: Automated Database Backup Automation:** Executable `infrastructure/scripts/backup-db.sh` produces compressed, timestamped backups with automated retention rotation.
- **Point 58: Authoritative Disaster Recovery Script:** Executable `infrastructure/scripts/restore-db.sh` validates archive integrity and restores the relational database cleanly.
- **Point 59: Production Operations Runbook:** Comprehensive documentation in `docs/deployment/production-runbook.md` detailing deployment, rollback, monitoring, and incident response.
- **Point 60: 100% Regression Suite Passing:** Automated verification passes unconditionally across all 20 modules (Phases 1 through 4T).
