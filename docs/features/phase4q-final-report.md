# Phase 4Q — Documents, Certificates & Printing Final Report

**Date:** September 20, 2026  
**Status:** **COMPLETED & VERIFIED**  
**Subsystem:** Document Management, File Storage, Certificate Generation, Template Engine, Public Verification, Printing & PDF Subsystem  

---

## 1. Executive Summary

Phase 4Q transforms the existing basic file metadata and document storage primitives into an enterprise-grade, secure, multi-tenant **Document Management, Certificate Generation, and Printing Subsystem**.

All architectural boundaries and locked phases (Phase 1, Phase 2, Phase 3, Phase 4A–4P) have been strictly preserved. Zero duplicate file storage systems were introduced; the existing S3/MinIO `StorageService` and `FileMetadata` models were enhanced with short-lived HMAC-signed download URLs, path traversal guards, SHA-256 integrity hashing, and MIME allowlist enforcement.

---

## 2. Completed Architecture & Deliverables

### A. Database Schema (`apps/api/prisma/schema.prisma`)
10 new models and 7 new enums were implemented:
- **Enums:** `DocumentLifecycleStatus`, `DocumentSharePermission`, `CertificateCategory`, `CertificateLifecycleStatus`, `CertificateLayout`, `PageSize`, `DocumentGenerationJobStatus`.
- **Models:**
  1. `DocumentCategory`: 10 institutional categories (`STUDENT`, `EMPLOYEE`, `ACADEMIC`, `FINANCE`, `HR`, `LIBRARY`, `TRANSPORT`, `HOSTEL`, `PROCUREMENT`, `CERTIFICATE`, `ADMINISTRATIVE`).
  2. `DocumentType`: Specific document types with MIME allowlists, size limits, and expiry requirement flags.
  3. `InstitutionalDocument`: Master document record linking files to domain entities with collision-safe numbers (`DOC-YYYY-XXXXX`), checksums, expiry tracking, and versioning.
  4. `DocumentVersion`: History of file revisions preserving previous versions without silent overwrites.
  5. `DocumentShare`: Audited document access sharing with time limits and permissions (`VIEW`, `DOWNLOAD`).
  6. `CertificateType`: Catalog of institutional certificates (`Bonafide`, `Character`, `Enrollment`, `Transfer Certificate`, `Leaving`, `Conduct`, `Employment`, `Salary`, `Experience`).
  7. `CertificateTemplate`: Template definitions with layout and page size metadata.
  8. `CertificateTemplateVersion`: Versioned HTML/CSS templates preserving historical visual renderings.
  9. `IssuedCertificate`: Formal certificate records with collision-safe numbering (`CERT-YYYY-XXXXX`), cryptographic verification reference, and revocation ledger.
  10. `DocumentGenerationJob`: Background generation jobs tracking batch generation progress.

### B. Shared Contracts (`packages/shared-types`)
- Defined unified TypeScript interfaces and DTOs in `packages/shared-types/src/interfaces/documents-certificates.interface.ts`.
- Exported from index: `IDocumentCategory`, `IDocumentType`, `IInstitutionalDocument`, `IDocumentVersion`, `IDocumentShare`, `ICertificateType`, `ICertificateTemplate`, `ICertificateTemplateVersion`, `IIssuedCertificate`, `ICertificateIssueDto`, `ICertificateApprovalDto`, `ICertificateRevokeDto`, `ICertificateVerificationResult`, `IPrintJob`, `IBulkGenerationDto`, `IDocumentDashboardOverview`.

### C. Backend Modules (`apps/api/src/modules/`)
1. **Core Storage Enhancement (`apps/api/src/core/storage/storage.service.ts`):**
   - `validateFileSafety()`: Enforces MIME allowlists, file size caps, and blocks path traversal attacks.
   - `getSignedDownloadUrl()`: Generates short-lived, authenticated HMAC-signed URLs with configurable TTL (default 15 mins), preventing unauthorized direct public bucket access.

2. **Documents Subsystem (`apps/api/src/modules/documents/`):**
   - `documents.service.ts`: Sequential numbering (`DOC-YYYY-XXXXX`), secure upload registration, version management, expiry tracking, search/filters, and dashboard overview.
   - `document-categories.service.ts`: Institutional category and type management with automatic defaults seeding.
   - `document-sharing.service.ts`: Secure, audited sharing with time-limited access and revocation.
   - `documents.controller.ts`: 12+ REST endpoints guarded by `@RequirePermissions` and `@CurrentUser`.
   - `documents.module.ts`: Wired with `AuditModule` and `NotificationsModule`.

