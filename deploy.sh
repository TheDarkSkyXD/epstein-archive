#!/bin/bash

# Epstein Archive Production Deployment Script
# This script handles the complete production deployment process

set -e

echo "🚀 Starting Epstein Archive Production Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOCKER_COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env.production"
SSL_DIR="./ssl"
LOGS_DIR="./logs"
DATA_DIR="./data"
BACKUPS_DIR="./backups"

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
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check if environment file exists
    if [ ! -f "$ENV_FILE" ]; then
        log_warn "Production environment file not found. Creating from template..."
        cp .env.example "$ENV_FILE"
        log_warn "Please edit $ENV_FILE with your production values before continuing."
        exit 1
    fi
    
    log_info "Prerequisites check completed."
}

# Create necessary directories
setup_directories() {
    log_step "Setting up directories..."
    
    mkdir -p "$LOGS_DIR" "$DATA_DIR" "$BACKUPS_DIR" "$SSL_DIR"
    
    # Create SSL directory with proper permissions
    chmod 700 "$SSL_DIR"
    
    log_info "Directories created successfully."
}

# Generate SSL certificates (self-signed for development)
generate_ssl_certs() {
    log_step "Generating SSL certificates..."
    
    if [ ! -f "$SSL_DIR/cert.pem" ] || [ ! -f "$SSL_DIR/key.pem" ]; then
        openssl req -x509 -newkey rsa:4096 -keyout "$SSL_DIR/key.pem" -out "$SSL_DIR/cert.pem" -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
        chmod 600 "$SSL_DIR/key.pem"
        chmod 644 "$SSL_DIR/cert.pem"
        log_info "SSL certificates generated successfully."
    else
        log_info "SSL certificates already exist."
    fi
}

# Build and deploy with Docker Compose
deploy_with_docker() {
    log_step "Building and deploying with Docker Compose..."
    
    # Pull latest images
    docker-compose -f "$DOCKER_COMPOSE_FILE" pull
    
    # Build the application
    docker-compose -f "$DOCKER_COMPOSE_FILE" build --no-cache
    
    # Stop existing containers
    docker-compose -f "$DOCKER_COMPOSE_FILE" down
    
    # Start the services
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d
    
    log_info "Docker deployment completed."
}

# Wait for services to be ready
wait_for_services() {
    log_step "Waiting for services to be ready..."
    
    # Wait for the main application
    timeout=300
    interval=10
    
    while [ $timeout -gt 0 ]; do
        if curl -f -s http://localhost:3012/api/health > /dev/null; then
            log_info "Application is ready!"
            break
        fi
        
        log_info "Waiting for application... ($timeout seconds remaining)"
        sleep $interval
        timeout=$((timeout - interval))
    done
    
    if [ $timeout -le 0 ]; then
        log_error "Application failed to start within the timeout period."
        docker-compose -f "$DOCKER_COMPOSE_FILE" logs
        exit 1
    fi
}

# Run health checks
run_health_checks() {
    log_step "Running health checks..."
    
    # API Health Check
    if curl -f -s http://localhost:3012/api/health | grep -q "healthy"; then
        log_info "✅ API Health Check: PASSED"
    else
        log_error "❌ API Health Check: FAILED"
        exit 1
    fi
    
    # Database Connection Check
    if curl -f -s http://localhost:3012/api/stats | grep -q "totalEntities"; then
        log_info "✅ Database Connection: PASSED"
    else
        log_error "❌ Database Connection: FAILED"
        exit 1
    fi
    
    log_info "All health checks passed!"
}

# Run end-to-end tests
run_e2e_tests() {
    log_step "Running end-to-end tests..."
    
    if npm run test:prod; then
        log_info "✅ E2E Tests: PASSED"
    else
        log_warn "⚠️  E2E Tests: SOME TESTS FAILED"
        # Don't fail the deployment for test failures, but warn
    fi
}

# Display deployment information
show_deployment_info() {
    log_step "Deployment completed successfully!"
    echo ""
    echo "📊 Deployment Information:"
    echo "  - Application URL: https://localhost (or your domain)"
    echo "  - API Health Check: http://localhost:3012/api/health"
    echo "  - API Statistics: http://localhost:3012/api/stats"
    echo "  - Logs: ./logs/"
    echo "  - Data: ./data/"
    echo "  - Backups: ./backups/"
    echo ""
    echo "🔧 Management Commands:"
    echo "  - View logs: docker-compose logs -f"
    echo "  - Stop services: docker-compose down"
    echo "  - Restart services: docker-compose restart"
    echo "  - Update deployment: ./deploy.sh"
    echo ""
    echo "📝 Next Steps:"
    echo "  1. Update your DNS to point to this server"
    echo "  2. Replace self-signed SSL certificates with proper ones"
    echo "  3. Configure monitoring and alerts"
    echo "  4. Set up automated backups"
    echo "  5. Review security settings"
}

# Cleanup function
cleanup() {
    log_step "Cleaning up..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" down
    log_info "Cleanup completed."
}

# Main deployment process
main() {
    log_info "Starting Epstein Archive production deployment..."
    
    # Set up trap for cleanup on exit
    trap cleanup EXIT
    
    check_prerequisites
    setup_directories
    generate_ssl_certs
    deploy_with_docker
    wait_for_services
    run_health_checks
    run_e2e_tests
    show_deployment_info
    
    log_info "🚀 Deployment completed successfully!"
}

# Handle script arguments
case "${1:-deploy}" in
    deploy)
        main
        ;;
    cleanup)
        cleanup
        ;;
    health)
        run_health_checks
        ;;
    logs)
        docker-compose logs -f
        ;;
    *)
        echo "Usage: $0 {deploy|cleanup|health|logs}"
        exit 1
        ;;
esac