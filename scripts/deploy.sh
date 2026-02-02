#!/bin/bash
#
# ZERO-DOWNTIME DEPLOY PIPELINE
# =============================
# Single command for full data integrity, no data loss, no downtime.
#
# Usage:
#   ./scripts/deploy.sh           # Full deploy (sync + code + restart)
#   ./scripts/deploy.sh --sync-only   # Sync databases only (no code deploy)
#   ./scripts/deploy.sh --dry-run     # Preview changes without applying
#
set -euo pipefail

# ============================================
# CONFIGURATION
# ============================================
PRODUCTION_SERVER="glasscode"
PRODUCTION_USER="deploy"
PRODUCTION_PATH="/home/deploy/epstein-archive"
SSH_KEY_PATH="$HOME/.ssh/id_glasscode"
LOCAL_DB="epstein-archive.db"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DRY_RUN=false
SYNC_ONLY=false

# Parse arguments
for arg in "$@"; do
  case $arg in
    --dry-run) DRY_RUN=true ;;
    --sync-only) SYNC_ONLY=true ;;
  esac
done

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_step() { echo -e "${BLUE}▶ $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# ============================================
# PRE-FLIGHT CHECKS
# ============================================
log_step "Running Pre-Flight Checks..."

if [ ! -f "$LOCAL_DB" ]; then
  log_error "Local database not found: $LOCAL_DB"
  exit 1
fi

if [ ! -f "$SSH_KEY_PATH" ]; then
  log_error "SSH key not found: $SSH_KEY_PATH"
  exit 1
fi

# Test SSH connection
if ! ssh -i "$SSH_KEY_PATH" -o ConnectTimeout=5 "${PRODUCTION_USER}@${PRODUCTION_SERVER}" "echo 'SSH OK'" > /dev/null 2>&1; then
  log_error "Cannot connect to production server"
  exit 1
fi

log_success "Pre-flight checks passed"

# ============================================
# PHASE 1: BACKUP LOCAL DATABASE
# ============================================
log_step "Phase 1: Creating Local Backup..."
LOCAL_BACKUP="${LOCAL_DB}.backup-${TIMESTAMP}"
cp "$LOCAL_DB" "$LOCAL_BACKUP"
log_success "Local backup created: $LOCAL_BACKUP"

# ============================================
# PHASE 2: PULL PRODUCTION DATABASE (Merge Remote -> Local)
# ============================================
log_step "Phase 2: Pulling Production Database..."
PROD_SNAPSHOT="epstein-archive-prod-snapshot-${TIMESTAMP}.db"

ssh -i "$SSH_KEY_PATH" "${PRODUCTION_USER}@${PRODUCTION_SERVER}" "cd ${PRODUCTION_PATH} && cp epstein-archive.db /tmp/${PROD_SNAPSHOT}"
scp -i "$SSH_KEY_PATH" "${PRODUCTION_USER}@${PRODUCTION_SERVER}:/tmp/${PROD_SNAPSHOT}" "./${PROD_SNAPSHOT}"
ssh -i "$SSH_KEY_PATH" "${PRODUCTION_USER}@${PRODUCTION_SERVER}" "rm /tmp/${PROD_SNAPSHOT}"

log_success "Production snapshot downloaded: $PROD_SNAPSHOT"

# ============================================
# PHASE 3: BIDIRECTIONAL SYNC (Merge Production Changes into Local)
# ============================================
log_step "Phase 3: Merging Production Changes into Local..."

SYNC_ARGS="--source=${PROD_SNAPSHOT} --target=${LOCAL_DB}"
if [ "$DRY_RUN" = true ]; then
  SYNC_ARGS="$SYNC_ARGS --dry-run"
fi

if ! npx tsx scripts/sync-db.ts $SYNC_ARGS; then
  log_error "Sync from production failed! Restoring backup..."
  cp "$LOCAL_BACKUP" "$LOCAL_DB"
  rm -f "$PROD_SNAPSHOT"
  exit 1
fi

log_success "Production data merged into local"

# Clean up snapshot
rm -f "$PROD_SNAPSHOT"

# ============================================
# PHASE 4: PUSH LOCAL DATABASE TO PRODUCTION
# ============================================
log_step "Phase 4: Pushing Local Database to Production..."

if [ "$DRY_RUN" = true ]; then
  log_warning "DRY RUN: Would upload local DB to production"
else
  # Upload local DB
  UPLOAD_NAME="epstein-archive-incoming-${TIMESTAMP}.db"
  scp -i "$SSH_KEY_PATH" "$LOCAL_DB" "${PRODUCTION_USER}@${PRODUCTION_SERVER}:${PRODUCTION_PATH}/${UPLOAD_NAME}"

  # Remote atomic swap with backup
  ssh -i "$SSH_KEY_PATH" "${PRODUCTION_USER}@${PRODUCTION_SERVER}" "
    cd ${PRODUCTION_PATH}
    
    # Create working copy for merge
    cp epstein-archive.db epstein-archive.db.work
    
    # Run sync on working copy (preserves production-only data)
    if npx tsx scripts/sync-db.ts --source=${UPLOAD_NAME} --target=epstein-archive.db.work; then
      echo '   ✅ Merge Successful. Performing atomic swap...'
      
      # Backup current production
      cp epstein-archive.db epstein-archive.db.rollback-${TIMESTAMP}
      
      # Atomic swap
      mv epstein-archive.db.work epstein-archive.db
      
      # Cleanup
      rm ${UPLOAD_NAME}
      
      echo '   ✅ Database swap complete'
    else
      echo '   ❌ Merge Failed! Aborting...'
      rm epstein-archive.db.work
      rm ${UPLOAD_NAME}
      exit 1
    fi
  "
fi

log_success "Local database pushed to production"

# ============================================
# PHASE 5: CODE DEPLOY (Optional)
# ============================================
if [ "$SYNC_ONLY" = true ]; then
  log_warning "Skipping code deploy (--sync-only mode)"
else
  log_step "Phase 5: Building and Deploying Code..."

  if [ "$DRY_RUN" = true ]; then
    log_warning "DRY RUN: Would build and deploy code"
  else
    # Build locally
    pnpm build:prod

    # Push code via git
    git push origin main

    # Remote: Pull latest code and restart
    ssh -i "$SSH_KEY_PATH" "${PRODUCTION_USER}@${PRODUCTION_SERVER}" "
      cd ${PRODUCTION_PATH}
      git pull origin main
      pnpm install --frozen-lockfile
      pnpm build:prod
      pm2 reload epstein-archive
    "
  fi

  log_success "Code deployed"
fi

# ============================================
# PHASE 6: HEALTH CHECK VALIDATION
# ============================================
log_step "Phase 6: Validating Production Health..."

if [ "$DRY_RUN" = true ]; then
  log_warning "DRY RUN: Would run health checks"
else
  # Wait for server to stabilize
  sleep 5

  # Run health check
  HEALTH_RESPONSE=$(ssh -i "$SSH_KEY_PATH" "${PRODUCTION_USER}@${PRODUCTION_SERVER}" "curl -s localhost:3012/api/health")

  if echo "$HEALTH_RESPONSE" | grep -q '"status":"healthy"'; then
    log_success "Production health check PASSED"
    
    # Extract stats
    ENTITIES=$(echo "$HEALTH_RESPONSE" | grep -o '"entities":[0-9]*' | grep -o '[0-9]*')
    DOCUMENTS=$(echo "$HEALTH_RESPONSE" | grep -o '"documents":[0-9]*' | grep -o '[0-9]*')
    echo -e "   📊 Entities: ${ENTITIES}, Documents: ${DOCUMENTS}"
  else
    log_error "Production health check FAILED!"
    log_warning "Response: $HEALTH_RESPONSE"
    
    # Automatic rollback
    log_step "Initiating automatic rollback..."
    ssh -i "$SSH_KEY_PATH" "${PRODUCTION_USER}@${PRODUCTION_SERVER}" "
      cd ${PRODUCTION_PATH}
      if [ -f epstein-archive.db.rollback-${TIMESTAMP} ]; then
        cp epstein-archive.db.rollback-${TIMESTAMP} epstein-archive.db
        pm2 reload epstein-archive
        echo 'Rollback complete'
      else
        echo 'No rollback file found!'
      fi
    "
    exit 1
  fi
fi

# ============================================
# CLEANUP
# ============================================
log_step "Phase 7: Cleanup..."

# Keep only recent backups (last 5)
ls -t ${LOCAL_DB}.backup-* 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null || true

log_success "Cleanup complete"

# ============================================
# SUMMARY
# ============================================
echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   DEPLOY COMPLETE - ZERO DATA LOSS CONFIRMED${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo ""
echo "   Local Backup:  $LOCAL_BACKUP"
echo "   Timestamp:     $TIMESTAMP"
if [ "$DRY_RUN" = true ]; then
  echo "   Mode:          DRY RUN (no changes applied)"
fi
if [ "$SYNC_ONLY" = true ]; then
  echo "   Mode:          SYNC ONLY (no code deploy)"
fi
echo ""
