# Periodic Cleanup Setup Guide

This guide explains how to set up the periodic cleanup script to run automatically on a weekly basis.

## Setting Up Cron Job (macOS/Linux)

1. Open the crontab editor:
   ```bash
   crontab -e
   ```

2. Add the following line to run the cleanup every Sunday at 2 AM:
   ```bash
   0 2 * * 0 /Users/veland/Downloads/Epstein\ Files/epstein-archive/periodic-cleanup.sh >> /Users/veland/Downloads/Epstein\ Files/epstein-archive/logs/cleanup.log 2>&1
   ```

3. Save and exit the editor.

## Creating Log Directory

Before setting up the cron job, create a logs directory:
```bash
mkdir -p /Users/veland/Downloads/Epstein\ Files/epstein-archive/logs
```

## Verifying Cron Job

To verify that the cron job is set up correctly:
```bash
crontab -l
```

## Manual Testing

To manually test the periodic cleanup script:
```bash
cd /Users/veland/Downloads/Epstein\ Files/epstein-archive
./periodic-cleanup.sh
```

## What the Periodic Cleanup Does

The periodic cleanup script performs the following tasks:

1. **Log Cleanup**: Removes all `.log`, `.log.*`, `.tmp`, `.bak`, and `.old` files
2. **Backup Management**: Keeps only the 3 most recent backups in the `backups/` directory and 2 most recent in the `database_backups/` directory
3. **Test Artifact Removal**: Removes `test-results` and `playwright-report` directories
4. **Cache Cleanup**: Removes `node_modules/.cache` directory
5. **Disk Usage Reporting**: Shows current disk usage after cleanup

## Customization

You can customize the cleanup schedule by modifying the cron expression:
- `0 2 * * 0` - Every Sunday at 2 AM
- `0 2 * * 1` - Every Monday at 2 AM
- `0 2 1 * *` - First day of every month at 2 AM
- `0 */6 * * *` - Every 6 hours

For more information about cron expressions, visit: https://crontab.guru/