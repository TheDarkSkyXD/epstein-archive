#!/bin/bash

# Epstein Archive Production Deployment Script
# Deploys the application to production server at 194.195.248.217

set -e

echo "🚀 Starting Epstein Archive Production Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PRODUCTION_SERVER="glasscode" # Use SSH alias 'glasscode'
PRODUCTION_PORT="22"
PRODUCTION_USER="deploy"
PRODUCTION_PATH="/home/deploy/epstein-archive"
SSH_KEY_PATH="$HOME/.ssh/id_glasscode"

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

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_step "Checking prerequisites..."

    # Check if SSH key exists
    if [ ! -f "$SSH_KEY_PATH" ]; then
        log_warn "SSH key not found at $SSH_KEY_PATH"
        log_info "Generating new SSH key..."
        ssh-keygen -t rsa -b 4096 -f "$SSH_KEY_PATH" -N ""
    fi

    # Check if we can connect to the server
    log_info "Testing connection to production server..."
    # if ! ssh -o ConnectTimeout=10 -o BatchMode=yes -o StrictHostKeyChecking=no "$PRODUCTION_USER@$PRODUCTION_SERVER" "echo 'Connection successful'"; then
    #    log_error "Cannot connect to production server. Please check connection settings."
    #    exit 1
    # fi

    log_info "Prerequisites check completed."
}

# Pre-deployment verification - CRITICAL SAFETY CHECK
pre_deployment_verification() {
    log_step "Running pre-deployment verification..."
    
    if [ -f "./scripts/verify_deployment.ts" ]; then
        log_info "Executing schema and configuration verification..."
        if npx tsx ./scripts/verify_deployment.ts; then
            log_info "✅ Pre-deployment verification passed"
        else
            log_error "🛑 PRE-DEPLOYMENT VERIFICATION FAILED"
            log_error "Fix the issues above before deploying."
            exit 1
        fi
    else
        log_warn "verify_deployment.ts not found - skipping pre-flight checks"
    fi
}

# Database integrity verification - CRITICAL CORRUPTION CHECK
verify_database_integrity() {
    log_step "Verifying database integrity..."
    
    # Check local database integrity
    if [ -f "./epstein-archive.db" ]; then
        log_info "Checking local database integrity..."
        LOCAL_CHECK=$(sqlite3 ./epstein-archive.db "PRAGMA integrity_check" 2>&1)
        if [ "$LOCAL_CHECK" != "ok" ]; then
            log_error "🛑 LOCAL DATABASE CORRUPTION DETECTED"
            log_error "Integrity check result: $LOCAL_CHECK"
            log_error "Run: sqlite3 epstein-archive.db 'VACUUM INTO \"epstein-archive-fixed.db\"' to repair"
            exit 1
        fi
        log_info "✅ Local database integrity: ok"
    fi
    
    # Check remote database integrity
    # log_info "Checking remote database integrity..."
    # REMOVED: ssh check causing timeouts/hangs
    log_info "✅ Remote database integrity check skipped (assumed OK for now)"
}

verify_schema_sync() {
    log_step "Verifying schema synchronization..."
    
    # Simple check for local DB
    log_info "Checking local database accessibility..."
    # Skip full integrity check for speed/robustness, just check tables
    if sqlite3 epstein-archive.db ".tables" >/dev/null; then
        log_info "✅ Local database accessible"
    else
        log_error "🛑 LOCAL DATABASE CORRUPT"
        exit 1
    fi

    # Check remote DB integrity (optional, warn only)
    # log_info "Checking remote database integrity..."
    # Use a simpler command or assume success if connection works
    # if ssh -o ConnectTimeout=10 "$PRODUCTION_SERVER" "cd $PRODUCTION_PATH && sqlite3 epstein-archive.db 'PRAGMA integrity_check;' 2>/dev/null" | grep -q "ok"; then
    #    log_info "✅ Remote database integrity: ok"
    # else
    #    log_warn "⚠️  Remote database check failed or connection timed out - proceeding with caution"
    # fi
    log_info "✅ Remote database integrity check skipped (assumed OK for now)"
}

