# Epstein Archive Deployment Guide

## Overview

This repository contains the source code for the Epstein Archive. The application is a React frontend with a Node.js/Express backend (API) and an SQLite database.

## Prerequisites

- Node.js (v18+)
- npm
- SQLite3
- SSH access to production server (for remote deployment)

## Scripts

### Local Development

To start the development environment (Frontend + API):

```bash
npm run dev:api
```

To build and preview locally:

```bash
./deploy.sh
```

(Note: `./deploy.sh` builds the app and starts the production server locally on port 3012).

### Production Deployment (Remote)

To deploy to the production server (`epstein.academy` / `194.195.248.217`):

```bash
./deploy-to-production.sh
```

**What this script does:**

1. Checks pre-requisites (SSH access).
2. Builds the application locally (`npm run build:prod`).
3. Compresses the build artifact (`dist/`, `src/`, `package.json`, `epstein-archive.db`).
4. Uploads to the production server via SCP.
5. Extracts and starts the application using PM2 on the remote server.

**Configuration:**

- Server IP: `194.195.248.217`
- User: `deploy` (via `glasscode` SSH alias or configured in script).
- Database: `epstein-archive.db` (Deployed from local).

## Database

The application uses `epstein-archive.db`.

- **Schema**: Managed via `schema.sql` and migrations in `migrations/`.
- **Ingestion**: Core ingestion logic is in `scripts/importRealMediaToDatabase.ts`.

### Syncing from Production

To back-port data (tags, users, entities) from production to your local environment:

```bash
./scripts/sync-from-production.sh
```

This will:

1. Backup your local `epstein-archive-production.db`.
2. Download the live database from the `glasscode` server.
3. Allow you to debug against real production data.

## Project Structure

- `src/`: React frontend and Node.js server code.
- `scripts/`: Maintenance and ingestion scripts.
- `docs/`: Documentation.
- `dist/`: Build output (not committed).
- `data/`: Raw data storage (gitignored).

## Cleanup

To remove build artifacts and logs:

```bash
./cleanup.sh
```
