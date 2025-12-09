#!/bin/bash
# Database Hardening Script
# Enables WAL mode and sets up automated backups

set -e

REMOTE_USER="deploy"
REMOTE_HOST="glasscode"
REMOTE_PATH="~/epstein-archive"

echo "Hardening production database..."

# Enable WAL mode for better concurrency and corruption resistance
ssh $REMOTE_USER@$REMOTE_HOST "sqlite3 $REMOTE_PATH/epstein-archive.db 'PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL; PRAGMA cache_size=10000;'"

# Create backup cron job
ssh $REMOTE_USER@$REMOTE_HOST "cat > /tmp/db_backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR=~/epstein-archive/backups
DB_PATH=~/epstein-archive/epstein-archive.db
TIMESTAMP=\$(date +%Y%m%d-%H%M)

# Create backup directory
mkdir -p \$BACKUP_DIR

# Backup database
sqlite3 \$DB_PATH \".backup \$BACKUP_DIR/epstein-archive-\$TIMESTAMP.db\"

# Verify backup integrity
if sqlite3 \$BACKUP_DIR/epstein-archive-\$TIMESTAMP.db \"PRAGMA integrity_check;\" | grep -q \"ok\"; then
    echo \"Backup successful: \$BACKUP_DIR/epstein-archive-\$TIMESTAMP.db\"
    # Keep only last 7 days of backups
    find \$BACKUP_DIR -name \"epstein-archive-*.db\" -mtime +7 -delete
else
    echo \"Backup integrity check failed!\"
    rm \$BACKUP_DIR/epstein-archive-\$TIMESTAMP.db
    exit 1
fi
EOF
chmod +x /tmp/db_backup.sh && mv /tmp/db_backup.sh ~/db_backup.sh"

# Add cron job (hourly backups)
ssh $REMOTE_USER@$REMOTE_HOST "(crontab -l 2>/dev/null | grep -v db_backup.sh; echo '0 * * * * ~/db_backup.sh >> ~/db_backup.log 2>&1') | crontab -"

echo "Database hardening complete!"
echo "  - WAL mode enabled"
echo "  - Hourly backups configured"
echo "  - 7-day retention policy"
