
#!/bin/bash
set -e

# Hardened Deployment Script
# 1. Backs up current build
# 2. Installs dependencies
# 3. Builds backend and frontend
# 4. Validates build (checks for critical files)
# 5. Restarts PM2 only if build is good

echo "Current date: $(date)"
echo "Starting hardened deployment..."

# Backup
if [ -d "dist" ]; then
    echo "Backing up previous dist..."
    rm -rf dist.bak
    cp -r dist dist.bak
fi

# Install
echo "Installing production dependencies..."
npm ci --production --quiet

# Build (in a real scenario, we might build on a CI server and rsync artifacts)
# But since we built locally and SCP'd, we will verify the artifacts exist.

if [ ! -f "dist/server.js" ]; then
    echo "CRITICAL ERROR: dist/server.js not found. Deployment aborted."
    exit 1
fi

if [ ! -d "dist/assets" ]; then
    echo "CRITICAL ERROR: dist/assets not found. Deployment aborted."
    exit 1
fi

# Syntax check
echo "Verifying server syntax..."
node --check dist/server.js

echo "Build verification passed."

# Reload
echo "Reloading PM2..."
pm2 reload epstein-archive --update-env

echo "Deployment success!"
