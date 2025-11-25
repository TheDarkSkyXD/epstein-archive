#!/bin/bash

# Epstein Archive Repository Cleanup Script
# This script removes build artifacts, temporary files, logs, and other unnecessary files

set -e

echo "🧹 Starting Epstein Archive Repository Cleanup..."

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

# Confirm before proceeding
confirm_cleanup() {
    echo ""
    read -p "Are you sure you want to clean up the repository? This will remove logs, temporary files, and build artifacts. (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cleanup cancelled."
        exit 0
    fi
}

# Main cleanup function
cleanup_repository() {
    log_info "Starting repository cleanup..."
    
    # Count files to be removed
    LOG_COUNT=$(find . -name "*.log" -type f | wc -l)
    TEMP_COUNT=$(find . -name "*.tmp" -o -name "*.bak" -o -name "*.old" -type f | wc -l)
    DS_STORE_COUNT=$(find . -name ".DS_Store" -type f | wc -l)
    
    echo "Files to be removed:"
    echo "  - Log files: $LOG_COUNT"
    echo "  - Temporary files: $TEMP_COUNT"
    echo "  - .DS_Store files: $DS_STORE_COUNT"
    echo ""
    
    # Remove log files
    find . -name "*.log" -type f -delete
    find . -name "*.log.*" -type f -delete
    log_info "Log files removed."
    
    # Remove temporary files
    find . -name "*.tmp" -type f -delete
    find . -name "*.bak" -type f -delete
    find . -name "*.old" -type f -delete
    log_info "Temporary files removed."
    
    # Remove .DS_Store files
    find . -name ".DS_Store" -type f -delete
    # Also remove from node_modules
    find ./node_modules -name ".DS_Store" -type f -delete 2>/dev/null || true
    # Force remove any remaining .DS_Store files
    rm -f ./.DS_Store 2>/dev/null || true
    log_info ".DS_Store files removed."
    
    # Remove database temporary files
    find . -name "*.db-shm" -type f -delete
    find . -name "*.db-wal" -type f -delete
    log_info "Database temporary files removed."
    
    # Remove compressed files (but keep some important ones)
    find . -name "*.gz" -type f -not -name "epstein-archive.db.gz" -delete
    find . -name "*.tar.gz" -type f -not -name "epstein-archive.tar.gz" -delete
    log_info "Compressed files removed (except key archives)."
    
    # Remove test results
    rm -rf "./test-results" "./playwright-report"
    log_info "Test results removed."
    
    # Remove node_modules cache
    rm -rf "./node_modules/.cache"
    log_info "Node modules cache removed."
    
    # Remove dist folder
    rm -rf "./dist"
    log_info "Dist folder removed."
    
    log_info "Repository cleanup completed successfully!"
}

# Show disk space savings
show_savings() {
    log_info "Cleanup completed. You have freed up disk space by removing unnecessary files."
}

# Main execution
main() {
    confirm_cleanup
    cleanup_repository
    show_savings
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