# Epstein Archive Deployment Guide

This document provides instructions for cleaning up the repository and deploying the Epstein Archive application to production.

## Cleanup Script

The repository includes a cleanup script that removes unnecessary files and build artifacts:

```bash
# Run the cleanup script
./cleanup.sh
```

Or using npm:
```bash
npm run clean
```

This script will remove:
- Log files (*.log)
- Temporary files (*.tmp, *.bak, *.old)
- .DS_Store files
- Database temporary files (*.db-shm, *.db-wal)
- Compressed files (*.gz, *.tar.gz) except key archives
- Test results directories
- Node modules cache
- Dist folder

## Server Cleanup Procedures

For production servers experiencing disk space issues, additional cleanup scripts are available:

### Emergency Server Cleanup

When the server is critically low on disk space, use the emergency cleanup script:

```bash
# Run the emergency server cleanup script
./server-cleanup.sh
```

This script will:
- Remove all but the 5 most recent backups
- Remove all but the 3 most recent database backups
- Clean up all log files and temporary files
- Remove test artifacts and cache files

### Periodic Maintenance Cleanup

For ongoing server maintenance, use the periodic cleanup script:

```bash
# Run the periodic maintenance cleanup script
./maintenance-cleanup.sh
```

This script performs the same operations as the emergency cleanup but is designed for scheduled execution.

### Automated Cleanup Setup

See `PERIODIC_CLEANUP_SETUP.md` for instructions on setting up automated cleanup using cron jobs.

## Production Build and Deployment

For production deployment, use the build-and-deploy script:

```bash
# Run the build and deployment preparation script
./build-and-deploy.sh
```

Or using npm:
```bash
npm run build:deploy
```

This script will:
1. Clean up build artifacts and temporary files
2. Install production dependencies
3. Build the frontend application
4. Enrich the database with production data
5. Optimize the database
6. Package the application for deployment

## Docker Deployment

The application can be deployed using Docker Compose:

```bash
# Deploy using the existing deploy script
./deploy.sh
```

This will:
1. Check prerequisites (Docker, Docker Compose)
2. Set up necessary directories
3. Generate SSL certificates (self-signed for development)
4. Build and deploy with Docker Compose
5. Run health checks
6. Execute end-to-end tests

## Environment Configuration

Before deployment, ensure you have configured the environment variables in `.env.production`:

```bash
# Copy the example file and edit it
cp .env.example .env.production
# Edit .env.production with your values
```

## Database Enrichment

The production data enrichment process includes:
1. Adding timeline events to the database
2. Enhancing document summaries with better titles and descriptions
3. Verifying Black Book entries are properly linked

The enrichment script is located at `scripts/enrich_production_data.ts` and can be run independently:

```bash
npx tsx scripts/enrich_production_data.ts
```

## Deployment Package

The build-and-deploy script creates a deployment package (`epstein-archive-deployment-*.tar.gz`) that contains:
- Built application files
- Enriched production database
- Docker configuration files
- Deployment scripts
- Environment configuration

## Post-Deployment Steps

After deployment, you should:
1. Update your DNS to point to the server
2. Replace self-signed SSL certificates with proper ones
3. Configure monitoring and alerts
4. Set up automated backups
5. Review security settings

## Management Commands

Once deployed, you can manage the application using these commands:

```bash
# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Restart services
docker-compose restart

# Update deployment
./deploy.sh
```