#!/bin/bash
set -euo pipefail

# Configuration matches deploy.sh
PRODUCTION_USER="deploy"
PRODUCTION_HOST="194.195.248.217"
PRODUCTION_PATH="/home/deploy/epstein-archive"
SSH_KEY_PATH="$HOME/.ssh/id_glasscode"
LOCAL_DB="epstein-archive.db"
REMOTE_DB="epstein-archive.db"
REMOTE_SNAPSHOT="epstein-archive.db.download_snapshot"

echo "▶ Creating remote snapshot to ensure consistency..."
# Using .backup to create a consistent snapshot
ssh -i "$SSH_KEY_PATH" "${PRODUCTION_USER}@${PRODUCTION_HOST}" "sqlite3 ${PRODUCTION_PATH}/${REMOTE_DB} \".backup '${PRODUCTION_PATH}/${REMOTE_SNAPSHOT}'\""

echo "▶ Syncing database (using delta transfer)..."
# We sync directly to a temp file, but use the existing local DB as a basis for blocks to speed up transfer
# IF the local DB has similar blocks. Given 1.8GB vs 7.8GB, there might be a lot of new data.
# -z compression is critical for text/sparse data.
# --partial allows resuming.
# --inplace is risky if it fails mid-way on the actual DB, so we use a temp file.
# But rsync --link-dest or --copy-dest can help if we had a previous backup.
# Here we just use standard compression.

rsync -avz --progress --partial -e "ssh -i $SSH_KEY_PATH" "${PRODUCTION_USER}@${PRODUCTION_HOST}:${PRODUCTION_PATH}/${REMOTE_SNAPSHOT}" "${LOCAL_DB}.new"

echo "▶ Verifying downloaded snapshot integrity..."
if ! sqlite3 "${LOCAL_DB}.new" "PRAGMA quick_check;" | grep -q "ok"; then
  echo "❌ Error: Downloaded snapshot is corrupt! Aborting."
  # Don't delete immediately in case we want to inspect/resume
  echo "Keeping ${LOCAL_DB}.new for inspection."
  # Try to clean up remote
  ssh -i "$SSH_KEY_PATH" "${PRODUCTION_USER}@${PRODUCTION_HOST}" "rm -f ${PRODUCTION_PATH}/${REMOTE_SNAPSHOT}"
  exit 1
fi

echo "▶ Backing up existing local database..."
mv "$LOCAL_DB" "${LOCAL_DB}.bak_$(date +%Y%m%d_%H%M%S)" || true

echo "▶ Replacing local database with production copy..."
mv "${LOCAL_DB}.new" "$LOCAL_DB"

echo "▶ Cleaning up remote snapshot..."
ssh -i "$SSH_KEY_PATH" "${PRODUCTION_USER}@${PRODUCTION_HOST}" "rm -f ${PRODUCTION_PATH}/${REMOTE_SNAPSHOT}"

echo "✅ Database sync complete. Local DB replaced with Production DB."
