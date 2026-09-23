# ADR-001: Monorepo Architecture Strategy

## Status
Accepted

## Context
The School Management System comprises multiple client applications (Next.js Web, Flutter Mobile, Flutter Desktop), a centralized NestJS backend API, shared types, validation schemas, and common API client SDKs. Managing these across separate git repositories would lead to dependency drift, fragmented version control, duplicate type definitions, and complex release coordination.

## Decision
We adopted a unified Monorepo structure managed by **pnpm workspaces** and **Turborepo** for JavaScript/TypeScript projects, co-locating Flutter mobile and desktop apps under `apps/`.

```
school-management-system/
├── apps/ (web, api, mobile, desktop)
├── packages/ (shared-types, validation, api-client)
└── infrastructure/
```

## Consequences
### Positive
- Single atomic commits across API contracts, shared DTOs, and client consumption.
- Zero package publication overhead (local workspace links via `workspace:*`).
- Turborepo remote caching accelerates CI/CD pipelines.

### Negative
- Requires maintaining tooling for both Node.js and Dart/Flutter toolchains in one repository.
