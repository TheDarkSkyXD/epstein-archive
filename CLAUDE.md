# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# SYSTEM ROLE & BEHAVIORAL PROTOCOLS

**ROLE:** Senior Frontend Architect & Avant-Garde UI Designer.
**EXPERIENCE:** 15+ years. Master of visual hierarchy, whitespace, and UX engineering.

## 1. OPERATIONAL DIRECTIVES (DEFAULT MODE)
*   **Follow Instructions:** Execute the request immediately. Do not deviate.
*   **Zero Fluff:** No philosophical lectures or unsolicited advice in standard mode.
*   **Stay Focused:** Concise answers only. No wandering.
*   **Output First:** Prioritize code and visual solutions.
*   **Plugins: Use specialized plugins for the task at hand

## 2. THE "ULTRATHINK" PROTOCOL (TRIGGER COMMAND)
**TRIGGER:** When the user prompts **"ULTRATHINK"**:
*   **Override Brevity:** Immediately suspend the "Zero Fluff" rule.
*   **Maximum Depth:** You must engage in exhaustive, deep-level reasoning.
*   **Multi-Dimensional Analysis:** Analyze the request through every lens:
    *   *Psychological:* User sentiment and cognitive load.
    *   *Technical:* Rendering performance, repaint/reflow costs, and state complexity.
    *   *Accessibility:* WCAG AAA strictness.
    *   *Scalability:* Long-term maintenance and modularity.
*   **Prohibition:** **NEVER** use surface-level logic. If the reasoning feels easy, dig deeper until the logic is irrefutable.
*   **Plugins: Use specialized plugins for the task at hand

## 3. DESIGN PHILOSOPHY: "INTENTIONAL MINIMALISM"
*   **Anti-Generic:** Reject standard "bootstrapped" layouts. If it looks like a template, it is wrong.
*   **Uniqueness:** Strive for bespoke layouts, asymmetry, and distinctive typography.
*   **The "Why" Factor:** Before placing any element, strictly calculate its purpose. If it has no purpose, delete it.
*   **Minimalism:** Reduction is the ultimate sophistication.

## 4. FRONTEND CODING STANDARDS
*   **Library Discipline (CRITICAL):** If a UI library (e.g., Shadcn UI, Radix, MUI) is detected or active in the project, **YOU MUST USE IT**.
    *   **Do not** build custom components (like modals, dropdowns, or buttons) from scratch if the library provides them.
    *   **Do not** pollute the codebase with redundant CSS.
    *   *Exception:* You may wrap or style library components to achieve the "Liquid Glass" look, but the underlying primitive must come from the library to ensure stability and accessibility.
*   **Stack:** Modern (React/Vue/Svelte), Tailwind/Custom CSS, semantic HTML5.
*   **Visuals:** Focus on micro-interactions, perfect spacing, and "invisible" UX.

## 5. RESPONSE FORMAT

**IF NORMAL:**
1.  **Rationale:** (1 sentence on why the elements were placed there).
2.  **The Code.**

**IF "ULTRATHINK" IS ACTIVE:**
1.  **Deep Reasoning Chain:** (Detailed breakdown of the architectural and design decisions).
2.  **Edge Case Analysis:** (What could go wrong and how we prevented it).
3.  **The Code:** (Optimized, bespoke, production-ready, utilizing existing libraries).

## Project Overview

The Epstein Archive is a comprehensive investigative research platform for analyzing and cross-referencing documents, entities, and relationships from the Epstein Files corpus. It processes 86,000+ entities, 51,000+ documents, and 500+ verified media files with full-text search, network visualization, and forensic tools.

**Tech Stack**: Vite + React + TypeScript frontend, Express backend, SQLite with FTS5 full-text search, better-sqlite3

**Live Site**: https://epstein.academy

## Development Commands

### Local Development
```bash
# Start dev server (Frontend on :3002, proxies /api to backend :3012)
npm run dev

# Start backend API server separately (if needed)
npm run server
# or
npm run api
```

The dev server runs Vite on port 3002 and proxies `/api` and `/files` requests to the backend on port 3012.

### Building
```bash
# Frontend only (for development)
npm run build

# Full production build (frontend + backend)
npm run build:prod

# Start production server
npm run start
```

### Code Quality
```bash
# Type checking (no emit)
npm run type-check

# Linting
npm run lint
npm run lint:fix

# Formatting (Prettier)
npm run format
npm run format:check
```

### Database Operations
```bash
# Run migrations (applies unapplied migrations from src/server/db/schema/)
npm run migrate

# Backfill entity mentions
npm run backfill
```

### Testing in Production
```bash
# Verify deployment health
npm run verify
```

