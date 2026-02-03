#!/bin/bash
# scripts/safe_db_upload.sh
# Safely uploads the SQLite database to production using atomic swap pattern.
# Prevents corruption by ensuring the file is fully uploaded and verified before use.

set -e

# Configuration
PRODUCTION_SERVER="glasscode"
PRODUCTION_USER="deploy"
PRODUCTION_HOST="194.195.248.217"
PRODUCTION_PATH="/home/deploy/epstein-archive"
SSH_KEY_PATH="$HOME/.ssh/id_glasscode"
LOCAL_DB="epstein-archive.db"
REMOTE_TEMP="${PRODUCTION_PATH}/epstein-archive.db.new"
REMOTE_TARGET="${PRODUCTION_PATH}/epstein-archive.db"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 1. Verification
log "Checking local database integrity..."
if ! sqlite3 "$LOCAL_DB" "PRAGMA integrity_check;" | grep -q "ok"; then
  error "Local database is corrupt! Aborting upload."
  exit 1
fi
success "Local integrity check passed."

# 2. Upload to temporary file
log "Uploading to temporary file ($REMOTE_TEMP)..."
rsync -avz --progress -e "ssh -i $SSH_KEY_PATH" "$LOCAL_DB" "${PRODUCTION_USER}@${PRODUCTION_HOST}:${REMOTE_TEMP}"

# 3. Verify remote integrity
log "Verifying remote temporary file integrity..."
if ssh -i "$SSH_KEY_PATH" "${PRODUCTION_USER}@${PRODUCTION_HOST}" "sqlite3 $REMOTE_TEMP 'PRAGMA integrity_check;' | grep -q 'ok'"; then
  success "Remote integrity check passed."
else
  error "Remote file integrity check failed! Upload may be corrupt."
  exit 1
fi

# 4. Atomic Swap
log "Performing atomic swap..."
ssh -i "$SSH_KEY_PATH" "${PRODUCTION_USER}@${PRODUCTION_HOST}" "
  set -e
  cd ${PRODUCTION_PATH}
  
  echo 'Stopping application...'
  pm2 stop epstein-archive
  
  echo 'Removing stale WAL/Journal files...'
  rm -f epstein-archive.db-wal epstein-archive.db-shm
  
  echo 'Backing up current database...'
  mv epstein-archive.db epstein-archive.db.bak || true
  
  echo 'Swapping in new database...'
  mv epstein-archive.db.new epstein-archive.db
  
  echo 'Restarting application...'
  pm2 start epstein-archive
"

# 5. Health Check
log "Waiting for service to stabilize..."
sleep 5
log "Checking API health..."
HTTP_STATUS=$(ssh -i "$SSH_KEY_PATH" "${PRODUCTION_USER}@${PRODUCTION_HOST}" "curl -s -o /dev/null -w \"%{http_code}\" http://localhost:3012/api/health")

if [ "$HTTP_STATUS" == "200" ]; then
  success "Deployment successful! API is responding (Status: $HTTP_STATUS)."
else
  error "Deployment completed but API returned status $HTTP_STATUS. Please check logs."
  exit 1
fi
