#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

log() { echo "[pg-nuclear] $*"; }
fail() { echo "[pg-nuclear] $*" >&2; exit 1; }
is_ci() { [[ "${CI:-}" == "true" || "${CI:-}" == "1" ]]; }
have_rg() { command -v rg >/dev/null 2>&1; }

log "Guard: no SQLite remnants in src/"
if grep -rE "better-sqlite3|sqlite|PRAGMA|FTS5|DatabaseBridge|SqliteWrapper" src/; then
  fail "❌ SQLite keywords found in src/"
fi

log "Guard: no legacy DB_DIALECT anywhere in runtime/deploy/CI configs"
if grep -rn "DB_DIALECT" src scripts deploy.sh ecosystem.config.cjs package.json .github/workflows \
  | grep -v "scripts/ci_pg_nuclear_gates.sh" \
  | grep -v "Legacy DB_DIALECT is set in remote .env"; then
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

log "Guard: no pgtyped/db namespace executor misuse in repositories"
TMP_PGTYPED_DB="$(mktemp)"
if have_rg; then
  rg -n "db\\.apiPool" src/server/db >"$TMP_PGTYPED_DB" || true
else
  grep -rEn "db\\.apiPool" src/server/db >"$TMP_PGTYPED_DB" || true
fi
if [[ -s "$TMP_PGTYPED_DB" ]]; then
  cat "$TMP_PGTYPED_DB"
  rm -f "$TMP_PGTYPED_DB"
  fail "❌ Repository DB calls must use getApiPool() (no db.apiPool)"
fi
if have_rg; then
  rg -nUP "\.run\([\s\S]{0,600},\s*db\s*\)" src/server/db >>"$TMP_PGTYPED_DB" || true
else
  find src/server/db -type f \( -name '*.ts' -o -name '*.tsx' \) -print0 \
    | xargs -0 perl -0777 -ne 'print "$ARGV\n" if /\.run\([\s\S]{0,600},\s*db\s*\)/' \
    >>"$TMP_PGTYPED_DB" || true
fi
if [[ -s "$TMP_PGTYPED_DB" ]]; then
  cat "$TMP_PGTYPED_DB"
  rm -f "$TMP_PGTYPED_DB"
  fail "❌ Repository DB calls must use getApiPool() (no pgtyped .run(..., db))"
fi
rm -f "$TMP_PGTYPED_DB"

log "Guard: documents SQL hotfix parity"
node --import tsx/esm scripts/check_documents_sql_parity.ts

log "Lint + typecheck"
pnpm lint
pnpm type-check

if [[ -z "${DATABASE_URL:-}" ]]; then
  if is_ci; then
    fail "❌ DATABASE_URL required in CI for PG explain/schema gates"
  fi
  log "DATABASE_URL not set; skipping pg_explain + schema hash gates for local prebuild"
  exit 0
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  log "pg_dump not installed locally; skipping DB-backed gates (pg_explain/schema hash/pg_dump snapshot)"
  exit 0
fi
if command -v sha256sum >/dev/null 2>&1; then
  HASH_CMD="sha256sum"
elif command -v shasum >/dev/null 2>&1; then
  HASH_CMD="shasum -a 256"
else
  if is_ci; then
    fail "❌ sha256sum/shasum is required"
  fi
  log "sha256 tool not installed locally; skipping DB-backed gates"
  exit 0
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
