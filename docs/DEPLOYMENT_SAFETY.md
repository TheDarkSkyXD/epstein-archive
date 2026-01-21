# Deployment Safety Guide

This document describes the safeguards in place to prevent production database failures and ensure safe deployments.

## Overview

The Epstein Archive uses multiple layers of protection to ensure deployments never cause database corruption or outages:

1. **Pre-deployment verification** - Schema and query validation before any changes
2. **Automatic backups** - Created before every deployment
3. **Deep health checks** - Comprehensive database integrity verification
4. **Automatic rollback** - Immediate recovery if deployment fails
5. **PM2 crash protection** - Prevents restart loops on failures

## Verification Layers

### 1. Pre-Deployment Verification (`npm run verify`)

Run before deploying to catch issues early:

```bash
npm run verify
```

This checks:
- All required tables exist
- Required columns are present
- Database integrity (PRAGMA integrity_check)
- Critical queries execute successfully
- Environment configuration is correct
- PM2 ecosystem.config.cjs is valid

### 2. Build-Time Verification

The `build:prod` script compiles both frontend and server TypeScript, catching any type errors.

### 3. Post-Deployment Health Checks

After deployment, the deploy script runs 4 phases of verification:

**Phase 1: Basic Health Check**
- Retries up to 3 times with 15s delay
- Verifies `/api/health` returns status "healthy"

**Phase 2: Deep Health Check**
- Calls `/api/health/deep` which runs:
  - Database connection test
  - PRAGMA integrity_check
  - Critical table existence checks
  - Query execution test
  - Memory usage check
  - Journal mode verification

**Phase 3: API Smoke Tests**
- Tests `/api/entities?limit=1`
- Tests `/api/documents?limit=1`
- Tests `/api/stats`

**Phase 4: Database Query Verification**
- Confirms actual data is returned from queries
- Validates entity count > 0

## Health Check Endpoints

### Basic Health (`/api/health`)
Fast endpoint for load balancers. Returns:
- `status`: "healthy" | "degraded"
- `database`: connection status
- `data`: entity/document counts
- `uptime`: server uptime

### Deep Health (`/api/health/deep`)
Comprehensive endpoint for deployment verification. Returns:
- `status`: "healthy" | "degraded" | "critical"
- `checks`: Individual check results with pass/fail/warn status
  - database_connection
  - database_integrity
  - table_entities, table_documents, etc.
  - query_execution
  - journal_mode
  - memory
  - database_size

## Automatic Rollback

If any health check fails, the deploy script automatically:

1. Stops the PM2 application
2. Kills any processes on port 3012
3. Restores the backup `dist` folder
4. Removes stale WAL/SHM files (prevents corruption)
5. Restores the backup database
6. Restarts the application
7. Verifies the rollback succeeded

### Manual Rollback

If automatic rollback fails, run:

```bash
# Find available backups
ls -la dist.backup-* epstein-archive.db.backup-*

# Rollback to a specific timestamp
./scripts/emergency_rollback.sh 20240121-143000
```

## PM2 Crash Protection

The `ecosystem.config.cjs` includes safeguards:

```javascript
{
  // Must run 30s before considered "started"
  min_uptime: '30s',
  
  // Max 5 restarts before giving up
  max_restarts: 5,
  
  // 10s between restart attempts
  restart_delay: 10000,
  
  // Exponential backoff
  exp_backoff_restart_delay: 100,
  
  // 10s graceful shutdown (DB close)
  kill_timeout: 10000,
}
```

## Database Safety

### WAL Mode
SQLite is configured to use Write-Ahead Logging (WAL) mode for better:
- Concurrent read/write performance
- Crash recovery
- Reduced corruption risk

### Busy Timeout
`SQLITE_BUSY_TIMEOUT: 30000` prevents "database is locked" errors.

### Journal Cleanup
During deployment, stale journal files are explicitly removed:
```bash
rm -f epstein-archive.db-wal epstein-archive.db-shm epstein-archive.db-journal
```

## Deployment Commands

```bash
# Full deployment with all safeguards
./deploy-to-production.sh

# Code-only deployment (no DB sync)
./deploy-to-production.sh deploy-code

# Pre-flight verification only
npm run verify

# Post-deployment verification (local testing)
npm run verify:post-deploy

# Emergency rollback
npm run rollback <timestamp>
```

## Debugging Failed Deployments

If a deployment fails:

```bash
# Check PM2 logs
ssh glasscode 'pm2 logs epstein-archive --lines 100'

# Check deep health
ssh glasscode 'curl http://localhost:3012/api/health/deep | jq'

# Check database integrity
ssh glasscode 'cd /home/deploy/epstein-archive && sqlite3 epstein-archive.db "PRAGMA integrity_check;"'

# List available backups
ssh glasscode 'cd /home/deploy/epstein-archive && ls -la *.backup-*'
```

## Best Practices

1. **Always run `npm run verify` before deploying**
2. **Test locally first** with `npm run server` and check `/api/health/deep`
3. **Monitor the deployment output** - don't walk away mid-deploy
4. **Keep at least 3 backups** on the server
5. **If rollback fails**, check PM2 logs immediately
6. **Never manually edit** the production database during deployment

## Recovery Procedures

### Database Corruption
```bash
# On server
sqlite3 epstein-archive.db "PRAGMA integrity_check;"

# If corrupted, restore from backup
./scripts/emergency_rollback.sh <timestamp>

# If no backup, try VACUUM
sqlite3 epstein-archive.db "VACUUM INTO 'recovered.db'"
mv recovered.db epstein-archive.db
```

### Application Won't Start
```bash
# Check for port conflicts
fuser -k 3012/tcp

# Check logs
pm2 logs epstein-archive

# Restart with fresh environment
pm2 delete epstein-archive
pm2 start ecosystem.config.cjs --env production
```
