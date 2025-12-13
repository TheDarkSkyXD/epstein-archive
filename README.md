# Epstein Archive

**A comprehensive investigative research platform** for analyzing and cross-referencing documents, entities, and relationships from the Epstein Files corpus.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build:prod
```

## Features

- **46,000+ Entities** with relationship mapping and risk scoring
- **18,000+ Documents** with full-text search and OCR processing
- **350+ Media Files** organized in albums with EXIF metadata
- **Investigation Workspace** for hypothesis testing and evidence linking
- **Timeline Visualization** with confidence scoring
- **Network Graphs** showing entity relationships

## Documentation

- [API Reference](docs/API.md) - REST API endpoints
- [Deployment Guide](docs/DEPLOYMENT.md) - Production deployment
- [Development Setup](docs/DEPLOY.md) - Local development

## Project Structure

```
epstein-archive/
├── src/                    # Frontend React application
│   ├── components/         # React components
│   ├── services/           # API clients & data services
│   ├── server/            # Backend Express server
│   └── scripts/           # Database scripts
├── data/                   # Media and OCR data
├── docs/                   # Documentation
├── scripts/                # Utility scripts
└── public/                 # Static assets
```

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Recharts, D3
- **Backend**: Express, SQLite, better-sqlite3
- **Build**: Vite, esbuild

## License

This project is for research and educational purposes only.
