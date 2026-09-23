# Phase 4Q — Documents, Certificates & Printing Specification

**Date:** September 20, 2026  
**Status:** **IN PROGRESS**  
**Subsystem:** Document Management, File Storage, Certificate Generation, Template Engine, Verification, Printing & PDF Subsystem  

---

## 1. EXISTING Architecture & Foundations

The system already provides core primitives and domain models across earlier locked phases that must be reused without duplication:

1. **Storage Primitives & File Metadata:**
   - `FileMetadata` (`apps/api/prisma/schema.prisma` line 2336): Tracks `bucketName`, `fileKey`, `fileName`, `mimeType`, `sizeInBytes`, `uploadedBy`.
   - `StorageService` (`apps/api/src/core/storage/storage.service.ts`): MinIO / S3 configuration, object URL resolver, metadata registration.
   - `DocumentsController` (`apps/api/src/modules/documents/documents.controller.ts`): Minimal base controller resolving file download URLs.

2. **Entity-Specific Document Attachments:**
   - `StudentDocument` (`schema.prisma` line 1098): Document attachments for students/admissions (`studentId`, `admissionApplicationId`, `documentType`, `fileKey`, `fileName`, `mimeType`, `verifiedAt`, `verifiedBy`).
   - `EmployeeDocument` (`schema.prisma` line 1247): HR documents for employees (`employeeId`, `documentType`, `fileUrl`, `issueDate`, `expiryDate`).
   - `VehicleDocument` (`schema.prisma` line 3441): Fleet management documents (`vehicleId`, `documentType`, `fileUrl`, `issueDate`, `expiryDate`).
   - `ProcurementAttachment` & `CommunicationAttachment`: Attachments linked to purchase orders, RFQs, announcements, and message deliveries.

3. **Domain Printing & Assembled Documents:**
   - **Student Report Cards & Transcripts (Phase 4F):** `ReportCardService` (`apps/api/src/modules/examinations/report-card.service.ts`), `ReportCard` and `ReportCardTemplate` models, letterhead generation, assembled exam results and attendance summaries.
   - **Fee Invoices & Sequential Receipts (Phase 4G):** `PaymentsService.generateReceipt(paymentId)` (`apps/api/src/modules/fees/payments.service.ts`), sequential `RCP-YYYY-XXXXX` and `INV-YYYY-XXXXX` numbering, cashier shift reconciliation.
   - **Employee Payslips (Phase 4H):** `PayslipsService` (`apps/api/src/modules/payroll/payslips.service.ts`), sequential `PSL-YYYY-XXXXX` numbering, complete earnings/deductions statements.

4. **Security, Queue & Audit Infrastructure:**
   - `AuditService` (`apps/api/src/modules/audit/audit.service.ts`): Full tamper-evident audit trail logging.
   - `NotificationsService` (`apps/api/src/modules/notifications/notifications.service.ts`): In-app, email, and SMS notifications.
   - `BullMQ` Queues: Background workers (`sms`, `push`, `communications`).

---

## 2. MISSING Capabilities

1. **Unified Institutional Document Catalog:**
   - Configurable document categories (`STUDENT`, `EMPLOYEE`, `ACADEMIC`, `FINANCE`, `HR`, `LIBRARY`, `TRANSPORT`, `HOSTEL`, `PROCUREMENT`, `CERTIFICATE`, `ADMINISTRATIVE`).
   - Configurable document types with MIME allowlists, size limits, and expiry requirement flags.
   - Centralized document registry (`InstitutionalDocument`) linking files to domain entities with collision-safe numbers (`DOC-YYYY-XXXXX`).

2. **File Security & Integrity:**
   - Cryptographic file integrity checks (`SHA-256` checksums).
   - Server-side authorization check before downloading private files (rejecting unauthorized direct URL exposure).
   - Short-lived signed URLs with expiration.
   - Document sharing model with controlled permissions (`VIEW`, `DOWNLOAD`) and expiry.

3. **Document Lifecycle & Versioning:**
   - Document versioning (`DocumentVersion`) preserving historical iterations and author attribution without silent overwrites.
   - Expiry tracking with proactive notifications (e.g. expiring teacher certifications, driver licenses, vehicle insurances).
   - Document status transitions (`ACTIVE`, `ARCHIVED`, `EXPIRED`, `REVOKED`, `DELETED`).

4. **Certificate Management Subsystem:**
   - Configurable certificate types (`Bonafide`, `Character`, `Enrollment`, `Transfer Certificate / TC`, `Leaving`, `Conduct`, `Employment`, `Salary`, `Experience`).
   - Certificate template engine supporting whitelisted safe variables (`{{student_name}}`, `{{admission_number}}`, `{{class_name}}`, `{{certificate_number}}`, `{{issue_date}}`, etc.) without allowing arbitrary executable code.
   - Template versioning (`Version 1 -> Version 2`) to ensure previously issued certificates preserve exact historical visual templates.
   - Sequential, collision-safe certificate numbering (`CERT-YYYY-XXXXX`).
   - Multi-tier workflow: Request/Draft -> Eligibility Validation -> Approval -> Issuance -> Print/Download -> Revocation.
   - Non-sequential, cryptographic verification references to prevent enumeration.
   - Public verification portal (`/verify/:reference`) exposing minimal non-sensitive data (certificate number, type, issue date, status, institution).

