#!/bin/bash

# Epstein Archive Periodic Maintenance Cleanup Script
# This script should be run periodically to maintain server cleanliness
# and prevent disk space issues

set -e

echo "🧹 Starting Epstein Archive Periodic Maintenance Cleanup..."

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

# Clean up old backups, keeping only the most recent ones
cleanup_backups() {
    log_info "Cleaning up old backups..."
    
    # Keep only the 5 most recent backups in the backups directory
    cd /Users/veland/Downloads/Epstein\ Files/epstein-archive/backups/
    ls -t *.db | tail -n +6 | xargs -r rm -f
    log_info "Old backups in backups/ directory cleaned up."
    
    # Keep only the 3 most recent backups in the database_backups directory
    cd /Users/veland/Downloads/Epstein\ Files/epstein-archive/database_backups/
    ls -t *.db | tail -n +4 | xargs -r rm -f
    log_info "Old backups in database_backups/ directory cleaned up."
    
    cd /Users/veland/Downloads/Epstein\ Files/epstein-archive/
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
    
    log_info "Logs and temporary files cleaned up."
}

# Clean up test artifacts
cleanup_tests() {
    log_info "Cleaning up test artifacts..."
    
    # Remove test results
    rm -rf "./test-results" "./playwright-report" 2>/dev/null || true
    
    log_info "Test artifacts cleaned up."
}

# Show current disk usage
show_disk_usage() {
    log_info "Current disk usage:"
    echo "----------------------------------------"
    df -h /Users/veland/Downloads/Epstein\ Files/
    echo "----------------------------------------"
}

# Main cleanup function
maintenance_cleanup() {
    log_info "Starting maintenance cleanup..."
    
    cleanup_backups
    cleanup_logs_temp
    cleanup_tests
    
    log_info "Maintenance cleanup completed successfully!"
}

# Main execution
main() {
    maintenance_cleanup
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