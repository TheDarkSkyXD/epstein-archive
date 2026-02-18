#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

TARGET="${1:-}"

echo "▶ Starting emergency rollback in $ROOT_DIR"

pm2 stop epstein-archive || true

if [ -n "$TARGET" ] && [ -f "epstein-archive.db.backup-$TARGET" ]; then
  echo "▶ Restoring database from epstein-archive.db.backup-$TARGET"
  mv -f "epstein-archive.db.backup-$TARGET" epstein-archive.db
elif [ -f "epstein-archive.db.bak" ]; then
  echo "▶ Restoring database from epstein-archive.db.bak"
  mv -f epstein-archive.db.bak epstein-archive.db
else
  echo "⚠️  No rollback database file found (continuing with current DB)."
fi

rm -f epstein-archive.db-wal epstein-archive.db-shm epstein-archive.db-journal || true

if [ -f .rollback_commit ]; then
  ROLLBACK_COMMIT="$(cat .rollback_commit)"
  if git cat-file -e "$ROLLBACK_COMMIT^{commit}" 2>/dev/null; then
    echo "▶ Resetting code to $ROLLBACK_COMMIT"
    git reset --hard "$ROLLBACK_COMMIT"
  else
    echo "⚠️  .rollback_commit does not reference a valid commit."
  fi
fi

export PNPM_HOME="${PNPM_HOME:-$HOME/.local/share/pnpm}"
export PATH="$PNPM_HOME:$PATH"
export NODE_ENV=production

pnpm install --frozen-lockfile
pnpm build:prod

pm2 stop epstein-archive || true
pm2 delete epstein-archive || true
rm -f epstein-archive.db-wal epstein-archive.db-shm epstein-archive.db-journal
pm2 start ecosystem.config.cjs --only epstein-archive --env production

READY_RESPONSE=$(curl -sS --max-time 8 -w " HTTP_STATUS:%{http_code}" "http://localhost:3012/api/health/ready" || echo "HTTP_STATUS:000")
READY_STATUS="${READY_RESPONSE##*HTTP_STATUS:}"

if [ "$READY_STATUS" != "200" ]; then
  echo "❌ Rollback completed but readiness failed: $READY_STATUS"
  exit 1
fi

echo "✅ Emergency rollback completed and readiness check passed."
