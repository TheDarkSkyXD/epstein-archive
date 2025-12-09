#!/bin/bash

# Epstein Archive Periodic Cleanup Script
# This script should be scheduled to run weekly to maintain server cleanliness

set -e

echo "🧹 Starting Epstein Archive Periodic Cleanup..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Clean up logs and temporary files
cleanup_logs_temp() {
    log_info "Cleaning up logs and temporary files..."
    
    # Remove log files
    find . -name "*.log" -type f -delete
    find . -name "*.log.*" -type f -delete
    
    # Remove temporary files
    find . -name "*.tmp" -type f -delete
    find . -name "*.bak" -type f -delete
    find . -name "*.old" -type f -delete
    
    # Remove database temporary files
    find . -name "*.db-shm" -type f -delete
    find . -name "*.db-wal" -type f -delete
    
    # Remove .DS_Store files
    find . -name ".DS_Store" -type f -delete
    find ./node_modules -name ".DS_Store" -type f -delete 2>/dev/null || true
    
    log_info "Logs and temporary files cleaned up"
}

# Clean up old backups, keeping only the most recent ones
cleanup_backups() {
    log_info "Cleaning up old backups..."
    
    # Backups directory - keep only 3 most recent
    if [ -d "backups" ]; then
        cd backups
        ls -t *.db 2>/dev/null | tail -n +4 | xargs -r rm -f
        log_info "Backups directory cleaned up"
        cd ..
    fi
    
    # Database backups directory - keep only 2 most recent
    if [ -d "database_backups" ]; then
        cd database_backups
        ls -t *.db 2>/dev/null | tail -n +3 | xargs -r rm -f
        log_info "Database backups directory cleaned up"
        cd ..
    fi
}

# Clean up test artifacts
cleanup_tests() {
    log_info "Cleaning up test artifacts..."
    
    # Remove test results directories if they exist
    rm -rf "./test-results" "./playwright-report" 2>/dev/null || true
    
    log_info "Test artifacts cleaned up"
}

# Clean up node_modules cache
cleanup_node_cache() {
    log_info "Cleaning up node_modules cache..."
    
    # Remove node_modules cache if it exists
    rm -rf "./node_modules/.cache" 2>/dev/null || true
    
    log_info "Node modules cache cleaned up"
}

# Show current disk usage
show_disk_usage() {
    log_info "Current disk usage:"
    echo "----------------------------------------"
    df -h /Users/veland/Downloads/Epstein\ Files/
    echo "----------------------------------------"
}

# Main cleanup function
periodic_cleanup() {
    log_info "Starting periodic cleanup..."
    
    cleanup_logs_temp
    cleanup_backups
    cleanup_tests
    cleanup_node_cache
    
    log_info "Periodic cleanup completed successfully!"
}

# Main execution
main() {
    cd /Users/veland/Downloads/Epstein\ Files/epstein-archive
    periodic_cleanup
    show_disk_usage
}

# Handle script arguments
case "${1:-cleanup}" in
    cleanup)
        main
        ;;
    *)
        echo "Usage: $0 {cleanup}"
        exit 1
        ;;
esac