#!/bin/bash
# =============================================================================
# EMERGENCY ROLLBACK SCRIPT
# =============================================================================
# Immediately rolls back to a previous backup version.
# Designed to be called automatically when deployment verification fails.
#
# Usage: ./scripts/emergency_rollback.sh <backup_timestamp>
#
# Exit codes:
#   0 = Rollback successful
#   1 = Rollback failed
# =============================================================================

set -e

BACKUP_TIMESTAMP="$1"
PRODUCTION_PATH="${PRODUCTION_PATH:-$(pwd)}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[ROLLBACK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[ROLLBACK]${NC} $1"; }
log_error() { echo -e "${RED}[ROLLBACK]${NC} $1"; }

echo ""
echo "=============================================="
echo "  🔄 EMERGENCY ROLLBACK INITIATED"
echo "=============================================="
echo ""

if [ -z "$BACKUP_TIMESTAMP" ]; then
    log_error "No backup timestamp provided!"
    log_error "Usage: $0 <backup_timestamp>"
    
    # Try to find the most recent backup
    LATEST_BACKUP=$(ls -t dist.backup-* 2>/dev/null | head -1 | sed 's/dist.backup-//')
    if [ -n "$LATEST_BACKUP" ]; then
        log_warn "Most recent backup found: $LATEST_BACKUP"
        log_warn "Run: $0 $LATEST_BACKUP"
    fi
    exit 1
fi

log_info "Rolling back to backup: $BACKUP_TIMESTAMP"

cd "$PRODUCTION_PATH"

# 1. Stop the application
log_info "Stopping application..."
pm2 stop epstein-archive || true
sleep 2

# 2. Kill any remaining processes on the port
log_info "Killing any processes on port 3012..."
fuser -k 3012/tcp 2>/dev/null || true

# 3. Restore dist folder
if [ -d "dist.backup-$BACKUP_TIMESTAMP" ]; then
    log_info "Restoring dist folder..."
    rm -rf dist
    mv "dist.backup-$BACKUP_TIMESTAMP" dist
else
    log_warn "No dist backup found for $BACKUP_TIMESTAMP"
fi

# 4. Restore database (CRITICAL)
if [ -f "epstein-archive.db.backup-$BACKUP_TIMESTAMP" ]; then
    log_info "Restoring database..."
    
    # Remove any WAL/SHM files that might cause issues
    rm -f epstein-archive.db-wal epstein-archive.db-shm epstein-archive.db-journal
    
    # Restore the backup
    mv "epstein-archive.db.backup-$BACKUP_TIMESTAMP" epstein-archive.db
    
    log_info "Database restored successfully"
else
    log_warn "No database backup found for $BACKUP_TIMESTAMP"
    log_warn "Database was not rolled back!"
fi

# 5. Restart the application
log_info "Restarting application..."
pm2 start ecosystem.config.cjs --env production --update-env

# 6. Wait for startup
log_info "Waiting for application startup (30s)..."
sleep 30

# 7. Quick health check
log_info "Verifying rollback..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:3012/api/health" --max-time 10 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    echo ""
    echo "=============================================="
    echo -e "${GREEN}  ✅ ROLLBACK SUCCESSFUL${NC}"
    echo "=============================================="
    echo ""
    log_info "Application is responding to health checks"
    log_info "Previous version has been restored"
    exit 0
else
    echo ""
    echo "=============================================="
    echo -e "${RED}  ❌ ROLLBACK MAY HAVE FAILED${NC}"
    echo "=============================================="
    echo ""
    log_error "Health check returned HTTP $HTTP_CODE after rollback"
    log_error "MANUAL INTERVENTION REQUIRED!"
    log_error ""
    log_error "Debug commands:"
    log_error "  pm2 logs epstein-archive"
    log_error "  pm2 restart epstein-archive"
    log_error "  sqlite3 epstein-archive.db 'PRAGMA integrity_check;'"
    exit 1
fi
