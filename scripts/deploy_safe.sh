#!/bin/bash
set -e

# Configuration
PRODUCTION_SERVER="glasscode"
PRODUCTION_USER="deploy"
PRODUCTION_PATH="/home/deploy/epstein-archive"
SSH_KEY_PATH="$HOME/.ssh/id_glasscode"
LOCAL_DB="epstein-archive.db"
UPLOAD_NAME="epstein-archive-incoming.db"

echo "🚀 SAFE DEPLOY: Local -> Production"

# 1. Standard Code Deploy (Build & Push Code)
echo "📦 Deploying Code..."
./deploy-to-production.sh deploy-code

# 2. Upload Local DB
echo "⬆️  uploading Local DB for merging..."
scp -i "$SSH_KEY_PATH" "$LOCAL_DB" "${PRODUCTION_USER}@${PRODUCTION_SERVER}:${PRODUCTION_PATH}/${UPLOAD_NAME}"

# 3. Remote Merge Execution
echo "🧠 Executing Remote Merge..."
ssh -i "$SSH_KEY_PATH" "${PRODUCTION_USER}@${PRODUCTION_SERVER}" "
    cd ${PRODUCTION_PATH} &&
    
    # 1. Create Working Copy (Atomic Safety)
    cp epstein-archive.db epstein-archive.db.work &&
    
    # 2. Run Merge on Working Copy (Not Live DB)
    echo '   Running Smart Merge on Working Copy...' &&
    if npx tsx scripts/sync-db.ts --source=${UPLOAD_NAME} --target=epstein-archive.db.work; then
        echo '   ✅ Merge Successful. Swapping to Live...'
        
        # 3. Create Backup of Old Live DB
        cp epstein-archive.db epstein-archive.db.backup-$(date +%Y%m%d-%H%M%S) &&
        
        # 4. Atomic Swap
        mv epstein-archive.db.work epstein-archive.db &&
        
        # Cleanup
        rm ${UPLOAD_NAME} &&
        
        # Restart
        pm2 reload epstein-archive
    else
        echo '   ❌ Merge Failed! Discarding changes.'
        rm epstein-archive.db.work
        rm ${UPLOAD_NAME}
        exit 1
    fi
"

echo "✅ Safe Deploy Complete!"
