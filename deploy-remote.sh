#!/bin/bash

# Epstein Archive Remote Deployment Script (Simplified)
# This script deploys the updated application with Red Flag Index support
# Uses pre-built files to avoid TypeScript compilation on server

set -e  # Exit on any error

# Configuration
APP_DIR="/opt/epstein-archive"
BACKUP_DIR="/opt/backups/epstein-archive"
LOG_FILE="/var/log/epstein-archive/deploy.log"
DB_FILE="$APP_DIR/epstein-archive.db"
API_PORT=3012
WEB_PORT=3005

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

error_exit() {
    echo -e "${RED}ERROR: $1${NC}" >&2
    log "ERROR: $1"
    exit 1
}

success_msg() {
    echo -e "${GREEN}SUCCESS: $1${NC}"
    log "SUCCESS: $1"
}

warning_msg() {
    echo -e "${YELLOW}WARNING: $1${NC}"
    log "WARNING: $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    error_exit "This script must be run as root"
fi

# Create necessary directories
mkdir -p "$BACKUP_DIR"
mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$APP_DIR"

log "Starting Epstein Archive deployment with Red Flag Index support"

# Step 1: Backup current deployment
echo -e "${YELLOW}Step 1: Creating backup...${NC}"
if [ -d "$APP_DIR" ] && [ "$(ls -A "$APP_DIR")" ]; then
    BACKUP_NAME="backup-$(date +%Y%m%d-%H%M%S)"
    cp -r "$APP_DIR" "$BACKUP_DIR/$BACKUP_NAME"
    success_msg "Backup created: $BACKUP_DIR/$BACKUP_NAME"
else
    warning_msg "No existing deployment found, skipping backup"
fi

# Step 2: Stop current services
echo -e "${YELLOW}Step 2: Stopping current services...${NC}"
if command -v pm2 &> /dev/null; then
    pm2 stop epstein-archive-api 2>/dev/null || warning_msg "API service not running"
    pm2 stop epstein-archive-web 2>/dev/null || warning_msg "Web service not running"
    pm2 delete epstein-archive-api 2>/dev/null || true
    pm2 delete epstein-archive-web 2>/dev/null || true
    success_msg "Services stopped"
else
    warning_msg "PM2 not found, services may still be running"
fi

# Step 3: Copy deployment files
echo -e "${YELLOW}Step 3: Copying deployment files...${NC}"
if [ -d "/tmp/epstein-archive-deployment" ]; then
    rm -rf "$APP_DIR"
    cp -r "/tmp/epstein-archive-deployment" "$APP_DIR"
    success_msg "Files copied to $APP_DIR"
else
    error_exit "Deployment files not found in /tmp/epstein-archive-deployment"
fi

# Step 4: Database migration
echo -e "${YELLOW}Step 4: Running database migration...${NC}"
if [ -f "migrations/20241125_red_flag_index.sql" ]; then
    if [ -f "$DB_FILE" ]; then
        # Backup database before migration
        cp "$DB_FILE" "$BACKUP_DIR/database-backup-$(date +%Y%m%d-%H%M%S).db"
        
        # Apply migration
        sqlite3 "$DB_FILE" < migrations/20241125_red_flag_index.sql
        success_msg "Database migration completed"
        
        # Verify migration
        if sqlite3 "$DB_FILE" "SELECT name FROM sqlite_master WHERE type='view' AND name='entity_summary' AND sql LIKE '%red_flag_rating%'" | grep -q "entity_summary"; then
            success_msg "Red Flag Index migration verified"
        else
            error_exit "Database migration verification failed"
        fi
    else
        warning_msg "Database file not found, migration skipped"
    fi
else
    warning_msg "Migration file not found, database update skipped"
fi

# Step 5: Set permissions
echo -e "${YELLOW}Step 5: Setting permissions...${NC}"
chown -R www-data:www-data "$APP_DIR"
chmod -R 755 "$APP_DIR"
chmod 644 "$APP_DIR"/*.json
chmod 644 "$APP_DIR"/*.md
chmod 755 "$APP_DIR"/*.sh
chmod 644 "$DB_FILE" 2>/dev/null || true
success_msg "Permissions set"

# Step 6: Create simple Node.js API server (no TypeScript compilation)
echo -e "${YELLOW}Step 6: Creating simple API server...${NC}"
cat > "$APP_DIR/api-server.js" << 'EOF'
const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3012;
const DB_PATH = process.env.DB_PATH || './epstein-archive.db';
const DATA_PATH = path.join(__dirname, 'data');

// Middleware
app.use(cors());
app.use(express.json());
// Serve static data (images)
try {
  app.use('/data', express.static(DATA_PATH));
} catch (e) {
  console.error('Static data setup failed:', e);
}

// Initialize database connection
let db;
try {
  db = new Database(DB_PATH, { readonly: true });
  console.log('Database connected successfully');
} catch (error) {
  console.error('Database connection failed:', error);
  process.exit(1);
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: db.open ? 'connected' : 'disconnected'
  });
});

// Evidence search endpoint with Red Flag Index support
app.get('/api/evidence/search', (req, res) => {
  try {
    const { query, redFlagMin, limit = 50 } = req.query;
    
    let sql = `
      SELECT 
        e.id,
        e.title,
        e.description,
        e.document_type,
        e.red_flag_rating,
        e.red_flag_description,
        e.publication_date,
        e.source_url,
        e.relevance_score
      FROM evidence e
      WHERE 1=1
    `;
    
    const params = [];
    
    if (query && query.trim()) {
      sql += ` AND (
        e.title LIKE ? OR 
        e.description LIKE ? OR 
        e.document_type LIKE ? OR
        e.red_flag_description LIKE ?
      )`;
      const searchTerm = `%${query.trim()}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    if (redFlagMin && redFlagMin >= 1 && redFlagMin <= 5) {
      sql += ` AND e.red_flag_rating >= ?`;
      params.push(parseInt(redFlagMin));
    }
    
    sql += ` ORDER BY e.red_flag_rating DESC, e.relevance_score DESC LIMIT ?`;
    params.push(parseInt(limit));
    
    const stmt = db.prepare(sql);
    const results = stmt.all(params);
    
    res.json({
      success: true,
      data: results,
      count: results.length,
      query: { query, redFlagMin, limit }
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed',
      message: error.message
    });
  }
});

// Evidence by ID endpoint
app.get('/api/evidence/:id', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT 
        e.id,
        e.title,
        e.description,
        e.document_type,
        e.red_flag_rating,
        e.red_flag_description,
        e.publication_date,
        e.source_url,
        e.relevance_score,
        e.content_preview,
        e.metadata
      FROM evidence e
      WHERE e.id = ?
    `);
    
    const result = stmt.get(req.params.id);
    
    if (result) {
      res.json({
        success: true,
        data: result
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Evidence not found'
      });
    }
  } catch (error) {
    console.error('Evidence fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch evidence',
      message: error.message
    });
  }
});

// Analytics endpoint
app.get('/api/analytics', (req, res) => {
  try {
    // Get Red Flag Index distribution
    const redFlagStmt = db.prepare(`
      SELECT 
        red_flag_rating,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM evidence), 2) as percentage
      FROM evidence 
      WHERE red_flag_rating IS NOT NULL
      GROUP BY red_flag_rating
      ORDER BY red_flag_rating DESC
    `);
    const redFlagDistribution = redFlagStmt.all();
    
    // Get document type distribution
    const docTypeStmt = db.prepare(`
      SELECT 
        document_type,
        COUNT(*) as count
      FROM evidence 
      WHERE document_type IS NOT NULL
      GROUP BY document_type
      ORDER BY count DESC
      LIMIT 10
    `);
    const documentTypes = docTypeStmt.all();
    
    // Get timeline data
    const timelineStmt = db.prepare(`
      SELECT 
        strftime('%Y-%m', publication_date) as month,
        COUNT(*) as count
      FROM evidence 
      WHERE publication_date IS NOT NULL
      GROUP BY month
      ORDER BY month
      LIMIT 24
    `);
    const timeline = timelineStmt.all();
    
    res.json({
      success: true,
      data: {
        redFlagDistribution,
        documentTypes,
        timeline,
        totalDocuments: db.prepare('SELECT COUNT(*) as count FROM evidence').get().count
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Analytics failed',
      message: error.message
    });
  }
});

// Entity summary endpoint
app.get('/api/entities/summary', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT 
        entity_name,
        entity_type,
        COUNT(*) as mention_count,
        AVG(red_flag_rating) as avg_red_flag_rating,
        MAX(red_flag_rating) as max_red_flag_rating,
        GROUP_CONCAT(DISTINCT document_type) as document_types
      FROM entity_summary
      WHERE entity_name IS NOT NULL
      GROUP BY entity_name, entity_type
      ORDER BY mention_count DESC
      LIMIT 100
    `);
    
    const results = stmt.all();
    
    res.json({
      success: true,
      data: results,
      count: results.length
    });
  } catch (error) {
    console.error('Entity summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Entity summary failed',
      message: error.message
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  if (db) db.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  if (db) db.close();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Epstein Archive API server running on port ${PORT}`);
  console.log(`Database: ${DB_PATH}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'production'}`);
});
EOF

success_msg "Simple API server created"

# Step 7: Create PM2 ecosystem configuration
echo -e "${YELLOW}Step 7: Creating PM2 configuration...${NC}"
cat > "$APP_DIR/ecosystem.config.js" << 'EOF'
module.exports = {
  apps: [
    {
      name: 'epstein-archive-api',
      script: 'api-server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3012,
        DB_PATH: '/opt/epstein-archive/epstein-archive.db'
      },
      error_file: '/var/log/epstein-archive/api-error.log',
      out_file: '/var/log/epstein-archive/api-out.log',
      log_file: '/var/log/epstein-archive/api-combined.log',
      time: true
    },
    {
      name: 'epstein-archive-web',
      script: 'serve',
      args: '-s dist -l 3005',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      },
      error_file: '/var/log/epstein-archive/web-error.log',
      out_file: '/var/log/epstein-archive/web-out.log',
      log_file: '/var/log/epstein-archive/web-combined.log',
      time: true
    }
  ]
};
EOF

# Install serve for static file hosting
npm install -g serve

success_msg "PM2 configuration created"

# Step 8: Start services
echo -e "${YELLOW}Step 8: Starting services...${NC}"
cd "$APP_DIR"
pm2 start ecosystem.config.js
sleep 5  # Wait for services to start

# Step 9: Verification
echo -e "${YELLOW}Step 9: Verifying deployment...${NC}"

# Check if API is responding
API_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$API_PORT/api/health" 2>/dev/null || echo "000")
if [ "$API_HEALTH" = "200" ]; then
    success_msg "API health check passed"
else
    error_exit "API health check failed (HTTP $API_HEALTH)"
fi

# Check if web server is responding
WEB_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$WEB_PORT/" 2>/dev/null || echo "000")
if [ "$WEB_HEALTH" = "200" ]; then
    success_msg "Web server health check passed"
else
    warning_msg "Web server health check failed (HTTP $WEB_HEALTH)"
fi

# Test Red Flag Index functionality
echo -e "${YELLOW}Testing Red Flag Index functionality...${NC}"
RED_FLAG_TEST=$(curl -s "http://localhost:$API_PORT/api/evidence/search?query=Epstein&redFlagMin=3" | jq -r '.data[0].red_flag_description' 2>/dev/null || echo "")
if [ -n "$RED_FLAG_TEST" ]; then
    success_msg "Red Flag Index functionality working: $RED_FLAG_TEST"
else
    warning_msg "Red Flag Index test inconclusive"
fi

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup systemd -u root --hp /root

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}DEPLOYMENT COMPLETED SUCCESSFULLY!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "API Server: http://localhost:$API_PORT"
echo -e "Web Server: http://localhost:$WEB_PORT"
echo -e "Health Check: http://localhost:$API_PORT/api/health"
echo -e "Red Flag Test: http://localhost:$API_PORT/api/evidence/search?query=Epstein&redFlagMin=3"
echo -e "${GREEN}========================================${NC}"

log "Deployment completed successfully"

# Show service status
echo -e "${YELLOW}Service Status:${NC}"
pm2 status

echo -e "${YELLOW}Recent Logs:${NC}"
pm2 logs --lines 10 --nostream

exit 0
