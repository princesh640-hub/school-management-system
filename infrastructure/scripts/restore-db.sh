#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Enterprise School Management System - Database Restore Script
# ==============================================================================

if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <path_to_backup_file.sql.gz>"
    exit 1
fi

BACKUP_FILE="$1"
CONTAINER_NAME="school_prod_postgres"
DB_NAME="${DB_NAME:-school_management_db}"
DB_USER="${DB_USER:-postgres}"

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "Error: Backup file '${BACKUP_FILE}' does not exist."
    exit 1
fi

echo "WARNING: This will overwrite existing data in '${DB_NAME}'. Continue? (y/N)"
read -r CONFIRM
if [ "${CONFIRM}" != "y" ] && [ "${CONFIRM}" != "Y" ]; then
    echo "Restore aborted."
    exit 0
fi

echo "==> Restoring from ${BACKUP_FILE}..."
gunzip -c "${BACKUP_FILE}" | docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}"

echo "==> Database restore completed successfully."
