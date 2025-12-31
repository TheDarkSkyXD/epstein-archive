# Database Maintenance and Recovery Guide

This guide describes the systems in place to ensure data integrity and how to recover from potential data loss.

## Automated Backups

The production server pulls a full database backup every hour.
- **Location**: `~/epstein-archive/backups/`
- **Retention**: The last 48 hourly backups are preserved as `.db.gz` files.
- **Process**: Backups use the SQLite `.backup` API to ensure consistency even while the application is running.

## Local Data Sync

You can sync the production database to your local machine at any time to inspect data or keep a local copy for safety.

### How to Sync:
1. Ensure you have SSH access to the production server.
2. Run the sync script from your local project root:
   ```bash
   ./scripts/sync_prod_to_local.sh
   ```
3. This will create a fresh `epstein-archive-local.db` in your project folder.

## Recovery from Backups

If data is accidentally deleted or corrupted:
1. SSH into the production server.
2. Locate a healthy backup in `~/epstein-archive/backups/`.
3. Stop the application: `pm2 stop epstein-archive`.
4. Replace the live DB with the backup:
   ```bash
   gunzip -c backups/epstein-archive-2025XXXX-XXXX.db.gz > epstein-archive.db
   ```
5. Start the application: `pm2 start epstein-archive`.

## Data Integrity Warnings

The application now includes enhanced startup validation. Check PM2 logs (`pm2 logs epstein-archive`) for any "Startup Warnings" regarding:
- Missing environment variables.
- Missing critical tables.
- Migration failures.

## Future Prevention

> [!TIP]
> **Always sync before major manual updates**: Before doing a large batch of manual tagging or data cleaning, run `./scripts/sync_prod_to_local.sh` to have a known good state on your local machine.