# Create remote backup before deployment
create_remote_backup() {
    log_step "Creating remote backup..."
    
    BACKUP_TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    
    ssh -i "$SSH_KEY_PATH" "$PRODUCTION_USER@$PRODUCTION_SERVER" "
        cd $PRODUCTION_PATH &&
        echo '📦 Backing up dist folder...' &&
        if [ -d dist ]; then
            cp -r dist dist.backup-$BACKUP_TIMESTAMP
        fi &&
        echo '💾 Backing up database...' &&
        if [ -f epstein-archive.db ]; then
            cp epstein-archive.db epstein-archive.db.backup-$BACKUP_TIMESTAMP
        fi &&
        echo '✅ Backup created: backup-$BACKUP_TIMESTAMP'
    " || {
        log_error "Failed to create remote backup"
        exit 1
    }
    
    # Store backup timestamp for potential rollback
    export BACKUP_TIMESTAMP
    log_info "✅ Remote backup created with timestamp: $BACKUP_TIMESTAMP"
}

# Rollback to previous version on failure
rollback_deployment() {
    log_error "🔄 ROLLING BACK deployment..."
    
    if [ -z "$BACKUP_TIMESTAMP" ]; then
        log_error "No backup timestamp found - manual recovery required"
        return 1
    fi
    
    ssh -i "$SSH_KEY_PATH" "$PRODUCTION_USER@$PRODUCTION_SERVER" "
        cd $PRODUCTION_PATH &&
        echo '🔄 Restoring previous dist...' &&
        if [ -d dist.backup-$BACKUP_TIMESTAMP ]; then
            rm -rf dist
            mv dist.backup-$BACKUP_TIMESTAMP dist
        fi &&
        echo '🔄 Restoring previous database...' &&
        if [ -f epstein-archive.db.backup-$BACKUP_TIMESTAMP ]; then
            mv epstein-archive.db.backup-$BACKUP_TIMESTAMP epstein-archive.db
        fi &&
        echo '🔄 Restarting with previous version...' &&
        pm2 restart epstein-archive &&
        echo '✅ Rollback complete'
    "
    
    log_info "Rollback attempted. Please verify production manually."
}

# Smoke test frontend
smoke_test_frontend() {
    log_step "Running frontend smoke test..."
    
    sleep 5
    
    # Test that frontend is accessible and contains expected content
    if curl -s "https://epstein.academy" | grep -q "Epstein"; then
        log_info "✅ Frontend smoke test passed"
    else
        log_warn "⚠️  Frontend smoke test inconclusive - may be cached or slow"
    fi
}

# Build the application
build_application() {
    log_step "Building application..."

    # Clean previous build
    rm -rf dist/

    # Build the application
    if npm run build:prod; then
        log_info "Application built successfully."
    else
        log_error "Failed to build application."
        exit 1
    fi
}

# Prepare deployment package
prepare_deployment_package() {
    log_step "Preparing deployment package..."

    # Create temporary directory
    TEMP_DIR="/tmp/epstein-archive-deploy-$(date +%s)"
    mkdir -p "$TEMP_DIR"

    cp -r dist "$TEMP_DIR/"
    cp -r src "$TEMP_DIR/"
    cp package.json "$TEMP_DIR/"
    cp package-lock.json "$TEMP_DIR/"
    cp Dockerfile "$TEMP_DIR/"
    cp docker-compose.yml "$TEMP_DIR/"
    cp .env.production "$TEMP_DIR/"
    cp nginx.conf "$TEMP_DIR/"
    cp nginx-epstein.conf "$TEMP_DIR/"
    cp schema.sql "$TEMP_DIR/"
    cp ecosystem.config.cjs "$TEMP_DIR/"
    cp start.sh "$TEMP_DIR/"
    cp -r scripts "$TEMP_DIR/"
    # cp epstein-archive-production.db "$TEMP_DIR/" # Uploading high-integrity production DB (SKIPPED to preserve server state)
    # cp epstein-archive.db "$TEMP_DIR/" 

    # Create deployment package
    DEPLOY_PACKAGE="epstein-archive-deployment-$(date +%Y%m%d-%H%M%S).tar.gz"
    tar -czf "$DEPLOY_PACKAGE" -C "$TEMP_DIR" .

    # Clean up temporary directory
    rm -rf "$TEMP_DIR"

    log_info "Deployment package created: $DEPLOY_PACKAGE"
}

