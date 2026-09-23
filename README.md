# Enterprise School Management System

> **Phase 1 — Technology & Architecture Foundation Complete**  
> Scalable, secure, enterprise-grade school management platform designed for multi-campus educational institutions.

---

## 1. System Architecture

```
                            +--------------------------+
                            |       Internet /         |
                            |   External Traffic       |
                            +------------+-------------+
                                         |
                                    HTTPS (443)
                                         v
                            +--------------------------+
                            |     Nginx Reverse Proxy  |
                            | (SSL, Rate Limits, Gzip) |
                            +----+---------------+-----+
                                 |               |
                         /api/*  |               |  /*
                                 v               v
            +------------------------+      +-----------------------+
            |     NestJS Backend     |      |    Next.js 16 Web     |
            |   (Fastify Adapter)    |      |     (App Router)      |
            +----+-------+-------+---+      +-----------------------+
                 |       |       |
                 |       |       +------------------------------------+
                 v       v                                            v
         +-----------+ +-----------+                         +------------------+
         |PostgreSQL | |   Redis   |                         |  MinIO (S3 API)  |
         |    18     | | (BullMQ)  |                         |  Object Storage  |
         +-----------+ +-----------+                         +------------------+
```

### Direct Multi-Client Support
A single central backend serves all platforms:
* **Web:** Next.js 16 (React 19, TypeScript, App Router)
* **Mobile:** Flutter (Dart, Android & iOS)
* **Desktop:** Flutter (Dart, Windows, macOS & Linux)

---

## 2. Approved Technology Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Web Portal** | Next.js 16 | React 19, App Router, TypeScript, RTL-ready architecture |
| **Backend API** | NestJS + Fastify | Modular monolith, TypeScript, OpenAPI / Swagger |
| **Database** | PostgreSQL 18 | Relational database with multi-campus relational hierarchy |
| **ORM** | Prisma | Compile-time type-safe relational mapping |
| **Mobile App** | Flutter / Dart | Unified iOS & Android cross-platform client |
| **Desktop App** | Flutter / Dart | Native desktop workstation application (Windows/macOS/Linux)|
| **Cache & Queue**| Redis + BullMQ | Fast in-memory caching and resilient asynchronous queues |
| **Object Storage**| MinIO | S3-compatible private and public asset storage |
| **Reverse Proxy**| Nginx | TLS 1.3, rate limiting, gzip compression, security headers |
| **Containers** | Docker Compose | Independent service isolation for VPS hosting |

---

## 3. Monorepo Structure

```
school-management-system/
├── apps/
│   ├── web/                    # Next.js 16 Web Application
│   ├── api/                    # NestJS (Fastify) REST Backend API
│   ├── mobile/                 # Flutter Cross-Platform Mobile App
│   └── desktop/                # Flutter Desktop Workstation App
│
├── packages/
│   ├── shared-types/           # Shared TypeScript interfaces, DTOs & Enums
│   ├── validation/             # Shared validation schemas (Zod/class-validator)
│   └── api-client/             # Universal HTTP API Client SDK
│
├── infrastructure/
│   ├── docker/                 # Dockerfiles & Docker Compose (dev & prod)
│   ├── nginx/                  # Nginx reverse proxy configuration & templates
│   └── scripts/                # Database backup, restore, and MinIO automation
│
├── docs/                       # Technical & architectural specifications
│   ├── adr/                    # Architecture Decision Records (ADRs)
│   ├── architecture.md
│   ├── technology-stack.md
│   ├── database-schema.md
│   ├── api-specification.md
│   ├── auth-and-rbac.md
│   ├── redis-and-queues.md
│   ├── file-storage.md
│   └── deployment-guide.md
│
├── .env.example                # Safe environment configuration template
├── pnpm-workspace.yaml         # pnpm workspace definition
├── package.json                # Monorepo root configuration
├── turbo.json                  # Turborepo task pipelines
└── tsconfig.base.json          # Monorepo strict TypeScript configuration
```

---

## 4. Development Roadmap

* [x] **PHASE 1 — Technology & Architecture (CURRENT)**: Core architecture locked, monorepo foundation established, database schemas modeled, security baseline enforced, infrastructure configured.
* [ ] **PHASE 2 — Basic Structure + Basic Features**: Authentication implementation, core CRUD APIs, user management, basic academic structure.
* [ ] **PHASE 3 — UI/UX Design**: Enterprise design system, themes, accessible dashboards, responsive layouts, RTL support.
* [ ] **PHASE 4 — Feature Addition**: Advanced operational domains (fees, payroll, examinations, library, transport, notifications).

---

## 5. Getting Started (Local Development)

### Prerequisites
- Node.js >= 20.0.0
- pnpm >= 9.0.0
- Docker & Docker Compose
- Flutter SDK (for mobile & desktop development)

### 1. Environment Configuration
```bash
cp .env.example .env
```

### 2. Launch Local Infrastructure Stack
```bash
cd infrastructure/docker
docker compose up -d postgres redis minio
```

### 3. Install Dependencies & Generate Prisma Client
```bash
# Return to root directory
pnpm install
pnpm db:generate
```

### 4. Start Development Servers
```bash
# Runs API backend (port 4000) and Next.js Web (port 3000) concurrently via Turborepo
pnpm dev
```

* **Web Application:** `http://localhost:3000`
* **Backend API Base:** `http://localhost:4000/api/v1`
* **Swagger API Docs:** `http://localhost:4000/docs`
* **MinIO Console:** `http://localhost:9001`
