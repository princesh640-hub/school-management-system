#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Enterprise School Management System - Automated Database Backup Script
# ==============================================================================

BACKUP_DIR="/var/backups/school_db"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
CONTAINER_NAME="school_prod_postgres"
DB_NAME="${DB_NAME:-school_management_db}"
DB_USER="${DB_USER:-postgres}"
RETENTION_DAYS=14

mkdir -p "${BACKUP_DIR}"

BACKUP_FILE="${BACKUP_DIR}/school_db_backup_${TIMESTAMP}.sql.gz"

echo "==> Starting database backup for '${DB_NAME}' at ${TIMESTAMP}..."

docker exec -t "${CONTAINER_NAME}" pg_dump -U "${DB_USER}" -d "${DB_NAME}" --clean --if-exists | gzip > "${BACKUP_FILE}"

echo "==> Backup completed successfully: ${BACKUP_FILE}"
echo "==> File size: $(du -h "${BACKUP_FILE}" | cut -f1)"

# Rotate old backups
echo "==> Rotating backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "school_db_backup_*.sql.gz" -mtime +${RETENTION_DAYS} -delete

echo "==> Backup rotation complete."
