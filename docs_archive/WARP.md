# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project overview

This repository is a full-stack investigative dashboard for the Epstein document corpus. It combines:

- A React + Vite SPA for browsing entities, documents, media, timelines, and investigations
- An Express/SQLite API that serves normalized entities, documents, evidence, and media
- A large set of one-off and batch scripts that ingest raw files into a structured SQLite database and perform intensive data cleanup/validation

The system assumes a local or mounted SQLite database file (highly curated) and a large corpus of source documents in `data/` and external paths.

## Core development commands

All commands below are run from the repository root unless noted.

### Install dependencies

- Install app dependencies:
  - `npm install`
- Install Playwright test dependencies (first time only):
  - `cd tests && npm install`

### Run the app in development

The frontend is served by Vite on port 3002 and proxies API calls to an Express server on port 3012.

- Start the API server (development mode, TypeScript via `tsx`):
  - `DB_PATH=./epstein-archive-production.db npm run server`
- In a second terminal, start the frontend dev server:
  - `npm run dev`

The Vite dev server (see `vite.config.ts`) proxies `/api` to `http://localhost:3012`.

### Build and run in production (Node)

- Build frontend and server bundles:
  - `npm run build:prod`
- Start the production server from the built artifacts:
  - Ensure `DB_PATH` points to the production SQLite file (for example `./epstein-archive-production.db`)
  - `npm run start`

`start.sh` is a minimal helper that runs `node dist/server.production.js` with `NODE_ENV=production` and assumes the build has already been produced.

### Run with Docker / docker-compose

- Build and run the full stack (API + Redis + Nginx) via Docker:
  - `docker-compose up --build`

The `app` service runs `node dist/server.production.js` on port 3012 and uses environment variables from `.env`/shell (see `docker-compose.yml`). The SQLite database is expected under `./data/epstein-archive.db`, mounted into the container.

### End‑to‑end tests (Playwright)

Tests live in `tests/` and are driven by the root `playwright.config.ts`.

- Run the full test suite (automatically starts dev web + API servers when `NODE_ENV !== 'production'`):
  - From the repo root (after installing Playwright dev deps in `tests/`):
    - `npx playwright test`
  - Or, from within `tests/`:
    - `npm test`
- Run a focused group using named test groups from `tests/package.json` (from `tests/`):
  - Smoke suite: `npm run test:smoke`
  - "spice"-focused tests: `npm run test:spice`
  - Search-only suite: `npm run test:search`
  - Visualization-only: `npm run test:visualization`
  - Performance checks: `npm run test:performance`
  - Data integrity checks: `npm run test:integrity`
- Run a single test file or test by title (from `tests/`):
  - By file: `npx playwright test epstein-archive.spec.ts`
  - By test title match: `npx playwright test epstein-archive.spec.ts -g "Basic Navigation"`

**Important:** `playwright.config.ts` is configured to start `npm run dev` on port 3002 and an API server via `npm run api` on port 3012. Currently the root `package.json` only defines `server` (dev API) and `start` (prod API) scripts. For CI or automated runs, either:

- Add an `api` script that starts the API server on port 3012, or
- Set `NODE_ENV=production` so the Playwright `webServer` section is skipped and run the API and frontend separately.

### Repository cleanup

- Remove build artifacts, logs, temp files, and test reports:
  - `./cleanup.sh`

This is interactive and will prompt before deleting files.

## Environment and data

Configuration is centralized in `src/config/index.ts` and `.env.example`.

Key points:

- **Database**
  - `DatabaseService` (server-side) uses `process.env.DB_PATH` or defaults to `./epstein-archive.db`.
  - `config.databaseUrl` (used by services like `MediaService`) defaults to `./epstein-archive.db` and is overridden by `DATABASE_URL`.
  - In Docker, `DATABASE_URL` is set to `./data/epstein-archive.db` and mounted via a volume.
- **API server**
  - `API_PORT` controls the Express server port; defaults to `3012`.
  - `NODE_ENV` controls dev vs production behavior (logging, Playwright baseURL, etc.).
- **Static JSON fallbacks**
  - Frontend data services will fall back to static JSON under `/data` if the API is unavailable:
    - `data/public/data/people.json` – normalized entity list used by `OptimizedDataService` and `DataLoaderService`.
    - `src/data/peopleData.ts` – TypeScript-backed people map used mainly by validation tests.
    - `src/data/articles.json` – curated article metadata used by the media/articles UI and ingestion scripts.
- **External raw corpus**
  - Several analysis scripts under `analysis/` assume an external corpus path such as `"Epstein Estate Documents - Seventh Production"` living alongside this repo. Those absolute paths are specific to the original author’s machine and should be parameterized or updated if you run them elsewhere.

