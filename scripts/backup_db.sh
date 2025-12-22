#!/bin/bash
# Backup script for Epstein Archive Database

DB_NAME="epstein-archive.db"
BACKUP_DIR="backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="backup_${DB_NAME}_${TIMESTAMP}.gz"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

echo "💾 Starting backup of $DB_NAME..."

# Use sqlite3 .dump or simply copy if not busy?
# Safer is .backup command or copying with WAL consistency
sqlite3 "$DB_NAME" ".backup '$BACKUP_DIR/backup_${DB_NAME}_${TIMESTAMP}.sqlite'"

# Compress
gzip "$BACKUP_DIR/backup_${DB_NAME}_${TIMESTAMP}.sqlite"

# Retention: Keep only last 7 days
find "$BACKUP_DIR" -name "backup_*.gz" -mtime +7 -delete

echo "✅ Backup completed: $BACKUP_NAME"
