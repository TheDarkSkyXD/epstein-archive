#!/usr/bin/env bash
set -e

# Exclude: shell scripts (contain patterns as strings), .recovered backups, compiled dist/
EXCLUDE_GLOBS=(
  '--glob=!*.sh'
  '--glob=!*.recovered'
  '--glob=!dist/'
  '--glob=!*.cjs'
)

if rg -n "sqlite|better-sqlite3|PRAGMA|FTS5" src/ scripts/ "${EXCLUDE_GLOBS[@]}" 2>/dev/null | grep -v "ingest_audit.ts"; then
  echo "FAIL: SQLite detected in production code or scripts"
  exit 1
fi
if rg -n "getDb\b|getIngestDb\b" scripts/ "${EXCLUDE_GLOBS[@]}" 2>/dev/null | grep -v "ingest_audit.ts"; then
  echo "FAIL: Deleted getDb()/getIngestDb() still referenced in scripts/"
  exit 1
fi
echo "PASS: No SQLite patterns detected"
