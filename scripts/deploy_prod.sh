#!/bin/bash
# Automated Production Deployment Script with Validation and Rollback
# Usage: ./scripts/deploy_prod.sh

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REMOTE_USER="deploy"
REMOTE_HOST="glasscode"
REMOTE_PATH="~/epstein-archive"
LOCAL_DB="epstein-archive.db"
BACKUP_DIR="backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Epstein Archive Production Deployment${NC}"
echo -e "${GREEN}========================================${NC}"

# Step 1: Pre-deployment validation
echo -e "\n${YELLOW}[1/8] Running pre-deployment validation...${NC}"

# Check local database integrity
echo "  - Checking local database integrity..."
if ! sqlite3 "$LOCAL_DB" "PRAGMA integrity_check;" | grep -q "ok"; then
    echo -e "${RED}ERROR: Local database integrity check failed!${NC}"
    exit 1
fi

# Check local database schema
echo "  - Verifying database schema..."
if ! sqlite3 "$LOCAL_DB" "SELECT sql FROM sqlite_master WHERE type='table' AND name='entities';" | grep -q "red_flag_rating"; then
    echo -e "${RED}ERROR: Database missing red_flag_rating column!${NC}"
    exit 1
fi

# Count entities
ENTITY_COUNT=$(sqlite3 "$LOCAL_DB" "SELECT COUNT(*) FROM entities;")
echo "  - Entity count: $ENTITY_COUNT"

if [ "$ENTITY_COUNT" -lt 40000 ]; then
    echo -e "${RED}ERROR: Entity count too low ($ENTITY_COUNT). Expected >40,000${NC}"
    exit 1
fi

# Check for duplicates
DUPLICATE_COUNT=$(sqlite3 "$LOCAL_DB" "SELECT COUNT(*) FROM (SELECT full_name, COUNT(*) as cnt FROM entities WHERE full_name LIKE 'And %' OR full_name LIKE 'But %' GROUP BY full_name);")
if [ "$DUPLICATE_COUNT" -gt 10 ]; then
    echo -e "${RED}WARNING: Found $DUPLICATE_COUNT malformed entities (And/But prefixes)${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo -e "${GREEN}  ✓ Pre-deployment validation passed${NC}"

# Step 2: Build frontend
echo -e "\n${YELLOW}[2/8] Building frontend...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Frontend build failed!${NC}"
    exit 1
fi
echo -e "${GREEN}  ✓ Frontend built successfully${NC}"

# Step 3: Create local backup
echo -e "\n${YELLOW}[3/8] Creating local backup...${NC}"
mkdir -p "$BACKUP_DIR"
cp "$LOCAL_DB" "$BACKUP_DIR/epstein-archive-$TIMESTAMP.db"
echo -e "${GREEN}  ✓ Local backup created: $BACKUP_DIR/epstein-archive-$TIMESTAMP.db${NC}"

# Step 4: Create remote backup
echo -e "\n${YELLOW}[4/8] Creating remote backup...${NC}"
ssh $REMOTE_USER@$REMOTE_HOST "mkdir -p $REMOTE_PATH/backups && cp $REMOTE_PATH/epstein-archive.db $REMOTE_PATH/backups/epstein-archive-$TIMESTAMP.db 2>/dev/null || true"
echo -e "${GREEN}  ✓ Remote backup created${NC}"

# Step 5: Stop production server (only epstein services, not other apps)
echo -e "\n${YELLOW}[5/8] Stopping epstein-archive services...${NC}"
ssh $REMOTE_USER@$REMOTE_HOST "pm2 stop epstein-archive-api epstein-archive-web 2>/dev/null || true"
echo -e "${GREEN}  ✓ Epstein services stopped${NC}"

# Step 6: Deploy code and build
echo -e "\n${YELLOW}[6/8] Deploying code and building...${NC}"

# Deploy source code
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude 'dist' \
  --exclude '.git' \
  --exclude 'backups' \
  src/ $REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/src/

# Deploy config files
scp ecosystem.config.cjs tsconfig.server.json package.json $REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/

# Install dependencies and build on production
ssh $REMOTE_USER@$REMOTE_HOST "cd $REMOTE_PATH && npm install --production=false && npx tsc -p tsconfig.server.json"

if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: TypeScript compilation failed!${NC}"
    echo -e "${YELLOW}Rolling back...${NC}"
    ssh $REMOTE_USER@$REMOTE_HOST "cp $REMOTE_PATH/backups/epstein-archive-$TIMESTAMP.db $REMOTE_PATH/epstein-archive.db"
    ssh $REMOTE_USER@$REMOTE_HOST "pm2 restart epstein-api"
    exit 1
fi

echo -e "${GREEN}  ✓ Code deployed and compiled${NC}"

