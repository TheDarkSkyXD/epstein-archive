#!/bin/bash
set -e

# Configuration
URL="http://161.35.137.95:3012"
EXPECTED_VERSION="13.1.3"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

echo "Verifying deployment at $URL..."

# 1. Check Health (Basic)
echo "Checking /api/health..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL/api/health")
if [ "$HTTP_STATUS" == "200" ]; then
    log_success "Health Check OK (200)"
else
    log_error "Health Check FAILED ($HTTP_STATUS)"
    exit 1
fi

# 2. Check Deep Health (if available) - Assuming /api/health returns JSON with status: ok
HEALTH_JSON=$(curl -s "$URL/api/health")
if echo "$HEALTH_JSON" | grep -q '"status":"ok"'; then
    log_success "Health JSON Status OK"
else
    log_error "Health JSON Status FAILED: $HEALTH_JSON"
    exit 1
fi

# 3. Check Stats (DB Connectivity)
echo "Checking /api/stats (Database Connectivity)..."
STATS_JSON=$(curl -s "$URL/api/stats")
TOTAL_ENTITIES=$(echo "$STATS_JSON" | grep -o '"totalEntities":[0-9]*' | cut -d: -f2)

if [ -n "$TOTAL_ENTITIES" ] && [ "$TOTAL_ENTITIES" -gt 0 ]; then
    log_success "Stats Verified (Total Entities: $TOTAL_ENTITIES)"
else
    log_error "Stats Verification FAILED (Empty or zero entities): $STATS_JSON"
    exit 1
fi

# 4. Check Subject Listings (/api/subjects)
echo "Checking /api/subjects (Data Retrieval)..."
SUBJECTS_JSON=$(curl -s "$URL/api/subjects?limit=1")
if echo "$SUBJECTS_JSON" | grep -q '"data":\['; then
   log_success "Subject Listing API OK"
else
   log_error "Subject Listing API FAILED: $SUBJECTS_JSON"
   exit 1
fi

# 5. Check Content (Main Page for Version String if possible) - This is tricky if it's rendered by JS
# But let's check if the main page loads successfully at least
echo "Checking Main Page Load..."
MAIN_PAGE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL")
if [ "$MAIN_PAGE_STATUS" == "200" ]; then
    log_success "Main Page Load OK (200)"
else
    log_error "Main Page Load FAILED ($MAIN_PAGE_STATUS)"
    exit 1
fi

echo "---"
echo -e "${GREEN}ALL CHECKS PASSED. DEPLOYMENT VERIFIED.${NC}"
exit 0
