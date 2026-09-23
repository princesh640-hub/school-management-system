// =============================================================================
// Phase 4Q: Documents, Certificates & Printing Verification Suite
// =============================================================================
const fs = require('fs');
const path = require('path');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  \x1b[32m✔\x1b[0m ${message}`);
  } else {
    failedTests++;
    console.error(`  \x1b[31m✖\x1b[0m ${message}`);
  }
}

function checkFileContains(filePath, patterns, label) {
  assert(fs.existsSync(filePath), `${label}: File exists -> ${path.relative(process.cwd(), filePath)}`);
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, 'utf8');
  patterns.forEach((pattern) => {
    if (typeof pattern === 'string') {
      assert(content.includes(pattern), `${label}: Contains "${pattern}"`);
    } else if (pattern instanceof RegExp) {
      assert(pattern.test(content), `${label}: Matches pattern ${pattern}`);
    }
  });
}

console.log('\n=============================================================================');
console.log('PHASE 4Q: DOCUMENTS, CERTIFICATES & PRINTING SUBSYSTEM VERIFICATION');
console.log('=============================================================================\n');

// 1. Prisma Schema Verification
console.log('1. Checking Database Schema (Prisma)...');
const schemaPath = path.join(__dirname, '../apps/api/prisma/schema.prisma');
checkFileContains(
  schemaPath,
  [
    'model DocumentCategory {',
    'model DocumentType {',
    'model InstitutionalDocument {',
    'model DocumentVersion {',
    'model DocumentShare {',
    'model CertificateType {',
    'model CertificateTemplate {',
    'model CertificateTemplateVersion {',
    'model IssuedCertificate {',
    'model DocumentGenerationJob {',
    'enum DocumentLifecycleStatus {',
    'enum DocumentSharePermission {',
    'enum CertificateCategory {',
    'enum CertificateLifecycleStatus {',
    'enum CertificateLayout {',
    'enum PageSize {',
    'enum DocumentGenerationJobStatus {',
  ],
  'Prisma Schema'
);

// 2. Shared Types Verification
console.log('\n2. Checking Shared Types...');
const sharedTypesPath = path.join(
  __dirname,
  '../packages/shared-types/src/interfaces/documents-certificates.interface.ts'
);
checkFileContains(
  sharedTypesPath,
  [
    'export interface IDocumentCategory',
    'export interface IDocumentType',
    'export interface IInstitutionalDocument',
    'export interface IDocumentVersion',
    'export interface IDocumentShare',
    'export interface ICertificateType',
    'export interface ICertificateTemplate',
    'export interface ICertificateTemplateVersion',
    'export interface IIssuedCertificate',
    'export interface ICertificateIssueDto',
    'export interface ICertificateVerificationResult',
    'export interface IPrintJob',
    'export interface IBulkGenerationDto',
  ],
  'Shared Types'
);

// 3. Storage Service Enhancement
console.log('\n3. Checking Storage Service Security Enhancements...');
const storageServicePath = path.join(__dirname, '../apps/api/src/core/storage/storage.service.ts');
checkFileContains(
  storageServicePath,
  [
    'validateFileSafety',
    'getSignedDownloadUrl',
    'Buffer.from',
  ],
  'StorageService'
);

// 4. Queue Service Configuration
console.log('\n4. Checking Queue Service Configuration...');
const queueServicePath = path.join(__dirname, '../apps/api/src/core/queue/queue.service.ts');
checkFileContains(
  queueServicePath,
  [
    "DOCUMENT_GENERATION = 'queue:document-generation'",
  ],
  'QueueService'
);

// 5. Backend Documents Subsystem
console.log('\n5. Checking Documents Subsystem...');
const docServicePath = path.join(__dirname, '../apps/api/src/modules/documents/documents.service.ts');
checkFileContains(
  docServicePath,
  [
    'class DocumentsService',
    'generateSequentialDocumentNumber',
    'DOC-',
    'uploadDocument',
    'createNewVersion',
    'getSignedDownloadUrl',
    'getDashboardOverview',
  ],
  'DocumentsService'
);

const docControllerPath = path.join(__dirname, '../apps/api/src/modules/documents/documents.controller.ts');
checkFileContains(
  docControllerPath,
  [
    'class DocumentsController',
    "@Post('upload')",
    "@Get(':id/download')",
    "@Post(':id/versions')",
    "@Post(':id/share')",
  ],
  'DocumentsController'
);

// 6. Backend Certificates Subsystem
console.log('\n6. Checking Certificates Subsystem...');
const certServicePath = path.join(__dirname, '../apps/api/src/modules/certificates/certificates.service.ts');
checkFileContains(
  certServicePath,
  [
    'class CertificatesService',
    'generateSequentialCertificateNumber',
    'CERT-',
    'requestCertificateIssuance',
    'reviewCertificateApproval',
    'revokeCertificate',
  ],
  'CertificatesService'
);

const certVerificationPath = path.join(__dirname, '../apps/api/src/modules/certificates/certificate-verification.service.ts');
checkFileContains(
  certVerificationPath,
  [
    'class CertificateVerificationService',
    'generateVerificationReference',
    'verifyCertificate',
  ],
  'CertificateVerificationService'
);

const certControllerPath = path.join(__dirname, '../apps/api/src/modules/certificates/certificates.controller.ts');
checkFileContains(
  certControllerPath,
  [
    'class CertificatesController',
    "@Get('verify/:reference')",
    "@Post('issue')",
    "@Post(':id/approve')",
    "@Post(':id/revoke')",
  ],
  'CertificatesController'
);

// 7. Backend Printing Subsystem
console.log('\n7. Checking Printing & Document Generation Subsystem...');
const printingServicePath = path.join(__dirname, '../apps/api/src/modules/printing/printing.service.ts');
checkFileContains(
  printingServicePath,
  [
    'class PrintingService',
    'createBulkJob',
    'renderPrintableDocument',
    'wrapWithPrintStyles',
  ],
  'PrintingService'
);

const printingControllerPath = path.join(__dirname, '../apps/api/src/modules/printing/printing.controller.ts');
checkFileContains(
  printingControllerPath,
  [
    'class PrintingController',
    "@Post('jobs')",
    "@Get('render/:docType/:entityId')",
  ],
  'PrintingController'
);

// 8. AppModule Integration
console.log('\n8. Checking AppModule Integration...');
const appModulePath = path.join(__dirname, '../apps/api/src/app.module.ts');
checkFileContains(
  appModulePath,
  [
    'DocumentsModule',
    'CertificatesModule',
    'PrintingModule',
  ],
  'AppModule'
);

// 9. Web Frontend Workspaces
console.log('\n9. Checking Web Workspace & Print CSS...');
const globalsCssPath = path.join(__dirname, '../apps/web/src/app/globals.css');
checkFileContains(
  globalsCssPath,
  [
    '@media print',
    'print-color-adjust: exact',
    '.page-break-before',
    '.page-break-after',
  ],
  'globals.css Print Styling'
);

const webDocsPagePath = path.join(__dirname, '../apps/web/src/app/(dashboard)/portal/documents/page.tsx');
checkFileContains(
  webDocsPagePath,
  [
    'DocumentsPage',
    'Document Center',
    'handleDownload',
    'handleUploadNewVersion',
  ],
  'Web Documents Page'
);

const webCertsPagePath = path.join(__dirname, '../apps/web/src/app/(dashboard)/portal/certificates/page.tsx');
checkFileContains(
  webCertsPagePath,
  [
    'CertificatesPage',
    'Certificate Management',
    'handleIssueCertificate',
    'handleApprove',
    'handleRevoke',
  ],
  'Web Certificates Page'
);

const webVerifyPagePath = path.join(__dirname, '../apps/web/src/app/verify/[reference]/page.tsx');
checkFileContains(
  webVerifyPagePath,
  [
    'CertificateVerificationPage',
    'Official Certificate Verification Portal',
    'certificates/verify',
  ],
  'Web Public Verification Page'
);

const sidebarPath = path.join(__dirname, '../apps/web/src/components/Sidebar.tsx');
checkFileContains(
  sidebarPath,
  [
    '/portal/documents',
    '/portal/certificates',
  ],
  'Sidebar Navigation'
);

// 10. Mobile App Integration
console.log('\n10. Checking Flutter Mobile App...');
const mobileEndpointsPath = path.join(__dirname, '../apps/mobile/lib/core/constants/api_endpoints.dart');
checkFileContains(
  mobileEndpointsPath,
  [
    'static const String documents',
    'static const String certificates',
    'static const String verifyCertificate',
  ],
  'Mobile ApiEndpoints'
);

const mobileScreenPath = path.join(__dirname, '../apps/mobile/lib/features/documents/documents_screen.dart');
checkFileContains(
  mobileScreenPath,
  [
    'class DocumentsScreen',
    '_verifyToken',
    'Cryptographic Certificate Validator',
  ],
  'Mobile DocumentsScreen'
);

// 11. Documentation & Status
console.log('\n11. Checking Documentation & Feature Status...');
const featureStatusPath = path.join(__dirname, '../docs/features/feature-status.md');
checkFileContains(
  featureStatusPath,
  [
    '| **Documents** | Centralized Document Store & Uploads | 4Q | **VERIFIED** |',
    '| **Certificates** | Printable Certificates & Public Verification | 4Q | **VERIFIED** |',
  ],
  'Feature Status Documentation'
);

const finalReportPath = path.join(__dirname, '../docs/features/phase4q-final-report.md');
assert(fs.existsSync(finalReportPath), 'Phase 4Q Final Report exists');

console.log('\n=============================================================================');
console.log(`TOTAL CHECKS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
console.log('=============================================================================\n');

if (failedTests > 0) {
  console.error('\x1b[31mPhase 4Q Verification FAILED with errors.\x1b[0m\n');
  process.exit(1);
} else {
  console.log('\x1b[32mPhase 4Q Verification PASSED SUCCESSFULLY!\x1b[0m\n');
  process.exit(0);
}