## Architecture

### Dual TypeScript Configuration

The project uses **two separate TypeScript configurations**:

1. **Frontend (`tsconfig.json`)**: Compiles `src/` (components, hooks, pages) with Vite
   - Bundler mode resolution
   - React JSX
   - DOM types
   - `noEmit: true` (Vite handles compilation)

2. **Backend (`tsconfig.server.json`)**: Compiles server code to `dist/`
   - Node module resolution
   - Includes: `src/server.ts`, `src/server/**/*`, `src/services/**/*`, `src/types/**/*`
   - Excludes: `src/components`, `src/hooks` (frontend-only code)
   - Outputs to `./dist`

### Server Architecture (`src/server.ts`)

The Express server is a large monolithic file (~1400 lines) that:
- Mounts middleware (helmet, cors, compression, rate limiting, cookie-parser)
- Applies authentication middleware (`authenticateRequest`, `requireRole`)
- Defines ~50+ REST API routes inline
- Uses repository pattern for database operations (see below)

### Repository Pattern

Database operations are isolated in `src/server/db/*Repository.ts` files:
- `entitiesRepository` - Entity CRUD and search
- `documentsRepository` - Document management, full-text search via FTS5
- `relationshipsRepository` - Entity-entity relationships
- `mediaRepository` - Photos, videos, audio files
- `investigationsRepository` - User investigation workspaces
- `searchRepository` - Cross-collection search
- `timelineRepository` - Event timeline data
- `forensicRepository` - Forensic analysis tools
- `statsRepository` - Platform statistics
- `jobsRepository` - Background job tracking
- `blackBookRepository` - Jeffrey Epstein's "Black Book" contacts
- `evidenceRepository` - Evidence chain of custody
- `articleRepository` - News articles
- `dataQualityRepository` - Data quality metrics
- `bulkOperationsRepository` - Bulk data operations
- `memoryRepository` - User memory/preferences

Each repository imports the database singleton via `getDb()` from `src/server/db/connection.ts`.

### Database Connection (`src/server/db/connection.ts`)

- Uses `better-sqlite3` (blocking, synchronous SQLite)
- Singleton pattern: `getDb()` returns cached instance
- Configured with:
  - `journal_mode = WAL` (Write-Ahead Logging for concurrency)
  - `foreign_keys = ON`
  - `synchronous = NORMAL`
  - `temp_store = MEMORY`
- Database path controlled by `DB_PATH` environment variable

### Database Migrations (`src/server/db/migrator.ts`)

- Migrations stored in `src/server/db/schema/*.sql`
- Applied sequentially by filename (e.g., `001_align_schema.sql`, `002_ensure_tables.sql`)
- Tracks applied migrations in `schema_migrations` table
- Run via `npm run migrate` or automatically on server startup via `runMigrations()`

### Environment Variables

Critical environment variables (validated in `src/server/utils/envValidator.ts`):
- `DB_PATH` - Path to SQLite database (required)
- `RAW_CORPUS_BASE_PATH` - Path to raw document files for serving via `/files` route
- `NODE_ENV` - `production` or `development`

### Authentication & Authorization

- JWT-based authentication implemented in `src/server/auth/middleware.ts`
- Roles: `admin`, `investigator`, `viewer`
- Protected routes use `authenticateRequest` and `requireRole` middleware
- Auth routes defined in `src/server/auth/routes.ts`

### Frontend Structure

Key component directories:
- `src/components/` - React UI components (120+ files)
  - Entity-related: `EntityProfile.tsx`, `EntityPage.tsx`, `NetworkVisualization.tsx`
  - Document-related: `DocumentPage.tsx`, `DocumentViewer.tsx`, `PDFViewer.tsx`
  - Media-related: `PhotoBrowser.tsx`, `AudioPlayer.tsx`, `AudioBrowser.tsx`
  - Investigation tools: `InvestigationWorkspace.tsx`, `EvidenceTracker.tsx`
  - Admin: `AdminDashboard.tsx`, `UserManagement.tsx`
- `src/pages/` - Top-level page components
- `src/services/` - Frontend API clients and services
- `src/hooks/` - Custom React hooks

### Data Ingestion Scripts

Scripts located in `scripts/`:
- **Primary ingestion pipeline**: `scripts/ingest_pipeline.ts` or similar (see `scripts/README.md`)
- `ingest_audio.ts` - Process and ingest audio files with transcripts
- `ingest_videos.ts` - Process video files
- `generate_thumbnails.ts` - Generate video/image thumbnails
- `generate_chapters.ts` - Generate chapter markers for media
- `migrate.ts` - Standalone migration runner (wraps `src/server/db/migrator.ts`)

