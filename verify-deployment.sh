#!/bin/bash

# Epstein Archive Deployment Verification Script
# This script verifies that the Red Flag Index deployment is working correctly

set -e

# Configuration
API_URL="http://localhost:3012"
WEB_URL="http://localhost:3005"
LOG_FILE="./logs/verification.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

success_msg() {
    echo -e "${GREEN}✓ $1${NC}"
    log "SUCCESS: $1"
    ((TESTS_PASSED++))
}

error_msg() {
    echo -e "${RED}✗ $1${NC}"
    log "ERROR: $1"
    ((TESTS_FAILED++))
}

info_msg() {
    echo -e "${BLUE}ℹ $1${NC}"
    log "INFO: $1"
}

warning_msg() {
    echo -e "${YELLOW}⚠ $1${NC}"
    log "WARNING: $1"
}

# Test function
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_result="$3"
    
    ((TESTS_TOTAL++))
    echo -e "\n${YELLOW}Running test: $test_name${NC}"
    
    if eval "$test_command"; then
        if [ -n "$expected_result" ]; then
            if eval "$expected_result"; then
                success_msg "$test_name"
            else
                error_msg "$test_name - Expected result not found"
            fi
        else
            success_msg "$test_name"
        fi
    else
        error_msg "$test_name - Command failed"
    fi
}

# Create log directory
mkdir -p "$(dirname "$LOG_FILE")"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Epstein Archive Deployment Verification${NC}"
echo -e "${BLUE}========================================${NC}"
log "Starting deployment verification"

# Test 1: API Health Check
run_test "API Health Check" \
    "curl -s -o /dev/null -w '%{http_code}' '$API_URL/api/health' | grep -q '200'" \
    ""

# Test 2: API Response Format
run_test "API Response Format" \
    "curl -s '$API_URL/api/health' | jq -r '.status' | grep -q 'healthy'" \
    ""

# Test 3: Database Connection
run_test "Database Connection" \
    "curl -s '$API_URL/api/health' | jq -r '.database' | grep -q 'connected'" \
    ""

# Test 4: Red Flag Index Search Endpoint
run_test "Red Flag Index Search Endpoint" \
    "curl -s -o /dev/null -w '%{http_code}' '$API_URL/api/evidence/search?query=Epstein&redFlagMin=3' | grep -q '200'" \
    ""

# Test 5: Red Flag Index Response Structure
run_test "Red Flag Index Response Structure" \
    "curl -s '$API_URL/api/evidence/search?query=Epstein&redFlagMin=3' | jq -r '.data[0].red_flag_rating' | grep -q '[0-5]'" \
    ""

# Test 6: Red Flag Visual Indicators
run_test "Red Flag Visual Indicators" \
    "curl -s '$API_URL/api/evidence/search?query=Epstein&redFlagMin=3' | jq -r '.data[0].red_flag_indicators' | grep -q '[⚪🟡🟠🔴🟣⚫]'" \
    ""

# Test 7: Red Flag Descriptions
run_test "Red Flag Descriptions" \
    "curl -s '$API_URL/api/evidence/search?query=Epstein&redFlagMin=3' | jq -r '.data[0].red_flag_description' | grep -q 'Red Flags'" \
    ""

# Test 8: Search Filtering by Red Flag Range
run_test "Search Filtering by Red Flag Range" \
    "curl -s '$API_URL/api/evidence/search?query=Epstein&redFlagMin=4&redFlagMax=5' | jq -r '.data | length > 0' | grep -q 'true'" \
    ""

# Test 9: Legacy Search Endpoint Compatibility
run_test "Legacy Search Endpoint Compatibility" \
    "curl -s -o /dev/null -w '%{http_code}' '$API_URL/api/search?q=Epstein' | grep -q '200'" \
    ""

# Test 10: Entity Detail Endpoint
run_test "Entity Detail Endpoint" \
    "curl -s -o /dev/null -w '%{http_code}' '$API_URL/api/entities/1' | grep -q '200'" \
    ""

# Test 11: Entity Detail Red Flag Data
run_test "Entity Detail Red Flag Data" \
    "curl -s '$API_URL/api/entities/1' | jq -r '.red_flag_rating' | grep -q '[0-5]'" \
    ""

# Test 12: Statistics Endpoint
run_test "Statistics Endpoint" \
    "curl -s -o /dev/null -w '%{http_code}' '$API_URL/api/stats' | grep -q '200'" \
    ""

# Test 13: Timeline Endpoint
run_test "Timeline Endpoint" \
    "curl -s -o /dev/null -w '%{http_code}' '$API_URL/api/timeline' | grep -q '200'" \
    ""

# Test 14: Web Server Response
run_test "Web Server Response" \
    "curl -s -o /dev/null -w '%{http_code}' '$WEB_URL/' | grep -q '200\\|301\\|302'" \
    ""

# Test 15: API Error Handling
run_test "API Error Handling" \
    "curl -s -o /dev/null -w '%{http_code}' '$API_URL/api/evidence/search' | grep -q '400'" \
    ""

# Test 16: Invalid Entity ID Handling
run_test "Invalid Entity ID Handling" \
    "curl -s -o /dev/null -w '%{http_code}' '$API_URL/api/entities/invalid-id' | grep -q '400\\|404'" \
    ""

# Test 17: Database Query Performance
run_test "Database Query Performance" \
    "timeout 10 curl -s '$API_URL/api/evidence/search?query=Epstein&redFlagMin=3' | jq -r '.data | length >= 0' | grep -q 'true'" \
    ""

# Test 18: Response Caching Headers
run_test "Response Caching Headers" \
    "curl -s -I '$API_URL/api/evidence/search?query=Epstein&redFlagMin=3' | grep -q 'Cache-Control'" \
    ""

# Test 19: Security Headers
run_test "Security Headers" \
    "curl -s -I '$API_URL/api/health' | grep -q 'X-Content-Type-Options\\|X-Frame-Options\\|Content-Security-Policy'" \
    ""

# Test 20: Memory Usage Check
run_test "Memory Usage Check" \
    "curl -s '$API_URL/api/health' | jq -r '.memory.heapUsed' | awk '{print (\$1 < 100000000)}' | grep -q '1'" \
    ""

# Summary Report
echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}VERIFICATION SUMMARY${NC}"
echo -e "${BLUE}========================================${NC}"

info_msg "Total Tests: $TESTS_TOTAL"
success_msg "Tests Passed: $TESTS_PASSED"
error_msg "Tests Failed: $TESTS_FAILED"

if [ "$TESTS_FAILED" -eq 0 ]; then
    echo -e "\n${GREEN}🎉 ALL TESTS PASSED! Deployment is successful.${NC}"
    log "All verification tests passed"
    exit_code=0
else
    echo -e "\n${RED}❌ Some tests failed. Please review the issues above.${NC}"
    log "$TESTS_FAILED tests failed"
    exit_code=1
fi

# Additional Information
echo -e "\n${YELLOW}Additional Information:${NC}"
echo -e "API Base URL: $API_URL"
echo -e "Web Base URL: $WEB_URL"
echo -e "Health Check: $API_URL/api/health"
echo -e "Red Flag Test: $API_URL/api/evidence/search?query=Epstein&redFlagMin=3"
echo -e "Log File: $LOG_FILE"

# Service Status Check
echo -e "\n${YELLOW}Service Status:${NC}"
if command -v pm2 &> /dev/null; then
    pm2 status 2>/dev/null || warning_msg "PM2 not available"
else
    warning_msg "PM2 not installed"
fi

echo -e "\n${BLUE}========================================${NC}"

exit $exit_code