#!/bin/bash
set -e

# Configuration
SERVER_IP="194.195.248.217"
USER="deploy"
PASSWORD="3231"
REMOTE_DIR="/var/www/epstein-archive"

echo "🚀 Starting deployment to epstein.academy..."

# Build frontend
echo "📦 Building frontend..."
npm run build

# Create archive
echo "📦 Creating archive..."
# Exclude node_modules, .git, etc.
tar -czf deploy.tar.gz dist src package.json package-lock.json epstein-archive.db

# Transfer archive
echo "📤 Transferring archive..."
./scripts/scp_to_remote.exp deploy.tar.gz $USER@$SERVER_IP:~/deploy.tar.gz $PASSWORD

# Transfer Nginx config
echo "📤 Transferring Nginx config..."
./scripts/scp_to_remote.exp scripts/epstein.academy.conf $USER@$SERVER_IP:~/epstein.academy.conf $PASSWORD

# Deploy on server
echo "🛠️  Deploying on server..."
./scripts/ssh_exec.exp $SERVER_IP $USER $PASSWORD "
  echo 'Extracting files...'
  tar -xzf deploy.tar.gz
  
  echo 'Stopping application to prevent database corruption...'
  pm2 stop epstein-archive || true

  echo 'Moving files to app directory...'
  # Ensure directory exists
  echo $PASSWORD | sudo -S mkdir -p $REMOTE_DIR
  echo $PASSWORD | sudo -S chown -R $USER:$USER $REMOTE_DIR
  
  cp -r dist src package.json package-lock.json epstein-archive.db $REMOTE_DIR/
  
  cd $REMOTE_DIR
  echo 'Installing dependencies...'
  npm install --production
  
  echo 'Starting application...'
  # Restart with tsx
  pm2 start src/server.ts --name epstein-archive --interpreter ./node_modules/.bin/tsx
  pm2 save
  
  echo 'Configuring Nginx...'
  echo $PASSWORD | sudo -S cp ~/epstein.academy.conf /etc/nginx/sites-available/epstein.academy
  echo $PASSWORD | sudo -S ln -sf /etc/nginx/sites-available/epstein.academy /etc/nginx/sites-enabled/
  echo $PASSWORD | sudo -S rm -f /etc/nginx/sites-enabled/default
  echo $PASSWORD | sudo -S nginx -t
  echo $PASSWORD | sudo -S systemctl reload nginx
  
  echo 'Setting up SSL...'
  # Check if certificate already exists to avoid rate limits or errors
  if [ ! -d /etc/letsencrypt/live/epstein.academy ]; then
    echo $PASSWORD | sudo -S certbot --nginx -d epstein.academy --non-interactive --agree-tos -m admin@epstein.academy --redirect
  else
    echo 'SSL certificate already exists.'
  fi
"

# Clean up
rm deploy.tar.gz

echo "✅ Deployment complete! Visit https://epstein.academy"
