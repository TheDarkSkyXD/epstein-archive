#!/bin/bash
# deploy.sh
# Canonical deployment script for production
# Usage: ./deploy.sh [--code-only] [--db-only] [--with-db] [--dry-run] [--skip-integrity]

set -euo pipefail

# Configuration
PRODUCTION_USER="deploy"
PRODUCTION_HOST="194.195.248.217"
PRODUCTION_PATH="/home/deploy/epstein-archive"
SSH_KEY_PATH="$HOME/.ssh/id_glasscode"
LOCAL_DB="epstein-archive.db"
REMOTE_TEMP="${PRODUCTION_PATH}/epstein-archive.db.new"

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

verify_release_notes_version() {
  local current_version
  current_version=$(sed -n 's/.*"version":[[:space:]]*"\([^"]*\)".*/\1/p' package.json | head -n 1)

  if [ -z "$current_version" ]; then
    log_error "Could not read version from package.json"
    exit 1
  fi

  if ! head -n 20 release_notes.md | grep -Eq "^##[[:space:]]+v?${current_version}([[:space:]]+-|[[:space:]]+—)"; then
    log_error "release_notes.md must be updated for v${current_version} before deploy."
    log_error "Expected top section heading like: ## ${current_version} - YYYY-MM-DD"
    exit 1
  fi

  log_success "Release notes include v${current_version}."
}

remote_pm2_reload_cmd() {
  cat <<'CMD'
set -e
cd /home/deploy/epstein-archive
pm2 startOrReload ecosystem.config.cjs --only epstein-archive --env production || {
  pm2 delete epstein-archive || true
  pm2 start ecosystem.config.cjs --only epstein-archive --env production
}
CMD
}

# Runtime flags (used by trap/rollback)
DEPLOY_MUTATION_STARTED=false
ROLLBACK_IN_PROGRESS=false

# Parse args
CODE_ONLY=false
DB_ONLY=false
DEPLOY_DB=false
DRY_RUN=false
SKIP_INTEGRITY=false

for arg in "$@"; do
  case $arg in
    --dry-run) DRY_RUN=true ;;
    --code-only) CODE_ONLY=true ;;
    --db-only) DB_ONLY=true; DEPLOY_DB=true ;;
    --with-db) DEPLOY_DB=true ;;
    --skip-integrity) SKIP_INTEGRITY=true ;;
    *) log_error "Unknown argument: $arg"; exit 1 ;;
  esac
done

if [ "$CODE_ONLY" = true ] && [ "$DB_ONLY" = true ]; then
  log_error "Cannot specify both --code-only and --db-only"
  exit 1
fi

if [ "$CODE_ONLY" = true ]; then
  DEPLOY_DB=false
fi

