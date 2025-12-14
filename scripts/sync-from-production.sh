#!/bin/bash

# Sync Production Database to Local
# Downloads the live production database to your local environment for debugging/development.

set -e

# Configuration
PRODUCTION_SERVER="glasscode"
PRODUCTION_PATH="/home/deploy/epstein-archive"
DB_NAME="epstein-archive-production.db"
LOCAL_DB_PATH="."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔄 Starting Production Sync...${NC}"

# Check connection
if ! ssh -q "$PRODUCTION_SERVER" exit; then
    echo -e "${YELLOW}Cannot connect to $PRODUCTION_SERVER. Check your SSH config.${NC}"
    exit 1
fi

# Backup local DB if it exists
if [ -f "$LOCAL_DB_PATH/$DB_NAME" ]; then
    BACKUP_NAME="$DB_NAME.bak_$(date +%Y%m%d_%H%M%S)"
    echo -e "${YELLOW}Backing up local database to $BACKUP_NAME...${NC}"
    cp "$LOCAL_DB_PATH/$DB_NAME" "$LOCAL_DB_PATH/$BACKUP_NAME"
fi

# Download
echo -e "${GREEN}Downloading $DB_NAME from production...${NC}"
scp "$PRODUCTION_SERVER:$PRODUCTION_PATH/$DB_NAME" "$LOCAL_DB_PATH/"

echo -e "${GREEN}✅ Database synced successfully!${NC}"
echo "You can now run the app with: npm run dev"
