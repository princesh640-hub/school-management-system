# Approved Technology Stack Specification

This document details the locked and approved technology stack for the Enterprise School Management System.

---

## 1. Web Application

* **Framework:** Next.js 16 (App Router)
* **Library:** React 19
* **Language:** Strict TypeScript
* **State & Data Fetching:** React Server Components (RSC) + Typed API SDK (`@school/api-client`)
* **Styling & UI Foundation:** Tailwind CSS / Semantic Modular CSS
* **Internationalization & RTL:** Native document direction (`dir="ltr"` / `dir="rtl"`) architecture ready

### Rationale
Next.js 16 App Router provides optimal server-side rendering for administrative portal security, automated code-splitting, instant route transitions, and robust search-engine optimization where public admissions/school landing pages are needed.

---

## 2. Backend API

* **Framework:** NestJS
* **HTTP Engine:** Fastify Adapter (`@nestjs/platform-fastify`)
* **Language:** Strict TypeScript
* **Architectural Pattern:** Domain-Driven Modular Monolith
* **Documentation:** OpenAPI / Swagger 3.0 via `@nestjs/swagger` + `@fastify/swagger-ui`
* **Validation:** `class-validator`, `class-transformer`, and `zod`

### Rationale
Fastify delivers significantly higher requests-per-second throughput and reduced latency compared to default Express. NestJS provides enterprise-grade dependency injection, modular encapsulation, and lifecycle management required for 28+ interconnected school operational domains.

---

## 3. Database & ORM

* **Database Engine:** PostgreSQL 18
* **ORM:** Prisma 7 / Prisma 6.4+
* **Data Modeling:** Strictly relational with foreign keys, composite indexes, cascading rules, and multi-campus hierarchy (`Organization -> Campus -> AcademicYear -> Departments / Classes / Users`).

### Rationale
School operational workflows (grade calculations, fee billing, payroll, enrollments, attendance) demand ACID guarantees, strong relational referential integrity, and complex relational joins that NoSQL databases cannot reliably provide. Prisma offers end-to-end compile-time type safety.

---

## 4. Mobile & Desktop Client Applications

* **Framework:** Flutter (Dart >= 3.3.0)
* **Targets:**
  - Mobile: Android & iOS
  - Desktop: Windows, macOS, Linux
* **Network Layer:** `dio` with JWT bearer interceptors and token auto-refresh
* **Security Storage:** `flutter_secure_storage` (Keychain / KeyStore)

### Rationale
Flutter enables a single shared Dart code foundation across Mobile and Desktop with high-performance native compilation, 60/120 FPS UI fidelity, and native multi-window/desktop constraint handling.

---

## 5. Cache & Background Job Queues

* **In-Memory Cache:** Redis 7+
* **Queue Engine:** BullMQ (Redis-based queue architecture)
* **Worker Processing:** Asynchronous background job pipelines for PDF generation, bulk report compiling, payroll batches, email delivery, and push notifications.

### Rationale
Prevents CPU-intensive and I/O-heavy processes from blocking the Fastify HTTP request loop, ensuring sub-100ms API response times.

---

## 6. Object Storage

* **System:** MinIO (Production S3-Compatible Storage)
* **Protocol:** AWS S3 REST API
* **Policy:** Zero binary file storage in PostgreSQL; database stores file metadata, while binaries reside in MinIO with signed URLs.

---

## 7. Reverse Proxy & Infrastructure

* **Reverse Proxy:** Nginx (with HTTP/2, TLS 1.3, Rate Limiting, Gzip Compression, Security Headers)
* **Containerization:** Docker & Docker Compose
* **Host Environment:** Ubuntu LTS VPS
