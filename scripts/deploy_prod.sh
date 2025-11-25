#!/bin/bash

# Epstein Archive Production Deployment Script
# Usage: ./scripts/deploy_prod.sh

set -e

# Configuration
SERVER_USER="deploy"
SERVER_IP="194.195.248.217"
SERVER_PATH="~/epstein-archive/"
PM2_PROCESS_NAME="epstein-archive"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🚀 Starting Production Deployment...${NC}"

# 1. Build
echo -e "${YELLOW}📦 Building production assets...${NC}"
npm run build:prod

# 2. Deploy
echo -e "${YELLOW}📤 Syncing files to server (${SERVER_IP})...${NC}"
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '.env' \
  --exclude 'data' \
  --exclude 'logs' \
  --exclude 'backups' \
  --exclude 'uploads' \
  --exclude 'database_backups' \
  --exclude '*.tar.gz' \
  --exclude '.DS_Store' \
  -e "ssh -o StrictHostKeyChecking=no" \
  ./ ${SERVER_USER}@${SERVER_IP}:${SERVER_PATH}

# 3. Restart
echo -e "${YELLOW}🔄 Restarting application...${NC}"
ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} "pm2 restart ${PM2_PROCESS_NAME}"

echo -e "${GREEN}✅ Deployment Completed Successfully!${NC}"
