#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:3012}"

check_case() {
  local label="$1"
  local path="$2"
  local expected_codes="$3"
  local body_pattern="${4:-}"

  local body
  body="$(mktemp)"
  local status
  status=$(curl -sS --max-time 30 -o "$body" -w "%{http_code}" "${BASE_URL}${path}")

  if ! echo ",${expected_codes}," | grep -q ",${status},"; then
    echo "[ci-pg-matrix] ❌ ${label} ${path} returned ${status} (expected one of ${expected_codes})"
    cat "$body"
    rm -f "$body"
    exit 1
  fi

  if [[ -n "$body_pattern" ]] && ! grep -Eq "$body_pattern" "$body"; then
    echo "[ci-pg-matrix] ❌ ${label} ${path} payload did not match expected pattern"
    cat "$body"
    rm -f "$body"
    exit 1
  fi

  echo "[ci-pg-matrix] ✅ ${label} -> ${status}"
  rm -f "$body"
}

echo "[ci-pg-matrix] BASE_URL=${BASE_URL}"

# Broad public GET coverage across major route groups (no auth-required endpoints here).
check_case "health" "/api/health" "200" '"status"[[:space:]]*:[[:space:]]*"ok"'
check_case "health-ready" "/api/health/ready" "200,503"
check_case "stats-health" "/api/stats/health" "200,503"
check_case "stats-ready" "/api/stats/health/ready" "200,503"
check_case "stats-deep" "/api/stats/health/deep" "200"
check_case "db-meta" "/api/_meta/db" "200" '"dialect"[[:space:]]*:[[:space:]]*"postgres"'

check_case "stats" "/api/stats" "200" '"totalEntities"[[:space:]]*:'
check_case "subjects" "/api/subjects" "200"
check_case "entities" "/api/entities?limit=2" "200"
check_case "documents" "/api/documents?page=1&limit=2" "200" '"documents"[[:space:]]*:|"data"[[:space:]]*:'
check_case "search" "/api/search?q=epstein" "200"
check_case "evidence-search" "/api/evidence/search?q=epstein" "200"
check_case "evidence-types" "/api/evidence/types" "200"
check_case "relationships" "/api/relationships?entityId=1&limit=10" "200"
check_case "timeline" "/api/timeline" "200"
check_case "analytics" "/api/analytics" "200"
check_case "analytics-enhanced" "/api/analytics/enhanced" "200"
check_case "graph-global" "/api/graph/global?limit=50" "200"
check_case "map-entities" "/api/map/entities?limit=20" "200,401"

check_case "media-albums" "/api/media/albums" "200"
check_case "media-images" "/api/media/images?limit=2" "200"
check_case "media-search" "/api/media/search?q=epstein" "200"
check_case "media-tags" "/api/media/tags" "200"
check_case "media-stats" "/api/media/stats" "200"
check_case "tags" "/api/tags" "200"

check_case "properties" "/api/properties?limit=10" "200"
check_case "properties-stats" "/api/properties/stats" "200"
check_case "properties-known-associates" "/api/properties/known-associates" "200"
check_case "flights" "/api/flights?limit=10" "200"
check_case "flights-stats" "/api/flights/stats" "200"
check_case "flights-airports" "/api/flights/airports" "200"
check_case "flights-passengers" "/api/flights/passengers" "200"
check_case "flights-routes" "/api/flights/routes" "200"
check_case "flights-aircraft" "/api/flights/aircraft" "200"

check_case "emails" "/api/emails?limit=10" "200"
check_case "email-mailboxes" "/api/email/mailboxes" "200"
check_case "email-categories" "/api/email/categories" "200"
check_case "email-known-senders" "/api/email/known-senders" "200"

check_case "articles" "/api/articles" "200"
check_case "downloads-release-latest" "/api/downloads/release/latest" "200,404"

echo "[ci-pg-matrix] ✅ Public GET matrix passed"
