#!/bin/bash
set -e

# Configuration
PRODUCTION_SERVER="glasscode"
PRODUCTION_USER="deploy"
PRODUCTION_PATH="/home/deploy/epstein-archive"
SSH_KEY_PATH="$HOME/.ssh/id_glasscode"
LOCAL_DB="epstein-archive.db"
TEMP_DOWNLOAD="epstein-archive-prod.db"
BACKUP_DB="${LOCAL_DB}.pre-pull-$(date +%Y%m%d-%H%M%S).bak"

echo "🔄 SAFE SYNC: Production -> Local"

# 1. Backup Local
if [ -f "$LOCAL_DB" ]; then
    echo "📦 Backing up local DB to $BACKUP_DB..."
    cp "$LOCAL_DB" "$BACKUP_DB"
fi

# 2. Download Production DB
echo "⬇️  Downloading production database..."
scp -i "$SSH_KEY_PATH" "${PRODUCTION_USER}@${PRODUCTION_SERVER}:${PRODUCTION_PATH}/epstein-archive.db" "$TEMP_DOWNLOAD"

# 3. Smart Merge
echo "🧠 Merging Production data into Local..."
echo "----------------------------------------"
if [ -f "$LOCAL_DB" ]; then
    npm run db:merge -- --source="$TEMP_DOWNLOAD" --target="$LOCAL_DB"
else
    echo "⚠️  Local DB missing, simply using downloaded DB."
    mv "$TEMP_DOWNLOAD" "$LOCAL_DB"
fi
echo "----------------------------------------"

# 4. Cleanup
echo "🧹 Cleaning up..."
rm -f "$TEMP_DOWNLOAD"

echo "✅ Sync Complete! Your local DB now contains Production data + Your local changes."