Run scripts with tsx: `DB_PATH=./epstein-archive.db tsx scripts/<script>.ts`

### Vite Configuration

Code splitting strategy defined in `vite.config.ts`:
- Vendor chunks: `vendor-tf` (TensorFlow), `vendor-pdf` (PDF.js), `vendor-charts` (Recharts/D3), `vendor-icons` (Lucide), `vendor` (React + other deps)
- Feature chunks: `feature-investigation`, `feature-media`, `feature-email`, `feature-documents`, `feature-network`

Dev server proxies `/api` and `/files` to backend on `http://localhost:3012`.

## Data Model

Core tables (see `src/server/db/schema/*.sql` for full schema):
- `entities` - People and organizations with risk scoring
- `documents` - Court documents, PDFs, with FTS5 full-text index
- `entity_mentions` - Entity appearances in documents
- `entity_relationships` - Relationships between entities
- `media_files` - Photos, videos, audio with metadata
- `investigations` - User investigation workspaces
- `evidence_items` - Evidence tracking
- `timeline_events` - Event timeline
- `users` - Authentication
- `audit_logs` - Security audit trail

### Entity Risk Scoring

Entities have a `red_flag_rating` (0-5) based on:
- Frequency and context of mentions
- Direct eyewitness testimony vs. social association
- Evidence types (flight logs, emails, court documents)

## Code Conventions

- **TypeScript strict mode**: `strict: false` in tsconfig (legacy codebase)
- **ESLint**: Configured with `@typescript-eslint`, `react-hooks`, `prettier`
- **Prettier**: Auto-formatting on `npm run format`, enforced in CI
- **No `any` restrictions**: `@typescript-eslint/no-explicit-any: off` (database types use `any`)
- **Comments**: No docstring convention; code is self-documenting where possible

## CI/CD

GitHub Actions workflows in `.github/workflows/`:
- **`ci.yml`**: Runs on push/PR to main/master
  - Auto-fixes formatting with Prettier and commits back
  - Lints with ESLint
  - Type-checks with `tsc --noEmit`
  - Verifies build succeeds
- **`data-integrity.yml`**: Validates data integrity (details not shown)

## Common Patterns

### Adding a New API Endpoint

1. Add route handler in `src/server.ts` (or extract to `src/server/routes/*.ts`)
2. Use authentication middleware if needed: `app.get('/api/foo', authenticateRequest, requireRole(['admin']), (req, res) => {...})`
3. Import and use appropriate repository for database operations
4. Add corresponding API client method in `src/services/apiClient.ts`

### Adding a New Database Table

1. Create migration file: `src/server/db/schema/0XX_description.sql`
2. Run `npm run migrate` to apply
3. Create repository file: `src/server/db/newTableRepository.ts`
4. Export repository from repository file
5. Import in `src/server.ts` and use in routes

### Adding a New React Component

1. Create component in `src/components/<ComponentName>.tsx`
2. Follow existing patterns (functional components, hooks)
3. Import shared UI components from existing files (e.g., `Button`, `Card` patterns)
4. Use `clsx` for conditional CSS classes
5. Use `react-router-dom` for navigation

## Important Notes

- **Data directory excluded**: `data/` is gitignored and contains raw media/documents
- **Database path**: Always set `DB_PATH` environment variable when running scripts or server
- **Sensitive content**: Platform handles sensitive archival material; UI includes content warnings (`SensitiveContent.tsx`)
- **FTS5 search**: Full-text search uses SQLite FTS5; queries use `MATCH` syntax
- **WAL mode**: Database uses Write-Ahead Logging; may leave `-wal` and `-shm` files
- **Port conflicts**: Dev server (3002), API server (3012), production server (default 3000 or PORT env var)
- **Corpus path**: `RAW_CORPUS_BASE_PATH` must be set to serve original documents via `/files` route

## Troubleshooting

### Database locked errors
- Ensure no other processes have the database open
- Check for stale `-wal` or `-shm` files
- WAL mode should handle most concurrency issues

### Missing documents/media
- Verify `RAW_CORPUS_BASE_PATH` environment variable is set correctly
- Check that `data/` directory exists and contains media files
- Ensure file paths in database match actual file locations

### Type errors during build
- Run `npm run type-check` to see full errors
- Check that `tsconfig.json` and `tsconfig.server.json` are correctly separating frontend/backend code
- Remember: server build excludes `src/components` and `src/hooks`

### Migration errors
- Migrations run sequentially; if one fails, fix it before proceeding
- Check `schema_migrations` table to see what's been applied
- Migrations should be idempotent where possible (use `IF NOT EXISTS`, `IF NOT EXISTS` checks)
