# Redis & Background Queue Architecture Specification

## 1. Redis Roles in the System

Redis serves three mission-critical operational responsibilities:
1. **Cache Layer:** Caches permissions lookup tables, school campus settings, active academic year sessions, and public announcement feeds.
2. **Rate Limiting State:** Tracks API access quotas per IP / authenticated token.
3. **Queue Backbone:** Serves as the distributed message broker backing **BullMQ** worker processes.

---

## 2. BullMQ Background Worker Queues

Long-running and computation-intensive tasks are strictly prohibited from executing within the HTTP request/response cycle.

### Dedicated Queues
* `queue:reports` — Bulk student performance summaries, grade sheets, campus financial audits, Excel/CSV exports.
* `queue:notifications` — Multi-channel broadcast messages (push notifications, SMS reminders).
* `queue:emails` — Password reset links, monthly fee invoices, attendance alert emails.
* `queue:payroll` — Monthly salary calculation runs, tax withholdings, bulk payslip PDF generation.
* `queue:file-processing` — Image compression, thumbnail generation for student/employee profile photos.

### Resilience & Retry Policy
All queue jobs implement exponential backoff:
```typescript
{
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000
  }
}
```
Failed jobs transition to BullMQ Dead Letter Queue (DLQ) state for administrative investigation and replay.
