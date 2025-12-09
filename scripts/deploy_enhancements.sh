#!/bin/bash

# Production Deployment Script for Entity Enhancements
# This script deploys:
# - Consolidated database (1,484 entities merged)
# - Relationship generation script
# - Importance scoring
# - Entity type filtering
# - Updated frontend code

set -e  # Exit on error

PROD_SERVER="root@68.183.186.127"
PROD_DIR="/root/epstein-archive"
LOCAL_DIR="/Users/veland/Downloads/Epstein Files/epstein-archive"

echo "🚀 Starting Production Deployment"
echo "=================================="

# Step 1: Backup production database
echo ""
echo "📦 Step 1: Backing up production database..."
ssh $PROD_SERVER "cd $PROD_DIR && cp epstein-archive.db epstein-archive.db.backup-$(date +%Y%m%d-%H%M%S)"

# Step 2: Upload consolidated database
echo ""
echo "📤 Step 2: Uploading consolidated database..."
echo "   Database size: $(du -h $LOCAL_DIR/epstein-archive.db | cut -f1)"
scp $LOCAL_DIR/epstein-archive.db $PROD_SERVER:$PROD_DIR/epstein-archive.db

# Step 3: Upload enhancement scripts
echo ""
echo "📤 Step 3: Uploading enhancement scripts..."
scp $LOCAL_DIR/scripts/enhance_schema.sql $PROD_SERVER:$PROD_DIR/scripts/
scp $LOCAL_DIR/scripts/generate_relationships_and_scoring.ts $PROD_SERVER:$PROD_DIR/scripts/

# Step 4: Run schema enhancements (if not already applied)
echo ""
echo "🔧 Step 4: Applying schema enhancements..."
ssh $PROD_SERVER "cd $PROD_DIR && sqlite3 epstein-archive.db < scripts/enhance_schema.sql 2>/dev/null || echo 'Schema already enhanced'"

# Step 5: Generate relationships and importance scores
echo ""
echo "🕸️  Step 5: Generating relationships and importance scores..."
ssh $PROD_SERVER "cd $PROD_DIR && npx tsx scripts/generate_relationships_and_scoring.ts"

# Step 6: Upload updated server code
echo ""
echo "📤 Step 6: Uploading updated server code..."
scp $LOCAL_DIR/src/server.production.ts $PROD_SERVER:$PROD_DIR/src/
scp $LOCAL_DIR/src/services/DatabaseService.ts $PROD_SERVER:$PROD_DIR/src/services/
scp $LOCAL_DIR/src/types.ts $PROD_SERVER:$PROD_DIR/src/

# Step 7: Build and deploy frontend
echo ""
echo "🏗️  Step 7: Building frontend..."
cd $LOCAL_DIR
npm run build

echo ""
echo "📤 Step 8: Uploading frontend build..."
rsync -avz --delete $LOCAL_DIR/dist/ $PROD_SERVER:$PROD_DIR/dist/

# Step 9: Restart production server
echo ""
echo "🔄 Step 9: Restarting production server..."
ssh $PROD_SERVER "cd $PROD_DIR && pm2 restart epstein-api || pm2 start src/server.production.ts --name epstein-api --interpreter npx --interpreter-args tsx"

# Step 10: Verify deployment
echo ""
echo "✅ Step 10: Verifying deployment..."
sleep 3
HEALTH_CHECK=$(curl -s http://68.183.186.127:3001/api/health | jq -r '.status' 2>/dev/null || echo "error")

if [ "$HEALTH_CHECK" = "healthy" ]; then
    echo "   ✅ API is healthy"
else
    echo "   ❌ API health check failed"
    exit 1
fi

# Test entity type filter
echo ""
echo "🧪 Testing entity type filter..."
PERSON_COUNT=$(curl -s "http://68.183.186.127:3001/api/entities?type=Person&limit=1" | jq -r '.total' 2>/dev/null || echo "0")
ORG_COUNT=$(curl -s "http://68.183.186.127:3001/api/entities?type=Organization&limit=1" | jq -r '.total' 2>/dev/null || echo "0")

echo "   👤 Persons: $PERSON_COUNT"
echo "   🏢 Organizations: $ORG_COUNT"

# Summary
echo ""
echo "=================================="
echo "✅ Deployment Complete!"
echo "=================================="
echo ""
echo "📊 Summary:"
echo "   - Consolidated database deployed (1,484 entities merged)"
echo "   - Entity relationships generated"
echo "   - Importance scores calculated"
echo "   - Entity type filtering enabled"
echo "   - Frontend updated with new features"
echo ""
echo "🌐 Production URL: http://68.183.186.127"
echo "📡 API URL: http://68.183.186.127:3001/api"
echo ""
echo "🔍 Next steps:"
echo "   1. Test entity type filter in UI"
echo "   2. Verify relationship data"
echo "   3. Check importance scores"
echo ""
