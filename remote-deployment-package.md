# Epstein Archive - Remote Deployment Package

## Overview
This package contains everything needed to deploy the updated Epstein Archive platform with Red Flag Index functionality to the remote production server.

## What's Included
- Updated production server with Red Flag Index support
- Database migration scripts
- Build artifacts
- Deployment scripts
- Verification procedures

## Key Updates
1. **Red Flag Index Integration**: Replaced "spiciness" terminology with professional "Red Flag Index"
2. **Enhanced Search API**: New `/api/evidence/search` endpoint with Red Flag filtering
3. **Professional Visual Indicators**: Updated from 🌶️ peppers to ⚪🟡🟠🔴🟣⚫ flags
4. **Production-Ready Infrastructure**: Security middleware, rate limiting, health checks

## Deployment Steps

### 1. Server Preparation
```bash
# Connect to remote server
ssh root@194.195.248.217

# Navigate to application directory
cd /opt/epstein-archive

# Backup current deployment
cp -r current-deployment backup-$(date +%Y%m%d-%H%M%S)
```

### 2. Database Migration
```bash
# Apply Red Flag Index migration
sqlite3 epstein-archive.db < migrations/20241125_red_flag_index.sql

# Verify migration
sqlite3 epstein-archive.db "SELECT name, red_flag_rating FROM entity_summary WHERE red_flag_rating > 0 LIMIT 5;"
```

### 3. Application Deployment
```bash
# Stop current services
pm2 stop epstein-archive-api
pm2 stop epstein-archive-web

# Copy new files
cp -r /tmp/new-deployment/* /opt/epstein-archive/

# Install dependencies
npm install --production

# Build frontend
npm run build:prod

# Start services
pm2 start ecosystem.config.js
```

### 4. Verification
```bash
# Test health endpoint
curl http://localhost:3012/api/health

# Test Red Flag search
curl "http://localhost:3012/api/evidence/search?query=Epstein&redFlagMin=3"

# Check service status
pm2 status
```

## Configuration Files

### Production Server (src/server.production.ts)
- Enhanced with Red Flag Index support
- New `/api/evidence/search` endpoint
- Professional visual indicators
- Backward compatibility maintained

### Database Schema Updates
- Added `red_flag_rating` field to entity_summary view
- Updated search functionality to support Red Flag filtering
- Maintained data integrity and relationships

## API Endpoints

### Evidence Search
```
GET /api/evidence/search?query=SEARCH_TERM&redFlagMin=0&redFlagMax=5&page=1&limit=50
```

Response includes:
- `red_flag_rating`: Numeric rating (0-5)
- `red_flag_indicators`: Visual flag emoji
- `red_flag_description`: Professional description
- All existing entity data

### Health Check
```
GET /api/health
```

Returns server status, database connection, memory usage, and environment info.

## Troubleshooting

### Common Issues
1. **Database Connection**: Check SQLite file permissions
2. **Port Conflicts**: Ensure ports 3012 (API) and 3005 (Web) are available
3. **Memory Issues**: Monitor Node.js process memory usage
4. **SSL Certificate**: Verify certificate paths in nginx configuration

### Logs
```bash
# Application logs
tail -f /var/log/epstein-archive/api.log
tail -f /var/log/epstein-archive/web.log

# System logs
journalctl -u epstein-archive -f
```

## Security Considerations
- All API endpoints include rate limiting
- Database queries are parameterized
- Input validation on all endpoints
- Security headers via Helmet middleware
- Non-root user execution in Docker

## Performance Optimization
- Database indexing on search fields
- Response caching (60-second TTL)
- Gzip compression enabled
- Connection pooling for database

## Monitoring
- Health check endpoint for load balancers
- Memory and CPU monitoring
- Database connection monitoring
- Error rate tracking

## Backup and Recovery
- Daily automated database backups
- Application state snapshots
- Configuration version control
- Rollback procedures documented

---

**Deployment Date**: $(date)
**Version**: 2.0.0-RedFlagIndex
**Environment**: Production
**Server**: 194.195.248.217