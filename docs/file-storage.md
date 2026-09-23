# Object Storage Architecture Specification (MinIO / S3)

## 1. Storage Strategy

In compliance with the project architectural rules:
* **Zero Binary Storage in Relational DB:** PostgreSQL never stores raw binary blobs (`bytea`).
* **S3-Compatible Object Store:** MinIO (development & on-premise VPS) or AWS S3 (cloud) handles all binary objects.
* **Database Metadata Indexing:** The `file_metadata` table tracks object keys, MIME types, file sizes, and uploading users.

---

## 2. Bucket Segregation

* `school-documents` — Admissions documents, transfer certificates, student IDs, employee identity records. (Private access, presigned URLs only).
* `school-photos` — Student, teacher, and employee avatars. (Public-read CDN / reverse proxy cache).
* `school-reports` — Asynchronously compiled PDF report cards, fee receipts, and payroll slips. (Private access, time-limited presigned download links).

---

## 3. Presigned URL Lifecycle

1. Client requests upload ticket via API: `POST /api/v1/documents/upload-ticket`.
2. Backend generates a short-lived presigned PUT URL directly to MinIO.
3. Client streams binary directly to MinIO, avoiding API server memory overhead.
4. Client notifies API of completed upload with hash and key; API verifies and commits record to `file_metadata`.
