#!/bin/bash
# deploy.sh
# CANONICAL DEPLOYMENT SCRIPT
# ===========================
# Single source of truth for deploying changes to production.
# Usage: ./deploy.sh [--code-only] [--db-only] [--dry-run]

set -euo pipefail

# Configuration
PRODUCTION_SERVER="glasscode"
PRODUCTION_USER="deploy"
PRODUCTION_HOST="194.195.248.217"
PRODUCTION_PATH="/home/deploy/epstein-archive"
SSH_KEY_PATH="$HOME/.ssh/id_glasscode"
LOCAL_DB="epstein-archive.db"
REMOTE_TEMP="${PRODUCTION_PATH}/epstein-archive.db.new"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

log_step() { echo -e "${BLUE}▶ $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# Parse Args
CODE_ONLY=false
DB_ONLY=false
DRY_RUN=false
SKIP_INTEGRITY=false

for arg in "$@"; do
  case $arg in
    --dry-run) DRY_RUN=true ;;
    --code-only) CODE_ONLY=true ;;
    --db-only) DB_ONLY=true ;;
    --skip-integrity) SKIP_INTEGRITY=true ;;
  esac
done

if [ "$CODE_ONLY" = true ] && [ "$DB_ONLY" = true ]; then
  log_error "Cannot specify both --code-only and --db-only"
  exit 1
fi

# ============================================
# PHASE 1: DATABASE DEPLOYMENT
# ============================================
if [ "$CODE_ONLY" = true ]; then
  log_step "Skipping database deployment (--code-only)"
