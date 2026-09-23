# Enterprise School Management System — Production Operations & Deployment Runbook

## Document Control
- **Document Version:** 1.0.0
- **Phase:** 4T — Global QA, Security, Performance & Production Hardening
- **Target Audience:** DevOps Engineers, Platform Administrators, Site Reliability Engineers (SRE), Database Administrators
- **Classification:** Confidential / Internal Operations

---

## 1. System Topology & Architecture Overview

The Enterprise School Management System is designed as a secure, high-availability, modular multi-tenant educational management platform consisting of:

| Component | Technology | Role | Port / Protocol |
| :--- | :--- | :--- | :--- |
| **Edge Gateway / Reverse Proxy** | Nginx 1.27 (Alpine) | TLS termination, rate limiting, request routing, HTTP/2, security headers | 80, 443 (HTTPS) |
| **API Backend** | NestJS 11 + Fastify | Modular REST API engine, authentication, RBAC, domain services | 4000 (Internal) |
| **Background Workers** | BullMQ + Redis | Asynchronous event dispatch, email/SMS queues, certificate rendering, report generation | Managed via Redis |
| **Primary Database** | PostgreSQL 18 (Alpine) | ACID relational persistence, multi-campus partitioning, foreign key integrity | 5432 (Internal) |
| **In-Memory Cache & Broker** | Redis 7.4 (Alpine) | Session state, rate limiting keys, pub/sub, BullMQ job queues | 6379 (Internal) |
| **Object Storage** | MinIO / AWS S3 Compatible | Documents (DOC-), certificate PDFs (CERT-), student photos, report exports | 9000/9001 (Internal) |
| **Web Frontend** | Next.js 16 (React 19) | Multi-role responsive dashboard (Admin, Faculty, Parent, Student) | 3000 (Internal) |
| **Mobile Client** | Flutter 3.x (Dart) | Parent, Student, Teacher offline-tolerant mobile application | HTTPS REST |
| **Desktop Client** | Flutter 3.x Desktop | Administrative station, registrar, cashier, fee counter | HTTPS REST |

---

## 2. Pre-Flight Production Deployment Checklist

Before initiating any deployment to staging or production, execute the pre-flight verification:

