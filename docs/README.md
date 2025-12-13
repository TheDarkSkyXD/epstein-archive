# Documentation

## Guides

- **[API Reference](API.md)** - REST API endpoints and usage
- **[Deployment Guide](DEPLOYMENT.md)** - Production server deployment
- **[Development Setup](DEPLOY.md)** - Local development environment

## Architecture

The application consists of:

1. **React Frontend** (`src/`) - Vite-powered SPA with TypeScript
2. **Express Backend** (`src/server/`) - REST API with SQLite database
3. **Data Layer** (`data/`) - OCR text, media files, and articles

## Database Schema

See [schema.sql](../schema.sql) for the complete database structure.

Key tables:
- `entities` - People, organizations, locations
- `documents` - Text documents with metadata
- `entity_relationships` - Connections between entities
- `investigations` - User investigation workspaces
- `media_images` / `media_albums` - Photo management