# Step 7: Deploy database
echo -e "\n${YELLOW}[6/8] Deploying database...${NC}"
ssh $REMOTE_USER@$REMOTE_HOST "rm -f $REMOTE_PATH/epstein-archive.db*"
scp "$LOCAL_DB" $REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/epstein-archive.db

# Verify upload
REMOTE_MD5=$(ssh $REMOTE_USER@$REMOTE_HOST "md5sum $REMOTE_PATH/epstein-archive.db | cut -d' ' -f1")
LOCAL_MD5=$(md5 -q "$LOCAL_DB" 2>/dev/null || md5sum "$LOCAL_DB" | cut -d' ' -f1)

if [ "$REMOTE_MD5" != "$LOCAL_MD5" ]; then
    echo -e "${RED}ERROR: MD5 mismatch! Upload failed.${NC}"
    echo "  Local:  $LOCAL_MD5"
    echo "  Remote: $REMOTE_MD5"
    echo -e "${YELLOW}Rolling back...${NC}"
    ssh $REMOTE_USER@$REMOTE_HOST "cp $REMOTE_PATH/backups/epstein-archive-$TIMESTAMP.db $REMOTE_PATH/epstein-archive.db"
    ssh $REMOTE_USER@$REMOTE_HOST "pm2 restart epstein-api"
    exit 1
fi

echo -e "${GREEN}  ✓ Database deployed (MD5: $LOCAL_MD5)${NC}"

# Verify remote database integrity
echo "  - Verifying remote database integrity..."
if ! ssh $REMOTE_USER@$REMOTE_HOST "sqlite3 $REMOTE_PATH/epstein-archive.db 'PRAGMA integrity_check;'" | grep -q "ok"; then
    echo -e "${RED}ERROR: Remote database integrity check failed!${NC}"
    echo -e "${YELLOW}Rolling back...${NC}"
    ssh $REMOTE_USER@$REMOTE_HOST "cp $REMOTE_PATH/backups/epstein-archive-$TIMESTAMP.db $REMOTE_PATH/epstein-archive.db"
    ssh $REMOTE_USER@$REMOTE_HOST "pm2 restart epstein-api"
    exit 1
fi

# Step 7: Deploy frontend
echo -e "\n${YELLOW}[7/8] Deploying frontend...${NC}"
rsync -avz --delete dist/ $REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/dist/
echo -e "${GREEN}  ✓ Frontend deployed${NC}"

# Step 8: Restart server and verify
echo -e "\n${YELLOW}[8/8] Restarting server and verifying...${NC}"
ssh $REMOTE_USER@$REMOTE_HOST "cd $REMOTE_PATH && pm2 delete epstein-api 2>/dev/null || true && pm2 start ecosystem.config.cjs"
sleep 5

# Verify API health
echo "  - Checking API health..."
API_HEALTH=$(ssh $REMOTE_USER@$REMOTE_HOST "curl -s http://127.0.0.1:3012/api/health | jq -r '.status' 2>/dev/null || echo 'error'")
if [ "$API_HEALTH" != "healthy" ]; then
    echo -e "${RED}ERROR: API health check failed!${NC}"
    echo -e "${YELLOW}Rolling back...${NC}"
    ssh $REMOTE_USER@$REMOTE_HOST "pm2 stop epstein-api"
    ssh $REMOTE_USER@$REMOTE_HOST "cp $REMOTE_PATH/backups/epstein-archive-$TIMESTAMP.db $REMOTE_PATH/epstein-archive.db"
    ssh $REMOTE_USER@$REMOTE_HOST "pm2 restart epstein-api"
    exit 1
fi

# Verify data integrity
echo "  - Verifying data integrity..."
EPSTEIN_DATA=$(ssh $REMOTE_USER@$REMOTE_HOST "curl -s 'http://127.0.0.1:3012/api/entities?search=Jeffrey%20Epstein&limit=1' | jq -r '.data[0].fullName' 2>/dev/null || echo 'error'")
if [ "$EPSTEIN_DATA" != "Jeffrey Epstein" ]; then
    echo -e "${RED}ERROR: Data verification failed!${NC}"
    echo "  Expected: Jeffrey Epstein"
    echo "  Got: $EPSTEIN_DATA"
    exit 1
fi

echo -e "${GREEN}  ✓ Server restarted and verified${NC}"

# Summary
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Successful!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Entities: $ENTITY_COUNT"
echo -e "Backup: $BACKUP_DIR/epstein-archive-$TIMESTAMP.db"
echo -e "Remote backup: $REMOTE_PATH/backups/epstein-archive-$TIMESTAMP.db"
echo -e "\nProduction URL: https://epstein.academy"
echo -e "${GREEN}========================================${NC}"
