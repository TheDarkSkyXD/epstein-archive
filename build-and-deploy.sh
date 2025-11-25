#!/bin/bash

# Epstein Archive Production Build and Deployment Script
# This script cleans up the repository, builds the application, enriches data, and prepares for deployment

set -e

echo "🚀 Starting Epstein Archive Production Build and Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BUILD_DIR="./dist"
DATA_DIR="./data"
LOGS_DIR="./logs"
BACKUPS_DIR="./backups"
DB_FILE="epstein-archive.db"
ENRICHED_DB_FILE="epstein-archive-production.db"

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

# Cleanup function to remove build artifacts and temporary files
cleanup_build_artifacts() {
    log_step "Cleaning up build artifacts and temporary files..."
    
    # Remove log files
    find . -name "*.log" -type f -delete
    find . -name "*.log.*" -type f -delete
    
    # Remove temporary files
    find . -name "*.tmp" -type f -delete
    find . -name "*.bak" -type f -delete
    find . -name "*.old" -type f -delete
    find . -name ".DS_Store" -type f -delete
    
    # Remove build directories
    rm -rf "$BUILD_DIR"
    rm -rf "./node_modules/.cache"
    
    # Remove database temporary files
    find . -name "*.db-shm" -type f -delete
    find . -name "*.db-wal" -type f -delete
    
    # Remove compressed backup files (keep the actual backups)
    find . -name "*.gz" -type f -delete
    find . -name "*.tar.gz" -type f -delete
    find . -name "*.db.gz" -type f -delete
    
    # Remove test results
    rm -rf "./test-results"
    rm -rf "./playwright-report"
    
    # Remove dist folder if it exists
    rm -rf "$BUILD_DIR"
    
    log_info "Build artifacts cleaned up successfully."
}

# Install dependencies
install_dependencies() {
    log_step "Installing production dependencies..."
    
    # Clean npm cache
    npm cache clean --force
    
    # Install only production dependencies
    npm ci --only=production
    
    log_info "Dependencies installed successfully."
}

# Build the frontend application
build_frontend() {
    log_step "Building frontend application..."
    
    # Build the application
    npm run build:prod
    
    log_info "Frontend built successfully."
}

# Create necessary directories
setup_directories() {
    log_step "Setting up directories..."
    
    mkdir -p "$DATA_DIR" "$LOGS_DIR" "$BACKUPS_DIR"
    
    log_info "Directories created successfully."
}

# Enrich database with production data
enrich_database() {
    log_step "Enriching database with production data..."
    
    # Check if database exists
    if [ ! -f "$DB_FILE" ]; then
        log_error "Database file $DB_FILE not found!"
        exit 1
    fi
    
    # Backup current database
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUPS_DIR/${DB_FILE%.db}_backup_$TIMESTAMP.db"
    cp "$DB_FILE" "$BACKUP_FILE"
    log_info "Database backed up to $BACKUP_FILE"
    
    # Run data enrichment script
    if [ -f "./scripts/enrich_production_data.ts" ]; then
        log_info "Running data enrichment script..."
        npx tsx ./scripts/enrich_production_data.ts
    else
        log_warn "Data enrichment script not found, skipping..."
    fi
    
    # Create production database copy
    cp "$DB_FILE" "$ENRICHED_DB_FILE"
    log_info "Production database created: $ENRICHED_DB_FILE"
}

# Optimize database
optimize_database() {
    log_step "Optimizing database..."
    
    # Run database optimization
    sqlite3 "$ENRICHED_DB_FILE" "VACUUM;"
    sqlite3 "$ENRICHED_DB_FILE" "ANALYZE;"
    
    log_info "Database optimized successfully."
}

# Package application for deployment
package_application() {
    log_step "Packaging application for deployment..."
    
    # Create deployment package
    DEPLOY_PACKAGE="epstein-archive-deployment-$(date +%Y%m%d).tar.gz"
    
    # Create a temporary directory for packaging
    TEMP_DIR="/tmp/epstein-archive-deploy-$(date +%s)"
    mkdir -p "$TEMP_DIR"
    
    # Copy necessary files
    cp -r "$BUILD_DIR" "$TEMP_DIR/"
    cp -r "src" "$TEMP_DIR/"
    cp "package.json" "$TEMP_DIR/"
    cp "package-lock.json" "$TEMP_DIR/"
    cp "$ENRICHED_DB_FILE" "$TEMP_DIR/"
    cp "Dockerfile" "$TEMP_DIR/"
    cp "docker-compose.yml" "$TEMP_DIR/"
    cp ".env.production" "$TEMP_DIR/" 2>/dev/null || cp ".env.example" "$TEMP_DIR/.env.production"
    
    # Create deployment script
    cat > "$TEMP_DIR/deploy.sh" << 'EOF'
#!/bin/bash

# Deployment script for Epstein Archive

set -e

echo "🚀 Deploying Epstein Archive..."

# Install dependencies
npm ci --only=production

# Start services
docker-compose up -d

echo "✅ Deployment completed successfully!"
EOF

    chmod +x "$TEMP_DIR/deploy.sh"
    
    # Create the package
    tar -czf "$DEPLOY_PACKAGE" -C "$TEMP_DIR" .
    
    # Clean up temporary directory
    rm -rf "$TEMP_DIR"
    
    log_info "Application packaged as $DEPLOY_PACKAGE"
}

# Show deployment information
show_deployment_info() {
    log_step "Deployment preparation completed!"
    echo ""
    echo "📊 Deployment Package Information:"
    echo "  - Package: epstein-archive-deployment-$(date +%Y%m%d).tar.gz"
    echo "  - Contains: Built application, enriched database, and deployment scripts"
    echo ""
    echo "📋 Next Steps:"
    echo "  1. Transfer the deployment package to your production server"
    echo "  2. Extract the package: tar -xzf epstein-archive-deployment-*.tar.gz"
    echo "  3. Run the deployment script: ./deploy.sh"
    echo "  4. Configure environment variables in .env.production"
    echo "  5. Start the application: docker-compose up -d"
    echo ""
    echo "📁 File Structure:"
    echo "  - Application files in: $BUILD_DIR/"
    echo "  - Production database: $ENRICHED_DB_FILE"
    echo "  - Deployment package: epstein-archive-deployment-*.tar.gz"
    echo ""
}

# Main deployment process
main() {
    log_info "Starting Epstein Archive production build and deployment..."
    
    cleanup_build_artifacts
    setup_directories
    install_dependencies
    build_frontend
    enrich_database
    optimize_database
    package_application
    show_deployment_info
    
    log_info "🚀 Production build and deployment preparation completed successfully!"
}

# Handle script arguments
case "${1:-build}" in
    build)
        main
        ;;
    cleanup)
        cleanup_build_artifacts
        ;;
    *)
        echo "Usage: $0 {build|cleanup}"
        exit 1
        ;;
esac