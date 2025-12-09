#!/bin/bash

# Comprehensive Epstein Archive Server Cleanup Script
# This script removes duplicate deploys, logs, and backups while preserving essential data

set -e

echo "🧹 Starting Comprehensive Epstein Archive Server Cleanup..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

log_debug() {
    echo -e "${BLUE}[DEBUG]${NC} $1"
}

# Confirm before proceeding
confirm_cleanup() {
    echo ""
    read -p "Are you sure you want to perform comprehensive server cleanup? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cleanup cancelled."
        exit 0
    fi
}

# Clean up duplicate deployment files
cleanup_deployments() {
    log_info "Cleaning up duplicate deployment files..."
    
    # Count deployment files before cleanup
    local deploy_count_before=$(find . -name "*deployment*.tar.gz" -type f | wc -l)
    
    # Keep only the most recent deployment file
    cd /Users/veland/Downloads/Epstein\ Files/epstein-archive
    find . -name "*deployment*.tar.gz" -type f -printf '%T@ %p\n' | sort -nr | tail -n +2 | cut -d' ' -f2- | xargs -r rm -f
    
    # Clean up .deploy directory if it exists
    if [ -d ".deploy" ]; then
        rm -rf ".deploy"
        log_info "Removed .deploy directory"
    fi
    
    local deploy_count_after=$(find . -name "*deployment*.tar.gz" -type f | wc -l)
    log_info "Deployment files: $deploy_count_before -> $deploy_count_after"
}

# Clean up logs and temporary files
cleanup_logs_temp() {
    log_info "Cleaning up logs and temporary files..."
    
    # Count log files before cleanup
    local log_count_before=$(find . -name "*.log" -o -name "*.log.*" -type f | wc -l)
    
    # Remove log files
    find . -name "*.log" -type f -delete
    find . -name "*.log.*" -type f -delete
    
    # Count temp files before cleanup
    local temp_count_before=$(find . -name "*.tmp" -o -name "*.bak" -o -name "*.old" -type f | wc -l)
    
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
    
    log_info "Log files removed: $log_count_before"
    log_info "Temp files removed: $temp_count_before"
}

# Clean up old backups, keeping only the most recent ones
cleanup_backups() {
    log_info "Cleaning up old backups..."
    
    # Backups directory - keep only 3 most recent
    if [ -d "backups" ]; then
        cd backups
        local backup_count_before=$(ls -1 *.db 2>/dev/null | wc -l)
        ls -t *.db 2>/dev/null | tail -n +4 | xargs -r rm -f
        local backup_count_after=$(ls -1 *.db 2>/dev/null | wc -l)
        log_info "Backups directory: $backup_count_before -> $backup_count_after files"
        cd ..
    fi
    
    # Database backups directory - keep only 2 most recent
    if [ -d "database_backups" ]; then
        cd database_backups
        local db_backup_count_before=$(ls -1 *.db 2>/dev/null | wc -l)
        ls -t *.db 2>/dev/null | tail -n +3 | xargs -r rm -f
        local db_backup_count_after=$(ls -1 *.db 2>/dev/null | wc -l)
        log_info "Database backups directory: $db_backup_count_before -> $db_backup_count_after files"
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

# Clean up large unnecessary SQL files
cleanup_large_sql() {
    log_info "Cleaning up large unnecessary SQL files..."
    
    # Remove large SQL files that are not essential
    # Keep only the most essential ones
    find . -name "deploy-*.sql" -type f -not -name "deploy_clean.sql" -not -name "deploy-no-fts.sql" | xargs -r rm -f
    
    log_info "Large SQL files cleaned up"
}

# Show disk space savings
show_savings() {
    log_info "Cleanup completed. Showing disk space usage:"
    echo "----------------------------------------"
    df -h /Users/veland/Downloads/Epstein\ Files/
    echo "----------------------------------------"
}

# Main cleanup function
comprehensive_cleanup() {
    log_info "Starting comprehensive server cleanup..."
    
    cleanup_deployments
    cleanup_logs_temp
    cleanup_backups
    cleanup_tests
    cleanup_node_cache
    cleanup_large_sql
    
    log_info "Comprehensive server cleanup completed successfully!"
}

# Main execution
main() {
    confirm_cleanup
    comprehensive_cleanup
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