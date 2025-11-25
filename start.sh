#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Epstein Archive Application...${NC}"

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed.${NC}"
    exit 1
fi

# Check for database
if [ ! -f "epstein-archive.db" ]; then
    echo -e "${YELLOW}Database not found. Please run migration scripts first if needed.${NC}"
    # Optional: Offer to run migration?
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
fi

# Kill existing processes on ports
echo -e "${YELLOW}Cleaning up ports 3002, 3012, 5173...${NC}"
lsof -ti:3002 | xargs kill -9 2>/dev/null
lsof -ti:3012 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null

# Start Application
echo -e "${GREEN}Starting API and Frontend...${NC}"
echo -e "${GREEN}API will run on http://localhost:3012${NC}"
echo -e "${GREEN}Frontend will run on http://localhost:3002${NC}"

# Run concurrently
npm run dev:api &

# Wait for services to start
echo -e "${YELLOW}Waiting for services to initialize...${NC}"
sleep 5

# Open Browser
if [[ "$OSTYPE" == "darwin"* ]]; then
    open http://localhost:3002
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    xdg-open http://localhost:3002
fi

echo -e "${GREEN}Application started! Press Ctrl+C to stop.${NC}"

# Keep script running
wait