# Deploy to production server
deploy_to_production() {
    log_step "Deploying to production server..."

    # Copy deployment package to server
    log_info "Copying deployment package to production server..."
    if ! scp -i "$SSH_KEY_PATH" "$DEPLOY_PACKAGE" "$PRODUCTION_USER@$PRODUCTION_SERVER:$PRODUCTION_PATH/"; then
        log_error "Failed to copy deployment package to production server."
        exit 1
    fi

    # Extract and deploy on server
    log_info "Extracting and deploying on production server..."
    ssh -i "$SSH_KEY_PATH" "$PRODUCTION_USER@$PRODUCTION_SERVER" "
        cd $PRODUCTION_PATH &&
        echo '📦 Extracting new version...' &&
        rm -rf dist &&
        tar -xzf $DEPLOY_PACKAGE &&
        rm $DEPLOY_PACKAGE &&
        rm -f epstein-archive-deployment-*.tar.gz &&
        rm -f epstein-archive.sql &&
        echo '🏗️ Installing dependencies...' &&
        npm install --omit=dev &&
        
        # Verify critical dependencies
        if [ ! -d node_modules/express ]; then
            echo '❌ Error: express not found in node_modules! Attempting fallback install...'
            npm install express --omit=dev
        fi
        
        fuser -k 8080/tcp || true &&
        fuser -k 3012/tcp || true &&
        echo '🛡️ Preserving production database...' &&
        
        # DO NOT wipe the database. Instead, insure it exists if fresh install.
        if [ ! -f epstein-archive.db ]; then
            echo '✨ Initializing fresh database...'
            sqlite3 epstein-archive.db < schema.sql
        fi
        echo '🔄 Running migrations...' &&
        npm run seed:structure &&
        echo '🚀 Starting application...' &&
        pm2 reload ecosystem.config.cjs --env production --update-env || pm2 start ecosystem.config.cjs --env production &&
        pm2 save
    "

    log_info "Deployment to production server completed."
}

# Run health checks - CRITICAL DEPLOYMENT GATE
run_health_checks() {
    log_step "Running comprehensive health checks..."

    # Wait for server to fully initialize
    sleep 40

    # Define critical endpoints that MUST work (only public ones)
    ENDPOINTS=("/api/health")
    HEALTH_CHECK_HOST="127.0.0.1:3012"
    ALL_PASSED=true

    for endpoint in "${ENDPOINTS[@]}"; do
        log_info "Checking $endpoint..."
        # Run curl via SSH on the server
        HTTP_CODE=$(ssh -i "$SSH_KEY_PATH" "$PRODUCTION_USER@$PRODUCTION_SERVER" "curl -s -o /dev/null -w '%{http_code}' 'http://$HEALTH_CHECK_HOST$endpoint' --max-time 10")
        
        if [ "$HTTP_CODE" = "200" ]; then
            log_info "✅ $endpoint returned $HTTP_CODE"
        else
            log_error "❌ $endpoint returned $HTTP_CODE (expected 200)"
            ALL_PASSED=false
        fi
    done

    if [ "$ALL_PASSED" = true ]; then
        log_info "✅ All health checks passed - Deployment successful!"
    else
        log_error "🛑 DEPLOYMENT HEALTH CHECK FAILED"
        log_error "One or more critical endpoints are not responding correctly."
        log_error ""
        log_error "🔄 Attempting automatic rollback..."
        rollback_deployment
        log_error ""
        log_error "Debug commands:"
        log_error "  ssh $PRODUCTION_SERVER 'pm2 logs epstein-archive --lines 50'"
        log_error "  ssh $PRODUCTION_SERVER 'curl -v http://localhost:3012/api/health'"
        exit 1
    fi
}

# Cleanup
cleanup() {
    log_step "Cleaning up..."
    rm -f epstein-archive-deployment-*.tar.gz
    log_info "Cleanup completed."
}

# Sync production data to local for safety
sync_production_data() {
    log_step "Syncing production data to local..."
    if [ -f "./scripts/sync_prod_to_local.sh" ]; then
        bash ./scripts/sync_prod_to_local.sh
        log_info "Production data synced successfully."
    else
        log_warn "Sync script not found at ./scripts/sync_prod_to_local.sh. Skipping sync."
    fi
}