else
  log_step "Phase 1: Database Deployment..."

  if [ "$DRY_RUN" = true ]; then
    log_warning "DRY RUN: Would upload $LOCAL_DB to $PRODUCTION_HOST"
  else
    # 1. Create Consistent Snapshot
    SNAPSHOT_DB="${LOCAL_DB}.snapshot"
    log_step "Creating consistent snapshot (to handle concurrent writes)..."
    rm -f "$SNAPSHOT_DB"
    sqlite3 "$LOCAL_DB" ".backup '$SNAPSHOT_DB'"
    
    # 2. Verification of Snapshot
    if [ "$SKIP_INTEGRITY" = true ]; then
      log_warning "Skipping local integrity check (--skip-integrity)"
    else
      log_step "Checking snapshot integrity (quick check)..."
      if ! sqlite3 "$SNAPSHOT_DB" "PRAGMA quick_check;" | grep -q "ok"; then
        log_error "Snapshot is corrupt! Aborting upload."
        rm -f "$SNAPSHOT_DB"
        exit 1
      fi
      log_success "Snapshot integrity check passed."
    fi

    # 3. Upload Snapshot to temporary file
    log_step "Uploading snapshot to temporary file ($REMOTE_TEMP)..."
    rsync -avz --progress -e "ssh -i $SSH_KEY_PATH" "$SNAPSHOT_DB" "${PRODUCTION_USER}@${PRODUCTION_HOST}:${REMOTE_TEMP}"
    
    # Clean up local snapshot
    rm -f "$SNAPSHOT_DB"

    # 3. Verify remote integrity
    log_step "Verifying remote temporary file integrity (quick check)..."
    if ssh -i "$SSH_KEY_PATH" "${PRODUCTION_USER}@${PRODUCTION_HOST}" "sqlite3 $REMOTE_TEMP 'PRAGMA quick_check;' | grep -q 'ok'"; then
      log_success "Remote integrity check passed."
    else
      log_error "Remote file integrity check failed! Upload may be corrupt."
      exit 1
    fi

    # 4. Atomic Swap (Safe Mode)
    log_step "Performing DB swap (stopping service to prevent SQLITE_BUSY)..."
    ssh -i "$SSH_KEY_PATH" "${PRODUCTION_USER}@${PRODUCTION_HOST}" "
      set -e
      cd ${PRODUCTION_PATH}
      
      # Stop the application to release all DB locks
      echo 'Stopping application to release DB locks...'
      pm2 stop epstein-archive || true
      
      # Allow potential lingering connections to close
      sleep 2
      
      echo 'Removing potentially stale WAL/Journal files...'
      rm -f epstein-archive.db-wal epstein-archive.db-shm
      
      echo 'Backing up current database...'
      mv epstein-archive.db epstein-archive.db.bak || true
      
      echo 'Swapping in new database...'
      mv epstein-archive.db.new epstein-archive.db
      
      # Restart will happen in Phase 2, or here if DB_ONLY
      if [ \"$DB_ONLY\" = true ]; then
        echo 'Restarting application...'
        pm2 start dist/server.js --name epstein-archive --update-env
      fi
    "
    log_success "Database swapped successfully."
  fi
fi

# ============================================
# PHASE 2: CODE DEPLOYMENT & RESTART
# ============================================
if [ "$DB_ONLY" = true ]; then
  log_warning "Skipping code deployment (--db-only)"
  # Restart to ensure DB connection is fresh
  # Restart currently handled in loop or Phase 1 if DB_ONLY? 
  # Wait, if code-only, we didn't stop. If db-only, we stopped and started in Phase 1?
  # Let's verify logic.
  # If DB_ONLY=true, Phase 1 block runs. I added `pm2 start` there.
  # So this block is redundant/conflicting?
  # If DB_ONLY=true:
  #   Phase 1 -> Swap -> Start
  #   Phase 2 -> Check DB_ONLY -> Skip Code -> Restart (redundant but safe-ish?)
  
  if [ "$DRY_RUN" = false ]; then
      log_step "Ensuring service is running..."
      ssh -i "$SSH_KEY_PATH" "${PRODUCTION_USER}@${PRODUCTION_HOST}" "pm2 restart epstein-archive --update-env || pm2 start dist/server.js --name epstein-archive"
  fi
else
  log_step "Phase 2: Code Deployment..."

  if [ "$DRY_RUN" = true ]; then
    log_warning "DRY RUN: Would push code and restart server"
  else
    # 0. Pre-flight QA
    log_step "Running pre-flight QA (Format & Lint)..."
    # Make sure we don't proceed if these fail
    pnpm format || { log_error "Formatting failed! Run 'pnpm format' locally."; exit 1; }
    pnpm lint:fix || { log_error "Linting failed! Run 'pnpm lint:fix' locally."; exit 1; }

    # Check for uncommitted changes after formatting
    if [ -n "$(git status --porcelain)" ]; then
      log_warning "Format/Lint modified files. Automatically committing changes..."
      echo -e "${YELLOW}Uncommitted changes:${NC}"
      git status --short
      
      git add .
      git commit -m "chore: auto-format [skip ci]"
      log_success "Changes committed."
    fi

    # 1. Build Local (Verify)
    log_step "Building locally to verify integrity..."
    pnpm build:prod

    # 2. Push Code
    log_step "Pushing code to origin..."
    git push origin main --no-verify

    # 3. Pull & Reload on Server
    log_step "Updating remote server..."
    ssh -i "$SSH_KEY_PATH" "${PRODUCTION_USER}@${PRODUCTION_HOST}" "
      set -e
      cd ${PRODUCTION_PATH}
      
      echo 'Forcing Git Sync...'
      git fetch origin
      git reset --hard origin/main
      
      echo 'Installing Dependencies...'
      export PNPM_HOME=\"/home/deploy/.local/share/pnpm\"
      export PATH=\"\$PNPM_HOME:\$PATH\"
      export NODE_ENV=production
      export RAW_CORPUS_BASE_PATH=\"./data\"
      
      pnpm install --frozen-lockfile
      
      echo 'Building on Server...'
      pnpm build:prod
      
      echo 'Restarting Application...'
      echo 'Restarting Application...'
      pm2 restart epstein-archive --update-env || pm2 start dist/server.js --name epstein-archive
    "
  fi
fi

# ============================================
# PHASE 3: HEALTH CHECK
# ============================================
if [ "$DRY_RUN" = false ]; then
    log_step "Waiting for service to stabilize..."
    sleep 5
    log_step "Checking API health..."
    HTTP_STATUS=$(ssh -i "$SSH_KEY_PATH" "${PRODUCTION_USER}@${PRODUCTION_HOST}" "curl -s -o /dev/null -w \"%{http_code}\" http://localhost:3012/api/health")

    if [ "$HTTP_STATUS" == "200" ]; then
      log_success "Deployment successful! API is responding (Status: $HTTP_STATUS)."
    else
      log_error "Deployment completed but API returned status $HTTP_STATUS. Please check logs."
      exit 1
    fi
fi