- [ ] **Environment Validation:** Verify `.env` has all required secrets populated with cryptographically random strings (min 32 bytes for `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `INTEGRATIONS_ENCRYPTION_KEY`).
- [ ] **No Default Credentials:** Ensure default database and MinIO credentials from development are replaced.
- [ ] **Database Backup:** Confirm automated or manual backup executed within the last 15 minutes.
- [ ] **Database Migrations Check:** Inspect pending Prisma migrations with `prisma migrate status`.
- [ ] **TLS Certificate Validity:** Ensure Let's Encrypt or corporate CA certificates have >= 30 days validity remaining.
- [ ] **Disk & Memory Headroom:** Minimum 20% free disk space on database and storage volumes; minimum 2GB free RAM on host.
- [ ] **Automated Regression Suite Pass:** All 20 module verification suites (`verify-phase1.cjs` through `verify-phase4s.cjs` and `verify-phase4t.cjs`) must pass with 0 failures.

---

## 3. Deployment Procedures

### Standard Zero-Downtime Deployment
Deployments leverage Docker Compose container recreation behind Nginx proxy upstream buffers:

```bash
# 1. Pull latest verified release tag
cd /opt/school-system
git fetch --tags
git checkout tags/v1.0.0

# 2. Rebuild container images with caching
docker compose -f infrastructure/docker/docker-compose.prod.yml build --pull

# 3. Apply schema migrations before switching application traffic
docker compose -f infrastructure/docker/docker-compose.prod.yml run --rm school_api npx prisma migrate deploy

# 4. Perform rolling service reload
docker compose -f infrastructure/docker/docker-compose.prod.yml up -d --no-deps --remove-orphans school_api school_web

# 5. Verify readiness probes
curl -f http://127.0.0.1:4000/api/v1/health/ready || (echo "DEPLOYMENT FAILED READINESS PROBE" && exit 1)

# 6. Reload Nginx reverse proxy configuration gracefully
docker exec school_prod_nginx nginx -s reload
```

---

## 4. Health Probes & Service Verification

The API server exposes standard Kubernetes/Docker liveness and readiness probe endpoints:

### Liveness Probe (`GET /api/v1/health/live`)
- **Purpose:** Verifies the Node.js/Fastify process is event-loop responsive and alive.
- **Expected Status:** HTTP 200 OK
- **Response Format:**
  ```json
  {
    "status": "alive",
    "timestamp": "2026-09-20T10:00:00.000Z",
    "uptime": 14285.32
  }
  ```

### Readiness Probe (`GET /api/v1/health/ready`)
- **Purpose:** Verifies that both PostgreSQL and Redis connections are established and responsive before traffic is routed.
- **Expected Status:** HTTP 200 OK (HTTP 503 Service Unavailable if database is unreachable)
- **Response Format:**
  ```json
  {
    "status": "ready",
    "timestamp": "2026-09-20T10:00:00.000Z",
    "checks": {
      "database": "healthy",
      "redis": "healthy"
    }
  }
  ```

---

## 5. Rollback Procedures

If an unrecoverable fault occurs during or immediately after deployment:

### Fast Application Rollback (Code Only)
```bash
# 1. Check out previous release git commit or tag
git checkout HEAD~1

# 2. Restart services with previous image
docker compose -f infrastructure/docker/docker-compose.prod.yml up -d --no-deps school_api school_web

# 3. Verify health
curl -f http://127.0.0.1:4000/api/v1/health/ready
```

### Database Restoration Procedure (Disaster Recovery)
In the event of a breaking schema corruption or accidental data loss:
```bash
# 1. Stop web and api traffic
docker compose -f infrastructure/docker/docker-compose.prod.yml stop school_api school_web

# 2. Execute authoritative restore script
sudo bash infrastructure/scripts/restore-db.sh /var/backups/school_db/school_db_backup_YYYYMMDD_HHMMSS.sql.gz

# 3. Restart application containers
docker compose -f infrastructure/docker/docker-compose.prod.yml start school_api school_web

# 4. Verify system integrity
curl -f http://127.0.0.1:4000/api/v1/health/ready
```

---

## 6. Secrets & Key Rotation Procedures

1. **JWT Secret Rotation (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`):**
   - Updates to JWT secrets immediately invalidate existing active user sessions.
   - Schedule during low-traffic maintenance windows (e.g., 02:00 UTC).
   - Update `.env`, execute `docker compose up -d school_api`, and broadcast session re-authentication.

2. **Integration Secrets Encryption Key (`INTEGRATIONS_ENCRYPTION_KEY`):**
   - Used for AES-256-GCM encryption of third-party provider keys in `integration_configs`.
   - Never change without executing the batch credential re-encryption script (`reencrypt-integrations.ts`).

3. **Webhook Signing Key (`WEBHOOK_SIGNING_SECRET`):**
   - Outbound HMAC-SHA256 signatures are generated using this key.
   - Coordinate rotation with external subscribed webhook receivers.

---

## 7. Disaster Recovery & RPO/RTO Targets

| Metric | Target | Realization Strategy |
| :--- | :--- | :--- |
| **Recovery Point Objective (RPO)** | < 1 Hour | Continuous WAL archiving + hourly incremental snapshots + nightly full `pg_dump` |
| **Recovery Time Objective (RTO)** | < 30 Minutes | Automated dockerized single-command database restore script (`restore-db.sh`) |
| **Backup Retention** | 30 Days Local, 90 Days Cold Storage | Automated retention prune in `backup-db.sh`, offsite rsync/S3 replication |
| **Backup Encryption** | AES-256 | GPG/OpenSSL encryption layer prior to cloud object replication |

---

## 8. Incident Response & Severity Matrix

- **SEV-1 (Critical Outage):** System down, primary database unreachable, student/financial data exposed. Immediate page to on-call engineer; 15-minute response SLA.
- **SEV-2 (Major Degradation):** Core module offline (e.g., Fee payments failing, attendance roll call unresponsive), workaround available. 1-hour response SLA.
- **SEV-3 (Minor Defect):** Report generation timeout on large ranges, UI layout defect on rare device. 24-hour response SLA.
- **SEV-4 (Informational / Request):** Configuration tweak, new certificate template request. Next sprint cycle.