5. **Print Engine & PDF Generation:**
   - Centralized print architecture with `@media print` CSS stylesheet ensuring pixel-perfect A4/A5/Letter layout, typography, and page-breaks.
   - Background generation queue (`document-generation`) for large bulk generation tasks (e.g. 500 certificates, bulk report cards) via BullMQ.

---

## 3. TO IMPLEMENT

### Database Models (`apps/api/prisma/schema.prisma`):
- `DocumentCategory`: Institutional categories.
- `DocumentType`: Specific document types with validation rules.
- `InstitutionalDocument`: Master document record with entity references, checksums, expiry, and versioning.
- `DocumentVersion`: History of file versions.
- `DocumentShare`: Audited document access sharing.
- `CertificateType`: Catalog of certificates issued by the institution.
- `CertificateTemplate`: Template definitions with layout and metadata.
- `CertificateTemplateVersion`: Versioned HTML/CSS templates with placeholder specifications.
- `IssuedCertificate`: Formal record of issued certificates with verification token and revocation details.
- `PrintJob`: Tracking bulk generation jobs and async workers.

### Shared Types (`packages/shared-types`):
- `packages/shared-types/src/interfaces/documents-certificates.interface.ts`:
  - Document DTOs: `IDocumentCategory`, `IDocumentType`, `IInstitutionalDocument`, `IDocumentUploadDto`, `IDocumentVersionDto`, `IDocumentShareDto`, `IDocumentFilterDto`.
  - Certificate DTOs: `ICertificateType`, `ICertificateTemplate`, `ICertificateTemplateVersion`, `IIssuedCertificate`, `ICertificateIssueDto`, `ICertificateRevokeDto`, `ICertificateVerificationResult`.
  - Print & Job DTOs: `IPrintJob`, `IBulkGenerationDto`, `IDocumentTemplatePreviewDto`.

### Backend Architecture (`apps/api/src/modules/`):
- **Documents Subsystem (`apps/api/src/modules/documents/`):**
  - `documents.service.ts`: Document catalog, secure upload validation, signed download URL generation, versioning, expiry tracking, search/filter, and archival.
  - `document-categories.service.ts`: Management of institutional document categories and types.
  - `document-sharing.service.ts`: Controlled document sharing and permissions.
  - `documents.controller.ts`: 15+ REST endpoints protected by `@RequirePermissions` and `@CurrentUser`.
- **Certificates Subsystem (`apps/api/src/modules/certificates/`):**
  - `certificates.service.ts`: Certificate numbering (`CERT-YYYY-XXXXX`), eligibility checks, variable interpolation, issuance, approval, and revocation.
  - `certificate-templates.service.ts`: Template creation, versioning, variable schema validation.
  - `certificate-verification.service.ts`: Public rate-limited verification endpoint, non-sensitive public metadata, and QR reference generator.
  - `certificates.controller.ts`: REST endpoints for certificate lifecycle, templates, and verification.
  - `certificates.module.ts`: NestJS module registered in `AppModule`.
- **Printing & Generation Subsystem (`apps/api/src/modules/printing/`):**
  - `printing.service.ts`: PDF generation orchestration, print styling, and template rendering for existing domains (report cards, receipts, payslips, certificates).
  - `print-queue.processor.ts`: BullMQ worker for bulk document generation.
  - `printing.controller.ts`: Print job dispatch and status polling.
  - `printing.module.ts`: NestJS module registered in `AppModule`.

### Web Workspace (`apps/web`):
- `/portal/documents`: Command center with Document Register, Categories, Expiring Documents, Upload Dialog, and Version History.
- `/portal/certificates`: Certificate Center with Types, Template Editor, Issued Ledger, Approval Queue, and Revocation Modal.
- `/verify/[reference]`: Public verification page displaying certificate validity without exposing sensitive personal info.
- Global Print CSS: `@media print` layout in `apps/web/src/app/globals.css`.
- Navigation: Add `Documents` and `Certificates` to `Sidebar.tsx`.

### Mobile Screen (`apps/mobile`):
- `apps/mobile/lib/core/constants/api_endpoints.dart`: Document and certificate endpoints.
- `apps/mobile/lib/features/documents/documents_screen.dart`: Document viewer, category tabs, secure download, and certificate verification checker.

### Verification Suite:
- `scripts/verify-phase4q.cjs`: Comprehensive automated validation suite testing models, shared types, services, controllers, permissions, web, mobile, and documentation.

---

## 4. DEFERRED

1. **Hardware Print Driver Integration / Direct USB Thermal Printer Drivers**:
   - Replaced by standard browser-native print dialogs, standard PDF generation, and thermal receipt-compatible CSS styles.
2. **Third-Party Digital Signature Hardware Tokens (USB PKI e-Tokens)**:
   - Handled via authorized institutional signature image placeholders and cryptographic verification tokens.
3. **External Cloud Storage Providers Beyond S3/MinIO (e.g. Google Drive, OneDrive sync)**:
   - Preserved as dedicated enterprise S3/MinIO backend for compliance and data sovereignty.
