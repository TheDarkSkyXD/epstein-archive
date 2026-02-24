#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:3012}"

check_status_200() {
  local path="$1"
  local body
  body="$(mktemp)"
  local status
  status=$(curl -sS --max-time 30 -o "$body" -w "%{http_code}" "${BASE_URL}${path}")
  if [[ "$status" != "200" ]]; then
    echo "[ci-pg-smoke] ❌ ${path} returned ${status}"
    cat "$body"
    rm -f "$body"
    exit 1
  fi
  cat "$body"
  rm -f "$body"
}

echo "[ci-pg-smoke] BASE_URL=${BASE_URL}"

echo "[ci-pg-smoke] checking /api/health/ready"
READY_BODY="$(check_status_200 "/api/health/ready")"
echo "$READY_BODY" | grep -Eq '"status"[[:space:]]*:[[:space:]]*"ok"' || {
  echo "[ci-pg-smoke] ❌ readiness response missing status=ok"
  echo "$READY_BODY"
  exit 1
}

echo "[ci-pg-smoke] checking /api/_meta/db"
DB_META="$(check_status_200 "/api/_meta/db")"
echo "$DB_META" | grep -Eq '"dialect"[[:space:]]*:[[:space:]]*"postgres"' || {
  echo "[ci-pg-smoke] ❌ /api/_meta/db does not report postgres dialect"
  echo "$DB_META"
  exit 1
}

echo "[ci-pg-smoke] checking /api/documents"
DOCS_BODY="$(check_status_200 "/api/documents?page=1&limit=2&sortBy=red_flag")"
echo "$DOCS_BODY" | grep -Eq '"documents"[[:space:]]*:|"data"[[:space:]]*:' || {
  echo "[ci-pg-smoke] ❌ /api/documents payload shape unexpected"
  echo "$DOCS_BODY"
  exit 1
}

echo "[ci-pg-smoke] checking /api/media/images"
MEDIA_BODY="$(check_status_200 "/api/media/images?limit=2")"
echo "$MEDIA_BODY" | grep -Eq '"images"[[:space:]]*:|"data"[[:space:]]*:' || {
  echo "[ci-pg-smoke] ❌ /api/media/images payload shape unexpected"
  echo "$MEDIA_BODY"
  exit 1
}

echo "[ci-pg-smoke] checking /api/stats"
STATS_BODY="$(check_status_200 "/api/stats")"
echo "$STATS_BODY" | grep -Eq '"totalEntities"[[:space:]]*:' || {
  echo "[ci-pg-smoke] ❌ /api/stats missing totalEntities"
  echo "$STATS_BODY"
  exit 1
}

echo "[ci-pg-smoke] ✅ PG endpoint smoke passed"
