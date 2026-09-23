# System Architecture Specification

## 1. High-Level System Architecture

The Enterprise School Management System adopts a centralized **Modular Monolith** pattern with a single source of truth for business logic and relational persistence.

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

### Direct Client Consumption
The unified REST API (`/api/v1/*`) serves all clients:
- **Next.js Web:** Administrative portals, teacher/student dashboards, reports.
- **Flutter Mobile:** Parent/Student app, teacher daily attendance & grade entry.
- **Flutter Desktop:** Offline-capable front desk terminal, accountant cashier workstation, librarian barcode station.

---

## 2. Backend Modular Monolith Structure

Business logic is strictly isolated from controllers and transport layers. Every feature domain adheres to the following layered conceptual structure:

```
[ Domain Module ]
       |
       +---> [ Controller ]          // Route endpoints, Swagger decorators, Guard bindings
       |
       +---> [ Service ]             // Domain business logic & calculation rules
       |
       +---> [ Data Access / Repo ]  // Prisma database queries & atomic transactions
       |
       +---> [ Validation DTOs ]     // class-validator & zod input sanitization
       |
       +---> [ Unit / Int Tests ]    // Automated isolated verification
```

### Centralized Business Rules Enforced Server-Side
Under no circumstances should client applications independently calculate:
1. **Fee Calculations:** Discount policies, late fee fines, sibling waivers, installments.
2. **Attendance Rules:** Minimum academic thresholds, late grace periods, automated notification triggers.
3. **Payroll Calculations:** Overtime tiers, tax deductions, provident fund contributions, allowances.
4. **Examination & Result Calculations:** Grade point averages (GPA), weighted component marks, promotion criteria.
5. **Authorization:** Fine-grained permissions and approval workflows.

---

## 3. Multi-Campus Hierarchy Model

The system natively supports multi-campus expansion without requiring architectural refactoring:

```
+--------------------------------------------------------+
|                      ORGANIZATION                      |
| (Multi-tenant root: e.g. "Beaconhouse Educational Grp")|
+---------------------------+----------------------------+
                            |
           +----------------+----------------+
           v                                 v
+-----------------------+         +-----------------------+
|    CAMPUS: Main       |         |   CAMPUS: North Wing  |
+-----------+-----------+         +-----------+-----------+
            |                                 |
            +------------+                    +-----------+
                         v                                v
               +--------------------+           +--------------------+
               |   ACADEMIC YEAR    |           |   ACADEMIC YEAR    |
               |    (2026-2027)     |           |    (2026-2027)     |
               +---------+----------+           +---------+----------+
                         |                                |
         +---------------+----------------+               +--- ...
         v                                v
+------------------+             +------------------+
|  Class: Grade 10 |             |  Class: Grade 11 |
+--------+---------+             +--------+---------+
         |                                |
         v                                v
+------------------+             +------------------+
|    Sections      |             |    Sections      |
|     (A, B)       |             |     (A, B)       |
+------------------+             +------------------+
```
