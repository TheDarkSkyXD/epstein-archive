#!/usr/bin/env bash
set -e
if rg -n "sqlite|better-sqlite3|PRAGMA|FTS5" src/; then
  echo "❌ SQLite detected in production code"
  exit 1
fi
