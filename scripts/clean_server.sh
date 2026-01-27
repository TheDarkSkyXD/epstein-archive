#!/bin/bash
# =============================================================================
# SERVER CLEANING SCRIPT
# =============================================================================
# Removes old backups and deployment artifacts to free up space.
# Retention policy: 7 days.
#
# Usage: ./clean_server.sh
# =============================================================================

set -e

BACKUP_DIR="epstein-archive/backups"
DIST_DIR="epstein-archive"
RETENTION_DAYS=7

echo "🧹 Starting server cleanup (Retention: ${RETENTION_DAYS} days)..."

# 1. Clean Database Backups
echo "   Checking for old database backups in ${BACKUP_DIR}..."
# Find files older than 7 days matching the pattern
OLD_BACKUPS=$(find "$BACKUP_DIR" -name "epstein-archive-*.db.gz" -mtime +$RETENTION_DAYS)

if [ -n "$OLD_BACKUPS" ]; then
    echo "$OLD_BACKUPS" | while read -r file; do
        if [ -f "$file" ]; then
            echo "   🗑️  Deleting old backup: $file"
            rm "$file"
        fi
    done
else
    echo "   ✓ No old database backups found."
fi

# 2. Clean Dist Backups
echo "   Checking for old deployment directories in ${DIST_DIR}..."
# Find directories older than 7 days matching the pattern
OLD_DISTS=$(find "$DIST_DIR" -maxdepth 1 -name "dist.backup-*" -type d -mtime +$RETENTION_DAYS)

if [ -n "$OLD_DISTS" ]; then
    echo "$OLD_DISTS" | while read -r dir; do
        if [ -d "$dir" ]; then
            echo "   🗑️  Deleting old deployment: $dir"
            rm -rf "$dir"
        fi
    done
else
    echo "   ✓ No old deployment directories found."
fi

# 3. Clean Log Files (Optional safety measure)
# find epstein-archive/logs -name "*.log" -size +100M -exec truncate -s 0 {} \;

echo "✨ Cleanup complete."
