#!/bin/bash

# Deployment script for Epstein Archive application

set -e  # Exit on any error

echo "🚀 Starting Epstein Archive deployment..."

# Define colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [[ ! -f "package.json" ]]; then
    print_error "This script must be run from the project root directory"
    exit 1
fi

# Kill any existing processes on our ports
print_status "Stopping any existing servers..."
pids=$(lsof -ti:3012,4173 2>/dev/null || true)
if [[ -n "$pids" ]]; then
    print_warning "Killing processes: $pids"
    kill -9 $pids 2>/dev/null || true
    sleep 2
fi

# Check if required database exists
if [[ ! -f "epstein.db" ]]; then
    print_error "epstein.db not found. Please ensure the database file exists."
    exit 1
fi

# Check database stats
print_status "Checking database..."
entity_count=$(sqlite3 epstein.db "SELECT COUNT(*) FROM entities;" 2>/dev/null || echo "0")
document_count=$(sqlite3 epstein.db "SELECT COUNT(*) FROM documents;" 2>/dev/null || echo "0")
print_status "Database contains $entity_count entities and $document_count documents"

# Ensure node_modules are installed
if [[ ! -d "node_modules" ]]; then
    print_status "Installing dependencies..."
    npm install
else
    print_status "Dependencies already installed"
fi

# Build the frontend
print_status "Building frontend..."
npm run build

# Start the API server in the background
print_status "Starting API server..."
API_LOG="api-server.log"
npm run api:prod > $API_LOG 2>&1 &
API_PID=$!

# Wait a moment for the API server to start
sleep 3

# Check if API server started successfully
if ps -p $API_PID > /dev/null; then
    print_status "API server started successfully (PID: $API_PID)"
else
    print_error "Failed to start API server. Check $API_LOG for details:"
    tail -20 $API_LOG
    exit 1
fi

# Start the frontend server
print_status "Starting frontend server..."
FRONTEND_LOG="frontend-server.log"
npm run preview > $FRONTEND_LOG 2>&1 &
FRONTEND_PID=$!

# Wait a moment for the frontend server to start
sleep 3

# Check if frontend server started successfully
if ps -p $FRONTEND_PID > /dev/null; then
    print_status "Frontend server started successfully (PID: $FRONTEND_PID)"
else
    print_error "Failed to start frontend server. Check $FRONTEND_LOG for details:"
    tail -20 $FRONTEND_LOG
    # Kill the API server since frontend failed
    kill $API_PID 2>/dev/null || true
    exit 1
fi

# Final status
echo ""
print_status "✅ Deployment completed successfully!"
print_status "🌐 Frontend available at: http://localhost:4173"
print_status "🔧 API available at: http://localhost:3012"
print_status "📊 Health check: http://localhost:3012/api/health"
echo ""
print_status "To stop the servers, run: kill $API_PID $FRONTEND_PID"
print_status "Logs are available in $API_LOG and $FRONTEND_LOG"

# Keep the script running to maintain the servers
wait $API_PID $FRONTEND_PID