# Deployment Guide: Epstein Archive

## Overview

This application has been optimized for production with a robust architecture:

- **Frontend**: React + Vite (Optimized build, chunking)
- **Backend**: Node.js + Express (Helmet, Compression, Rate Limiting)
- **Database**: SQLite with FTS5 (Full Text Search) and WAL mode
- **Infrastructure**: Docker + Docker Compose

## Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local development)

## Quick Start (Production)

1. **Build and Run with Docker Compose**

   ```bash
   docker-compose up --build -d
   ```

   This will start:
   - The application on port `3000` (mapped to container port 3000)
   - Automatic volume mapping for persistence

2. **Verify Deployment**
   - Visit `http://localhost:3000`
   - Check logs: `docker-compose logs -f`

## Manual Deployment

1. **Install Dependencies**

   ```bash
   npm install
   ```

2. **Build Frontend**

   ```bash
   npm run build
   ```

3. **Start Production Server**
   ```bash
   npm start
   ```
   The server will serve the static assets from `dist/` and handle API requests.

## Environment Variables

Create a `.env` file (see `.env.example`):

- `PORT`: API Port (default: 3000)
- `DB_PATH`: Path to SQLite database
- `RAW_CORPUS_BASE_PATH`: Path to raw document images (optional)

## Security Features

- **CSP**: Content Security Policy configured in `server.ts`
- **Rate Limiting**: 100 requests / 15 min window
- **Compression**: Gzip compression enabled
- **Sanitization**: Input validation on all endpoints

## Maintenance

- **Backups**: Backup the `epstein-archive-production.db` file regularly.
- **Updates**: Pull latest code, rebuild docker image.