3. **Certificates Subsystem (`apps/api/src/modules/certificates/`):**
   - `certificates.service.ts`: Sequential numbering (`CERT-YYYY-XXXXX`), template variable interpolation, recipient eligibility validation, draft/approval workflow, issuance, and revocation.
   - `certificate-templates.service.ts`: Whitelisted placeholder interpolation (`{{student_name}}`, `{{certificate_number}}`, `{{issue_date}}`), XSS escaping, and versioning (`Version 1 -> Version 2`).
   - `certificate-verification.service.ts`: Cryptographic reference generation (non-sequential high-entropy UUID), public rate-limited verification endpoint, and privacy-preserving payload.
   - `certificates.controller.ts`: Public `/verify/:reference` endpoint and protected management endpoints.
   - `certificates.module.ts`: Wired into `AppModule`.

4. **Printing Subsystem (`apps/api/src/modules/printing/`):**
   - `printing.service.ts`: Multi-domain printer-ready HTML document renderer (Certificates, Fee Receipts, Payslips, Report Cards) and BullMQ batch job orchestrator.
   - `printing.controller.ts`: REST endpoints for job dispatch, job status polling, and printable HTML rendering.
   - `printing.module.ts`: Wired with `QueueModule` and `AuditModule`.
   - `QueueService`: Added `QueueName.DOCUMENT_GENERATION = 'queue:document-generation'`.

### D. Web Workspace (`apps/web`)
1. **Centralized Print CSS (`apps/web/src/app/globals.css`):**
   - Implemented `@media print` rules hiding interactive UI chrome (nav, sidebars, buttons, headers), enforcing exact print colors, zero margins, and page-break utilities (`.page-break-before`, `.page-break-after`, `.avoid-break`).
2. **Institutional Document Center (`/portal/documents`):**
   - KPI metrics, Document Register table, category filters, signed download trigger, version history modal, upload modal, and share dialog.
3. **Certificate Center (`/portal/certificates`):**
   - KPI metrics, Issued Certificates ledger, print preview modal, approval button, revocation modal, certificate types catalog, and batch job monitor.
4. **Public Verification Page (`/verify/[reference]`):**
   - Clean, official verification screen displaying authenticity, certificate number, type, recipient name, issue date, and institution while strictly protecting private grades, finance, and contact data.
5. **Navigation:** Added `Document Center` and `Certificates & Printing` links to `Sidebar.tsx`.

### E. Flutter Mobile App (`apps/mobile`)
1. **API Endpoints (`ApiEndpoints`):** Added Phase 4Q routes (`documents`, `documentCategories`, `documentTypes`, `documentOverview`, `certificates`, `issuedCertificates`, `verifyCertificate`, `printingJobs`).
2. **Mobile Screen (`DocumentsScreen` in `documents_screen.dart`):**
   - Tab 0: Institutional documents viewer with status badges and details.
   - Tab 1: Issued certificates viewer.
   - Tab 2: Cryptographic certificate verifier with instant lookup against the verification API.

---

## 3. Security, Privacy & Compliance Verification

1. **Zero Unrestricted Public Bucket Access:**
   - Private documents are stored securely in S3/MinIO. Direct bucket URLs are never leaked; downloads require authenticated short-lived signed URLs.
2. **Public Verification Privacy Wall:**
   - The public verification endpoint exposes only safe verification details (certificate number, type, recipient name, issue date, status, institution). Academic grades, tuition dues, guardian numbers, and employee salaries are strictly excluded.
3. **Template Engine Security:**
   - Template placeholders are strictly whitelisted and sanitized against script tags / executable HTML injection.
4. **Collision-Safe Sequential Numbering:**
   - Document numbers (`DOC-YYYY-XXXXX`) and Certificate numbers (`CERT-YYYY-XXXXX`) follow guaranteed yearly sequences isolated per tenant.
5. **Full Audit Trail:**
   - Document uploads, version updates, sharing events, certificate approvals, and revocations are recorded in the immutable audit log.
