<p align="center">
  <img src="logo.png" alt="Epstein Archive" width="400">
</p>

<h1 align="center">Epstein Archive</h1>

<p align="center">
  <strong>A comprehensive investigative research platform</strong> for analyzing and cross-referencing documents, entities, and relationships from the Epstein Files corpus.
</p>

<p align="center">
  <a href="https://epstein.academy"><img src="https://img.shields.io/badge/🌐_LIVE_SITE-epstein.academy-blue?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiPjwvY2lyY2xlPjxsaW5lIHgxPSIyIiB5MT0iMTIiIHgyPSIyMiIgeTI9IjEyIj48L2xpbmU+PHBhdGggZD0iTTEyIDJhMTUuMyAxNS4zIDAgMCAxIDQgMTAgMTUuMyAxNS4zIDAgMCAxLTQgMTAgMTUuMyAxNS4zIDAgMCAxLTQtMTAgMTUuMyAxNS4zIDAgMCAxIDQtMTB6Ij48L3BhdGg+PC9zdmc+" alt="Live Site"></a>
</p>

---

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
