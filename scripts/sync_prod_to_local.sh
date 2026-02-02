#!/bin/bash
set -e

# Configuration
PRODUCTION_SERVER="glasscode"
PRODUCTION_USER="deploy"
PRODUCTION_PATH="/home/deploy/epstein-archive"
SSH_KEY_PATH="$HOME/.ssh/id_glasscode"
LOCAL_DB="epstein-archive.db"

echo "🔄 Syncing Production DB to Local..."

# 1. Backup Local
if [ -f "$LOCAL_DB" ]; then
    BACKUP_NAME="${LOCAL_DB}.local-backup-$(date +%Y%m%d-%H%M%S)"
    echo "📦 Backing up local DB to $BACKUP_NAME"
    cp "$LOCAL_DB" "$BACKUP_NAME"
fi

# 2. Pull from Prod
echo "⬇️  Downloading database from ${PRODUCTION_SERVER}..."
scp -i "$SSH_KEY_PATH" "${PRODUCTION_USER}@${PRODUCTION_SERVER}:${PRODUCTION_PATH}/epstein-archive.db" "${LOCAL_DB}.prod-new"

# 3. Swap
echo "🔀 Swapping databases..."
mv "${LOCAL_DB}.prod-new" "$LOCAL_DB"

echo "✅ Sync complete! Local DB is now a clone of Production."
echo "   Run 'npm run verify' to check integrity."
