#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Enterprise School Management System - MinIO Storage Initializer
# ==============================================================================

MINIO_ALIAS="school-storage"
ENDPOINT="http://localhost:9000"
ACCESS_KEY="${STORAGE_ACCESS_KEY:-minioadmin}"
SECRET_KEY="${STORAGE_SECRET_KEY:-minioadmin}"

echo "==> Configuring MinIO client alias..."
mc alias set "${MINIO_ALIAS}" "${ENDPOINT}" "${ACCESS_KEY}" "${SECRET_KEY}"

# Create required buckets
BUCKETS=("school-documents" "school-photos" "school-reports")

for BUCKET in "${BUCKETS[@]}"; do
  echo "==> Ensuring bucket exists: ${BUCKET}"
  mc mb --ignore-existing "${MINIO_ALIAS}/${BUCKET}"
done

echo "==> Setting access policies (private default)..."
mc anonymous set none "${MINIO_ALIAS}/school-documents"
mc anonymous set none "${MINIO_ALIAS}/school-reports"
mc anonymous set download "${MINIO_ALIAS}/school-photos"

echo "==> MinIO object storage successfully initialized."
