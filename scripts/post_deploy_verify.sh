#!/bin/bash
# =============================================================================
# POST-DEPLOYMENT VERIFICATION SCRIPT
# =============================================================================
# This script runs AFTER deployment to verify the application is working.
# If verification fails, it automatically triggers a rollback.
#
# Usage: ./scripts/post_deploy_verify.sh [backup_timestamp]
#
# Exit codes:
#   0 = All checks passed
#   1 = Checks failed, rollback attempted
#   2 = Checks failed, rollback also failed (manual intervention required)
# =============================================================================

set -o pipefail  # Catch pipeline errors

# Configuration
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:3012/api/health}"
DEEP_HEALTH_URL="${DEEP_HEALTH_URL:-http://127.0.0.1:3012/api/health/deep}"
MAX_RETRIES=5
RETRY_DELAY=10  # seconds between retries
STARTUP_WAIT=30  # seconds to wait for app to start

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[!]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }
log_step() { echo -e "${BLUE}[→]${NC} $1"; }

# Get backup timestamp from argument or environment
BACKUP_TIMESTAMP="${1:-$BACKUP_TIMESTAMP}"

echo ""
echo "=================================================="
echo "  POST-DEPLOYMENT VERIFICATION"
echo "=================================================="
echo ""

# ============================================
# PHASE 1: Wait for Application Startup
# ============================================
log_step "Phase 1: Waiting for application startup (${STARTUP_WAIT}s)..."

sleep $STARTUP_WAIT

# ============================================
# PHASE 2: Basic Health Check (Fast)
# ============================================
log_step "Phase 2: Basic health check..."