## High‑level architecture

### Frontend (React + Vite)

The SPA is defined in `src/main.tsx` and `src/App.tsx`.

- **Entry / layout**
  - `src/main.tsx` wires `BrowserRouter`, global `ErrorBoundary`, `ToastProvider`, and a `NavigationProvider` (from `ContentNavigationService`) around `<App />`.
  - `App.tsx` implements the main navigation tabs and overall routing logic across:
    - Subjects (entities/people browser)
    - Search (entity + evidence search)
    - Documents (document browser and viewer)
    - Media & Articles, Photos
    - Timeline
    - Investigations (workspace, forensic tools)
    - Analytics
    - Black Book
    - About
  - `App.tsx` coordinates derived state like selected entity/document, filters, sorting, onboarding state, and keyboard shortcuts.

- **State and data access**
  - `src/services/OptimizedDataService.ts` and `src/services/apiClient.ts` are the primary abstraction over the `/api` backend.
    - They implement pagination, caching, and graceful fallback to static JSON when the API is down.
    - `apiClient` normalizes API responses (fields like `fullName` vs `full_name`, `red_flag_rating` vs `redFlagRating`).
  - `src/services/ContentNavigationService.tsx` exposes a `NavigationProvider`/`useNavigation` hook that tracks search term, filters, and selected entity/document in both React state and `localStorage` so navigation state is preserved between tabs and reloads.
  - `src/contexts/InvestigationsContext.tsx` (and related components under `components/Investigation*`) encapsulate state for multi-document investigations.

- **Major UI components** (non-exhaustive, but structurally important):
  - `components/PersonCard`, `PersonCardRefined`, `RedFlagIndex` – entity cards and the “red flag/spice” visualization.
  - `components/DocumentBrowser`, `DocumentModal`, `DocumentContentRenderer` – document browsing and detailed views.
  - `components/MediaViewer`, `PhotoBrowser`, `MediaViewerModal` – media browsing, lightbox, and EXIF/metadata sidebar.
  - `components/EvidenceSearch`, `EvidenceModal`, `EvidenceMedia`, `EvidencePacketExporter` – evidence-centric search and export tools.
  - `components/InvestigationWorkspace`, `ForensicAnalysisWorkspace`, `InvestigationTimelineBuilder`, `InvestigationEvidencePanel` – investigative workflows, timeline building, and forensic tooling.
  - `components/DataVisualization*`, `NetworkVisualization`, `TimelineVisualization`, `TreeMap` – overview analytics and charts (mainly powered by Recharts and D3).

These components are generally thin over the API/data services and share a consistent “card + detail modal” pattern.

### Backend API (Express + better-sqlite3)

There are two primary server entrypoints:

- `src/server.ts` – development/legacy server
  - Uses `DatabaseService.getInstance()` to connect to the SQLite DB at `DB_PATH`.
  - Wires up feature‑specific services (e.g. `InvestigationService`, `HypothesisService`, `EvidenceLinkService`, `NoteService`, `TaskService`).
  - Mounts routers under:
    - `/api/evidence` – search and fetch individual evidence records (via `routes/evidenceRoutes.ts`, which has its own `better-sqlite3` connection and FTS integration).
    - `/api/investigation` – investigation/evidence routes (via `routes/investigationEvidenceRoutes.ts`).
  - Exposes core REST endpoints used by the frontend:
    - `/api/health` – health + DB-status check.
    - `/api/entities` – paginated entity listing with querystring filters (`search`, `role`, `likelihood`, red flag index bounds, sort options).
    - `/api/entities/:id` – single entity detail including contexts, spicy passages, file references, and connections summary.
    - `/api/entities/:id/documents` – supporting documents for a given entity.
    - `/api/documents` and `/api/documents/:id` – paginated documents list and single document detail with filters for file type, red flag band, evidence type, and search.
    - `/api/search` – unified entity + document search backing the global search UI.

- `src/server.production.ts` – hardened production server
  - Uses `config` from `src/config/index.ts` instead of hardcoded env access.
  - Initializes `MediaService` for high-volume image operations and serves media via `/api/media/...` endpoints (see usage by `MediaViewer`/`MediaViewerModal`).
  - Serves the built frontend from `dist/` and static data from `data/`.
  - In some environments, also mounts `/files` as a direct mapping to an external corpus path for raw documents.
  - Implements more defensive request validation, logging, and caching headers on list endpoints.
  - Adds user-management endpoints (simple `users` table) to simulate multi-user investigations.

#### Database layer