perform_rollback() {
  if [ "$ROLLBACK_IN_PROGRESS" = true ]; then
    return
  fi
  ROLLBACK_IN_PROGRESS=true
  trap - ERR

  log_warning "Initiating automatic rollback..."

  ssh -i "$SSH_KEY_PATH" "${PRODUCTION_USER}@${PRODUCTION_HOST}" "
    set -e
    cd ${PRODUCTION_PATH}

    echo 'Stopping service...'
    pm2 stop epstein-archive || true

    if [ \"$DEPLOY_DB\" = true ] && [ -f epstein-archive.db.bak ]; then
      echo 'Restoring database backup...'
      mv -f epstein-archive.db.bak epstein-archive.db
      rm -f epstein-archive.db-wal epstein-archive.db-shm epstein-archive.db-journal
    fi

    if [ \"$DB_ONLY\" = false ] && [ -f .rollback_commit ]; then
      TARGET=\$(cat .rollback_commit)
      echo \"Rolling back code to \$TARGET...\"
      git reset --hard \$TARGET

      export PNPM_HOME=\"/home/deploy/.local/share/pnpm\"
      export PATH=\"\$PNPM_HOME:\$PATH\"
      export NODE_ENV=production
      pnpm install --frozen-lockfile
      pnpm build:prod
    fi
  "

  ssh -i "$SSH_KEY_PATH" "${PRODUCTION_USER}@${PRODUCTION_HOST}" "$(remote_pm2_reload_cmd)"

  log_success "Rollback completed."
}

on_error() {
  local line="$1"
  log_error "Deployment failed at line $line"

  if [ "$DRY_RUN" = false ] && [ "$DEPLOY_MUTATION_STARTED" = true ]; then
    perform_rollback || true
  fi

  exit 1
}

trap 'on_error $LINENO' ERR

# ============================================
# PRE-FLIGHT (all non-mutating checks first)
# ============================================
if [ "$DRY_RUN" = false ] && [ "$DB_ONLY" = false ]; then
  log_step "Running pre-flight QA (format, lint, release notes, clean tree, build)..."

  pnpm format:check || {
    log_error "Format check failed. Run 'pnpm format' and commit intentionally."
    exit 1
  }

  pnpm lint || {
    log_error "Lint failed. Fix issues locally and commit intentionally."
    exit 1
  }

  verify_release_notes_version

  if [ -n "$(git status --porcelain)" ]; then
    log_error "Working tree is dirty. Commit or stash changes before deploy."
    git status --short
    exit 1
  fi

  log_step "Building locally to verify integrity..."
  pnpm build:prod

  log_step "Pushing code to origin..."
  git push origin main --no-verify
fi

# ============================================
# PHASE 1: DATABASE DEPLOYMENT (opt-in for full deploy)
# ============================================
if [ "$DEPLOY_DB" = true ]; then
  log_step "Phase 1: Database deployment..."

  if [ "$DRY_RUN" = true ]; then
    log_warning "DRY RUN: Would upload and swap database"
  else
    if [ ! -f "$LOCAL_DB" ]; then
      log_error "Local database file not found: $LOCAL_DB"
      exit 1
    fi

    SNAPSHOT_DB="${LOCAL_DB}.snapshot"
    log_step "Creating consistent local snapshot..."
    rm -f "$SNAPSHOT_DB"
    sqlite3 "$LOCAL_DB" ".backup '$SNAPSHOT_DB'"

    if [ "$SKIP_INTEGRITY" = true ]; then
      log_warning "Skipping local integrity check (--skip-integrity)"
    else
      log_step "Running local PRAGMA integrity_check..."
      if ! sqlite3 "$SNAPSHOT_DB" "PRAGMA integrity_check;" | grep -q "^ok$"; then
        log_error "Snapshot integrity check failed."
        rm -f "$SNAPSHOT_DB"
        exit 1
      fi
      log_success "Local integrity check passed."
    fi

    DEPLOY_MUTATION_STARTED=true

    log_step "Uploading snapshot to remote temp path..."
    rsync -az --progress -e "ssh -i $SSH_KEY_PATH" "$SNAPSHOT_DB" "${PRODUCTION_USER}@${PRODUCTION_HOST}:${REMOTE_TEMP}"
    rm -f "$SNAPSHOT_DB"

    log_step "Running remote PRAGMA integrity_check..."
    ssh -i "$SSH_KEY_PATH" "${PRODUCTION_USER}@${PRODUCTION_HOST}" "sqlite3 $REMOTE_TEMP 'PRAGMA integrity_check;' | grep -q '^ok$'"

    log_step "Swapping database on remote host..."
    ssh -i "$SSH_KEY_PATH" "${PRODUCTION_USER}@${PRODUCTION_HOST}" "
      set -e
      cd ${PRODUCTION_PATH}
      pm2 stop epstein-archive || true
      sleep 2
      rm -f epstein-archive.db-wal epstein-archive.db-shm epstein-archive.db-journal
      cp -f epstein-archive.db epstein-archive.db.bak
      mv -f epstein-archive.db.new epstein-archive.db
    "

    if [ "$DB_ONLY" = true ]; then
      ssh -i "$SSH_KEY_PATH" "${PRODUCTION_USER}@${PRODUCTION_HOST}" "$(remote_pm2_reload_cmd)"
    fi

    log_success "Database swap complete."
  fi
else
  log_step "Skipping database deployment (use --with-db or --db-only to deploy DB)"
fi

# ============================================
# PHASE 2: CODE DEPLOYMENT
# ============================================
if [ "$DB_ONLY" = false ]; then
  log_step "Phase 2: Code deployment..."

  if [ "$DRY_RUN" = true ]; then
    log_warning "DRY RUN: Would update code/build on remote and restart PM2"
  else
    DEPLOY_MUTATION_STARTED=true

    ssh -i "$SSH_KEY_PATH" "${PRODUCTION_USER}@${PRODUCTION_HOST}" "
      set -e
      cd ${PRODUCTION_PATH}

      echo 'Saving rollback commit...'
      git rev-parse HEAD > .rollback_commit

      echo 'Syncing code from origin/main...'
      git fetch origin
      git reset --hard origin/main

      export PNPM_HOME=\"/home/deploy/.local/share/pnpm\"
      export PATH=\"\$PNPM_HOME:\$PATH\"
      export NODE_ENV=production

      pnpm install --frozen-lockfile
      pnpm build:prod
    "

    ssh -i "$SSH_KEY_PATH" "${PRODUCTION_USER}@${PRODUCTION_HOST}" "$(remote_pm2_reload_cmd)"
    log_success "Code deployment complete."
  fi
else
  log_step "Skipping code deployment (--db-only)"
fi

# ============================================
# PHASE 3: HEALTH CHECK
# ============================================
if [ "$DRY_RUN" = false ]; then
  MAX_RETRIES=12
  COUNT=0
  SUCCESS=false

  log_step "Waiting for service to stabilize (up to 60s)..."

  while [ $COUNT -lt $MAX_RETRIES ]; do
    sleep 5

    READY=$(ssh -i "$SSH_KEY_PATH" "${PRODUCTION_USER}@${PRODUCTION_HOST}" "curl -sS --max-time 6 -w ' HTTP_STATUS:%{http_code}' http://localhost:3012/api/health/ready" || echo "HTTP_STATUS:000")
    READY_STATUS="${READY##*HTTP_STATUS:}"
    READY_BODY="${READY% HTTP_STATUS:*}"

    DEEP=$(ssh -i "$SSH_KEY_PATH" "${PRODUCTION_USER}@${PRODUCTION_HOST}" "curl -sS --max-time 10 -w ' HTTP_STATUS:%{http_code}' http://localhost:3012/api/stats/health/deep" || echo "HTTP_STATUS:000")
    DEEP_STATUS="${DEEP##*HTTP_STATUS:}"

    if [ "$READY_STATUS" = "200" ] && echo "$READY_BODY" | grep -Eq '"status"[[:space:]]*:[[:space:]]*"ok"' && [ "$DEEP_STATUS" = "200" ]; then
      SUCCESS=true
      break
    fi

    log_step "Attempt $((COUNT+1))/$MAX_RETRIES: ready=$READY_STATUS deep=$DEEP_STATUS"
    COUNT=$((COUNT+1))
  done

  if [ "$SUCCESS" = true ]; then
    log_success "Deployment successful (ready + deep health checks passed)."
  else
    log_error "Health checks failed after $MAX_RETRIES attempts."
    perform_rollback
    exit 1
  fi
fi
