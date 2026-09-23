# Authentication & RBAC Authorization Specification

## 1. Authentication Lifecycle

The system utilizes stateless JSON Web Tokens (JWT) with dual-token architecture:

1. **Access Token:**
   - Expiration: Short-lived (15 minutes).
   - Contains claims: `sub` (User ID), `email`, `organizationId`, `campusId`, `roles`, `permissions`.
   - Transmitted via standard header: `Authorization: Bearer <access_token>`.
2. **Refresh Token:**
   - Expiration: Long-lived (7 days).
   - Stored securely in client storage (SecureStorage on Mobile/Desktop, HTTP-only secure cookie on Web).
   - Used against `POST /api/v1/auth/refresh` to mint new access tokens without requiring re-login.
3. **Password Security:**
   - Passwords hashed using **Argon2id** (OWASP recommended password hashing standard).

---

## 2. Authorization Hierarchy (RBAC + Fine-Grained Permissions)

The system does NOT use a simplistic role-only access system. Authorization is evaluated as follows:

```
User 
  --> [ Roles ] 
        --> [ Permissions ] 
              --> Module Access 
                    --> Action Access
```

### Granular Permission Format
```
<module>:<action>
```
Examples:
* `students:create`
* `students:read`
* `attendance:mark`
* `examinations:grade`
* `fees:collect`
* `payroll:approve`

### Role Separation Enforcement Matrix
| Role | Allowed Scopes | Strictly Denied Scopes |
| :--- | :--- | :--- |
| **Teacher** | `students:read`, `attendance:write`, `examinations:grade`, `timetable:read` | `payroll:*`, `fees:*`, `hr:*`, `settings:*` |
| **Accountant** | `fees:*`, `accounts:*`, `students:read` (billing view only) | `examinations:*`, `attendance:write`, `settings:*` |
| **HR Officer** | `employees:*`, `payroll:manage`, `hr:*` | `grading:*`, `examinations:*`, `fees:*` |
| **Librarian** | `library:*`, `students:read` (borrower lookup) | `payroll:*`, `fees:*`, `grading:*` |
| **Student / Parent**| `portal:view`, `attendance:read`, `results:read`, `fees:read` | All mutation & administrative actions |

### Server-Side Enforcement Guards
Authorization is never entrusted to UI components. Guards check claims on every Fastify request:

```typescript
// Controller Endpoint Example
@Post()
@RequirePermissions('students:create')
@UseGuards(JwtAuthGuard, PermissionsGuard)
async createStudent(@Body() dto: CreateStudentDto) { ... }
```
