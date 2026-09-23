# ADR-005: Redis & BullMQ Queue Worker Architecture

## Status
Accepted

## Context
Educational software involves large background batch processing: generating thousands of term report cards in PDF format, computing monthly payroll with tax adjustments, dispatching emergency SMS/email announcements, and exporting analytical data. Executing these synchronously in Node.js event loops would degrade API responsiveness and cause request timeouts.

## Decision
We adopted **Redis** as a caching and queue backbone using **BullMQ**:
1. Intensive actions submit jobs to Redis queues (`queue:reports`, `queue:notifications`, `queue:payroll`, etc.).
2. The HTTP response immediately returns `202 Accepted` or a tracking Job ID.
3. Dedicated background workers process jobs with automated retry, backoff, and progress tracking.

## Consequences
### Positive
- Sub-100ms API response times even during heavy report generation periods.
- Fault-tolerant background processing: failed jobs can be inspected and retried without data loss.

### Negative
- Requires running and monitoring Redis as a continuous background dependency.