- `src/services/DatabaseService.ts` is the central SQLite wrapper for the API servers:
  - Enforces a specific schema (entities, documents, media items, investigations, evidence items, chain of custody, investigation timelines, financial transactions, forensic metrics, users, etc.).
  - Performs startup validation (`validateSchemaIntegrity`) to ensure the connected DB has the expected critical columns; if they are missing, the service throws and the app refuses to start.
  - Controls SQLite pragmas (WAL, synchronous mode, cache size, mmap) tuned for large analytical workloads.
  - Provides query helpers like `getEntities`, `getEntityById`, `getDocuments`, `getDocumentById`, `getEntityDocuments`, and `search` that the Express routes rely on.

- Specialized services on top of this DB include:
  - `InvestigationService` – CRUD + pagination for investigations (including collaborator lists and status).
  - `MediaService` – full media library management (albums, images, tags, EXIF extraction, thumbnail generation, ZIP export) operating directly on `media_*` tables.
  - `EvidenceLinkService`, `HypothesisService`, `NoteService`, `TaskService`, `evidenceChainService` – helpers for more advanced investigative workflows (linking entities/documents, hypotheses, notes, and tasks). These are mainly consumed by the investigation UI via the API routes.

### Data ingestion and analysis scripts

There are three main script “zones”:

- `analysis/`
  - Contains one-off and batch scripts for building and refining the high‑integrity SQLite database from raw text/PDF/CSV sources.
  - Examples:
    - `comprehensive_import.ts` – end‑to‑end pipeline that recreates the DB, walks large text/OCR directories, extracts entities with aggressive heuristics, populates `entities`, `documents`, and `entity_mentions`, and rebuilds FTS indexes.
    - `consolidate_entities.ts`, `consolidate_names.ts`, `final_ultra_cleanup.ts`, etc. – multi-pass entity normalization and cleanup scripts.
    - `validate_entities.ts`, `validate_risk.ts`, `test_validation_flow.ts` – QA/validation suites over the DB contents.
  - Many scripts hard-code paths (e.g., `BASE_PATH` in `comprehensive_import.ts`) and assume they are run on the author’s workstation; update those paths or parameterize them before reusing.

- `scripts/`
  - Standalone Node scripts that interact with the DB at a higher level:
    - `ingest_articles.ts` – fetches RSS/Atom feeds (e.g., Substack, Google News) and builds an `articles` table with normalized metadata (title, link, description, publication date, author, source, image URL, red flag rating). It resets the `articles` table on each run.
    - `import_media.ts`, `refresh_thumbnails.ts` – ingest image files and (re)generate thumbnails, populating media tables that power the photo gallery and media viewer.
    - `ingest_financial.ts`, `insert_known_entities.ts`, `normalize_known_entities.ts` – financial transaction imports and entity normalization from CSVs/lookup lists.
  - These scripts generally assume `DatabaseService` will connect to the DB indicated by `DB_PATH` and should be run with `ts-node`/`tsx` or compiled first.

- `src/scripts/`
  - Scripts that live inside `src/` and therefore share types/services with the main app:
    - `src/scripts/ingest_articles.ts` – imports article metadata from `src/data/articles.json` into the DB using `databaseService.insertArticle`, creating the `articles` table if it does not yet exist.

Running any of these scripts against the wrong SQLite file can corrupt a curated production DB; confirm `DB_PATH`/`DATABASE_URL` before using them.

### Testing and data validation

- **Playwright E2E tests** (`tests/*.spec.ts`)
  - `epstein-archive.spec.ts` – comprehensive UI and navigation coverage across all major tabs (Subjects, Search, Documents, Investigations, Black Book, Timeline, Media & Articles, Photos, Analytics, About), plus behavior of the Red Flag Index and search filters.
  - `production.spec.ts` – production-focused smoke tests: homepage load, analytics charts, entity search/filtering, opening entity modals, investigation flows, health endpoint checks, and responsiveness/performance expectations.
  - Both files assume the app is reachable at the `baseURL` configured in `playwright.config.ts` (localhost:3002 in dev, `https://epstein.academy` when `NODE_ENV=production`).

- **Data validation tests** (`tests/data-validation.spec.ts`)
  - Work directly against `src/data/peopleData.ts` to enforce invariants:
    - Red flag ratings/scores within expected bounds.
    - Evidence types drawn from a small, fixed set.
    - Likelihood scores limited to `HIGH`/`MEDIUM`/`LOW`.
    - Mentions/files/context counts are positive and internally consistent.
    - Filenames and spicy passage structures conform to expected patterns.

These tests are a key signal that changes to the data ingestion/cleanup pipeline have not broken core assumptions about people/entities.
