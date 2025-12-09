#!/bin/bash

# Epstein Archive Remote Server Cleanup Script
# This script removes duplicate deployments, logs, and backups from the remote server

set -e

echo "🧹 Starting Epstein Archive Remote Server Cleanup..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration - Update these with your actual server details
PRODUCTION_SERVER="194.195.248.217"
PRODUCTION_PORT="22"
PRODUCTION_USER="deploy"
PRODUCTION_PATH="/home/deploy/epstein-archive"
BACKUP_PATH="/opt/backups/epstein-archive"
LOG_PATH="/var/log/epstein-archive"

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
    read -p "Are you sure you want to clean up the remote server? This will remove duplicate deployments, logs, and backups. (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cleanup cancelled."
        exit 0
    fi
}

# Cleanup duplicate deployments
cleanup_duplicate_deployments() {
    log_info "Cleaning up duplicate deployments..."
    
    # Connect to remote server and remove duplicate deployment packages
    ssh -p "$PRODUCTION_PORT" "$PRODUCTION_USER@$PRODUCTION_SERVER" "
        cd $PRODUCTION_PATH
        # Keep only the most recent deployment package
        ls -t epstein-archive-deployment-*.tar.gz | tail -n +2 | xargs -r rm -f
        echo 'Duplicate deployment packages removed.'
    "
}

# Cleanup old backups
cleanup_old_backups() {
    log_info "Cleaning up old backups..."
    
    # Connect to remote server and remove old backups, keeping only the most recent 5
    ssh -p "$PRODUCTION_PORT" "$PRODUCTION_USER@$PRODUCTION_SERVER" "
        if [ -d '$BACKUP_PATH' ]; then
            cd $BACKUP_PATH
            # Keep only the 5 most recent backups
            ls -t backup-* | tail -n +6 | xargs -r rm -rf
            echo 'Old backups removed.'
        else
            echo 'Backup directory not found.'
        fi
    "
}

# Cleanup log files
cleanup_logs() {
    log_info "Cleaning up log files..."
    
    # Connect to remote server and remove old log files
    ssh -p "$PRODUCTION_PORT" "$PRODUCTION_USER@$PRODUCTION_SERVER" "
        if [ -d '$LOG_PATH' ]; then
            cd $LOG_PATH
            # Remove log files older than 30 days
            find . -name '*.log' -type f -mtime +30 -delete
            # Truncate large log files (>100MB)
            find . -name '*.log' -type f -size +100M -exec truncate -s 0 {} \;
            echo 'Old and large log files cleaned up.'
        else
            echo 'Log directory not found.'
        fi
    "
}

# Cleanup temporary files
cleanup_temp_files() {
    log_info "Cleaning up temporary files..."
    
    # Connect to remote server and remove temporary files
    ssh -p "$PRODUCTION_PORT" "$PRODUCTION_USER@$PRODUCTION_SERVER" "
        # Remove temporary files
        find $PRODUCTION_PATH -name '*.tmp' -type f -delete 2>/dev/null || true
        find $PRODUCTION_PATH -name '*.bak' -type f -delete 2>/dev/null || true
        find $PRODUCTION_PATH -name '*.old' -type f -delete 2>/dev/null || true
        echo 'Temporary files removed.'
    "
}

# Show disk usage before and after
show_disk_usage() {
    log_info "Checking disk usage..."
    
    ssh -p "$PRODUCTION_PORT" "$PRODUCTION_USER@$PRODUCTION_SERVER" "
        echo 'Disk usage before cleanup:'
        df -h $PRODUCTION_PATH
        echo ''
    "
}

# Main cleanup function
cleanup_remote_server() {
    log_info "Starting remote server cleanup..."
    
    # Show disk usage before cleanup
    show_disk_usage
    
    # Perform cleanup operations
    cleanup_duplicate_deployments
    cleanup_old_backups
    cleanup_logs
    cleanup_temp_files
    
    # Show disk usage after cleanup
    show_disk_usage
    
    log_info "Remote server cleanup completed successfully!"
}

# Main execution
main() {
    confirm_cleanup
    cleanup_remote_server
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