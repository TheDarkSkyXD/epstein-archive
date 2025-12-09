# Manual Production Deployment Guide

## Prerequisites
- SSH access to deploy@68.183.186.127 (password: 3231)
- Local database consolidated (1,484 entities merged)
- Enhancement scripts ready

## Step-by-Step Deployment

### 1. Backup Production Database
```bash
ssh deploy@68.183.186.127
# Password: 3231
cd /root/epstein-archive
sudo cp epstein-archive.db epstein-archive.db.backup-$(date +%Y%m%d-%H%M%S)
exit
```

### 2. Upload Consolidated Database
```bash
# From local machine
scp epstein-archive.db deploy@68.183.186.127:/tmp/epstein-archive-new.db
# Password: 3231

# On production server
ssh deploy@68.183.186.127
sudo mv /tmp/epstein-archive-new.db /root/epstein-archive/epstein-archive.db
sudo chown root:root /root/epstein-archive/epstein-archive.db
exit
```

### 3. Upload Enhancement Scripts
```bash
# From local machine
scp scripts/enhance_schema.sql deploy@68.183.186.127:/tmp/
scp scripts/generate_relationships_and_scoring.ts deploy@68.183.186.127:/tmp/

# On production server
ssh deploy@68.183.186.127
sudo mv /tmp/enhance_schema.sql /root/epstein-archive/scripts/
sudo mv /tmp/generate_relationships_and_scoring.ts /root/epstein-archive/scripts/
exit
```

### 4. Apply Schema Enhancements
```bash
ssh deploy@68.183.186.127
cd /root/epstein-archive
sudo sqlite3 epstein-archive.db < scripts/enhance_schema.sql
# This adds entity_relationships table and importance_score column
```

### 5. Generate Relationships and Scores
```bash
# Still on production server
sudo npx tsx scripts/generate_relationships_and_scoring.ts
# This will take ~2-3 minutes
# Expected output: 208k co-occurrence links, 47k entities scored
```

### 6. Upload Updated Server Code
```bash
# From local machine (new terminal)
scp src/server.production.ts deploy@68.183.186.127:/tmp/
scp src/services/DatabaseService.ts deploy@68.183.186.127:/tmp/
scp src/types.ts deploy@68.183.186.127:/tmp/

# On production server
sudo mv /tmp/server.production.ts /root/epstein-archive/src/
sudo mv /tmp/DatabaseService.ts /root/epstein-archive/src/services/
sudo mv /tmp/types.ts /root/epstein-archive/src/
```

### 7. Build and Upload Frontend
```bash
# From local machine
npm run build

# Upload dist folder
rsync -avz --delete dist/ deploy@68.183.186.127:/tmp/dist-new/

# On production server
sudo rm -rf /root/epstein-archive/dist
sudo mv /tmp/dist-new /root/epstein-archive/dist
```

### 8. Restart Production Server
```bash
# On production server
cd /root/epstein-archive
sudo pm2 restart epstein-api
# Or if not running:
# sudo pm2 start src/server.production.ts --name epstein-api --interpreter npx --interpreter-args tsx
```

### 9. Verify Deployment
```bash
# Test API health
curl http://68.183.186.127:3001/api/health

# Test entity type filter
curl "http://68.183.186.127:3001/api/entities?type=Person&limit=1"
curl "http://68.183.186.127:3001/api/entities?type=Organization&limit=1"

# Check frontend
curl http://68.183.186.127
```

## Expected Results

### Database Stats
- **Total Entities**: ~47,191 (down from ~48,675)
- **Persons**: 40,887
- **Organizations**: 4,351
- **Locations**: 1,448
- **Entity Relationships**: 208,207 links
- **Importance Scores**: All entities scored

### API Endpoints
- `/api/entities?type=Person` - Filter by person
- `/api/entities?type=Organization` - Filter by organization
- `/api/entities?type=Location` - Filter by location

### Frontend Features
- Entity Type dropdown in UI
- Importance scores displayed
- Relationship data available

## Troubleshooting

### If PM2 fails to restart:
```bash
sudo pm2 logs epstein-api
sudo pm2 delete epstein-api
sudo pm2 start src/server.production.ts --name epstein-api --interpreter npx --interpreter-args tsx
```

### If database is locked:
```bash
sudo pm2 stop epstein-api
# Then retry the operation
sudo pm2 start epstein-api
```

### If frontend doesn't update:
```bash
# Clear nginx cache
sudo systemctl reload nginx
```

## Rollback (if needed)
```bash
cd /root/epstein-archive
sudo pm2 stop epstein-api
sudo cp epstein-archive.db.backup-YYYYMMDD-HHMMSS epstein-archive.db
sudo pm2 start epstein-api
```
