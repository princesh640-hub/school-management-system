# API Architecture & Specification

## 1. REST API Standards & Conventions

All endpoints adhere strictly to the REST architectural style and versioning prefix:
```
Base URL: /api/v1/
```

### HTTP Methods & Semantics
* `GET` — Retrieve resources (idempotent, safe).
* `POST` — Create new resource or initiate background queue jobs.
* `PUT` — Full replacement of a resource.
* `PATCH` — Partial update of specific fields.
* `DELETE` — Soft-delete or archive resource.

---

## 2. Standard API Response Structure

All endpoints return uniform JSON envelopes.

### Success Response (`ApiResponse<T>`)
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "id": "e93ab7e2-1234-4b56-7890-abcdef123456",
    "email": "teacher@school.edu"
  },
  "timestamp": "2026-09-17T12:00:00.000Z"
}
```

### Paginated Response (`PaginatedResponse<T>`)
```json
{
  "success": true,
  "statusCode": 200,
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 20,
    "totalItems": 150,
    "totalPages": 8,
    "hasNextPage": true,
    "hasPreviousPage": false
  },
  "timestamp": "2026-09-17T12:00:00.000Z"
}
```

### Error Response (`ApiErrorResponse`)
```json
{
  "success": false,
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "errors": [
    "email must be an email",
    "password must be longer than or equal to 8 characters"
  ],
  "timestamp": "2026-09-17T12:00:00.000Z",
  "path": "/api/v1/auth/login"
}
```

---

## 3. OpenAPI / Swagger Documentation

Interactive OpenAPI documentation is generated and served directly from the Fastify NestJS application at:
```
http://localhost:4000/docs
```
Clients can download the raw OpenAPI specification schema from `/docs/json` to automatically generate type-safe client SDKs or Flutter Dart models.
