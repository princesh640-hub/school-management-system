# ADR-003: Relational Database Strategy & Multi-Campus Architecture

## Status
Accepted

## Context
School operations require rock-solid relational integrity (e.g. students cannot exist in non-existent sections; fee invoices must link to explicit academic years and fee structures; grades cannot be issued without enrollment). The system must also support future multi-campus expansions without redesigning the core schema.

## Decision
We selected **PostgreSQL 18** paired with **Prisma ORM**:
1. Hierarchical organization model: `Organization -> Campus -> AcademicYear -> Departments / Classes / Users`.
2. All operational entities enforce foreign keys with explicit cascade/restrict rules.
3. Every mutating table implements mandatory audit fields (`created_at`, `updated_at`, `created_by`, `updated_by`, `status`).
4. Composite indexes are placed across campus scopes and lookup keys.

## Consequences
### Positive
- Strict ACID transactions prevent financial and academic grading discrepancies.
- Zero architectural refactoring needed when a school opens branch campuses.
- Prisma generates compile-time type-safe queries preventing runtime SQL column mismatches.

### Negative
- Schema migrations must be carefully planned in version control before running against production databases.
