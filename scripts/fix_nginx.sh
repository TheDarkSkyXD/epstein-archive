#!/bin/bash
# Fix nginx API routing for epstein.academy
# This script updates the nginx configuration to properly proxy /api requests

echo "🔧 Fixing nginx API routing..."
echo ""

# Backup current config
sudo cp /etc/nginx/sites-available/epstein.academy /etc/nginx/sites-available/epstein.academy.backup
echo "✅ Backed up current config"

# Update the proxy_pass line
sudo sed -i 's|proxy_pass http://127.0.0.1:3012/;|proxy_pass http://127.0.0.1:3012/api/;|g' /etc/nginx/sites-available/epstein.academy

echo "✅ Updated proxy configuration"
echo ""

# Test nginx configuration
echo "🧪 Testing nginx configuration..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Configuration test passed"
    echo "🔄 Reloading nginx..."
    sudo systemctl reload nginx
    echo "✅ Nginx reloaded successfully"
    echo ""
    echo "🎉 API routing fixed!"
    echo ""
    echo "Test with: curl https://epstein.academy/api/health"
else
    echo ""
    echo "❌ Configuration test failed"
    echo "Restoring backup..."
    sudo cp /etc/nginx/sites-available/epstein.academy.backup /etc/nginx/sites-available/epstein.academy
    echo "Backup restored"
    exit 1
fi
