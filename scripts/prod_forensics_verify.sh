#!/usr/bin/env bash
set -euo pipefail

APP_PORT="${APP_PORT:-3012}"
APP_URL="${APP_URL:-http://localhost:${APP_PORT}}"

echo "== Phase 0: Runtime =="
uname -a || true
node -v || true
pnpm -v || npm -v || true
pm2 ls || true
pm2 describe epstein-archive || true
printenv | sort | rg "DATABASE_URL|API_|NODE_ENV|PORT|PG|POSTGRES" || true
ss -lntp | rg ":3012|:5432|:5435" || true

echo
echo "== Phase 0: HTTP smoke =="
curl -sv "${APP_URL}/api/health/ready" || true
curl -sv "${APP_URL}/api/_meta/db" || true

echo
echo "== Phase 0: Logs (PM2) =="
tail -n 200 ~/.pm2/logs/*out*.log || true
tail -n 200 ~/.pm2/logs/*error*.log || true

if [[ -f .env ]]; then
  set -a
  source .env
  set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "❌ DATABASE_URL missing after sourcing .env"
  exit 1
fi

echo
echo "== Phase 1: Postgres connectivity and load =="
psql "$DATABASE_URL" -c "SELECT version(), now();"
psql "$DATABASE_URL" -c "SELECT * FROM pgmigrations ORDER BY run_on DESC LIMIT 20;"
psql "$DATABASE_URL" -c "SELECT now(), state, count(*) FROM pg_stat_activity GROUP BY 1,2 ORDER BY 2;"
psql "$DATABASE_URL" -c "SELECT count(*) FILTER (WHERE wait_event IS NOT NULL) AS waiting, count(*) AS total FROM pg_stat_activity;"
psql "$DATABASE_URL" -c "SELECT * FROM pg_stat_activity WHERE state='idle in transaction' AND now()-state_change > interval '3 seconds';"

echo
echo "== Phase 6: Required proof checks =="
curl -sf "${APP_URL}/api/health/ready" | jq .
curl -sf "${APP_URL}/api/_meta/db" | jq .
curl -I "${APP_URL}/api/search?q=epstein" | rg "X-DB-Dialect|X-Request-Id" || true

echo
echo "== No SQLite in src/ =="
rg -n "better-sqlite3|sqlite|PRAGMA|FTS5|DatabaseBridge|SqliteWrapper" src/ || true

echo
echo "✅ prod_forensics_verify completed"
