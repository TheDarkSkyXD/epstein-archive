#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "☢️  Running Postgres nuclear gates..."

if ! command -v rg >/dev/null 2>&1; then
  echo "❌ ripgrep (rg) is required but not installed"
  exit 1
fi

echo "1) Forbidden imports / strings scan..."
if rg -n "better-sqlite3|sqlite|Database\\(|PRAGMA|FTS5|MATCH\\s*\\(|GROUP_CONCAT|IFNULL\\(|datetime\\('now'\\)" src/ packages/ tests/ --glob '!**/node_modules/**'; then
  echo "❌ Forbidden database patterns detected in src/ or packages/ or tests/."
  echo "   Allowed locations are limited; docs/ may contain historical references only."
  exit 1
fi
echo "✅ No forbidden SQLite/legacy patterns found in codepaths"

echo "2) Forbidden DB env usage..."
if rg -n "DB_DIALECT|DB_PATH" src/ packages/ --glob '!**/node_modules/**'; then
  echo "❌ Forbidden DB env variables (DB_DIALECT/DB_PATH) detected in src/ or packages/."
  exit 1
fi
echo "✅ No forbidden DB env variables in src/ or packages/"

echo "3) Routes must not contain raw SQL keywords..."
ROUTE_PATHS=("src/server/routes")
if [ -d "src/server/api" ]; then
  ROUTE_PATHS+=("src/server/api")
fi
if rg -n "SELECT\\s|INSERT\\s|UPDATE\\s|DELETE\\s|FROM\\s" "${ROUTE_PATHS[@]}" --glob '!**/node_modules/**'; then
  echo "❌ Raw SQL keywords detected in route handlers."
  echo "   Move SQL into typed query modules (e.g. @epstein/db or routesDb) instead."
  exit 1
fi
echo "✅ No raw SQL keywords found in route handlers"

echo "4) Type check (pnpm -w type-check)..."
pnpm -w type-check
echo "✅ Type check passed"

echo "5) Unit tests (pnpm -w test)..."
pnpm -w test
echo "✅ Unit tests passed"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ DATABASE_URL is required for pg_explain and schema hash gates"
  exit 1
fi

echo "6) pg_explain plan gate..."
node --import tsx/esm scripts/pg_explain.ts
echo "✅ pg_explain plan gate passed"

echo "7) schema hash gate..."
node --import tsx/esm scripts/pg_schema_hash.ts --check
echo "✅ Schema hash gate passed"

echo "☢️  All nuclear gates passed"

