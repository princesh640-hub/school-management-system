# ADR-002: NestJS Fastify Adapter & Modular Monolith Pattern

## Status
Accepted

## Context
School management operations span 28+ domains (attendance, fees, examinations, admissions, timetable, etc.). Implementing distributed microservices prematurely at this phase would introduce significant network latency, distributed transaction complexity (Sagas), and DevOps overhead unsuitable for single-VPS or small school cluster operations. Conversely, an unstructured monolith leads to code tangling and tight coupling.

## Decision
We chose **NestJS with Fastify Adapter** (`@nestjs/platform-fastify`) structured as a **Modular Monolith**:
1. Every domain is isolated in a NestJS module (`apps/api/src/modules/<domain>`).
2. Modules communicate via strictly typed services and dependency injection.
3. Fastify is chosen over Express for lower memory overhead and significantly higher I/O throughput.

## Consequences
### Positive
- High developer velocity and atomic transactions across domain boundaries.
- Easy transition path: any module can be extracted into an independent microservice in the future if specific scaling demands emerge.
- Fastify low-overhead request lifecycle maximizes single-VPS concurrency.

### Negative
- Fastify requires specific plugin adaptations (e.g. `@fastify/helmet`, `@fastify/swagger-ui`) instead of standard Express middleware.
