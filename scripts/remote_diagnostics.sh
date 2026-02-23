#!/usr/bin/env bash
# scripts/remote_diagnostics.sh
# Run this on the production server to diagnose DB connectivity

set -e

echo "--- Remote Diagnostics ---"
echo "User: $(whoami)"
echo "Node: $(node -v)"

if [ -f .env ]; then
  echo "✅ .env file found"
  # Check if DATABASE_URL is in .env without printing secrets
  if grep -q "DATABASE_URL" .env; then
    echo "✅ DATABASE_URL is defined in .env"
    # Check for user:pass pattern safely
    if grep "DATABASE_URL" .env | grep -q "@"; then
      echo "✅ DATABASE_URL appears to contain credentials"
    else
      echo "⚠️  DATABASE_URL might be missing credentials (no '@' found)"
    fi
  else
    echo "❌ DATABASE_URL NOT found in .env"
  fi
else
  echo "❌ .env file MISSING"
fi

echo "--- Database Connectivity ---"
if command -v psql >/dev/null 2>&1; then
  echo "psql version: $(psql --version)"
  # Try to connect and show the current user
  # We use --no-password and rely on the env var
  set +e
  DB_USER_CHECK=$(source .env && psql "$DATABASE_URL" -tAc "SELECT current_user" 2>&1)
  if [ $? -eq 0 ]; then
    echo "✅ Successfully connected as user: $DB_USER_CHECK"
  else
    echo "❌ Connection failed: $DB_USER_CHECK"
  fi
  set -e
else
  echo "❌ psql command not found"
fi
