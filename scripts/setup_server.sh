#!/bin/bash
set -e

# Ensure we are root
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root"
  exit 1
fi

DEPLOY_USER=${1:-deploy}

# Update and install dependencies
echo "Updating system..."
apt-get update
apt-get install -y curl nginx certbot python3-certbot-nginx git

# Install Node.js 20.x
echo "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install PM2
echo "Installing PM2..."
npm install -g pm2

# Check versions
echo "Node version:"
node -v
echo "NPM version:"
npm -v
echo "PM2 version:"
pm2 -v
echo "Nginx version:"
nginx -v

# Create app directory
mkdir -p /var/www/epstein-archive
chown -R $DEPLOY_USER:$DEPLOY_USER /var/www/epstein-archive
