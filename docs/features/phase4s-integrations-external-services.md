# Phase 4S — Integrations & External Services

## Specification & Audit Register

### 1. Existing Foundation (`EXISTING`)
- **Queue Infrastructure (`core/queue/queue.service.ts`)**: BullMQ queue manager handling `EMAILS`, `SMS`, `PUSH`, `WHATSAPP`, `COMMUNICATIONS`, `DOCUMENT_GENERATION`, `REPORTS`.
- **Storage Subsystem (`core/storage/storage.service.ts`)**: S3/MinIO compatible object store with short-lived HMAC-signed URLs, MIME allowlisting, path-traversal sanitization, and SHA-256 metadata tracking.
- **Communication Module (`modules/communication/`)**: Phase 4M multi-channel message dispatch, templates, audience resolution, quiet hours, and basic provider stubs (`communication-providers.service.ts`).
- **Finance Module (`modules/fees/`)**: Phase 4G invoicing, payments ledger (`payments.service.ts`), sequential receipts (`RCP-YYYY-XXXXX`), cashier shifts, and idempotency key checks.
- **Parent & Student Portals (`modules/parent/`, `modules/student/`)**: Payment initiation endpoints with honest `ONLINE PAYMENT NOT CONFIGURED` gatekeeper when gateway credentials are absent.
- **Documents & Certificates (`modules/documents/`, `modules/certificates/`, `modules/printing/`)**: Phase 4Q verified document management, certificate generation, cryptographic authenticity verification tokens, and centralized printing CSS.
- **Reports & Analytics (`modules/reports/`)**: Phase 4R 36+ operational reports, authoritative live database aggregations, and background BullMQ report scheduling.

---

### 2. Missing Capabilities (`MISSING`)
- **Unified Integration Registry**: Central catalog mapping integration types (`EMAIL`, `SMS`, `PUSH`, `WHATSAPP`, `PAYMENT`, `STORAGE`, `MAPS`, `CALENDAR`, `IDENTITY`, `DATA_EXCHANGE`) to providers with parameter schemas, default ports, and multi-tenant scoping.
- **Credential Protection & Masking**: Server-side credential encryption and UI masking preventing secrets from leaking over public API responses.
- **Pluggable Provider Adapters**: Provider-agnostic interfaces for communication, payments, maps, calendar sync, storage, and identity preventing core business logic from binding to vendor SDKs.
- **Cryptographic Webhook Verification**: Unified HMAC signature verifier for Stripe (`stripe-signature`), Razorpay (`x-razorpay-signature`), Twilio (`x-twilio-signature`), Meta WhatsApp (`x-hub-signature-256`), and generic webhooks with replay protection.
- **Idempotent Webhook Dispatcher**: Inbound callback router preventing duplicate payments, replayed notifications, and duplicate receipts.
- **Transactional Outbox Engine**: Outbox pattern ensuring transactional durability for critical external provider events.
- **Non-Destructive Health Probes**: Safe connection test and latency monitoring for third-party endpoints without generating spam or test charges.
- **Data Exchange Subsystem**: CSV/XLSX schema validator, template generator, duplicate detector, and row-level diagnostic error reporter.
- **Calendar & Location Services**: RFC 5545 iCalendar (.ics) feed generator and geocoding/distance calculation adapters.
- **Administrative UI Workspace**: Enterprise Integrations Workspace at `/portal/integrations` supporting catalog, credential forms, connection tests, health monitor, webhook activity, and data exchange.

---

### 3. Implementation Scope (`TO IMPLEMENT`)
1. **Database Schema (`apps/api/prisma/schema.prisma`)**:
   - `IntegrationConfig`: Scoped configuration store with encrypted secrets, masked displays, environment tags (`SANDBOX`/`PRODUCTION`), and health metrics.
   - `WebhookEventLog`: Audited inbound webhook delivery ledger tracking event IDs, SHA-256 payload hashes, verification status, and processing latency.
   - `IntegrationLog`: Operational audit log capturing inbound/outbound calls, correlation IDs, normalized error codes, and retry attempts.
   - `IntegrationOutbox`: Transactional outbox for guaranteed event publishing.
   - `DataExchangeJob`: Audited CSV/XLSX import/export batch jobs with progress tracking and row-level error details.
2. **Shared Types (`packages/shared-types`)**:
   - Create `integrations-external.interface.ts` with all enums, DTOs, and contracts; export in `index.ts`.
3. **Queue Infrastructure**:
   - Expand `QueueName` with `INTEGRATIONS`, `WEBHOOKS`, and `DATA_EXCHANGE`.
4. **Backend Integrations Module (`apps/api/src/modules/integrations/`)**:
   - Services: Registry, Config, Health, Logging, Outbox, Data Exchange.
   - Adapters: Email, SMS, Push, WhatsApp, Payment, Storage, Maps, Calendar, Identity.
   - Webhooks: Verification & Idempotent Dispatcher.
   - Controllers: Admin `IntegrationsController` and Public `WebhooksController`.
   - Wire into `AppModule` and integrate with `CommunicationProvidersService` and `PaymentsService`.
5. **Web Client (`apps/web`)**:
   - Enterprise workspace at `/portal/integrations`.
   - Sidebar link in `Sidebar.tsx`.
6. **Mobile Client (`apps/mobile`)**:
   - Register Phase 4S endpoints in `ApiEndpoints`.
7. **Verification & Regression**:
   - Create `verify-phase4s.cjs` and pass all 6 master regression test suites.

---

### 4. Deferred Beyond Phase 4S (`DEFERRED`)
- **Direct Biometric Hardware Firmware Flashing**: Hardware biometric clock-in remains handled via standard network API endpoints.
- **Physical GPS OBD-II Cellular Dongle Protocol Parsing**: Telematics hardware protocol parsing handled via standard REST/MQTT webhook ingestion.
- **On-Premise Active Directory Kerberos Agent**: Standard OIDC/OAuth2 protocol supported; proprietary legacy NTLM/Kerberos agent deferred.
