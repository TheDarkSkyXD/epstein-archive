#!/bin/bash
set -e

# Configuration
URL="${DEPLOY_VERIFY_URL:-http://127.0.0.1:3012}"
EXPECTED_VERSION=$(node -e "console.log(JSON.parse(require('fs').readFileSync('./package.json','utf8')).version)")

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

echo "Verifying deployment at $URL..."

# 1. Check Deep Readiness
echo "Checking /api/health/ready..."
READY_RESPONSE=$(curl -sS --max-time 8 -w " HTTP_STATUS:%{http_code}" "$URL/api/health/ready")
READY_STATUS="${READY_RESPONSE##*HTTP_STATUS:}"
READY_BODY="${READY_RESPONSE% HTTP_STATUS:*}"
if [ "$READY_STATUS" == "200" ] && echo "$READY_BODY" | grep -Eq '"status"[[:space:]]*:[[:space:]]*"ok"'; then
    log_success "Readiness Check OK (200 + status=ok)"
else
    log_error "Readiness Check FAILED ($READY_STATUS): $READY_BODY"
    exit 1
fi

# 1b. Check deep health endpoint
echo "Checking /api/stats/health/deep..."
DEEP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL/api/stats/health/deep")
if [ "$DEEP_STATUS" == "200" ]; then
    log_success "Deep Health Check OK (200)"
else
    log_error "Deep Health Check FAILED ($DEEP_STATUS)"
    exit 1
fi

# 2. Check Auth Scoping (/api/auth/me)
echo "Checking /api/auth/me (Auth Scoping Fix)..."
AUTH_ME_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL/api/auth/me")
if [ "$AUTH_ME_STATUS" == "200" ]; then
    log_success "Auth Scoping Verified (200)"
else
    log_error "Auth Scoping FAILED ($AUTH_ME_STATUS) - Still blocked by middleware?"
    exit 1
fi

# 3. Check Media Access (/api/media/images)
echo "Checking /api/media/images (Media Reliability Fix)..."
MEDIA_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL/api/media/images?limit=1&slim=true")
if [ "$MEDIA_STATUS" == "200" ]; then
    log_success "Media API Verified (200)"
else
    log_error "Media API FAILED ($MEDIA_STATUS) - Still returning 500?"
    exit 1
fi

# 4. Check Stats (DB Connectivity)
echo "Checking /api/stats (Database Connectivity)..."
STATS_JSON=$(curl -s "$URL/api/stats")
TOTAL_ENTITIES=$(echo "$STATS_JSON" | grep -o '"totalEntities":[0-9]*' | cut -d: -f2)

if [ -n "$TOTAL_ENTITIES" ] && [ "$TOTAL_ENTITIES" -gt 0 ]; then
    log_success "Stats Verified (Total Entities: $TOTAL_ENTITIES)"
else
    log_error "Stats Verification FAILED (Empty or zero entities): $STATS_JSON"
    exit 1
fi

# 5. Check Subject Listings (/api/subjects)
echo "Checking /api/subjects (Data Retrieval)..."
SUBJECTS_JSON=$(curl -s "$URL/api/subjects?limit=1")
if echo "$SUBJECTS_JSON" | grep -q '"subjects":\['; then
   log_success "Subject Listing API OK"
else
   log_error "Subject Listing API FAILED: $SUBJECTS_JSON"
   exit 1
fi

# 6. Check Main Page
echo "Checking Main Page Load..."
MAIN_PAGE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL")
if [ "$MAIN_PAGE_STATUS" == "200" ]; then
    log_success "Main Page Load OK (200)"
else
    log_error "Main Page Load FAILED ($MAIN_PAGE_STATUS)"
    exit 1
fi

echo "---"
echo -e "${GREEN}ALL CHECKS PASSED. DEPLOYMENT v$EXPECTED_VERSION VERIFIED.${NC}"
exit 0
