# ADR-004: Role-Based Access Control (RBAC) & Fine-Grained Permissions

## Status
Accepted

## Context
A simplistic role-only model (e.g. `if (role === 'TEACHER')`) fails in enterprise educational institutions. A teacher who is also a class teacher needs attendance editing rights for their section, but not global student deletion rights. Likewise, an accountant requires fee structure access, but not student grade modification. Access control must be granular, extensible, and strictly server-enforced.

## Decision
We implemented a decoupled **RBAC + Fine-Grained Permission** architecture:
`User -> Roles -> Permissions -> Module Access -> Action Access`
- Permissions follow the standard `<module>:<action>` format (e.g. `attendance:mark`, `payroll:approve`).
- Users can have multiple roles simultaneously (e.g. Teacher + Hostel Warden).
- Direct per-user overrides (`UserPermissionOverride`) allow temporary or special individual grants/revocations.
- Enforced via server-side `@RequirePermissions()` decorators and NestJS Guards (`PermissionsGuard`).

## Consequences
### Positive
- Total flexibility to define custom institution roles (e.g. "Vice Principal of Academics", "Junior Cashier").
- Client UI simply toggles button states based on permission lists, while the backend rejects unauthorized requests with 403 Forbidden.

### Negative
- Permission tokens can grow large; claims are cached in Redis to maintain fast token introspection.