HEALTH_PASSED=false
for i in $(seq 1 $MAX_RETRIES); do
    log_info "Attempt $i of $MAX_RETRIES..."
    
    HTTP_CODE=$(curl -s -o /tmp/health_response.json -w "%{http_code}" "$HEALTH_URL" --max-time 10 2>/dev/null)
    
    if [ "$HTTP_CODE" = "200" ]; then
        # Parse response to check status
        STATUS=$(cat /tmp/health_response.json | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
        if [ "$STATUS" = "healthy" ]; then
            log_info "Basic health check PASSED (status: $STATUS)"
            HEALTH_PASSED=true
            break
        else
            log_warn "Health check returned status: $STATUS (HTTP $HTTP_CODE)"
        fi
    else
        log_warn "Health check returned HTTP $HTTP_CODE"
    fi
    
    if [ $i -lt $MAX_RETRIES ]; then
        log_info "Retrying in ${RETRY_DELAY}s..."
        sleep $RETRY_DELAY
    fi
done

if [ "$HEALTH_PASSED" != "true" ]; then
    log_error "BASIC HEALTH CHECK FAILED after $MAX_RETRIES attempts"
    log_error "Response: $(cat /tmp/health_response.json 2>/dev/null || echo 'No response')"
    
    # Trigger rollback
    if [ -n "$BACKUP_TIMESTAMP" ]; then
        log_step "Attempting automatic rollback..."
        ./scripts/emergency_rollback.sh "$BACKUP_TIMESTAMP"
        ROLLBACK_EXIT=$?
        if [ $ROLLBACK_EXIT -eq 0 ]; then
            log_info "Rollback completed. Please investigate the failed deployment."
            exit 1
        else
            log_error "ROLLBACK ALSO FAILED! Manual intervention required!"
            exit 2
        fi
    else
        log_error "No backup timestamp provided - cannot rollback automatically"
        exit 1
    fi
fi

# ============================================
# PHASE 3: Deep Health Check (Thorough)
# ============================================
log_step "Phase 3: Deep health check (database integrity, tables, queries)..."

DEEP_PASSED=false
HTTP_CODE=$(curl -s -o /tmp/deep_health_response.json -w "%{http_code}" "$DEEP_HEALTH_URL" --max-time 60 2>/dev/null)

if [ "$HTTP_CODE" = "200" ]; then
    STATUS=$(cat /tmp/deep_health_response.json | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
    
    if [ "$STATUS" = "healthy" ] || [ "$STATUS" = "degraded" ]; then
        log_info "Deep health check PASSED (status: $STATUS)"
        DEEP_PASSED=true
        
        # Show individual check results
        echo ""
        log_info "Check Results:"
        cat /tmp/deep_health_response.json | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    for check, result in data.get('checks', {}).items():
        status_emoji = '✓' if result['status'] == 'pass' else ('⚠' if result['status'] == 'warn' else '✗')
        print(f\"  {status_emoji} {check}: {result['message']}\")
except: pass
" 2>/dev/null || cat /tmp/deep_health_response.json
        echo ""
    elif [ "$STATUS" = "critical" ]; then
        log_error "Deep health check returned CRITICAL status"
        DEEP_PASSED=false
    fi
else
    log_error "Deep health check returned HTTP $HTTP_CODE"
fi

if [ "$DEEP_PASSED" != "true" ]; then
    log_error "DEEP HEALTH CHECK FAILED"
    log_error "Response: $(cat /tmp/deep_health_response.json 2>/dev/null | head -20)"
    
    # Trigger rollback
    if [ -n "$BACKUP_TIMESTAMP" ]; then
        log_step "Attempting automatic rollback due to deep health failure..."
        ./scripts/emergency_rollback.sh "$BACKUP_TIMESTAMP"
        ROLLBACK_EXIT=$?
        if [ $ROLLBACK_EXIT -eq 0 ]; then
            log_info "Rollback completed. Please investigate the failed deployment."
            exit 1
        else
            log_error "ROLLBACK ALSO FAILED! Manual intervention required!"
            exit 2
        fi
    else
        log_warn "No backup timestamp - skipping automatic rollback"
        exit 1
    fi
fi

# ============================================
# PHASE 4: Smoke Test Critical Endpoints
# ============================================
log_step "Phase 4: Smoke testing critical API endpoints..."

ENDPOINTS=(
    "/api/entities?limit=1"
    "/api/documents?limit=1"
    "/api/stats"
    "/api/black-book?limit=1"
)

ALL_ENDPOINTS_OK=true
for endpoint in "${ENDPOINTS[@]}"; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:3012${endpoint}" --max-time 15 2>/dev/null)
    
    if [ "$HTTP_CODE" = "200" ]; then
        log_info "${endpoint} → HTTP ${HTTP_CODE}"
    else
        log_error "${endpoint} → HTTP ${HTTP_CODE} (FAILED)"
        ALL_ENDPOINTS_OK=false
    fi
done

if [ "$ALL_ENDPOINTS_OK" != "true" ]; then
    log_warn "Some endpoints failed - this may indicate a partial outage"
    # Don't rollback for partial failures, but warn
fi

# ============================================
# PHASE 5: Database Query Test
# ============================================
log_step "Phase 5: Testing database query execution..."

# This tests that we can actually query data
ENTITY_RESPONSE=$(curl -s "http://127.0.0.1:3012/api/entities?limit=1" --max-time 10 2>/dev/null)
ENTITY_COUNT=$(echo "$ENTITY_RESPONSE" | grep -o '"total":[0-9]*' | cut -d':' -f2)

if [ -n "$ENTITY_COUNT" ] && [ "$ENTITY_COUNT" -gt 0 ]; then
    log_info "Database contains $ENTITY_COUNT entities - queries working!"
else
    log_error "Database appears empty or queries failing"
    log_error "Response: $ENTITY_RESPONSE"
fi

# ============================================
# FINAL RESULT
# ============================================
echo ""
echo "=================================================="
if [ "$HEALTH_PASSED" = "true" ] && [ "$DEEP_PASSED" = "true" ]; then
    echo -e "${GREEN}  ✅ DEPLOYMENT VERIFIED SUCCESSFULLY${NC}"
    echo "=================================================="
    echo ""
    log_info "All critical checks passed"
    log_info "Application is healthy and serving requests"
    
    # Clean up backup files older than 7 days (optional)
    # find . -name "*.backup-*" -mtime +7 -delete 2>/dev/null
    
    exit 0
else
    echo -e "${RED}  ❌ DEPLOYMENT VERIFICATION FAILED${NC}"
    echo "=================================================="
    echo ""
    log_error "One or more critical checks failed"
    log_error "Check logs: pm2 logs epstein-archive"
    exit 1
fi
