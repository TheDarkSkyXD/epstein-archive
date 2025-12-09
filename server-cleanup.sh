#!/bin/bash

# Epstein Archive Production Server Cleanup Script
# This script removes old backups, temporary files, logs, and other unnecessary files
# to free up space for the latest deployment while preserving essential data

set -e

echo "🧹 Starting Epstein Archive Production Server Cleanup..."

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
    read -p "Are you sure you want to clean up the production server? This will remove old backups and temporary files. (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cleanup cancelled."
        exit 0
    fi
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

# Remove unnecessary large files
cleanup_large_files() {
    log_info "Removing unnecessary large files..."
    
    # Remove old deployment packages except the most recent one
    find . -name "epstein-archive-deployment-*.tar.gz" -type f | head -n -1 | xargs -r rm -f
    
    # Remove old SQL files except the most important ones
    find . -name "deploy-*.sql" -type f -not -name "deploy_clean.sql" -not -name "deploy-no-fts.sql" | xargs -r rm -f
    
    log_info "Unnecessary large files removed."
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

# Clean up node_modules cache
cleanup_node_cache() {
    log_info "Cleaning up node_modules cache..."
    
    rm -rf "./node_modules/.cache" 2>/dev/null || true
    
    log_info "Node modules cache cleaned up."
}

# Show disk space savings
show_savings() {
    log_info "Cleanup completed. Showing disk space savings:"
    echo "----------------------------------------"
    df -h /Users/veland/Downloads/Epstein\ Files/
    echo "----------------------------------------"
}

# Main cleanup function
cleanup_server() {
    log_info "Starting server cleanup..."
    
    cleanup_backups
    cleanup_large_files
    cleanup_logs_temp
    cleanup_tests
    cleanup_node_cache
    
    log_info "Server cleanup completed successfully!"
}

# Main execution
main() {
    confirm_cleanup
    cleanup_server
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