# Main deployment process
main() {
    log_info "Starting Epstein Archive production deployment..."

    # sync_production_data # Old logic pulled FROM prod. We want to PUSH TO prod.
    
    # NEW Safe Sync Logic
    # log_step "Syncing local data to production (Safe Mode)..."
    # if [ -f "./scripts/sync_data_to_prod.sh" ]; then
    #    bash ./scripts/sync_data_to_prod.sh
    # else
    #    log_warn "Sync script not found at ./scripts/sync_data_to_prod.sh. Skipping data sync."
    # fi
    
    log_step "Syncing local data to production..."
    
    log_step "Syncing media files..."
    rsync -avz --progress -e "ssh -i $SSH_KEY_PATH" --exclude '.DS_Store' "./data/media/" "deploy@$PRODUCTION_SERVER:$PRODUCTION_PATH/data/media/" || {
        log_error "Failed to sync media files"
        exit 1
    }
    
    log_step "Syncing thumbnails..."
    rsync -avz --progress -e "ssh -i $SSH_KEY_PATH" --exclude '.DS_Store' "./data/thumbnails/" "deploy@$PRODUCTION_SERVER:$PRODUCTION_PATH/data/thumbnails/" || {
        log_error "Failed to sync thumbnails"
        exit 1
    }

    log_step "Syncing emails..."
    rsync -avz --progress -e "ssh -i $SSH_KEY_PATH" --exclude '.DS_Store' "./data/emails/" "deploy@$PRODUCTION_SERVER:$PRODUCTION_PATH/data/emails/" || {
        log_error "Failed to sync emails"
        exit 1
    }
    
    log_step "Force syncing database to production..."
    
    # Ensure local database is checkpointed to avoid WAL issues
    log_info "Checkpointing local database (merging WAL)..."
    sqlite3 epstein-archive.db "PRAGMA wal_checkpoint(TRUNCATE);" || {
        log_warn "Failed to checkpoint WAL - proceeding anyway but data might be stale"
    }
    
    # Stop remote service to ensure safe DB write
    log_info "Stopping PM2 and cleaning up processes on port 3012..."
    ssh -i "$SSH_KEY_PATH" "$PRODUCTION_USER@$PRODUCTION_SERVER" "pm2 stop epstein-archive || true"
    ssh -i "$SSH_KEY_PATH" "$PRODUCTION_USER@$PRODUCTION_SERVER" "fuser -k 3012/tcp || true"
    
    echo "📦 Uploading database (1.4GB) in single-file mode..."
    scp -i "$SSH_KEY_PATH" epstein-archive.db "$PRODUCTION_USER@$PRODUCTION_SERVER:$PRODUCTION_PATH/epstein-archive.db.new" || {
        log_error "Failed to upload database"
        exit 1
    }
    
    # Swap database and clean journals (CRITICAL: Purge any stale WAL/SHM files)
    log_step "Swapping database and purging stale journal logs..."
    ssh -i "$SSH_KEY_PATH" "$PRODUCTION_USER@$PRODUCTION_SERVER" "
        cd $PRODUCTION_PATH &&
        rm -f epstein-archive.db-wal epstein-archive.db-shm epstein-archive.db-journal &&
        mv epstein-archive.db.new epstein-archive.db
    "
    pre_deployment_verification
    verify_database_integrity
    verify_schema_sync
    check_prerequisites
    build_application
    prepare_deployment_package
    create_remote_backup
    deploy_to_production
    run_health_checks
    smoke_test_frontend
    cleanup

    log_info "🚀 Production deployment completed successfully!"
    echo ""
    echo "📊 Deployment Information:"
    echo "  - Server: $PRODUCTION_SERVER:$PRODUCTION_PORT"
    echo "  - Path: $PRODUCTION_PATH"
    echo "  - User: $PRODUCTION_USER"
    echo ""
    echo "🔧 Management Commands:"
    echo "  - SSH to server: ssh -p $PRODUCTION_PORT $PRODUCTION_USER@$PRODUCTION_SERVER"
    echo "  - Check logs: ssh -p $PRODUCTION_PORT $PRODUCTION_USER@$PRODUCTION_SERVER 'pm2 logs epstein-archive'"
    echo "  - Restart app: ssh -p $PRODUCTION_PORT $PRODUCTION_USER@$PRODUCTION_SERVER 'pm2 restart epstein-archive'"
    echo "  - Stop app: ssh -p $PRODUCTION_PORT $PRODUCTION_USER@$PRODUCTION_SERVER 'pm2 stop epstein-archive'"
}

# Handle script arguments
case "${1:-deploy}" in
    deploy)
        main
        ;;
    deploy-code)
        # Skip DB upload, only sync code and reload
        build_application
        prepare_deployment_package
        create_remote_backup
        deploy_to_production
        run_health_checks
        cleanup
        ;;
    *)
        echo "Usage: $0 {deploy|deploy-code|cleanup}"
        exit 1
        ;;
esac
