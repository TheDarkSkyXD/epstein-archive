#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

log() { echo "[pg-nuclear] $*"; }
fail() { echo "[pg-nuclear] $*" >&2; exit 1; }

log "Guard: no SQLite remnants in src/"
if grep -rE "better-sqlite3|sqlite|PRAGMA|FTS5|DatabaseBridge|SqliteWrapper" src/; then
  fail "❌ SQLite keywords found in src/"
fi

log "Guard: no legacy DB_DIALECT anywhere in runtime/deploy/CI configs"
if grep -rn "DB_DIALECT" src scripts deploy.sh ecosystem.config.cjs package.json .github/workflows | grep -v "scripts/ci_pg_nuclear_gates.sh"; then
  fail "❌ DB_DIALECT is forbidden"
fi

log "Guard: no raw SQL in route files (health route exception only)"
TMP_ROUTE_SQL="$(mktemp)"
if grep -rn "\.query(" src/server/routes >"$TMP_ROUTE_SQL"; then
  if grep -v "src/server/routes/stats.ts:" "$TMP_ROUTE_SQL" >/dev/null; then
    cat "$TMP_ROUTE_SQL"
    rm -f "$TMP_ROUTE_SQL"
    fail "❌ Raw SQL found in src/server/routes (move to repositories)"
  fi
fi
rm -f "$TMP_ROUTE_SQL"

log "Lint + typecheck"
pnpm lint
pnpm type-check

if [[ -z "${DATABASE_URL:-}" ]]; then
  if [[ "${CI:-}" == "true" || "${CI:-}" == "1" ]]; then
    fail "❌ DATABASE_URL required in CI for PG explain/schema gates"
  fi
  log "DATABASE_URL not set; skipping pg_explain + schema hash gates for local prebuild"
  exit 0
fi

command -v pg_dump >/dev/null 2>&1 || fail "❌ pg_dump is required"
if command -v sha256sum >/dev/null 2>&1; then
  HASH_CMD="sha256sum"
elif command -v shasum >/dev/null 2>&1; then
  HASH_CMD="shasum -a 256"
else
  fail "❌ sha256sum/shasum is required"
fi

log "Schema snapshot hash via pg_dump --schema-only"
TMP_SCHEMA="$(mktemp)"
pg_dump --schema-only --no-owner --no-privileges "$DATABASE_URL" >"$TMP_SCHEMA"
[[ -s "$TMP_SCHEMA" ]] || { rm -f "$TMP_SCHEMA"; fail "❌ Empty schema dump from pg_dump"; }
SCHEMA_SHA="$($HASH_CMD "$TMP_SCHEMA" | awk '{print $1}')"
rm -f "$TMP_SCHEMA"
log "pg_dump schema sha256=${SCHEMA_SHA}"

log "Plan regression gate"
node --import tsx/esm scripts/pg_explain.ts

log "Schema hash baseline gate"
pnpm schema:hash:check

log "✅ All PG nuclear gates passed"
