#!/bin/bash
# SQLite Upgrade Script for Production Server
# This script upgrades SQLite to the latest version to fix compatibility issues

set -e

echo "🔧 SQLite Upgrade Script"
echo "========================"
echo ""

# Check current version
echo "📊 Current SQLite version:"
sqlite3 --version
echo ""

# Update package lists
echo "📦 Updating package lists..."
sudo apt update

# Install build dependencies
echo "🛠️  Installing build dependencies..."
sudo apt install -y build-essential wget

# Download latest SQLite
echo "⬇️  Downloading SQLite 3.45.0..."
cd /tmp
wget https://www.sqlite.org/2024/sqlite-autoconf-3450000.tar.gz

# Extract
echo "📂 Extracting..."
tar xzf sqlite-autoconf-3450000.tar.gz
cd sqlite-autoconf-3450000

# Configure and build
echo "🔨 Building SQLite..."
./configure --prefix=/usr/local
make

# Install
echo "📥 Installing SQLite..."
sudo make install

# Update library cache
sudo ldconfig

# Verify installation
echo ""
echo "✅ Installation complete!"
echo "📊 New SQLite version:"
/usr/local/bin/sqlite3 --version

# Update alternatives to use new version
echo ""
echo "🔗 Updating system alternatives..."
sudo update-alternatives --install /usr/bin/sqlite3 sqlite3 /usr/local/bin/sqlite3 100

echo ""
echo "✅ SQLite upgrade complete!"
echo ""
echo "To verify, run: sqlite3 --version"
echo ""
