#!/bin/bash
# scripts/deploy.sh
# CANONICAL DEPLOYMENT SCRIPT
# ===========================
# Single source of truth for deploying changes to production.
# Usage: ./scripts/deploy.sh [--sync-only] [--dry-run]

set -euo pipefail

# Configuration
PRODUCTION_SERVER="glasscode"
PRODUCTION_USER="deploy"
PRODUCTION_PATH="/home/deploy/epstein-archive"
SSH_KEY_PATH="$HOME/.ssh/id_glasscode"
LOCAL_DB="epstein-archive.db"
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
SYNC_ONLY=false
DRY_RUN=false

for arg in "$@"; do
  case $arg in
    --dry-run) DRY_RUN=true ;;
    --sync-only) SYNC_ONLY=true ;;
  esac
done

# ============================================
# PHASE 1: PRE-FLIGHT & DB DEPLOY
# ============================================
log_step "Phase 1: Database Deployment..."

if [ "$DRY_RUN" = true ]; then
  log_warning "DRY RUN: Would run ./scripts/safe_db_upload.sh"
else
  # Use the dedicated safe upload script
  if [ -f "./scripts/safe_db_upload.sh" ]; then
    ./scripts/safe_db_upload.sh
  else
    log_error "Critical: safe_db_upload.sh not found!"
    exit 1
  fi
fi

# ============================================
# PHASE 2: CODE DEPLOYMENT
# ============================================
if [ "$SYNC_ONLY" = true ]; then
  log_warning "Skipping code deployment (--sync-only)"
else
  log_step "Phase 2: Code Deployment..."

  if [ "$DRY_RUN" = true ]; then
    log_warning "DRY RUN: Would build, push, and reload code"
  else
    # 1. Build Local (Verify)
    log_step "Building locally to verify integrity..."
    pnpm build:prod

    # 2. Push Code
    log_step "Pushing code to origin..."
    git push origin main

    # 3. Pull & Reload on Server
    log_step "Updating remote server..."
    ssh -i "$SSH_KEY_PATH" "${PRODUCTION_USER}@${PRODUCTION_SERVER}" "
      set -e
      cd ${PRODUCTION_PATH}
      
      echo 'Forcing Git Sync...'
      git fetch origin
      git reset --hard origin/main
      
      echo 'Installing Dependencies...'
      # Ensure pnpm is available
      export PNPM_HOME=\"/home/deploy/.local/share/pnpm\"
      export PATH=\"\$PNPM_HOME:\$PATH\"
      
      if [ ! -f \"pnpm-lock.yaml\" ]; then
        echo 'Warning: pnpm-lock.yaml not found, this might be unstable!'
      fi
      
      pnpm install --frozen-lockfile
      
      echo 'Building on Server...'
      pnpm build:prod
      
      echo 'Restarting Process...'
      pm2 restart epstein-archive
    "
    log_success "Code updated and restarted"
  fi
fi

# ============================================
# PHASE 3: FINAL VERIFICATION
# ============================================
log_step "Phase 3: Final Health Check..."

if [ "$DRY_RUN" = true ]; then
  log_warning "DRY RUN: Would verify health"
else
  HEALTH_RESPONSE=$(ssh -i "$SSH_KEY_PATH" "${PRODUCTION_USER}@${PRODUCTION_SERVER}" "curl -s localhost:3012/api/health")

  if echo "$HEALTH_RESPONSE" | grep -q '"status":"healthy"'; then
    log_success "Deployment Successfully Verified!"
    echo "Summary Stats:"
    echo "$HEALTH_RESPONSE" | jq '{version: .version, documents: .documents, entities: .entities}'
  else
    log_error "Deployment Verification Failed!"
    echo "Response: $HEALTH_RESPONSE"
    exit 1
  fi
fi

echo ""
echo -e "${GREEN}DEPLOYMENT COMPLETE${NC}"
