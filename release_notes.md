## 15.1.0 - 2026-03-02 - Readiness Truthfulness Hardening + Semver Discipline

### Highlights

- Hardened `/api/health/ready` to validate real core data-path readiness (DB ping + entities/documents counts + pool pressure), not just a shallow ping.
- Added canonical compatibility endpoints in the active runtime path:
  - `GET /api/ready` -> `307 /api/health/ready`
  - `GET /api/_meta/db` for deploy/monitoring metadata checks.
- Reinstated strict RBAC on media APIs in the active runtime path (`/api/media/*` now requires auth), aligning with post-deploy verification gates.
- Restored authenticated `/api/subjects` route in the active runtime path (no SPA fallback false-200 on API path misses).
- Removed false-positive operational UI state: footer now requires both readiness success and protected data-route probe success before showing **System Operational**.
- Standardized release progression to strict `MAJOR.MINOR.PATCH` for active releases and bumped minor from `15.0.1` to `15.1.0`.

## 15.0.1 - 2026-03-02 - Bug Fixes + Production Build Hardening

### Highlights

- **Production server fix**: `app.ts` was calling `validateStartup()` synchronously without awaiting and reading non-existent `.isValid`/`.errors` properties from the returned Promise, preventing the server from booting correctly in production. Fixed to `await validateStartup()` inside a try/catch.
- **Removed unused import**: `toServedDocumentUrl` in `app.ts` was causing a TypeScript error that broke the server build; removed.
- **CodeRabbit review fixes (23 findings)**: Addressed all review findings including pagination reset missing global date dep, `redFlagLevel` min=0 skip, Timeline response.ok guard, EmailClient date re-population loop, EvidenceDetail timeout leak and localStorage JSON.parse safety, App.tsx date picker click-outside + ARIA attributes, entity mapper numeric-0 `??` fixes, status filter field correction, and ORDER BY on batch context query.

## 14.9.0 - 2026-02-28 - Strict RBAC Enforcement + Case Bundle Export

### Highlights

- **Strict RBAC Enforcement**: Tightened `PUBLIC_ROUTES` in the server to protect sensitive investigative data; only health and auth endpoints remain public.
- **Case Bundle (ZIP) Export**: Implemented a new authenticated route `GET /api/investigations/:id/export/zip` to bundle case evidence metadata and physical files into a single archive.
- **Production Build Restoration**: Fixed and verified the server-side build process, ensuring `dist/server.js` is correctly generated and deployable.
- **Migration & Code Integrity**: Finalized the Postgres-only architecture stabilization with over 100 files committed, covering API standardization and schema hardening.

## 14.8.0 - 2026-02-27 - Evidence Tab Render Reliability + QA Matrix

### Highlights

- Fixed entity Evidence tab blank-pane regression where evidence counts loaded but rows were not reliably rendered.
- Reworked Evidence tab rendering for normal result sets (`<= 500`) to a deterministic plain paginated list with explicit `Load more` flow.
- Kept virtualized rendering path for larger datasets and added stronger viewport safety checks.
- Added stable Evidence tab test IDs (`entity-evidence-count`, evidence row/list selectors) to support deterministic E2E assertions.
- Updated golden-path E2E coverage to assert actual evidence row rendering in the entity modal.
- Added feature-by-feature QA matrix report:
  - `docs/qa/qa-matrix-v14.7.0-postgres-stabilization.md`

## 14.7.0 - 2026-02-25 - Postgres Migration Stabilization + E2E Contract Sync

### Highlights

- Fixed Postgres migration recovery for historical placeholder ledger gaps (`pgmigrations`) and added preflight reconciliation so upgraded environments can migrate cleanly.
- Hardened long-running/backfill restore migrations for local/prod parity:
  - disabled statement timeout for document metadata backfill migration
  - corrected identity inserts in dataset restore migrations with `OVERRIDING SYSTEM VALUE`
- Restored compatibility aliases and test contracts after API/route drift:
  - `/api/ready` alias to `/api/health/ready`
  - `/api/graph` alias to `/api/graph/global`
  - `/api/search` accepts `query` alias in addition to `q`
- Fixed automation/E2E stability issues:
  - webdriver sessions auto-dismiss first-run onboarding overlays
  - refreshed test selectors for People/Documents/Email modals
  - Playwright config ignores legacy non-Playwright/obsolete suites during regression runs
- Fixed `EvidenceModal` lazy tab loading for deep-linked tabs and stopped evidence infinite-loader query storms caused by mention/document dedupe mismatch.
- End-to-end targeted regression sweep passed on Chromium after updates (API DTOs, API integration, data validation, email deep-link, golden paths, investigation flows, route/UI sync).

## 14.6.0 - 2026-02-25 - Media, Email, Black Book, and OG Preview Hardening

### Highlights

- Email mailbox list now derives from real outgoing senders and maps to canonical people, reducing junk mailbox labels.
- Email UI placeholders/loading states are left-aligned and no longer center text.
- Video cards use real/generated thumbnails (no external collage fallback) and natural title sorting (`Part 1`, `Part 2`, `Part 3`).
- Media album filtering now applies `albumId` in Postgres queries (count + list), so albums no longer show all media.
- Black Book viewer now tolerates camelCase/snake_case row shapes and avoids `undefined.split(...)` crashes.
- Social previews upgraded:
  - Entities use linked subject photos
  - Documents use real document/media previews when available
  - Media albums use first image in album
  - Route pages use cached screenshot OG images with safe fallback behavior

## 14.5.30 - 2026-02-25 - Restore JMail-Style People Mailboxes (Entity-Based)

### Emails Mailboxes

- Replaced the over-restrictive sender-only mailbox list with person-entity mailboxes derived from email evidence mentions, while keeping aggressive junk suppression.
- Requires `Person` type, clean junk tier, human-name heuristics, and at least one non-email mention to avoid marketing/category artifacts.
- Restores real people like Jeffrey Epstein / Ghislaine Maxwell / Ehud Barak / Donald Trump in mailbox navigation when present in the dataset.

## 14.5.29 - 2026-02-25 - Email Mailbox False-Positive Denylist Tightening

### Emails Mailboxes

- Added explicit denylist patterns for remaining non-person email-only mailbox artifacts observed in production (`The New`, `Blue Star Jets`, `Ad Free Mail`, `Career Honor`).
- Keeps mailbox list aligned with the requirement: real outgoing people only (plus `All Inboxes`).

## 14.5.28 - 2026-02-25 - Fix Email Mailbox Denylist SQL Semantics

### Emails Mailboxes

- Fixed Postgres SQL denylist logic in mailbox filtering (`NOT LIKE ANY` -> `NOT (... LIKE ANY ...)`) so organization/product/junk names are actually excluded.
- This restores the intended aggressive real-person-only mailbox behavior after the sender metadata backfill.

## 14.5.27 - 2026-02-25 - Aggressive Human-Only Email Mailbox Heuristic

### Emails Mailboxes

- Tightened mailbox entity filtering with a human-name regex and aggressive business-token denylist to prevent organization/product mailboxes mislabeled as `Person` from appearing.
- Keeps sender mailbox list focused on real people (outgoing sender identities) plus `All Inboxes`.

## 14.5.26 - 2026-02-25 - Email Meta-Sidecar Sender Backfill for Mailbox Filtering

### Emails Data Quality

- Extended the PG email header backfill to parse `.eml.meta` sidecar JSON files (common in the migrated dataset) and recover sender/subject/date metadata.
- Backfill now targets rows missing `from` so it completes instead of looping on rows that legitimately lack recipient fields in sidecar-only records.
- Restores sender metadata required for aggressive real-person mailbox filtering in the Emails UI.

## 14.5.25 - 2026-02-25 - Email Header Backfill Reads Raw EML Files

### Emails Data Quality

- Fixed the PG email header backfill to parse raw `.eml` files from `documents.file_path` (`/data/...`) instead of the stripped `documents.content` body text.
- Restores real `from` / `to` metadata on migrated emails so aggressive mailbox filtering can surface only real outgoing-person mailboxes.

## 14.5.24 - 2026-02-25 - Email Header Metadata Backfill (PG) for Real Mailboxes

### Emails Data Quality

- Added a Postgres backfill script to repair missing email `from` / `to` metadata by parsing raw MIME content in existing email documents.
- Supports the aggressive mailbox filter so current migrated data can surface real sender mailboxes again.
- Future `.eml` ingests already write sender/recipient metadata via `processEmail`; this release closes the migrated-data gap.

## 14.5.23 - 2026-02-25 - Aggressive Email Mailbox Entity Filtering + No Centered Text

### Emails Mailboxes / UI

- Aggressively filtered email entity mailboxes to show only sender-matched, non-junk, non-automation entities (reduces generic categories/places/marketing artifacts in the mailbox list).
- Applied the filter at query time so it affects both current and future data without a separate cleanup job.
- Removed remaining centered text in the Emails interface placeholders/list footer.

## 14.5.22 - 2026-02-24 - Emails Pane Overflow Clamp and Left-Aligned Thread Rows

### Emails Layout Polish

- Fixed desktop Emails layout overflow caused by mobile `w-full` pane classes leaking into desktop thread/content panes and pushing content past the right edge of the workspace.
- Enforced left-aligned thread row text (buttons default to centered text) and added extra overflow clamping in the thread pane/list rows.

## 14.5.21 - 2026-02-24 - Emails Primary Tab SQL Fix (Postgres)

### Emails Tab Reliability

- Fixed a Postgres query failure in the `Primary` email tab introduced by the conversation-thread filter (`participantCount` alias used in `WHERE`).
- Primary tab filtering now uses a SQL-safe thread-level participant-count expression and no longer returns `PG_QUERY_FAILED`.

## 14.5.20 - 2026-02-24 - Emails Primary Tab Conversation-Only Thread Filter

### Emails Tab Quality

- Tightened `Primary` email tab results to require conversation-like threads (multiple participants) instead of acting as a catch-all bucket for uncategorized bulk mail.
- Reduces no-reply/newsletter/marketing spillover in `Primary` while keeping `Updates` and `Promotions` available for bulk/transactional traffic.

## 14.5.19 - 2026-02-24 - Emails Tab Classification and Filter UX Cleanup

### Emails Classification / Filters

- Tightened server-side email tab classification so `Primary` excludes more automated/no-reply/newsletter traffic and `Updates` / `Promotions` are populated using broader sender/subject/body heuristics.
- Fixed `/api/emails/categories` legacy endpoint to `await` the category-count query instead of returning a Promise payload.
- Clarified Emails mailbox UI labels: `Entity mailboxes`, explicit `Show/Hide junk`, and replaced the dead `Pinned filters` placeholder with a real `Clear filters (N)` action.

## 14.5.18 - 2026-02-24 - Emails Workspace Viewport Layout Stabilization

### Emails UI Layout / Overflow

- Fixed the Emails page workspace collapsing to a tiny internal viewport by giving the page a viewport-based height (`100dvh`-relative) instead of relying on an unset parent `h-full`.
- Tightened pane layout constraints (`min-height: 0`, `min-width: 0`, wrapped subheader) so thread/mailbox/content panes stay clipped within the workspace container and UI elements do not spill outside the box.

## 14.5.17 - 2026-02-24 - Document Viewer Single-File Route Fallback (Eliminate Static Path 404s)

### Documents Viewer Reliability

- Updated `/api/documents/:id/pages` to return the robust API file route (`/api/documents/:id/file`) for single-file documents (images/PDFs and linked originals) instead of raw static file paths.
- Prevents document viewer 404s caused by static `/data/...` path serving mismatches while preserving multi-page OCR page-path behavior from `document_pages`.

## 14.5.16 - 2026-02-24 - Document Viewer Path Normalization (No Relative `data/...` 404s)

### Documents Viewer Reliability

- Fixed document viewer page/original URL generation returning relative `data/...` paths (missing leading slash), which caused browser-side 404s in the SPA despite files existing on disk and being served under `/data/...`.
- Added centralized document URL normalization for corpus paths, local `data/` paths, and fallback file-serving URLs across `/api/documents`, `/api/documents/:id`, and `/api/documents/:id/pages`.

## 14.5.15 - 2026-02-24 - Stats Page Entity Photo Batch Query Postgres Fix

### Analytics / Stats Recovery

- Fixed Stats/Analytics page crashes caused by the `/api/entities` photo batch enrichment query using a pgtyped `IN (:entityIds!)` expansion that serialized bigint arrays incorrectly for Postgres (`22P02 invalid input syntax for type bigint`).
- `mediaRepository.getPhotosForEntities` now uses a PG-native `ANY($1::bigint[])` batch query, restoring entity photo enrichment without breaking the Stats UI.

## 14.5.14 - 2026-02-24 - Black Book Dataset Restoration (Postgres)

### Black Book Recovery

- Restored the missing Postgres `black_book_entries` dataset (1,078 real contacts) via an idempotent migration generated from the verified preserved SQLite source database on the production host.
- Fixes the Black Book page and `/api/black-book` returning `0 of 0 contacts` after the Postgres migration left the table present but unpopulated.

## 14.5.13 - 2026-02-24 - Email Thread Field Mapping (Postgres Column Name Compatibility)

### Emails UI Data Integrity

- Fixed `/api/emails/threads` returning blank/zero-filled thread rows after the timeout hotfix. The route mapper now accepts the actual Postgres row field names (lowercase aliases like `threadid`, `lastmessageat`, `messagecount`) as well as camelCase, restoring real thread IDs, timestamps, participant counts, and message counts in the Emails UI.

## 14.5.12 - 2026-02-24 - Media Asset Schema Compat, Email Threads Query Hotfix, Articles Dataset Restore

### Media Recovery (Asset Delivery)

- Fixed `/api/media/images/:id/file` and `/api/media/images/:id/thumbnail` Postgres failures caused by selecting a non-existent `media_items.orientation` column in the PG `getImageById` path.
- Keeps media thumbnail/file delivery compatible with the current Postgres media schema while preserving thumbnail fallback/generation behavior.

### Emails Recovery

- Fixed `/api/emails/threads` statement timeouts by removing the per-thread correlated snippet subquery from the thread list aggregation path (the endpoint now uses a cheap aggregate snippet and a faster distinct-thread count query).

### Media Articles Recovery

- Restored the missing `articles` dataset in Postgres (32 rows) via an idempotent migration (`1741600000000_restore_articles_dataset`), re-populating the Media Articles tab and `/api/articles`.

## 14.5.11 - 2026-02-24 - Media Asset Path Recovery & Email Thread Timeout Fix

### Media Recovery

- Fixed media image file/thumbnail endpoints on Postgres by restoring reliable `getImageById` field mapping (`file_path`, `thumbnail_path`, dimensions/file size) and accepting both camelCase/snake_case path fields in media file/thumbnail routes.
- Fixed thumbnail regeneration persistence on Postgres by removing legacy `date_modified` writes against `media_items` (the PG table does not include that column), preventing fallback thumbnail generation from failing during requests.

### Emails Recovery

- Fixed `/api/emails/threads` timing out on production by replacing the expensive thread count query (which wrapped the full snippet/correlated-thread CTE) with a cheaper distinct-thread count query over filtered email docs.

## 14.5.10 - 2026-02-24 - Timeline Dataset Restoration & No-Silent-Empty Guard

### Timeline Recovery

- Restored missing Postgres `global_timeline_events` table plus curated timeline dataset (72 rows) from the verified enriched SQLite source database via an idempotent migration.
- Fixed `/api/timeline` returning silent empty arrays when the backend query fails (e.g. missing table): `timelineRepository` now surfaces the error instead of masking it as `[]`, preventing false “no events” states.

## 14.5.9 - 2026-02-24 - Properties Stats Postgres Compatibility Fix

### Properties API Compatibility

- Fixed `/api/properties/stats` Postgres failure caused by SQLite-compatible but Postgres-invalid `ROUND(AVG(double precision), 0)` usage in `propertiesRepository`; now casts aggregate to `numeric` before rounding.
- Completes the Properties recovery after the `palm_beach_properties` dataset restoration in `14.5.8`, restoring both listing and stats endpoints.

## 14.5.8 - 2026-02-24 - Properties Dataset Restoration & Deploy Chunk Compatibility

### Properties Recovery

- Restored missing Postgres `palm_beach_properties` table plus real property dataset (9,535 rows) via an idempotent migration generated from the verified enriched SQLite source database.
- Re-enabled the Properties API endpoints (`/api/properties`, `/api/properties/stats`, related property views) by fixing the migration parity gap that left the repository querying a non-existent Postgres table.

### Deploy Reliability (Chunk Loading)

- Hardened `deploy.sh` to preserve the previous hashed `dist/assets` bundle across deploys and restore it alongside the new build (non-overwriting), preventing open client sessions from failing lazy-loaded routes with `TypeError: Importing a module script failed` when they still reference prior hashed chunks.

## 14.5.7 - 2026-02-24 - Flights Dataset Restoration & Tracker Filter Fixes

### Flights Tracker Recovery

- Restored missing Postgres `flights` and `flight_passengers` tables plus real production flight data (110 flights / 305 passenger rows) via a dedicated idempotent migration generated from the verified enriched SQLite source dataset.
- Fixed flights API passenger loading on Postgres by replacing brittle pgtyped array parameter usage with PG-safe `ANY($1::bigint[])` / explicit parameter queries.
- Re-enabled passenger filtering in `/api/flights` list endpoint (the UI filter parameter was previously ignored by the repository query path).
- Fixed `/api/flights/passengers` response shape to return `{ name, flight_count }` objects expected by the Flight Tracker dropdown.

### Flights Tracker UI Cleanup

- Removed the nested border styling conflict on the Flights date filter controls ("boxes inside boxes") by scoping legacy `.filters input/select` CSS so it no longer overrides the Tailwind date-range wrapper inputs.

## 14.5.6 - 2026-02-24 - Core UI Boot Rate-Limit Exemption Fix

### Production UX Reliability

- Fixed intermittent UI-wide 429 failures on page boot by exempting core read endpoints from the broad `/api` rate limiter (`/api/auth/me`, `/api/stats`, `/api/entities`, `/api/timeline`, `/api/investigations`, plus existing health/documents/subjects).
- Preserved route-specific abuse controls on heavy endpoints (`search`, `analytics`, `map`, `graph`) while preventing legitimate users from being locked out of the app shell when a shared rate-limit bucket is hot.

## 14.5.5 - 2026-02-24 - Investigations UI Flash Loop Follow-up Fix

### Investigations UX Stability

- Fixed remaining intermittent Investigations workspace flashing by removing `onError` callback identity churn from `useInvestigationList` hook callback dependencies (uses ref-backed error handler now).
- Prevents repeated `loadInvestigations`/`loadInvestigation` effect retriggers caused by inline toast callbacks in `InvestigationWorkspace`.

## 14.5.4 - 2026-02-24 - Investigations Loading Loop Fix

### Investigations Runtime Stability

- Fixed an infinite/repeated Investigations loading loop caused by unstable callback identities in `useInvestigationList` (`options` object dependency recreated callbacks every render, retriggering `InvestigationWorkspace` effects and re-fetching investigations/case data).
- Stabilized hook dependencies to use primitive fields (`onError`, `currentUser.id`) so Investigations list and case loads execute once per intended trigger.
- Fixed investigation DTO mapping compatibility for Postgres-backed camelCase API payloads (`createdAt` / `updatedAt` / `ownerId`) to eliminate `Invalid Date` card metadata and preserve real timestamps/owner metadata in the Investigations UI.

## 14.5.3 - 2026-02-24 - Subject Card Flag Badge Duplication Fix

### UI Correctness

- Fixed subject-card `EvidenceBadge` to collapse duplicate objective/subjective flag stacks when both ratings are identical (the current dataset mirrors the same red flag rating into both fields, which previously rendered a doubled badge).

## 14.5.2 - 2026-02-24 - Stats Route Contract Accounting Fix

### Production Data Accounting Follow-Up

- Fixed the active `/api/stats` route contract in `src/server/routes/stats.ts` to emit `totalRelationships` instead of silently returning `null` due duplicate `withSafeStatsContract` drift.
- Verified `/api/stats` and `/api/analytics` now agree on relationship totals and match Postgres `entity_relationships` row count.

## 14.5.1 - 2026-02-24 - Data Accounting Patch & CI PG Build Parity

### Production Data Accounting

- Fixed `/api/stats` contract accounting gap where `totalRelationships` returned `null` despite populated `entity_relationships`; now sourced directly from Postgres count.
- Verified production row counts and migration metadata completeness after Postgres cutover:
  - `entities = 131342`
  - `documents = 1382479`
  - `entity_mentions = 1047520`
  - `entity_relationships = 1683084`
  - `media_items = 950`
  - `document_sentences = 3862346`
  - `documents.file_type/evidence_type/date_created` missing = `0`
  - `media_items.file_type` missing = `0`

### CI / Migration Compatibility

- Fixed CI `build` job parity by provisioning a local Postgres service + `DATABASE_URL` and running migrations before `pnpm build:prod` (required by PG nuclear gates).
- Hardened migration `1741000000000_schema_compat_hotfix` to be schema-compatible across environments where `documents.content_refined` and/or `documents.date_created` may not exist yet.

## 14.5.0 - 2026-02-24 - Postgres Migration Forensics Hardening & CI Coverage

### Incident Forensics & Production Stabilization

- Fixed deploy-time Postgres migration failures caused by inconsistent remote environment loading (`DATABASE_URL` now loaded and validated across all DB preflight/migration/certification phases).
- Hardened deployment sequencing so remote code is synced before migrations run, preventing stale migration directory execution.
- Added explicit remote env sanity gates in deployment to fail fast on missing `DATABASE_URL` and legacy `DB_DIALECT` values.
- Fixed multiple production 500s uncovered during cutover verification (`/api/documents`, `/api/media/images`, `/api/stats`) with PG-safe query execution and parameter typing.
- Normalized startup migration parity checks to compare migration names correctly against `pgmigrations`, preventing false pending-migration boot failures.

### Postgres Runtime Migration Hardening

- Removed remaining repository-layer pgtyped executor misuse (`.run(..., db)` / `db.apiPool`) across server repositories; standardized on `getApiPool()` and proper PG clients.
- Repaired `relationshipsRepository` transaction handling to use a real Postgres client transaction (`BEGIN/COMMIT/ROLLBACK`) instead of invalid namespace calls.
- Migrated `revisionManager` database reads to Postgres queries and updated admin revision route to async access.
- Further hardened `MediaService` for Postgres runtime use and removed remaining `prepare()`-based DB calls from `src/server`.
- Quarantined unused legacy `prepare()`-based services out of runtime source into `legacy/server-services/`.

### CI / Regression Gates

- Added `scripts/ci_pg_nuclear_gates.sh` enforcement for:
  - no runtime SQLite remnants in `src/`
  - no `DB_DIALECT` reintroduction in runtime/deploy/CI configs
  - no pgtyped repository executor misuse patterns
  - documents SQL hotfix parity drift
- Added `scripts/check_documents_sql_parity.ts` to keep `documentsRepository` hotfix SQL aligned with `packages/db/src/queries/documents.sql`.
- Added `scripts/ci_pg_endpoint_smoke.sh` for critical incident-route PG smoke checks.
- Added `scripts/ci_pg_public_get_matrix.sh` for broader public GET endpoint matrix coverage in CI against a real local Postgres service.
- Updated CI to provision Postgres 16, run migrations, start the API server, run PG smoke suites, and enforce schema hash checks in the PG nuclear gate job.

### Repo Hygiene

- Quarantined historical incident artifacts/logs with legacy SQLite traces into `legacy/artifacts/` and documented their status to avoid confusing runtime source audits.

## v14.4.0 - 2026-02-23 - PostgreSQL-Only Cutover & SQLite Purge

### Database & Deployment

- Enforced Postgres as the sole production datastore; removed all SQLite-based deployment flows.
- Replaced deploy-time SQLite snapshotting with remote `pnpm db:migrate:pg` + `pnpm db:analyze` on the production host.
- Added automatic purge of legacy `epstein-archive.db` files on the server during `--with-db` / `--db-only` deploys.
- Hardened CI/ops guardrails so `better-sqlite3` usage is restricted to quarantined one-off tooling only.

### Reliability & Verification

- Kept existing Postgres schema hash, EXPLAIN, and DTO contract tests as mandatory pre-flight for releases.
- Verified core investigative flows (`/api/entities/:id`, `/api/documents`, `/api/investigations`, `/api/emails`, `/api/_meta/db`) against the Postgres-backed stack after deploy.

## v14.3.0 - 2026-02-22 - Entity Detail + Global Stats Incident Fix

### Incident Resolution

- **Fixed `/api/entities/:id` production 500**: corrected entity-detail query path for Postgres type compatibility (`bigint`/`text` join mismatch in media enrichment) and ensured async repository execution path is fully awaited.
- **Removed silent data-shape masking in entity detail**: no placeholder unknown entity payloads; endpoint now returns real data or explicit API error JSON.
- **Fixed `/api/analytics/enhanced` schema drift**: aligned route SQL with materialized view columns (`sensitive`/`avg_signal`) and preserved client contract fields (`redacted`, `avgRisk`) via explicit aliasing.
- **Fixed global stats zeros**: corrected Postgres aggregate alias casing and numeric coercion so `totalEntities`/`totalDocuments` return true counts instead of zeroed contract defaults.
- **Contract integrity**: stats/entity responses now consistently emit explicit arrays/fields for frontend safety (`likelihoodDistribution`, evidence arrays, media arrays), preventing `undefined` access crashes.

### Production Verification

- Verified 200 responses for core routes: `/api/entities/1`, `/api/stats`, `/api/analytics/enhanced`, `/api/investigations`, `/api/documents?limit=1`, `/api/subjects?page=1&limit=1&sortBy=red_flag`, `/api/emails/threads?mailboxId=all&q=&tab=all&limit=1`, `/api/_meta/db`.
- Confirmed live Postgres counts are non-zero and consistent with API totals:
  - `entities = 131342`
  - `documents = 1382479`

## v14.2.0 - 2026-02-20 - Postgres Hardening Patch

### Database Hardening

- **7 CONCURRENTLY indexes**: graph, map (geo), FTS, media, document, entity-mention join paths — zero table locks during creation
- **Weighted FTS triggers** (`setweight A/B/C`): name/title → A, role/filename → B, body → C. Batched re-backfill in 10k/5k chunks
- **5 materialised views**: `mv_docs_by_type`, `mv_entity_type_dist`, `mv_top_connected`, `mv_timeline_data`, `mv_redaction_stats` — pre-computed analytics, refreshed by `matViewRefresh.ts` on dirty-flag, uses dedicated `maintenancePool`
- **`analytics_refresh_log`**: per-view refresh tracking. Per-table autovacuum overrides (entities 0.5%, documents 1%)
- **`better-sqlite3` excluded** from production image via `pnpm install --prod --ignore-optional`; boot crash guard enforces this at runtime
- **`epstein.conf`** retuned for actual prod host: Linode AMD EPYC 7713, 6 vCPU, 16 GB RAM — `shared_buffers=4GB`, `work_mem=32MB`, `max_connections=60`, `random_page_cost=1.1`
- **`docker-compose.yml`**: `shm_size: 256mb` added (fixes VACUUM shared memory failures), image tagged `14.2.0`
- **Search**: `websearch_to_tsquery` (phrase + negation), `ts_rank_cd` cover-density ranking, `?mode=prefix` for autocomplete

### New tooling

- `scripts/go_prod.ts` — rewritten for PG: 6-step orchestrator (preflight, migrations, VACUUM, mat-view refresh, FTS sanity, git tag)
- `scripts/pg_explain.ts` — 6/6 plan regression checks pass, no Seq Scans on indexed paths
- `src/server/db/batchQuery.ts` — safe `ANY($1::bigint[])` chunked batching
- `tests/pg-hardening-v2.spec.ts` — 15 acceptance tests (AT-1 through AT-15)

## v14.1.0 - 2026-02-20 - PostgreSQL Migration Production Release

### Database Cutover

- **Fully Migrated to PostgreSQL**: Migrated the 1.3M document corpus from SQLite to Postgres 16+ as the primary source of truth.
- **Enhanced Data Integrity**: Applied robust referential integrity enforcing zero data loss and automated orphan record detection.
- **Dual-Mode Bridge Support**: Implemented runtime translation bridge and role-based connection pooling to handle isolated API and ingestion workloads securely.

## v14.0.1 - 2026-02-20 - Database Reliability & Hardening Patch

### Persistence Reliability

- **Hardened SQLite Synchronicity**: Switched to `synchronous = FULL` in production to eliminate potential database corruption during power failures or OS crashes on network-attached storage.
- **Safe Resource Management**: Removed dangerous manual deletion of SQLite WAL/SHM files from deployment and rollback scripts. These internal recovery files are now managed strictly by the SQLite engine, preventing mandatory recovery failures.
- **Graceful Shutdown Hardening**: Increased deployment shutdown buffer to 5 seconds to ensure all database handles are cleanly released before process termination.

### Automated Maintenance

- **Periodic WAL Checkpointing**: Implemented a background maintenance task that triggers a `PASSIVE` checkpoint every 30 minutes, preventing Write-Ahead Log bloat without blocking active investigative writes.

## v14.0.0 - 2026-02-19 - Forensic Analytics & Network Intelligence

### Interactive Entity Map (Phase 12)

- **Geospatial Intelligence**: Global interactive map visualizing 130k+ entity locations with clustering and risk-coded markers.
- **Performance Cap**: Optimized for performance with a strictly enforced top-500 pin limit based on risk and mention, ensuring smooth 60fps interaction on standard devices.
- **Data Validation**: Implemented strict lat/lng validation to eliminate "Null Island" artifacts.

### Network Graph "Hero Spec" (v2)

- **VIP Face Integration**: High-risk entities now render with photo-realistic avatars directly in the graph nodes at higher zoom levels.
- **Semantic Zoom (LOD)**: Adaptive Level-of-Detail system revealing labels, avatars, and secondary edges based on zoom depth.
- **Fluid Stabilization**: Re-engineered force simulation for organic, community-aware clustering with a 200-tick settlement phase.

### Signal Purification (Junk Elimination)

- **Heuristic Sieves**: Deployed multi-stage filtering for OCR artifacts, boilerplate text ("Page 1 of..."), and low-signal noise.
- **Unclassified Handling**: Improved fallback logic for entities with missing or ambiguous types to prevent data loss in charts.

### Production Hardening

- **Availability**: Refactored readiness probes to sub-50ms latency.
- **Resilience**: Implemented exponential backoff for all client-side data fetching.
- **Persistence**: Deep-linking support for all filter states (Time, Risk, Type) via URL parameters.

## v13.14.1 - 2026-02-19 - Phase 6 UI & Analytics Recovery

### UI Stability & Restoration (Phase 6)

- **Network Graph Recalibration**: Fixed oversized font scaling and label positioning issues. Reordered the dashboard to prioritize the Entity Connection Network at the top.
- **Analytics Chart Recovery**: Restored "Risk Level Distribution" and "Interactive Entity Map" charts by correctly mapping server-side analytics data.
- **Enhanced Junk Filtering**: Implemented stricter OCR artifact suppression (e.g., "Search Personnel Name", "TheInformation") across all visualizations.
- **Type Normalization**: Improved entity type recognition for Locations and Organizations.

### Backend Hardening

- **Backpressure Monitoring**: Integrated `toobusy-js` to prevent event loop saturation during heavy ingestion or graph processing.
- **Background Orchestration**: Refactored `backfillJunkFlags` into a non-blocking, chunked background process to ensure zero-lag server startup.
- **Graph Adjacency Caching**: Implemented precomputed entity adjacency lists to accelerate Depth 2+ network traverses on the full 1.3M document dataset.
- **Fetch Optimization**: Enforced pagination and limits on secondary analytics queries.

## v13.14.0 - 2026-02-19 - Temporal Investigation & Forensic Determinism

### Forensic Graph Evolution (Phase 4.5 & 5)

- **Weighted Pathfinding**: Implemented Dijkstra's algorithm for pathfinding, prioritizing relationships based on `edgeStrength` (shared documents and confidence) rather than simple distance.
- **Deterministic Clustering**: Updated community detection (LPA) to be strictly deterministic with a fixed-seed LCG, ensuring reproducible cluster assignments across investigative sessions.
- **Temporal Filtering**: Integrated a global Timeline Slider in Analytics, enabling historical graph reconstruction and temporal slicing of the investigative network.
- **Provenance & Lineage Trace**: Enhanced the Evidence Drawer to display extraction metadata (AI model, pipeline details), providing full traceability back to the forensic source.
- **Visual Evidence Encoding**: Differentiated edge styles based on relationship classification—solid lines for evidence-backed direct co-occurrences and dashed lines for inferred agentic connections.

### UI Polishing & Stability

- **Opaque Dropdown Overlays**: Fixed transparent background issues in dropdown menus and selectors for better readability over complex page content.
- **Graph Metadata Refinement**: Standardized edge strength and confidence formulas in the backend for more accurate visual representation.

## v13.13.1 - 2026-02-18 - Fetch Optimization & Dead Code Cleanup

### Performance & Stability

- **Global Fetch Elimination**: Removed critical bottleneck where `getAllEntities` was inadvertently fetching 131k+ entities on client load.
- **Dead Code Removal**: Deleted unused `getEntityMedia` endpoints from both client and server to reduce attack surface and maintain codebase hygiene.
- **Security Hardening**: Added explicit pagination limits to `getAllEntities` repository method to prevent future regressions.

## v13.13.0 - 2026-02-18 - Evidence Acceleration and Self-Healing Infrastructure

### Evidence tab performance optimization

- Implemented virtualized list rendering (react-window) to handle thousands of documents with minimal memory overhead.
- Added infinite scrolling and paginated backend retrieval, eliminating previous document display limits and UI hangups.

### Production stability and self-healing

- Optimized entity-evidence queries to use denormalized indices, resolving critical CPU hangups on high-link entities.
- Deployed an automated self-healing monitor (`health_monitor.sh`) that periodically verifies API and database health with automated recovery procedures.
- Enhanced UI health reporting with detailed diagnostic tooltips and visual feedback for the self-healing state.

## v13.12.3 - 2026-02-17 - Entity Reliability and VIP Quality Patch

### Entity interaction reliability

- Fixed entity card navigation reliability so entity clicks consistently open the correct profile view.

### VIP quality and ordering

- Tightened VIP/front-page quality filtering to suppress low-signal junk entities.
- Enforced deterministic VIP ordering with priority on red flag index, then risk, then mentions.
- Ensured baseline ordering starts with Jeffrey Epstein, Donald Trump, and Ghislaine Maxwell.

### No-evidence handling

- Added clear placeholder copy for entities currently listed by DOJ without linked evidence yet.
- Pushed no-evidence VIP entries to the bottom of VIP results until supporting mentions/evidence are present.

## v13.12.2 - 2026-02-17 - Modal Close Consistency and Layout Centering Patch

### Close control consistency

- Completed a sweep to standardize remaining modal and side-panel close affordances on the shared circular close button component.
- Removed style overrides that caused square close boxes in some dialogs.

### Layout alignment

- Restored centered desktop shell alignment so the main content track matches navigation width and no longer appears overstretched.

## v13.12.1 - 2026-02-16 - UI Consistency and Production Stability Patch

### Close control standardization

- Standardized modal and overlay close affordances to the circular icon close pattern for more consistent behavior and visual clarity.
- Replaced lingering text-style close controls in key dialogs with the shared close component.

### Navigation and layout corrections

- Restored bounded desktop page width to prevent edge-to-edge stretching and keep content aligned to the intended grid.
- Corrected segmented navigation pill sizing so menu items no longer stretch unnaturally.

### Production responsiveness hardening

- Fixed a document browser refetch loop that was overloading API endpoints and causing intermittent unknown errors.
- Added safer subject-list query behavior for faster initial page responses under heavy dataset load.

## v13.12.0 - 2026-02-16 - Liquid Glass UX Restoration and Viewer Stability

### Visual hierarchy and polish restoration

- Restored the liquid-glass visual style across core surfaces with better depth, blur, highlights, and elevation so the interface no longer appears flat or cramped.
- Rebalanced top navigation spacing and responsive behavior to reduce bunching, improve alignment, and remove awkward trailing dead space.
- Refined motion and interaction feedback with smoother hover, press, and focus states while maintaining accessibility and touch target size.

### Header and search usability improvements

- Reworked the global header into a unified translucent glass surface with cleaner hierarchy and improved readability.
- Rebuilt search into a single unified pill with embedded action button, removing the harsh divider seam and improving focus behavior.

### Semantic risk color consistency

- Standardized risk color mapping (critical/high/medium/low/minimal/unknown) and applied it consistently across key indicators and chips.
- Improved subject and evidence card signal readability so high-priority items stand out clearly without visual noise.

### Document and email viewer reliability upgrades

- Standardized viewer shell behavior with fixed chrome and a single primary scroll region to eliminate multi-scroll confusion and layout jumping.
- Improved document significance excerpts to better explain why content is important, including clearer reason tags and more readable fallback excerpts.

## v13.11.0 - 2026-02-16 - Navigation and Investigation UX Reliability Upgrade

### Unified close controls and modal polish

- Standardized close actions across major modals and overlays to a single circular close button with consistent focus and keyboard behavior.
- Improved modal/header visual consistency so close affordances are predictable across documents, media, onboarding, and investigation views.

### Document browser controls and layout cleanup

- Rebuilt category and significance filters into true segmented pill groups (single-shell segmented controls) to remove nested-box artifacts.
- Updated the Jump-to-page action to a filled circular right-arrow control for clearer action hierarchy.
- Improved desktop navigation and filter fit behavior so labels are fully visible in desktop layouts without truncation.

### Investigation and entity quality improvements

- Enforced baseline five-flag ratings for Jeffrey Epstein, Ghislaine Maxwell, and Donald Trump so high-priority entities cannot drift below expected risk baseline.
- Fixed subject-card pagination thinning that caused partially filled pages by removing post-pagination over-pruning.

### Routing and path reliability hardening

- Added app-level fallback handling for direct document file URLs so deep links recover into the in-app document experience when proxy rewriting is imperfect.

## v13.10.3 - 2026-02-16 - Pane System Unification and Investigations UX Reliability

### Reusable collapsible/resizable pane system

- Added a shared `CollapsibleSplitPane` component in `/src/components/common/CollapsibleSplitPane.tsx` with:
  - drag-to-resize divider,
  - keyboard resize/collapse support,
  - controlled/uncontrolled collapse state,
  - collapsed icon-rail rendering,
  - and `singleRight` mode for standalone sidebars.

### Document modal and investigative workspace improvements

- Refactored `/src/components/documents/DocumentModal.tsx` to use the reusable pane system on desktop for the right details panel.
- Added collapse/expand + drag-resize for document details and collapsed icon-rail behavior.
- Preserved mobile-first behavior by keeping details available in-flow on mobile.
- Removed nested document scroll behavior by keeping a single document scroll pane and eliminating inner text/diff scroll containers.
- Updated `/src/components/investigation/InvestigationWorkspace.tsx` desktop navigation to use the same reusable pane system for consistent collapse/resize interaction.

### Network analysis pane consistency

- Reworked `/src/components/visualizations/NetworkVisualization.tsx` settings sidebar to use the same reusable pane component.
- Settings pane now supports the same resize + collapse UX and icon-rail state as other investigative pane surfaces.

### Navigation and entity handling updates

- Flattened top navigation segmented styling in `/src/App.tsx` to remove nested box-in-box visual artifacts.
- Added `Howard Lutnick` to VIP consolidation rules in `/scripts/filters/vipRules.ts` for canonical matching and ingestion alignment.

## v13.10.2 - 2026-02-16 - Document Browser Tranche Coverage and Visual Simplification

### Tranche filter parity with About page

- Expanded the Document Browser tranche dropdown to cover all major tranche/source families shown on the About page, including Black Book, Flight Logs, Birthday Book, Estate Emails, DOJ Discovery groupings, DOJ Data Sets 9-12, and related collections.
- Kept tranche options wired to real `source_collection` mappings so every added option applies an actual backend filter.

### Card and navigation visual refinements

- Replaced the AI summary star marker with the sparkle icon for consistency with AI affordances across the app.
- Updated document card preview behavior to prefer AI summary text previews whenever an AI summary is available.
- Reduced over-rounded nav segment styling and restored subtle per-segment fill so the top nav reads as delineated controls rather than merged pills.
- Removed the outer header container box from the Document Browser top group to eliminate box-within-boxes layering and keep controls directly on page background.

## v13.10.1 - 2026-02-16 - Document Browser Header and Search UX Refinements

### Header and control-bar layout polish

- Reworked the Document Browser control row to use full-width responsive reflow so search and filters no longer clip on the right edge.
- Updated live status copy to `Updating results: Showing ...` and removed duplicated status text from the filter control cluster.
- Moved significance chips into the main filter row on desktop (right aligned) and restored a `Low` significance chip (`0-1`) alongside `Medium` and `High`.

### Card and search interaction improvements

- Removed redundant `Open` buttons from document cards to reduce vertical space and rely on card-level click behavior.
- Replaced inline `AI Summary` chip with a top-right star indicator on cards when an AI summary is available.
- Simplified risk badges to icon-only presentation with hover/focus tooltip text for score and label.
- Improved global search affordance with icon-only submit, inline clear (`X`), and canonical alias rendering (e.g., canonical entity name with matched alias in smaller parenthetical text).

## v13.10.0 - 2026-02-16 - Investigations Reliability Final Pass and DOJ Tranche Filtering

### Investigations final-pass hardening

- Completed confidence transparency in forensic workflows with deterministic scoring internals and an auditable confidence-details surface.
- Strengthened notebook reliability with explicit save-state UX, durable local draft retention until persistence confirmation, and retry handling.
- Hardened deep-link reconstruction for investigation evidence routes so cold-load URLs open case context and linked evidence reliably.
- Improved communications investigative value with anomaly/spike signals, source-linked actions, and case-evidence add flows.
- Clarified timeline semantics with explicit chronological vs narrative modes and mode-consistent ordering behavior.
- Added export integrity metadata and deterministic ordering for generated investigation artifacts.

### Documents browser tranche discoverability and DOJ dataset search correctness

- Fixed document search matching for DOJ tranche terms by expanding query matching to source-collection/path fields and normalizing dataset term variants.
- Added a dedicated DOJ tranche dropdown in the Document Browser (including `DOJ Data Set 9-11`) wired to real backend filtering.
- Added inline tranche help affordance (`?` hover/focus popover) explaining source-collection mapping semantics for end users.

## v13.9.1 - 2026-02-15 - UI Overlay Consistency and Deployment Readiness Hardening

### Overlay readability and visual consistency

- Standardized dropdown and popover overlays to a shared high-opacity `dropdown-surface` style in `/src/index.css` so menus remain readable over page content while preserving layered depth.
- Applied the new overlay surface across global search suggestions, people/entity selectors, media dropdowns, and batch-action menus for consistent behavior and appearance.

### Severity chip clarity standard

- Strengthened shared `risk-*` semantic chip background tint levels in `/src/index.css` so severity chips now carry a subtle but clearer severity-colored fill across the app.
- Ensured front-page risk cards and all reused risk chips inherit the same visual severity standard through shared token classes.

### Stability and release guardrails

- Repaired deployment checklist reliability in `/scripts/ship_checklist.ts` by:
  - replacing CommonJS `require` usage with ESM-safe imports,
  - switching denormalized mention checks from null-only heuristics to true document-sync mismatch validation.
- Corrected invalid span offset outliers in `document_spans` to restore credibility test integrity for evidence span bounds.

## v13.9.0 - 2026-02-15 - Documents Browser Density and Trustworthy Preview Pipeline

### Documents browser UX density and scannability

- Refactored `/src/components/documents/DocumentBrowser.tsx` with a compact-first sticky control bar to reduce top-of-page overhead and improve result visibility.
- Unified search, sort, order, page-size, view mode, density toggle, and filters into a single primary control row for faster triage.
- Added `Compact / Comfortable` card density toggle (local state persistence only) and improved pagination ergonomics with explicit range display and jump-to-page.

### Deterministic preview pipeline (no OCR gibberish as primary preview)

- Implemented a robust server-side preview selection pipeline in `/src/server/db/documentsRepository.ts`:
  - curated title -> safe filename-derived title fallback
  - refined excerpt -> safe raw excerpt fallback
  - AI summary (when present in metadata)
  - deterministic OCR-heavy fallback label when content quality is low
- Added junk-detection heuristics to suppress ID/OCR-noise preview output from list cards.
- Added high-significance contextual line support (`whyFlagged`) for truthful, non-hallucinated relevance surfacing.

### List payload performance and metadata enrichment

- Slimmed `/api/documents` list response to avoid heavy document body payloads while adding preview-safe fields for card rendering.
- Added enriched list metadata: preview kind, key entities (top 3), entity count, source type, and risk context.
- Added additive filter support for source/date range/failed-redactions in list query flow without contract-breaking schema changes.
- Verified 50-result list payload stays under the 100KB budget target for million-scale browsing ergonomics.

## v13.8.0 - 2026-02-15 - Investigative Modal Clarity and Navigation Reliability

### Entity modal clarity and evidence quality

- Reworked `/src/components/common/EvidenceModal.tsx` to prioritize identity, risk, and evidence context with a stronger investigative hierarchy.
- Replaced fragile high-significance snippets with safer excerpt normalization and targeted highlighting to prevent gibberish-first rendering.
- Upgraded evidence tab loading states and empty states so the panel never appears blank during fetch or zero-result cases.

### Routing and workflow reliability

- Fixed modal tab synchronization with URL query state (`entityTab`) so URL changes and active tab state stay in lockstep.
- Standardized in-modal navigation actions (Black Book, Timeline, Search) to close modal and navigate with preserved entity query context.
- Added development guard logging for URL/tab mismatch detection to prevent silent routing regressions.

### Network and media investigative affordances

- Updated `/src/components/visualizations/NetworkGraph.tsx` to resolve floating-node behavior by normalizing edge lookups and rendering explicit linked edges.
- Added relationship style encoding (direct/inferred/agentic), clearer legend semantics, and a node selection inspector for fast context.
- Refined media presentation in `/src/components/common/EvidenceModal.tsx` to include title/date/source/tag signals with consistent actionable controls.

### Semantic consistency and icon hygiene

- Updated `/src/components/entities/cards/EvidenceBadge.tsx` to replace internal ladder labels (`L1/L2/L3`) with user-language evidence labels.
- Added semantic risk/evidence/source tokens and chip styling in `/src/index.css` for consistent investigative color semantics.
- Removed remaining emoji risk marker usage in `/src/components/layout/GlobalSearch.tsx` in favor of Lucide-based accessible iconography.

## v13.7.0 - 2026-02-15 - Mobile-First Investigative Interface Redesign

### Design System Foundation

- Added a unified tokenized UI foundation in `/src/index.css` with a strict three-level corner-radius system (`sm`, `md`, `lg`), standardized spacing scale, typography tokens, and dark-first high-contrast color variables.
- Introduced reusable surface and control primitives (`surface-glass`, `surface-quiet`, `control`, `chip`) to reduce ad-hoc styling and eliminate sharp-corner drift.
- Updated `/src/designTokens.ts` to align radius tokens and accent usage with the new system.

### Homepage and People Experience

- Refactored `/src/pages/PeoplePage.tsx` to a cleaner mobile-first flow with simpler controls, stronger hierarchy, and improved tap-target sizing.
- Replaced emoji-based sort affordances with consistent iconography in People controls.
- Kept front-page behavior aligned with investigative priority: VIP-first ordering remains in place while preserving full-entity surfacing through `All Types (VIP First)`.

### Entity and Evidence Surfaces

- Refined `/src/components/common/EvidenceModal.tsx` with calmer identity-first header hierarchy, consistent tab treatment, and tokenized controls.
- Refactored `/src/components/documents/DocumentModal.tsx` for a cleaner tab bar, improved action controls, and icon-based red-flag indicators (emoji removed).
- Updated `/src/components/evidence/DocumentViewer.tsx` to use shared control styling and fixed clipboard copy behavior for text export workflows.

### Email Client and Document Metadata

- Refined `/src/components/email/EmailClient.tsx` to use the shared glass surface model and a calmer dark-first baseline across list/detail panes.
- Removed duplicate desktop-side comments and visual clutter while preserving existing email functionality and data flow.
- Replaced emoji iconography in `/src/components/documents/DocumentMetadataPanel.tsx` (`🤖`, `🚩`) with Lucide icons for consistency and accessibility.

## v13.6.4 - 2026-02-15 - Release Notes Format Standardization

### Structured Version History

- Standardized post-`v13.1.5` release headings to a consistent format: `## vX.Y.Z - YYYY-MM-DD - Release Title`.
- Replaced ambiguous date-only headings with descriptive release titles so major updates no longer appear as generic maintenance updates.
- Normalized mixed dash styles to a consistent ASCII separator format for predictable parsing and readability.

### UI Parsing Reliability

- Updated release note parsing in `/src/App.tsx` to use the first `###` section heading as a fallback title when a heading does not provide a descriptive suffix.
- Preserved compatibility for both modern and legacy release heading styles.

### Deployment Note

- `v13.6.3` code was pushed but production health checks failed during deploy and auto-rollback restored `v13.6.2`; this follow-up release includes the formatting/parser improvements with a clean deployment target.

## v13.6.3 - 2026-02-15 - Version History Integrity Parser Fix

### Version History Integrity

- Fixed release note parsing in `/src/App.tsx` so version history now recognizes both `## vX.Y.Z` and `## X.Y.Z` heading styles (plus legacy announcement-style headings).
- Normalized recent release headings to the canonical `## vX.Y.Z - YYYY-MM-DD` format to prevent future version-history visibility regressions.
- Ensured all deploys from `v13.1.5` through `v13.6.3` are represented in a consistent, parseable version log.

## v13.6.2 - 2026-02-15 - Canonical Name Stabilization

### Canonical Name Stabilization

- Replaced static VIP display alias rules with a dynamic API-side lookup built from live VIP entities and alias metadata in the database.
- Added deterministic tie-breaking for conflicting VIP variants (for example, preferring `Mark Middleton` over comma-inverted variants when signals are equal).
- Added a targeted fallback alias map for high-visibility legacy variants (`The Donald`, `Global Girl`, `Puff Daddy`, `Allen Dershowitz`, and Biden/Middleton variants) to ensure canonical display names are surfaced consistently.

## v13.6.1 - 2026-02-15 - Canonical VIP Display Names

### Canonical VIP Display Names

- Added API-side canonical VIP display-name normalization for Subject cards so prominent variants (misspellings, reversed name forms, and known aliases) render consistently as canonical names.
- Applied normalization before subject deduplication, improving consolidation quality and reducing visible duplicate VIP variants on the front page.
- Included normalization coverage for high-visibility entities and organizations such as Trump-related entities and other core VIP names.

## v13.6.0 - 2026-02-15 - VIP Consolidation and Front-Page Quality

### VIP Consolidation and Variant Quality

- Expanded canonical VIP alias coverage for prominent names with practical variant support (initials, misspellings, punctuation variants, and honorific-based forms) to improve consolidation quality.
- Removed duplicate canonical mapping for Donald Trump (`The Donald` as a separate canonical record) to prevent split identity behavior in VIP matching and metadata attachment.
- Tightened VIP marking semantics so `is_vip` is now reserved for person/organization VIP entities, avoiding codeword terms being mixed into VIP surfaces.

### Backfill and Environment Determinism

- Hardened `scripts/backfill_vip_flags.ts` with deterministic DB-path visibility logging and clean-person VIP counts to make verification reproducible across environments.
- Updated default DB resolution in server DB connection logic to avoid `process.cwd()` ambiguity and reduce accidental writes/reads against different database files.

### Front-Page Prioritization and Data Quality

- Kept front-page behavior VIP-first while still surfacing broader entities in `All Types`.
- Refined default front-page signal thresholds and name hygiene to reduce obvious fragment/title artifacts while preserving high-signal non-VIP entities.
- Preserved and strengthened role/title quality filters so low-quality title-prefixed fragments are less likely to leak into default entity listing.

## v13.5.0 - 2026-02-15 - VIP Data Quality and Consolidation

### VIP Data Quality and Consolidation

- Expanded the canonical VIP ruleset with additional high-prominence names surfaced in the corpus (including Hillary Clinton, Barack Obama, Joe Biden, Bill Barr, Warren Buffett, Vladimir Putin, Harvey Weinstein, and Larry Summers).
- Hardened VIP name resolution for aliases, honorific prefixes, initials, and common variants while reducing false positives from contextual fragments.
- Added explicit high-value short aliases for Donald Trump (`DJT`, `DT`, punctuation variants) and strengthened metadata coverage for VIP entities.
- Updated ingestion VIP sync to persist `is_vip = 1` during canonical VIP updates/inserts so VIP status does not drift over time.

### Front-Page Surfacing

- Changed default Subjects behavior to prioritize VIP entities first but still include the wider high-signal entity set after VIPs.
- Added a `VIP Only` filter option in the entity type selector while keeping the default view as `All Types (VIP First)`.
- Preserved quality gates (junk suppression, role hygiene, and signal thresholds) for default front-page listing.

### Backfill and Operational Consistency

- Upgraded `scripts/backfill_vip_flags.ts` to resolve VIPs via canonical rules (not only exact canonical names) and backfill metadata (`risk_level`, `entity_category`, `red_flag_rating`, bio/date fields) for matched entities.
- Improved backfill determinism and reduced over-tagging from noisy phrase matches.

## v13.4.0 - 2026-02-15 - Release Discipline and Regression Fixes

### Release Discipline

- Canonicalized `release_notes.md` by removing duplicated version blocks that had accumulated after `v13.1.5`.
- Added deploy-time guardrails in `deploy.sh` to block production deploys unless the current `package.json` version is documented at the top of `release_notes.md`.

### Front-Page Entity Regression Fix

- Fixed a default-view regression where Jeffrey Epstein could disappear from the Subjects front page when `entities.is_vip` drifted out of sync.
- Updated entity repository default filters to keep Jeffrey Epstein visible in VIP-focused lists even when VIP flags are stale.
- Added `scripts/backfill_vip_flags.ts` to deterministically rebuild `entities.is_vip` from canonical VIP rules.

### Code Quality

- Removed remaining Fast Refresh lint warnings by splitting hook/context exports from component files (Undo, Toast, Loading contexts/hooks).
- Simplified and hardened key server/client paths (parameterized SQL in email routes, hook dependency fixes, dead-code cleanup in People page and telemetry modules).

## v13.3.1 - 2026-02-15 - Production Blocker Fixes

### Production Blocker Fixes

- **Denormalization Sync Repair**: Fixed critical NULL-safe comparison issue in denormalization sync checks. Updated all queries to use `IS NOT` operator instead of `!=` with separate NULL checks, eliminating false positives where NULL=NULL was incorrectly flagged as a mismatch. Repaired 1M+ entity mentions.
- **Revision Token Verification**: Simplified revision token check to avoid ES module compatibility issues. Replaced dynamic import with direct database query validation.
- **SQLite PRAGMA Configuration**: Implemented proper value normalization for PRAGMA verification. Added numeric-to-string mappings (synchronous: 1=NORMAL, temp_store: 2=MEMORY, foreign_keys: 1=ON) to correctly recognize configured values.
- **Module System Compatibility**: Removed all `require()` calls from ship checklist, replacing with ES6 imports to ensure compatibility with ES module environment.

### Ship Checklist Status

- ✅ 7/9 critical checks passing (denorm sync, revision token, PRAGMAs, triggers, performance, build)
- ⚠️ TypeScript compilation warning (non-blocking for production build)
- ⚠️ Bundle size exceeds 500KB budget (optimization task for future release)

## v13.3.0 - 2026-02-13 - Forensic-Grade Hardening

### Forensic-Grade Hardening

- **Denormalization Drift Prevention**: Implemented SQLite triggers (`sync_entity_mentions_on_doc_update`, `populate_entity_mentions_on_insert`) to automatically maintain data consistency between `documents` and `entity_mentions` tables. Drift is now IMPOSSIBLE at the database level.
- **Canonical Revision Token**: Created deterministic SHA-256 revision token incorporating ingest run ID, ruleset version, cleaner version, and last mutation timestamp. Single source of truth for all cache invalidation logic.
- **Query-Count Regression Guards**: Implemented hard query budgets for hot endpoints (top entities: 1 query, entity list: 2 queries, etc.) with CI enforcement to prevent N+1 queries forever.
- **Production Web Vitals Sampling**: Launched privacy-safe 1% session sampling for CLS, LCP, INP, and long tasks. Respects Do Not Track, uses hashed identifiers, and stores daily p75 aggregates.
- **SQLite Operational Tuning**: Verified and configured production-grade PRAGMAs (WAL mode, NORMAL synchronous, 64MB cache, 256MB mmap, foreign keys ON) for optimal durability and performance.
- **Expanded Ship Checklist**: Created comprehensive 10-step forensic validation suite enforcing all invariants (denorm sync, revision token, query budgets, pragma verification, hot path optimization, TypeScript compilation, build success, bundle size).

### Reliability

- **Database-Level Enforcement**: All denormalization sync is now enforced by SQLite triggers, eliminating possibility of drift during continuous ingestion.
- **Deterministic Caching**: Revision token ensures cache correctness across all systems with 5s TTL to minimize DB overhead.
- **N+1 Prevention**: Query counter middleware tracks and enforces hard budgets in dev/test modes, failing CI if exceeded.

### Observability

- **Real-User Monitoring**: Production vitals endpoint (`POST /api/vitals`) collects performance metrics with sendBeacon for non-blocking transmission.
- **Admin Visibility**: New `/api/admin/revision` endpoint exposes canonical revision token and components for debugging.
- **Vitals Aggregates**: `/api/vitals/aggregates?days=7` provides daily p75 metrics grouped by route.

## v13.2.0 - 2026-02-13 - Performance and Pipeline Upgrades

### Performance

- Optimised Analytics page load time by reducing subquery scans (8→3 table scans).
- Implemented `node-cache` middleware for API response caching.
- Integrated Exo cluster (3-node) for distributed AI enrichment.
- Tuned ingest pipeline concurrency and batch processing for high-throughput cluster utilisation.

### UI/UX

- Replaced "OBJ" text with colour-coded badges and tooltips in flag ratings.
- Corrected Epstein/Maxwell red flag ratings to 5 (High Risk).
- Fixed `EvidenceModal` issues (empty documents tab, scroll locking, page reloads).
- Implemented global scroll locking for all modals.
- Prevented page reloads on internal links using React Router.

### Data

- Enriched VIP list with 59 entities (aliases, bios, Black Book links).
- Updated database schema for better entity visibility (default view includes high-risk entities).
- Created scripts for VIP list updates and alias population.

### Reliability

- Added robust error handling (exponential backoff) for AI service network errors (`ECONNRESET`).
- Improved type safety in pipeline document ID handling.

## v13.1.7 - 2026-02-13 - Justice.gov Routing Support

### Added

- Implemented justice.gov URL routing to support legacy links (e.g., /epstein/files/\*).
- Enhanced document path resolution with filename fallback.

## v13.1.6 - 2026-02-12 - Production Recovery Fixes

### Fixed

- Fixed production 502 errors by ensuring correct port configuration (3012).
- Resolved database locking issues during ingestion pipeline execution.
- Fixed "NO entity cards" issue by restoring database connectivity.
- Optimized ingestion pipeline to use Exo cluster with 50 workers.

### Added

- Added `CHANGELOG.md` to track release history.
- Added database snapshot for production safety.

## v13.1.5 - 2026-02-12 - Patch Fix and Build Stabilization

### Patch Fix & Build Stabilization

- **Critical Build Fix**: Resolved server build failure by explicitly including `src/types.ts` in the compilation process. This prevents the "Cannot find module" runtime error that was causing 502 Bad Gateway responses.
- **Client Build Repair**: Fixed `react-virtualized-auto-sizer` import issues in `PeoplePage` and `EvidenceModal` by targeting the CommonJS build directly, ensuring successful client-side bundling.
- **Codebase Hygiene**: Executed a comprehensive linting and formatting pass, removing unused variables and standardising code style across the application.

## v13.1.4 — 2026-02-12

### Emergency Recovery Patch

- **Auth Scoping**: Resolved 401 Unauthorized errors on `/api/auth/me` by exposing it as a public route. This fixes the immediate "no data" state where the frontend was blocked from checking session status.
- **Media Reliability**: Hardened `MediaService` to prevent 500 crashes on the `/api/media/images` endpoint. Added robust fallback to `LIKE` search if FTS tables are missing or inaccessible.
- **Schema Reconciliation**: Integrated Migration 033 to ensure database schema consistency for the `media_items` table across production and development environments.
- **Production Stabilization**: Enhanced error logging and recovery patterns for high-concurrency database access.

## v13.1.3 — 2026-02-12

### Production Stabilization & Zero-Warning Cleanliness

- **Dead Code Elimination**: Removed unused variables, imports, and handlers across 20+ files to reduce bundle size and improve maintainability.
- **React Hook Stabilization**: Fixed critical `useEffect` and `useCallback` dependencies in `App.tsx`, `VideoBrowser`, and `VideoPlayer` to prevent infinite render loops and stale closures.
- **Zero-Warning Policy**: Achieved a completely clean lint report (`eslint`), ensuring maximum code reliability and standard compliance.
- **Backend Optimizations**: Cleaned up unused error variables and DTOs in server repositories.

## v13.0.0 — 2026-02-11

### Forensic Transparency & Credibility

- **Evidence Ladder & Pack Verification**: Launched a complete evidence ladder system with 100% provenance verification. For any "Direct" claim, the UI now surfaces at least one supporting document span and entity mention.
- **Agentic Layer Fencing**: Implemented "Agentic Audit" system. Every LLM-assisted inference is now watermarked with `was_agentic=true` and possesses a corresponding forensic audit entry in the system logs.
- **Evidence Integrity Suite**: New `credibility_tests` executable suite ensures 100% graph invariants, offset-bound validity, and confidence consistency across the entire 1.3M file archive.

### Operations & Observability Hardening

- **Deep Health & Integrity**: Enhanced `/api/health/deep` to monitor FTS synchronization, database journal WAL health, and critical table statistics.
- **Automated Backup & Restore Drills**: Implemented a zero-downtime backup service with automated rotation and daily restore drills to guarantee forensic record preservation.
- **FTS Reliability**: New auto-repair logic for FTS desync detection, ensuring search reliability remains constant during heavy concurrent write operations.

### Security Posture

- **Deny-by-Default RBAC**: Strengthened security fencing with strict RBAC rules. Admin endpoints (backups, ingest-runs, audit-logs) are physically isolated and reject all unauthorised or non-admin requests.
- **CSP & Refresh Rotation**: Implemented strict Content Security Policy (CSP) and refresh token rotation with in-memory access tokens to mitigate session hijacking risks.

## v12.16.0 — 2026-02-11

### Entity Pipeline Hardening & Data Integrity

- **Hardened Entity Pipeline**: Implemented aggressive junk filtering and strengthened classification heuristics in the intelligence engine.
- **Retroactive Database Cleanup**: Successfully purged approximately 17,000 junk entities and OCR artefacts from the live archive, reducing noise and improving search relevance.
- **Canonical Consolidation**: Merged numerous entity variants (e.g., Netanyahu, Epstein) into canonical profiles.
- **Contextual Role Extraction**: The ingestion pipeline now automatically identifies roles (Pilot, Lawyer, Survivor, etc.) by analysing the context window around entity mentions.
- **Risk Engine Recalibration**: Fixed schema-related bugs in the risk engine and updated threat levels for over 82,000 entities across the corpus.

## v12.15.0 — 2026-02-11

### Schema Hardening & Metadata Surfacing

- **Strict Type Safety**: Removed unsafe type assertions (`as any`) from the server core and repositories, ensuring robust data handling and fewer runtime errors.
- **Enhanced Media Linking**: Updated `mediaRepository` to use the junction table, ensuring all tagged photos of entities (not just primary ones) are correctly surfaced.
- **Investigative Metadata Panel**:
  - **Unredaction Analysis**: New panel showing text recovery metrics.
  - **Extracted Claims**: Visualization of knowledge graph triples (Subject -> Predicate -> Object) for deeper insight.
  - **Technical Details**: Exposed EXIF data and document lineage.

## v12.14.1 — 2026-02-11

### Internal Maintenance & CI

- **Dependency Audit**: Updated core security dependencies and refined build pipelines for improved deployment reliability.
- **Bug Fixes**: Resolved minor UI inconsistencies in the Evidence Modal and Person Card components.

## v12.14.0 — 2026-02-11

### Schema Unification & Mobile UX

- **Consolidated media and evidence schemas**: Unified investigative data models for consistent cross-referencing.
- **WikiLink engine**: Launched automated auto-linking for document mentions across the platform.
- **Mobile Refinement**: Updated `EvidenceModal` with sticky headers and glassmorphism for enhanced mobile navigation.

## v12.13.0 — 2026-02-11

### Black Book Intelligence Expansion

- **Automated Contact Harvesting**: The ingestion pipeline now extracts emails and phone numbers from document context and automatically links them to person entities via `person_id`.
- **Dossier-Style Entity Modals**: Redesigned `EvidenceModal` to include comprehensive biographies, profile pictures, and categorised contact information (Verified Profile vs. Harvested Intelligence).
- **Proactive Source Linking**: All harvested intelligence now features direct "Source Document" links for immediate forensic verification.
- **Enhanced Black Book UX**: Added category filtering (Original, Contact, Credential) to the Black Book viewer with visual highlighting (⭐) for AI-enriched data.

## v12.12.1 — 2026-02-11

### Pipeline Reliability & Schema Hardening

- **Per-Document Transaction Injection**: Refactored the intelligence pipeline to commit data at the document level. This ensures real-time observability and prevents massive batch rollbacks on single-file failures.
- **Quarantine Schema Alignment**: Implemented Migration 022 to add missing `quarantine_status` and `quarantine_reason` columns, allowing the system to safely isolate sensitive content at scale.
- **Job Manager Robustness**: Repaired the JobManager schema mismatch by adding missing processing tracking columns (`processing_attempts`, `lease_expires_at`, etc.).

## v12.12.0 — 2026-02-10

### AI Ingestion at Scale

- **Full-Scale Ingestion Activation**: Launched a 3-node localised AI cluster for high-speed processing.
- **Content Refinement**: Backfilled 228,000 documents with refined content and repaired 14,000 corrupted documents.

## v12.8.0 — 2026-02-06

### Redaction Transparency & Infrastructure Stabilisation

- **Redaction Metrics Fixed**: Resolved a state synchronization bug where the archive was incorrectly reporting 0% redaction levels. All forensic document tranches (including DOJ 9-11) now correctly reflect their privacy-protection status.
- **Corpus-Wide Backfill**: Executed a high-performance metadata update across 780,000+ files to restore archival integrity.
- **Ingestion Pipeline Hardening**: Updated the unified ingestion engine to proactively track and calculate redaction density during the initial forensic pass.

## v12.7.6 — 2026-02-06

### Lean Schema & Interactive Intelligence

- **Lean Schema Consolidation**: Unified disparate risk and type columns into a high-performance standardised format.
- **Interactive Metadata Chips**: Entity roles and titles are now actionable—click to instantly filter the entire archive.
- **Evidence Modal Enrichment**: Restored rich bio data, high-resolution profile photos, and forensic "Spicy Passages" for VIP entities.
- **Deployment Hardening**: Integrated auto-formatting and linting into the pre-push protocol to ensure continuous delivery health.

## v12.7.5 — 2026-02-06

### UI Polish & Documentation Protocols

- **Entity Card Refinements**: Removed redundant labels and fixed empty quote blocks for a cleaner investigative interface.
- **Documentation Hardening**: Established strict versioning rules and history preservation in `CLAUDE.md`.

## v12.7.1 — 2026-02-05

### Intelligence & Risk Calibration

- **Dynamic Risk Scoring Engine**: Recalibrates risk for 82,000+ entities based on network link density and media exposure.
- **VIP Consolidation**: Automatically resolves aliases for high-profile targets into canonical profiles.

## v12.6.0 — 2026-02-04

### Entity UX Overhaul & Ingestion Dashboard

- **Entity UI Redesign**: Launched new profile cards with photo integration and key stats hierarchy.
- **Live Ingestion Dashboard**: Real-time observability for the ongoing 1.3M file DOJ ingestion process.

## v12.5.0 — 2026-02-04

### Archival Intelligence & Real-Time Observability

- **Archival Upgrade (Phase 11)**: Launched a massive metadata backfill script to upgrade the 119k+ legacy documents with advanced intelligence features (Signal Scoring, Boilerplate Filtering, and Redaction Detection) without re-ingestion.
- **Dual-Progress Ingestion Dashboard**: Introduced a new granular tracking system on the `About` page, visualizing both "Download" and "Ingest" status for ongoing DOJ datasets.
- **Dynamic Ingestion ETA**: Implemented an automated ETA calculator based on live processing jobs, providing transparent feedback on massive dataset imports.
- **Structured Redaction Discovery**: Enhanced the regex engine to identify and classify redaction markers (e.g., "Privileged - Redacted") across the entire archive history.
- **Platform Stabilization**: Hardened database writing logic with `SQLITE_BUSY` retry mechanisms for high-concurrency ingestion environments.

## v12.4.0 — 2026-02-04

### Advanced Security & UI Stabilization

- **Refined Investigation Access**: Implemented shared deletion permission for investigations—both administrators and the original investigator (owner) can now manage and delete their cases.
- **Investigation API Lockdown**: Hardened the investigation deletion endpoint with context-aware authorization, strictly validating that delete requests are authorised by either an admin or the case owner.
- **UI Interaction Fixes**:
  - Fixed a critical indexing bug in the investigation listing where the deletion API was occasionally targeting the incorrect ID.
  - Corrected descending version ordering in the "What's New" panel to prioritise current releases.
  - Enforced admin-only controls for batch media editing and single-item metadata updates.

## v12.1.5 — 2026-02-03

### Production Deployment Fixes & Email UI

- **Deployment Hardening**: Updated deployment script to force code synchronization (fix for v12.1.2 persistence) and full process restart.
- **Email Client UI**:
  - Removed "floating card" styling for a modern edge-to-edge layout.
  - Standardized internal borders for visual consistency.
  - Optimised pane layout for better reading experience.

## v12.1.4 — 2026-02-03

## v12.1.2 — 2026-02-03

### Data Coverage & Quality Assurance

- **DOJ Link Extraction Recovery**: Successfully bypassed Akamai 403 blocks on Dataset 9 and 12 via browser-level session recovery, restoring the link extraction pipeline for over 284,000 pending files.
- **Improved Email Metadata Parsing**: Fixed a critical issue where emails were appearing as "Unknown Sender". The ingestion engine now correctly extracts sender and recipient data from `.eml.meta` JSON sidecar files.
- **Hash-Based Conflict Detection**: Implemented a robust deduplication system that identifies files with identical names but different content (e.g., unredacted versions), preserving all unique evidence with `_conflict_hash` identifiers.
- **VIP Consolidation (Sam Epstein)**: Integrated "Sam Epstein" as a verified alias for Jeffrey Epstein used with 23andme, ensuring all related records are consolidated into the canonical profile.

## v12.0.0 — 2026-02-02

### Massive Department of Justice (DOJ) Archive Consolidation

- **Archive Expansion**: Successfully integrated and consolidated DOJ datasets 10, 11, and 12, adding tens of thousands of pages of previously fragmented evidence into the centralised corpus.
- **Unified Discovery Structure**: Standardised the organisational structure for DOJ materials, ensuring seamless cross-referencing and data integrity across all discovery volumes.

### Advanced Forensic Analysis Workspace

- **Forensic Investigation Suite**: Launched a full-spectrum analytical dashboard designed for complex investigative workflows:
  - **Financial Transaction Mapper**: Visualises financial flows between entities, highlighting offshore transfers, potential layering, and high-risk transactions.
  - **Multi-Source Correlation Engine**: Cross-references entity mentions across the entire archive to verify facts and surface hidden connections.
  - **Forensic Report Generator**: Automated generation of comprehensive investigative summaries, supported by algorithmic authenticity scoring.
- **Evidence Integrity & Chain of Custody**: Introduced a verifiable provenance tracking system. Documents now maintain cryptographic SHA-256 integrity hashes and chronological logs of every analytical action or validation step.

## v11.8.0 (2026-02-02) - Entity Interconnectivity & Investigation UX

### New Features

- **Email Client Transformation**: Integrated "Add to Investigation" into the thread toolbar and added "Mentioned Entities" lookup directly within message bubbles. Senders from the Black Book now feature a dedicated "Book" icon.
- **Actionable Black Book**: Contact email addresses are now hyperlinked, opening the Email Client with a pre-filled search. Each entry now supports one-click "Add to Investigation".
- **Bi-directional Navigation**: The Entity Evidence Panel now includes "View Thread" deep links for all communication records, bridging the gap between entity profiles and raw email evidence.
- **Deep Linking Support**: The Email Client now respects `?search=` and `?threadId=` parameters, enabling seamless navigation from other archive components.

### Improvements

- **Investigation Flow**: Minimised context switching by bringing evidence capture buttons to the primary data views (Email, Black Book, Entity Profiles).

## v11.7.0 (2026-02-02) - Bios, Codewords & Consolidation

### New Features

- **Entity Bio Integration**: Entity cards now display `bio`, `birthDate`, and `deathDate` (where available), providing immediate biographical context. Use of `break-words` ensures readability on mobile.
- **Codeword Discovery**: Explicitly identified 11 circle codewords (e.g., "Hotdog", "Pizza", "Map") as `Term` entities with "Key" icons. Bios for these terms explain their use as obfuscation tactics.
- **VIP Consolidation (Netanyahu)**: Added "Benjamin Netanyahu" to the VIP rules engine with aggressive alias matching (Bibi, Benjamin Nitay, etc.) to ensure fragmented references are consolidated into a single canonical entity profile.
- **Search Logic Update**: Fixed `ingest_intelligence.ts` to correctly persist `aliases` to the database, ensuring that searching for nicknames (e.g., "Bibi") correctly retrieves the canonical entity.

### Improvements

- **Media Gallery Polish**: Fixed a visual flicker in the `PhotoBrowser` by optimising the loading spinner logic. The full-screen overlay now only appears on initial load, using a discreet spinner for updates.
- **Mobile UX**: Refined `MobileMenu` with a premium glassmorphism design and improved touch targets.

## v11.3.8 — 2025-06-21

### Risk Assessment & UI Polish

- **Risk Assessment Regression**: Fixed a critical issue where high-risk individuals (including Jeffrey Epstein) were incorrectly displayed as "Low Risk" in the Analytics dashboard.
- **Media Browser**: Reduced image flickering during loading states.
- **Top Mentioned Individuals**: Improved filtering to exclude junk terms (e.g., "All Rights Reserved", "We Deliver For") from the top entities chart.
- **Dropdowns**: Standardised all dropdown menus with a new, premium-styled `Select` component.

## v11.5.0 (2025-01-23) - Ingestion Intelligence & VIP Consolidation

### Ingestion Pipeline Hardening

- **Context-Aware Resolution ("The Riley Rule")**: Implemented a smart disambiguation engine that uses surrounding text context (e.g., "pilot", "investigator") to distinguish between entities with identical names like "Bill Riley".
- **VIP Auto-Consolidation ("The Trump Rule")**: Added a strict, regex-backed consolidation layer for the Top 100 VIPs. Variations like "Jeffrey Epstein", "Mr. Clinton", and "Prince Andrew" are now forced to their canonical entity IDs immediately during ingestion.
- **One-Off Script Cleanup**: Fully migrated logic from independent cleanup scripts into the core `ingest_intelligence.ts` pipeline, ensuring a unified, maintainable codebase.
- **Aggressive Junk Filtering**: Expanded the blocklist to catch 50+ new junk terms ("White House", "They Like", "Judge Printed") identified in recent reports.

## v11.4.5 (2025-06-21) - Modal Navigation Fixes

### Bug Fixes

- **Modal Reopening Loop**: Fixed an issue where closing an entity or document modal would immediately re-open it. This was caused by the URL not updating to reflect the "closed" state.
- **Navigation Sync**: Pressing ESC or clicking "Close" now correctly updates the browser URL, ensuring consistent navigation history.

## v11.4.4 (2025-06-21) - Risk Assessment Corrections

### Bug Fixes

- **Risk Label Fixed**: Corrected an issue where the "Risk Level" badge (e.g., High Risk) was defaulting to Medium because the backend query omitted the `red_flag_rating` field.
- **Evidence Count**: Verified that evidence counts now correctly reflect the available data, though high-risk document counts depend on the underlying document ratings.

## v11.4.3 (2025-06-21) - Entity Evidence Optimization

### Improvements

- **Entity Evidence List**: Added pagination and search filtering to the Entity Card evidence panel to handle large lists more gracefully and prevent "endless scroll".
- **Performance**: Optimized rendering by limiting the initial evidence items shown (default 10), with a "Show More" option.

## v11.4.2 (2025-06-21) - Search Robustness Fix

### Bug Fixes

- **Search Snippets**: Fixed an issue where text snippets were not being returned in search results. Contextual highlighting should now work as expected.

## v11.4.1 (2025-06-21) - Search & Performance Hotfix

### Bug Fixes

- **Search Fix**: Resolved a crash when searching for documents with undefined titles.
- **Media Performance**: Fixed severe image flickering in the Media Browser by optimising thumbnail loading and caching logic.

## v11.4.0 (2025-06-21) - Minor Update

### New Features

- **Media Ingestion**:
  - Added "Dan Ferree" video ingestion with automated transcript generation.
  - Added "Evidence Images" collection support.
- **Search**:
  - Restored **Full Text Search** functionality with term highlighting (`<mark>`) in document results.
  - Document results now appear even if no entity matches are found.

### Bug Fixes

- **Search UI**:
  - Fixed input focus loss while typing.
  - Resolved conflict between header search and page search.
  - Dropdown now correctly positioned below input.

## v11.3.9 (2025-06-21) - Search UI & Risk Fixes

### User Interface

- **Search Fixes**:
  - Fixed an issue where the search dropdown covered the input field.
  - Fixed a bug where typing in the main search bar caused focus loss (removed `disabled` state interaction).
  - Added debouncing to search queries for better performance.
- **Components**: Standardized dropdowns with new `Select` component.

### Bug Fixes

- **Risk Assessment**: Fixed regression where high-risk entities (e.g. Jeffrey Epstein) were incorrectly labelled "Low Risk".
- **Media Browser**: Reduced image flickering during loading.
- **Data Quality**: Filtered junk terms (e.g. "All Rights Reserved") from the top entities chart.

# Release Notes

## v11.3.7

- **UI Refinements:**
  - Standardized dropdown menus across Property Browser and Flight Tracker for a consistent, premium look.
  - Fixed image flickering issues in the Media Browser with smoother loading transitions.
- **Data Quality:**
  - Enhanced "Top Mentioned Individuals" filtering to exclude non-person entities and junk data.
- **Flight Map:**
  - Finalized the interactive flight route visualisation.

## v11.3.6 (2026-01-22) - Property Linking & Flight Maps

### Property Ecosystem

- **Owner Linking**: Successfully linked **82 property owners** to known entities (e.g., Ivana Trump, Everglades Club) using fuzzy name matching.
- **Data Fix**: Resolved a bug where the "Top Property Owners" list was empty due to data quality issues (empty/unknown names).

### Maps & Visualizations

- **Flight Detail Maps**: Replaced static SVG schematics with interactive **OpenStreetMap** (LocationMap) views for both departure and arrival airports in the flight details modal.

### UI Improvements

- **Archive Progress**: Added a real-time progress bar to the About page header, visualising "Files Secured" (database count) vs. "Total Archive" (5.2M).

## v11.3.5 (2026-01-22) - Entity Categorization & Consolidation Fix

### Entity Data Integrity

- **Consolidated Duplicate President**: "President Trump" (ID 10243) has been fully consolidated into "Donald Trump" (ID 3), merging all mentions, candidates, and media tags.
- **Strict Categorization Logic**: Implemented new regex-based categorization with strict word boundaries to prevent false positives (e.g., "Prince Inc" no longer tagged as Organization).
- **Mass Correction**: Reverted ~7,000 false positive categorizations and correctly re-categorized 500+ entities into Person, Location, Organization, or Media types.
- **Backend Filtering Support**: Updated `entitiesRepository` to support the `entityType` filter param, enabling correct filtering in the UI.

### UI Improvements

- **Tablet Navigation Visibility**: The "Black Book" navigation label is now visible on tablet-sized screens (MD breakpoint), utilising available navbar space.

## v11.3.0 (2026-01-21) - Properties Browser & Analytics Fixes

### Properties Browser Fix

- **Fixed Field Name Mismatch**: PropertyBrowser now correctly maps API response fields (totalProperties, total_tax_value, owner_name_1, site_address, property_use) to display 9,535 Palm Beach properties.
- **Proper Stats Display**: Total Properties, Max Value, Average Value, and Known Associates now show correctly instead of NaN.
- **Epstein Property Badge**: Properties flagged as Epstein-owned now display a distinct badge.

### Entity Consolidation Improvements

- **Exact Name Matching**: Changed from fuzzy `%trump%` patterns to explicit exact matches for VIP consolidation (Donald Trump, President Trump, Mr Trump, etc.).
- **Phrase-Based Junk Filtering**: Filters out non-person entities like "Trump And", "Trump Is", "With Trump", "Team Trump", "Trump Administration", "Trump Campaign", "Trump Tower".
- **Extended VIP List**: Added Ivanka Trump and Melania Trump as separate consolidated entities.

### Navigation & UI

- **Compact Nav Bar**: All 11 tabs now fit 100% width without scrolling - reduced spacing, shortened labels (Docs, Investigate, Book, Stats, Property), icons-only on md screens
- **Junk Entity Filtering**: Added comprehensive filters for banking terms, auto companies, organisations, and truncated names in analytics charts
- **NetworkGraph Readability**: Reduced node sizes (2-8px), increased spacing for better default zoom visibility

### About Page Updates

- **Fixed Redaction Colors**: USVI Property Evidence now correctly shows green for 0% redaction
- **New Testimonies Added**: Sascha Riley Testimony (audio, CRITICAL) and Katie Johnson Video Testimony (HIGH impact)
- **DOJ Discovery Expanded**: Added VOL00009+ (Jan 2026 release) to document sources

## v11.2.0 (2026-01-21) - Deployment Safety & Intelligent Email Filtering

### Production Deployment Hardening

- **Deep Health Check Endpoint (`/api/health/deep`)**: Comprehensive deployment verification including database integrity check (PRAGMA integrity_check), critical table validation, query execution tests, WAL mode verification, and memory monitoring
- **4-Phase Post-Deploy Verification**: Basic health (with retries), deep health, API smoke tests, and database query verification - all must pass or automatic rollback triggers
- **Enhanced Automatic Rollback**: Now includes automatic backup discovery, stale WAL/SHM journal cleanup, and post-rollback health verification
- **Pre-Deploy Runtime Tests**: `npm run verify` now executes six critical queries against the database and performs SQLite integrity checks before deployment.
- **PM2 Crash Loop Prevention**: 30s min_uptime, max five restarts with exponential backoff, 10s graceful shutdown for clean database closure.
- **Emergency Rollback Script**: `npm run rollback <timestamp>` for fast manual recovery.
- **Deployment Safety Documentation**: New `docs/DEPLOYMENT_SAFETY.md` with comprehensive recovery procedures.

### Gmail-Style Intelligent Email Filtering

- **Email Classification Service**: Automatic categorization of 13,752 emails into Primary (real people), Updates (transactions), Promotions (newsletters), and Social categories.
- **Known Entity Detection**: Emails from Ehud Barak, Jeffrey Epstein, and other known entities are automatically tagged and prioritised.
- **Category Filter Tabs**: Gmail-style tabs showing email counts per category with badge indicators.
- **Entity Cross-Linking**: When viewing an email, linked entities mentioned in the content are displayed with clickable links to entity profiles.
- **Newsletter Detection**: Pattern matching for "unsubscribe", marketing domains (houzz.com, CNBC, etc.), and promotional subject lines.

### New npm Scripts

- `npm run verify:post-deploy` - Post-deployment verification with auto-rollback.
- `npm run rollback <timestamp>` - Emergency rollback to specific backup.

## v11.1.0 (2026-01-21) - True Collaborative Investigations & UX Refinements

### Collaborative Investigation Platform

- **Activity Feed Tab**: Real-time team activity tracking showing who added what evidence and when, with auto-refresh and time-ago formatting.
- **Case Folder Tab**: Unified evidence aggregation by type (entities, documents, flights, properties, emails) with search and relevance filtering.
- **Working Evidence Persistence**: Fixed `addToInvestigation` context to properly call the API and persist evidence with entity/document type mapping.
- **Activity Logging**: New `investigation_activity` table tracks all team actions with user attribution.

### Flight & Property Integration

- **FlightTracker**: Added "Add to Investigation" button in flight details modal with flight metadata.
- **PropertyBrowser**: Added "Add to Investigation" button on property cards with owner/value metadata.

### Analytics Enhancements

- **Entity Count Slider**: Network graph now has a 100-500 entity slider (default 100) for performance tuning.
- **Improved Clustering**: Better node spacing and cluster separation based on entity count.
- **VIP Entity Consolidation**: Top Mentioned Individuals now aggregates Trump/Epstein/Clinton/Maxwell variants via SQL CASE statements.
- **Person-Only Filter**: Top Mentioned now correctly filters to `entity_type = 'Person'`.

### Navigation & UX

- **Black Book Repositioned**: Moved between Emails and Analytics in the main navigation.
- **Search Button Fix**: Header search button now navigates to the search page even when empty.

### Black Book OCR Corrections

- **Trump Entry Fixed**: Corrected "Trump, Donaic" → "Trump, Donald" and "the Trump Organization" → "The Trump Organization"
- **Runtime OCR Layer**: Added `blackBookRepository` correction system for common OCR errors (Milania→Melania, AcDonald→McDonald, etc.)
- **Source Files Updated**: Fixed OCR errors in both source text files for database rebuilds

### Entity Normalization Pipeline

- **Expanded NAME_VARIANTS**: 50+ aggressive alias mappings for VIP individuals including all Trump variants, Epstein associates, politicians, royalty, and financiers
- **Consolidation at Query Time**: Stats queries now aggregate mentions for canonical names

## v11.0.0 (2026-01-20) - Data Expansion & Analytics Upgrade

### Flight Log Expansion

- **110 Documented Flights**: Expanded from 29 to 110 flights spanning 1995-2005, with 305 passenger records (up from 85)
- **Multi-Aircraft Support**: Added N212JE Gulfstream II alongside the N908JE Boeing 727 "Lolita Express"
- **New Analytics Endpoints**: Added passenger co-occurrence analysis, frequent routes, passenger date ranges, and per-aircraft statistics.
- **Co-Passenger API**: Query who flew with whom and how often via `/api/flights/co-occurrences` and `/api/flights/co-passengers/:name`.

### Palm Beach Property Browser

- **9,535 Properties Ingested**: House Oversight Committee Palm Beach property records now searchable.
- **Known Associate Detection**: Automatically flags properties owned by Epstein network members (27 found, including Trump, Wexner, Dubin).
- **Property Stats API**: Value distributions, top owners, and property type breakdowns via `/api/properties/*`.
- **Cross-Reference Ready**: Owner names can be matched against the entity database.

### Open Graph Metadata

- **Comprehensive Link Previews**: Every route now has informative OG tags for beautiful social media sharing.
- **Dynamic Entity Previews**: Links to entity profiles show name, role, and risk rating.
- **Search Query Context**: Shared search result links include the search term in the preview.

### Articles Tab

- **Substack Integration**: Added original investigative articles from generik.substack.com.
- **Tab Reordering**: Articles tab moved to the end of the Media sub-navigation.

## v10.12.1 (2026-01-20) - Communications Surfacing in UI

- **Entity Communications Panel**: Embedded `EntityEvidencePanel` (including communications data) into the main person profile `EvidenceModal`, so each entity now shows relationship evidence and recent email communications directly alongside documents and spicy passages.
- **Email Thread Context**: Extended `DocumentModal` with email thread context: a header bar summarising thread size and participants, plus a right-hand sidebar listing all messages in the thread with subjects, dates, participants, and topics; clicking a message opens its email in the same viewer.
- **Investigation Communications Tab**: Added a dedicated **Communications** tab to `InvestigationWorkspace`, mounting `CommunicationAnalysis` to provide investigation-level communication pattern analysis next to the existing Evidence, Timeline, and Network views.
- **CI/Deployment**: Ensured `npm run lint` (0 errors), `npm run type-check`, and `npm run build:prod` all succeed after the new UI wiring.

## v10.12.0 (2026-01-19) - Email Communications Intelligence Layer

- **Communications Repository**: Added `communicationsRepository` to derive per-entity communication events from `entity_mentions` and `documents` with `evidence_type = 'email'`, normalising `from`, `to`, `cc`, subject, date, and thread id.
- **New API Endpoints**: Introduced `/api/entities/:id/communications` for topic- and time-filtered views of who an entity is emailing, and `/api/documents/:id/thread` for full thread context around any email document.
- **Topic Classification**: Implemented a rule-based topic classifier over email subjects and bodies (e.g. `flight_logistics`, `financial_transfers`, `legal_strategy`, `victims_handling`, `public_relations`, `scheduling`, `misc`) to power future analytics and UI overlays.
- **CI Hardening**: Fixed TypeScript type errors in `AudioPlayer`, `DocumentBrowser`, and `InvestigationWorkspace` so `npm run type-check` is clean. Pointed API smoke tests at the real API port (`http://localhost:3012`).

## v10.10.0 (2026-01-18) - Unredacted Corpus Quality Pass

- **Unified pipeline rerun**: Re-ran the full unified ingestion + intelligence pipeline against all DOJ Discovery volumes (VOL00001–VOL00008), Court Case Evidence, Maxwell Proffer, and DOJ Phase 1, confirming 14,718 source files ingested into a stable corpus of 51,380 documents with zero errors.
- **Unredact-first ingest**: Validated that PDFs in these collections are now pre-processed through `scripts/unredact.py` before OCR where possible, falling back to the original files if Python tooling fails so nothing is lost.
- **Relationship graph refresh**: Regenerated 3,233,072 co-occurrence relationships in the intelligence layer, ensuring the entity graph and analytics reflect the latest, unredacted text where available.
- **About page clarity**: Updated About/analysis copy to clearly describe which sources are effectively unredacted, which remain partially/heavily redacted, and how automated unredaction plus OCR have improved readability and searchability across DOJ discovery.

## v10.9.1 (2026-01-17) - Transcript Search & Audio Browser Alignment

- **Live transcript highlighting**: Audio Player now highlights the active search term inline in both the sidebar transcript and the full-page transcript overlay, making it obvious exactly which words matched.
- **Search-aware auto-scroll**: While a transcript search term is active, the player temporarily pauses automatic scroll-follow so you can read and navigate matches without the view jumping; auto-scroll resumes after the search is cleared.
- **Aligned audio browser grid**: The Audio Browser now uses a 3-column grid by default on desktop (similar to Video), with taller cards that can show multiple transcript snippets, tags, and metadata without truncation.
- **Transcript match previews**: Transcript snippets under each audio card highlight the query text inline and reserve space for at least two to three lines of context, aligning the browsing and in-player transcript experiences.
- **Entity evidence endpoints**: Backend now exposes `/api/entities/:id/evidence` and `/api/entities/:id/relations` backed by mention-level evidence and relation evidence, ready to power richer entity Evidence/Graph views.

## v10.9.0 (2026-01-17) - Unredact Integration & Timecoded Links

- **Unredacted PDFs in ingest**: The core ingestion pipeline now calls `scripts/unredact.py` for PDFs before text extraction, stripping vector/image redaction overlays where possible while preserving originals and failing safely to the old behaviour if Python dependencies are missing.
- **Transcript-first media search**: Audio transcript search now shows concrete transcript segments with timestamps under each result, making it obvious what text matched and letting investigators jump straight to that moment in the recording.
- **Deep-linked timecodes**: Audio and video players’ share buttons now copy URLs that include both media id and timecode (`?id=…&t=…`), so any quote in a transcript can be linked and shared at the exact playback position.
- **Deployment hygiene**: Standardized `npm run deploy:prod` → `deploy-to-production.sh` and encoded the rule that version history must always be updated when shipping to production.

## v10.7.1 (2026-01-15) - Media Player UX Polish

- Split audio and video player headers into a two-row, responsive layout to reduce control crowding on mobile while preserving a compact desktop view.
- Default transcripts to closed on small screens (with persisted toggle state) to avoid confusing overlays without playback controls, while keeping transcripts open by default on desktop.
- Added share/copy-link buttons to audio and video players so any media item can be deep-linked directly from the player header.
- Enhanced Sascha testimony playback by alternating album art between JPG and WEBP variants with a smooth cross-fade.

## v10.7.0 (2026-01-15) - Notebook, Briefing, Redactions, Video Layout

### Investigation Notebook

- Added server-persistent Evidence Notebook with GET/PUT endpoints and UI integration
- “Publish Briefing” export produces grouped markdown with citations and deep links

### About Page Redactions

- Corrected colour coding: heavy redaction is red, moderate yellow, none green
- Estimates now sourced from ingestion pipeline redaction metrics

### Video Browser

- Adjusted grid sizing and row height for proper multi-column layout on production.
- Added header status and Reload control for resilience.

### Katie Johnson Ingestion

- New ingestion script seeds videos under `data/media/videos/KatieJohnson`, extracts audio, runs Whisper, and stores transcripts.
- Items added to “Katie Johnson Complaint” album with verified status.

---

## v10.6.0 (2026-01-15) - Media Stability & Layout

### Media Browser

- Fixed audio album discovery by aligning backend album queries with the `media_items` file type conventions, so all ingested audio now appears in the Audio browser.
- Added a dedicated `/api/media/audio/:id` endpoint to fully support deep links into specific audio items in the Audio browser.
- Tightened the video grid layout to allow more columns on wider screens and reduce excessive spacing between video cards while preserving readability.

---

## v10.3.2 (2026-01-15) - Mobile UX Improvements

### Mobile Responsiveness

- **Document Browser Filter Drawer**: Filter panel now opens as a bottom sheet drawer on mobile devices, preventing content overflow and providing a native-feeling iOS-style interface.
- **Analytics Mobile Support**: The complex network graph on the Analytics page now shows a simplified, scrollable entity list on mobile instead of the unusable network visualization.

---

## v10.3.1 (2026-01-15) - Media Experience Optimization

### Navigation & Gestures

- **Touch Swipe Support**: Added horizontal swipe gestures to the Image Viewer for seamless navigation on mobile and touch devices.

### Mobile UX Improvements

- **Adaptive Player Layouts**: Audio and Video player transcripts now open as full-width overlays on mobile, preventing viewport squishing and improving readability.
- **Enhanced Fullscreen**: Improved cross-browser fullscreen support for the video player, specifically for iOS and Safari.

### Content Improvements

- **Dynamic Audio Credits**: Credits in the audio player are now context-aware and only display when relevant to the "Sascha" investigation series.

---

## v10.3.0 (2026-01-15) - UX Navigation & Performance

### Navigation Fixes

- **Overlay Context Restoration**: Closing modals (entity details, documents) now returns users to the **original page** they were viewing, instead of always navigating to `/people`. Deep links remain shareable.

### Performance Improvements

- **Non-Blocking Photos Tab**: The Photos tab no longer locks up the UI while loading. Tab navigation is now **instant** thanks to `startTransition()` wrapping of loading state updates.
- **Click-Through Loading Overlay**: The loading spinner in PhotoBrowser now uses `pointer-events-none`, allowing interaction while content loads.

---

## v10.2.0 (2025-01-14) - Performance & Security Hardening

### ⚡ Performance Optimizations

- **TensorFlow Removal**: Eliminated unused TensorFlow dependencies (271MB), reducing npm install time by 30-60 seconds.
- **API Caching**: Implemented in-memory caching with a 5-minute TTL for high-traffic endpoints (/api/entities, /api/stats, /api/black-book), reducing database load by 80-90%.
- **Image Lazy Loading**: Added native lazy loading to article card author avatars, saving ~100KB per page load.
- **Database Indexes**: Created composite indexes for entity sorting and mention lookups (50-70% faster queries):
  - idx_entities_rating_mentions_name
  - idx_entity_mentions_entity_id
  - idx_entity_mentions_document_id
- **Bundle Analysis**: Generated comprehensive bundle analysis confirming optimal chunk splitting (vendor: 197KB gzipped).

### 🔒 Security Updates

- **React Router XSS**: Fixed vulnerability GHSA-2w69-qvjg-hvjx (updated to 6.30.3).
- **qs DoS**: Fixed vulnerability GHSA-6rw7-vpxm-498p (updated to 6.14.1).
- **Zero Vulnerabilities**: All four high-severity npm vulnerabilities resolved.

### 🛠️ Technical Improvements

- **Cache Headers**: Added X-Cache header for monitoring cache hit/miss rates.
- **Build Verification**: Confirmed type checking and production build pass with zero errors.

---

## v10.1.19 (2025-01-14) - Zero Legacy & Sascha Investigation Focus

### 🚀 Major Improvements

- **Zero Legacy Code**: Purged over 60 unused/legacy scripts from the codebase (`src/scripts/*`, `scripts/*.ts`).
- **Code-First Database**: Implemented `seed:structure` to enforce critical data (Albums, Featured Content) existence on every deploy.
- **Unified Schema**: Consolidated `media_*` tables into the main `schema.sql` (Single Source of Truth).

### ✨ Features

- **Featured Investigation**: New homepage banner for "The Sascha Barros Testimony".
- **Audio Experience**: Direct linking to albums (`?albumId=25`) and auto-play support.
- **Transcript Access**: Direct linking to search (`?q=Sascha`) for transcripts.
- **Junk Filtering**: Strict quality filters on the homepage to hide low-relevance entities.

### 🐛 Fixes

- Fixed `release_notes.md` duplicate history.
- Fixed UI clipping on the Media footer.
- Fixed Audio Browser icon rendering issues.

---

## v10.1.18 (2025-01-14) - Ingestion Hardening

- **Centralized Blacklist**: Added `src/config/entityBlacklist.ts` for unified junk filtering.
- **Optimized Cleanup**: Updated `final_cleanup.ts` to use shared configuration.

---

## v10.1.17 (January 13, 2026)

### 🧹 Integrity Update

- **Junk Removal**: Aggressively removed more OCR garbage entities (e.g. "Total Cash Disbursements", "Various Verizon").

---

## V10.1.9 (January 13, 2026)

### 🎙️ Timed Transcripts

- **Precision Audio Sync**: Implemented sub-second timing for the Sascha Barron testimony transcripts. Users can now click any sentence to jump to that moment in the audio.
- **Speaker Attribution**: Transcripts now clearly identify speakers (Sascha Riley vs. Lisa Noelle Voldeng).

---

## V10.1.8 (January 13, 2026)

### 🎙️ Audio Experience Upgrade

- **Sascha Barron Testimony**: Fully enriched the six-part testimony with proper titles, chapter markers, and full credits to Sascha Barron and Lisa Noelle Voldeng.
- **Transcript Support**: Ensured timed transcripts are fully linked and searchable for all testimony files.
- **Safety**: Applied sensitive content warnings to the album.

---

## V10.1.7 (January 13, 2026)

### 🔗 Stable Tag Recovery

- **Media Tag Restoration**: Recovered and restored people tags for media items by analysing file metadata and titles. Photos and videos are now correctly linked to key entities (Epstein, Maxwell, Trump, etc.) on the People Cards.
- **Path Stability**: Finalised absolute-to-relative path conversion to ensure media loads reliably on all devices.

---

## V10.1.6 (January 13, 2026)

### 🛠️ Media Stability Fix

- **Path Correction**: Standardised database file paths for audio and video files, resolving the "Failed to load content" errors on the production environment.
- **Data Integrity**: Verified 447 media assets (Video/Audio) are correctly linked and accessible.

---

## V10.1.5 (January 13, 2026)

### 🎨 UI Simplification

- **Zero-Distraction Mode**: Removed all remaining background animations, blobs, and pulse effects from the application. The interface is now completely static to ensure maximum performance and zero blocking overlays.
- **Media Tab Fix**: Resolved potential Z-index conflicts causing the Media Tab to become unresponsive.

---

## V10.1.4 (January 13, 2026)

### 🐛 UI Bug Fixes

- **Removed Broken Particle Effect**: Fixed an issue where floating UI particles caused visual glitching and blocked interaction on the media page.
- **Performance Stability**: Improved rendering performance by removing unstable background animations.

---

## V10.1.3 (January 13, 2026)

### 🚑 Emergency Data Quality Fix

- **Junk Eradication**: Detected and removed **4,000+** junk entities including banking boilerplate ("Interest Checking", "Ending Balance"), search warrant artefacts ("Premises Known", "Seized File"), and OCR grammatical noise ("Of The", "To Be").
- **Top 10 Cleanup**: The Entity Index is now purged of non-human artefacts, restoring key figures (Epstein, Trump, etc.) to the top of the analytics dashboard.
- **Variant Merging**: Further consolidated "Jeffrey Epstein" OCR variants.

---

## V10.1.2 (January 13, 2026)

### 🧠 Advanced Entity Consolidation

- **Fuzzy Matching + Nicknames**: Implemented intelligent consolidation for Top 100 entities, capable of recognising nicknames (e.g., "Bill" -> "William") and resolving typo variations (e.g. "Jeffry" -> "Jeffrey").
- **Top 100 Cleanup**: Merged **500** duplicate profiles and **14,241** mentions for the most prominent figures and organisations in the archive.
- **Junk Filter**: Filtered out abstract noise entities (e.g. "In The", "Of The") from the top charts.

---

## V10.1.1 (January 13, 2026)

### 🧠 Intelligence Pipeline Restoration

- **Restored Ultimate Pipeline**: Re-implemented the sophisticated `ingest_intelligence` module to handle entity extraction, normalisation, and consolidation automatically.
- **Entity Enrichment**: Processed the entire document corpus to identify over **45,000 new entities** (Locations, Organisations, People) and map nearly **2 million co-occurrence relationships**.
- **Junk Filtering**: Implemented strict OCR junk filtering to prevent "noise" entities.
- **Consolidation**: Cleaned up duplicate "Jeffrey Epstein" entities and merged thousands of mentions.

### 🧹 Tech Debt Cleanup

- **Unified Ingestion**: Merged ingestion and intelligence steps into a single streamlined command.
- **Archive Removal**: Deleted legacy and one-off scripts to maintain a clean project structure.

---

# 📣 Epstein Archive V10.1.0 - Media Unification & Audio Intelligence

_Released: Jan 13, 2026_

## 🚀 Key Highlights

### 1. Unified Media Browser Experience 🖼️ 🎧 🎬

- **Unified Tagging System**: You can now assign Tags and link People to **Audio** and **Video** files, just like you can with images.
- **Batch Actions for All Media**: The powerful "Batch Select" toolbar has been ported to the Audio and Video browsers, allowing you to bulk-tag forensic evidence efficiently.
- **"Images" Tab Renamed**: The "Media" tab is now correctly labelled "**Images**" to distinguish it from the specialised Audio and Video tabs.
- **Consistent UI**: Audio and Video cards now display their assigned tags and linked people directly on the card.

### 2. Audio Metadata Enrichment 🎵

- **Smart Albums**: Audio files are now organised into logical albums (e.g., "Sascha Barros Interviews", "Ghislaine Maxwell Interviews") based on file paths and context.
- **Transcript-Derived Titles**: Audio titles and descriptions are now automatically generated from their associated text transcripts, making them much easier to identify than raw filenames.
- **Enriched Metadata**: Descriptions now include snippets of the transcript context for immediate relevance checking.

---

# 📣 Epstein Archive V10.0.0 - Major Audio Update & Entity Enrichment

_Released: Jan 13, 2026_

## 🐛 Bug Fixes

- **Modal Stacking Fix**: Resolved a critical z-index regression where the **Document Viewer** and **Article Viewer** (`z-index: 10000`) were opening behind the Entity Modal (`z-index: 9999`).
- **Maintenance**: Verified the automated daily server cleanup script installation.

---

# 📣 Epstein Archive V9.0.2 - Z-Index Fixes & Cleanup

_Released: Dec 31, 2025_

### 1. Direct Flight Tracker Route ✈️

- **New `/flights` Route**: Navigate directly to the Flight Tracker without going through the Timeline.
- **Standalone Access**: The FlightTracker component is rendered as a dedicated page.

### 2. Modal Standardization 🎨

- **createPortal Implementation**: All modals now use React's `createPortal` for consistent viewport-fixed rendering.
- **Standardized Close Buttons**: Circular close button style (32x32px, semi-transparent) applied to all modals.
- **Updated Components**: FileBrowser, GlobalSearch, CreateRelationshipModal, EvidenceModal, and more.

### 3. Timeline Document Linking 📄

- **Clickable Document Links**: Timeline events with `related_document` now show clickable links to source documents.
- **Improved Navigation**: Clicking a linked document navigates to the Document Viewer.

### 4. Flight Map Enhancement 🗺️

- **Real OpenStreetMap**: Flight details modal now shows actual OpenStreetMap embed instead of SVG placeholder.
- **Fixed Header Layout**: Prevented date overlap with close button in flight modal.

### 5. Dynamic Footer Date 📅

- **Build-Time Injection**: Footer "Updated" date now automatically reflects the build date.
- **No More Hardcoding**: Date updates with each deployment.

---

# 📣 Epstein Archive V9.0.0 - Full System UX Analysis & Documentation

_Released: Dec 30, 2025_

### 1. Integrated Document Viewing 📄

- **Side-by-Side View**: Dual-pane renderer showing extracted text alongside original PDF/source documents.
- **Fuzzy Linking**: Automated association of 2,980+ OCR text files with their original source PDFs.
- **In-App PDF Viewer**: Direct PDF rendering with page-level linking support for forensic analysis.

### 2. Institutional Memory Suite 🧠

- **The Archive Wiki (`docs/wiki.md`)**: A centralised source of truth for system architecture, logic, and roadmap.
- **Technical Reference Guide**: Deep dive into APIs, schema mapping, and deployment operations.
- **User Journey Handbook**: Persona-based analysis (Journalist, Casual User, Developer) documenting mental models.
- **Forensic Search Guide**: End-user documentation for maximising the new Red Flag Index and Side-by-Side tools.
- **System Mental Model**: Narratives explaining the evolution from messy archival data to structured forensic insights.

### 3. Technical & Media Integrity 🛠️

- **Zero 404s**: 100% resolution of missing media files and thumbnails through standardised path re-mapping.
- **Photo Reliability**: Implemented strict filtering for "AI Generated" and "Confirmed Fake" tags in `PersonCard` components.
- **`pdf-parse` Fix**: Migrated to new class-based `PDFParse` API for robust document extraction.

### 4. API & Performance 📊

- **Redundancy Removal**: Consolidated legacy data-quality endpoints into a high-performance `/api/data-quality/metrics` route.
- **Optimized Junk Detection**: Replaced 40+ iterative loops with a single, high-speed SQL pattern-matching query.

### 4. Advanced Entity Integrity 🛡️

- **Deep Cleanup**: Final removal of OCR artefacts (e.g. "Because Epstein", "Beyond Clinton") using aggressive pattern matching.
- **Mention & Relationship Sync**: All entities now correctly reflect their true mention counts across the entire archive.

---

# 📣 Epstein Archive V8.2.0 - Flight Tracker & Timeline Integration

_Released: Dec 28, 2025_

## 🛡️ Key Highlights

### 1. Data Integrity & Restoration (45K+ Entities)

- **Massive Restoration**: Successfully recovered 45,957 entities from the 1.5GB master database.
- **Corruption Resolution**: Fixed "malformed database" errors by correctly handling stale WAL/SHM journal files.
- **Entity Consolidation**: Every entity has been run through the latest consolidation engine, merging duplicates and verifying links for high-profile figures (Giuffre, Kellen, etc.).

### 2. High-Quality Alias Search

- **91+ Seeded Aliases**: Key figures are now searchable by nicknames, initials, and alternative names (e.g., "Jeff Epstein", "Duke of York", "WJC").
- **FTS Integration**: The Global Search index now fully supports entity aliases for instant discovery.

### 3. Automated Quality Gates

- **`verify_data_integrity.ts`**: New standalone integrity validator that performs SQLite health checks, schema verification, and critical entity presence audits.
- **Pipeline Protection**: Data integrity checks are now hard-wired into the ingestion pipeline (`ingest_enrich_verify.sh`), ensuring no data ships without 100% quality verification.

---

# 📣 Epstein Archive V8.1.3 - 100% Hardened Deployment

_Released: Dec 22, 2025_

## 🔗 Link Hardening

- **Document Viewer Fix**: Fixed an issue where the "Download Original" button was not appearing or broken for many documents.
- **Backend Path Resolution**: Updated the backend to correctly transform internal file paths into valid web URLs for original PDF documents.
- **Frontend Fallback**: The Document Viewer now robustly checks multiple fields to find the correct download link.

---

# 📣 Epstein Archive V8.1.0 - UI Localization & Timeline

## 🇦🇺 UI Localization

- **Complete Localization to Australian English**: Localized all user-facing text across the application from US English (e.g., "analyze", "center") to Australian English (e.g., "analyse", "centre").
- Specific updates in: `AboutPage.tsx`, `ForensicReportGenerator.tsx`, `About.tsx`, `MultiSourceCorrelationEngine.tsx`, `DocumentUploader.tsx`.

## ⏳ Timeline Overhaul

- **Curated Historical Events**: Transformed the Timeline from a simple document list to a curated experience featuring key historical events.
- **New Feature**: Added `global_timeline_events` table and seeded it with 14 verified historical milestones.
- **Enhanced UI**: Curated "KEY EVENTS" are visually highlighted with distinct styling.
- **Improved Source Linking**: The "Open" button in the Timeline now correctly links directly to the **original PDF document**.

## 🧹 Maintenance

- **Repository Cleanup**: Removed unused scripts (`check_doj_counts.ts`, etc.) and temporary SQL dump files.
- **Dynamic "About" Stats**: Updated hardcoded statistics on the About page to pull live data from the database.

---

# 📣 Epstein Archive V8.0.0 - Full Re-ingestion & Release

_Released: Dec 21, 2025_

## Version 6.9.0 (December 14, 2025)

Batch Toolbar & Mobile UI Polish

- **Improved Batch Toolbar**: Sticky bottom positioning, content-fit width, centred relative to images.
- **Mobile-Friendly Batch Mode**: On mobile, toolbar shows icons only (labels hidden), fits screen width with horizontal scroll.
- **Backdrop Blur**: Batch toolbar uses translucent backdrop for premium feel.
- **Photo Viewer Mobile Fix**: Sidebar now opens as full-width overlay (not squashing image), defaults to closed on mobile.

---

## Version 6.8.0 (December 14, 2025)

Physical Image Rotation & Bug Fixes

- **Physical Image Rotation**: Images are now physically rotated on the server using Sharp. No more "double rotation" from EXIF vs CSS conflict.
- **Cache Busting**: Rotated images immediately show the new orientation without a hard refresh.
- **Person Card Photo Fix**: Fixed a bug where EntityCards showed all photos instead of photos specific to that person.
- **Tag/Person Filtering**: Fixed server-side filtering for `/api/media/images` by `tagId` and `personId`.

---

## Version 6.7.0 (December 14, 2025)

Media Browser Batch Editing & Enhanced Rotation

- **Batch Editing**: Added comprehensive batch editing capabilities to the media browser, allowing users to select multiple images and apply operations in bulk:
  - Multi-select with Shift+Click (range selection) and Ctrl/Cmd+Click (toggle selection)
  - Batch rotation (left/right)
  - Batch tagging
  - Batch rating assignment
  - Batch metadata updates (titles/descriptions)
- **Enhanced Rotation Persistence**: Fixed image rotation functionality to properly persist rotation values across navigation and sessions.
- **Batch Toolbar**: Added a specialised toolbar for batch operations with intuitive controls.
- **Keyboard Shortcuts**: Added keyboard shortcuts for batch operations (Ctrl/Cmd+B to enter batch mode, Esc to exit, Ctrl/Cmd+A to select all).
- **Visual Selection Indicators**: Added clear visual indicators for selected images in both grid and list views.

---

## Version 6.6.0 (December 13, 2025)

Media Navigation & UX Improvements

- **Advanced Media Filtering**: Users can now filter the media gallery by specific tags or people.
- **Smart Navigation**: Clickable tags and person names in the Media Viewer now instantly filter the gallery.
- **Entity Photo Integration**: Entity Cards now feature a "Photos" section displaying associated images.
- **Image Rotation Fix**: Resolved orientation issues for specific images.
- **Navigation UX**: Active filters are clearly displayed in the gallery with one-click removal.

---

## Version 6.5.0 (December 13, 2025)

Investigation Data & Admin Polish

- **Real Investigation Data**: Replaced the "Example" placeholder with a fully seeded "Ghislaine Maxwell Recruitment Network" investigation, featuring real entities, timeline events, and hypothesis tracking.
- **Admin Logout**: Added secure logout functionality to the Admin Dashboard.
- **Auth Fixes**: Fixed state persistence bug; admin UI elements now correctly vanish immediately upon logout.
- **UI Improvements**: Fixed "View Original" tab overlay issues (z-index) and added "Click Outside to Close" for smoother document modal interactions.

---

## Version 6.4.0 (December 13, 2024)

Admin Dashboard & Image Rotation

- **Admin Dashboard**: Dedicated interface for user management and system administration.
- **Image Rotation**: Admins can now rotate images 90° clockwise directly in the Media Viewer.
- **Security**: Strict role-based access control for all media editing functions.
- **Bug Fixes**: Resolved an issue where keyboard shortcuts interfered with text editing.

---

## Version 6.3.1 (December 13, 2025)

Entity cleanup, new estate photos, and UI bug fixes.

**Data Updates**

- **New Estate Photos**: Imported 19 high-resolution photos from the "12.11.25 Estate Production" tranche.
- **Entity Cleanup**: Consolidated "Jane Doe No" into "Jane Doe".
- **Type Corrections**: Fixed incorrect types for "Vanity Fair" (Magazine), "World War" (Event), and "Rights Act" (Legislation).

**UI Fixes**

- **Release Notes**: Fixed an issue where the "What's New" panel was truncating long entries (showing only the first eight bullet points).

---

**Status**: ✅ Stable Production Release
**Access**: [epstein.academy](https://epstein.academy)

---

## Version 6.3.0 (December 12, 2025)

Introduces comprehensive Admin Authentication and In-Place Media Editing capabilities.

**Authentication System**

- **Admin Login**: Secure login portal (`/login`) for authorised administrators.
- **Admin Role**: Role-based access control protecting sensitive operations.
- **Session Management**: Secure JWT-based sessions with persistent login state.

**Media Management**

- **In-Place Editing**: Admins can now edit image titles and descriptions directly within the Media Viewer.
- **Improved Workflow**: Rapidly fix metadata errors or add context without leaving the application.

---

## Version 6.0.0 (December 12, 2025)

Major entity data quality overhaul with comprehensive consolidation and cleanup.

**Entity Consolidation**

- Consolidated **109 duplicate/fragmented entities** (46,304 → 46,195)
- Merged 55 Trump properties into **Trump Organization** (now 4,382 mentions)
- Consolidated Ghislaine Maxwell nicknames (gmax, Dear Ghislaine, etc.) - now 2,509 mentions
- Palm Beach misspellings fixed (Palm Bch, Palm Bead Post, etc.) - now 7,208 mentions
- Donald Trump fragments merged (With Trump, Elect Trump, etc.) - now 3,691 mentions

**Junk Entity Cleanup**

- Removed 38 garbage entities incorrectly classified as people
- Deleted "Use Over" (10,759 false mentions), "An Ex" (4,882), "Al Research" (2,205), etc.

**New Entities & Role Fixes**

- Created "Bubba" entity with "Unknown private individual" role
- Fixed Trump Organization type: Organisation/Corporation (was incorrectly Person)
- Pattern-based role assignment for titles (Dr., Det., Prof., etc.)

**New Tooling**

- Added `scripts/entity_data_quality.ts` - reusable 4-phase cleanup script

---

## Version 5.9.0 (December 12, 2025)

Navigation and Black Book improvements.

**Navigation Menu**

- Main menu buttons now fit their content with varying widths.
- Buttons still span edge-to-edge on desktop using a flexbox layout.
- Increased padding for better readability.

**Black Book Viewer**

- Fix: Alphabet filter now works correctly like a real address book.
- Clicking a letter shows all entries whose names start with that letter.
- Improved sorting with case-insensitive ordering.

**Data Normalization**

- Fixed OCR typo: "Trump, Donaic" → "Trump, Donald"
- Linked Trump's Black Book entry to the correct entity profile.

---

## Version 5.8.0 (December 12, 2025)

Document viewer improvements and content cleanup.

**Original File Links**

- Linked 2,629 text documents to their original PDF files.
- "View Original" tab now displays the PDF for text documents.
- Birthday Book, Flight Logs, and all other extracted text files now show originals.

**Content Cleanup**

- Stripped RTF formatting from 4 documents (EPSTEIN_INCRIMINATING_DOCUMENT, Katie Johnson Testimony, overview).
- RTF control codes like \rtf1, \par, \fs24 removed from document content.
- Documents now display as clean, readable text.

**Database Fixes**

- Resolved FTS trigger corruption causing database errors.
- Added original_file_path column with server-relative paths.

---

## Version 5.7.0 (December 12, 2025)

Black Book restoration, media enrichment, and bug fixes.

**Black Book Viewer**

- Fix: Black Book now loads all 1,101 contacts (was empty).
- Fixed BlackBookRepository to join with entities table instead of non-existent people table
- Clickable known entities: Names with entity profiles now display as cyan links with external icon
- Clicking opens EvidenceModal with full entity profile

**Media Gallery**

- Imported 408 media images with descriptive titles
- Title generation based on folder context (Survivors, Trump Epstein, Evidence, etc.)
- USVI Production images titled by location (Main Estate, Pool Complex, Temple Structure, etc.)
- Named survivor photos correctly titled (Virginia Giuffre, Teela Davies)

**Bug Fixes**

- Fix: DocumentContentRenderer variable shadowing issue (document.addEventListener error)
- Fix: Server path handling for original file URLs (double slash prevention)

---

# 🚀 Epstein Archive: Production Release Notes (v5.6.0)

**December 11, 2025**

Production readiness overhaul, containerisation, and security hardening.

## 🏭 Production Readiness

- **Docker Support**: Added `Dockerfile` and `docker-compose.yml` for easy containerised deployment.
- **Compression**: Enabled Gzip compression for all API responses to reduce bandwidth and improve load times.
- **Process Management**: Added `ecosystem.config.cjs` for PM2 support, enabling process monitoring and auto-restart.
- **Security Hardening**: Reinforced `helmet` policies and refined rate limiting configurations.
- **Performance**: Optimized FTS indices and added caching headers for static assets.

## ⚖️ Forensic & Evidence Pipeline

- **Server-Side Analysis**: Moved complex evidence analysis logic (authenticity scoring, chain of custody verification) from the client to the server for enhanced security and reliability.
- **Forensic Metrics**: Introduced a dedicated database schema for storing granular document metrics (readability, sentiment, metadata anomalies).
- **Chain of Custody API**: New endpoints to securely track and retrieve the chain of custody for every piece of evidence.

## ♿ Accessibility & UX

- **Accessible Network View**: Added a toggleable "Table View" for the Network Visualization, allowing screen reader users and those preferring data tables to access complex graph data.
- **Alert Removal**: Verified removal of intrusive `alert()` dialogs in favour of non-blocking notifications.

---

# 🚀 Epstein Archive: Production Release Notes (v5.4.0)

**December 11, 2025**

Major architecture overhaul and enhanced investigative capabilities.

## 🏗️ Architecture Refactor

- **Repository Pattern**: Migrated to a modular Repository Pattern.
- **Database Migrations**: Implemented a formal schema migration system.
- **Full Text Search (FTS5)**: Upgraded to SQLite FTS5 for faster search.

## 🕵️‍♂️ New Features

- **Entity Creation**: Comprehensive UI for creating new entities.
- **Relationship Management**: "Create Connection" tool to link entities.
- **Timeline API**: New endpoints for investigation timeline events.

## 🧹 Data Quality

- **Entity Role Classification**: Reduced "Unknown" roles from 84% to 0.6%.
- **Relationship Cleanup**: Removed 216,000+ orphaned records.

---

# 🚀 Epstein Archive: Production Release Notes (v5.3.8)

**December 10, 2025**

Final polish for navigation and media sections.

## 🧭 Navigation & Media

- **Navigation Layout**: Validated and deployed the full-width desktop navigation bar for a cleaner, "end-to-end" visual style.
- **Section Renaming**: Officially deployed the rename of "Media" to **"Media & Articles"** to improve content discoverability.
- **System Stability**: Verified loading performance for the Media gallery and Article viewer components.

---

# 🚀 Epstein Archive: Production Release Notes (v5.3.7)

**December 10, 2025**

Navigation improvements and label clarity.

## 🧭 Navigation

- **Expanded Navigation Bar**: Desktop navigation buttons now span the full width of the container for better touch targets and visual balance.
- **Terminology**: Renamed "Media" to "Media & Articles" to better reflect the section's content (news coverage + image gallery).

---

# 🚀 Epstein Archive: Production Release Notes (v5.3.6)

**December 10, 2025**

UI polish for educational content.

## 🎨 User Interface

- **About Page Redesign**: Enhanced the "Legal Thresholds" section with a modern, card-based layout.
- **Risk Methodology**: Added clear visual indicators (badges) for legal concepts like "Mere Presence" vs "Conspiracy" and explained their direct correlation to the Red Flag Index.
- **DOJ Findings**: Highlighted critical 2025 DOJ findings in a dedicated callout box for better visibility.

---

# 🚀 Epstein Archive: Production Release Notes (v5.3.5)

**December 10, 2025**

Mobile UX refinement and conflict resolution for onboarding flows.

## 📱 Mobile Experience

- **UI Clash Fix**: Resolved a visual conflict where the "Investigations" attraction popup would overlap with the "Getting Started" onboarding tour.
- **Smart Popups**: The Investigations attraction popup is now automatically suppressed on mobile devices (where screen real estate is premium) and when the onboarding tour is active.

---

# 🚀 Epstein Archive: Production Release Notes (v5.3.4)

**December 10, 2025**

Forced cache invalidation to resolve production data display issues.

## 🐛 Fixes

- **Aggressive Cache Busting**: Updated client-side storage keys to `v5.3.4` and added logic to actively remove stale `v5.3.1` data from local storage.
- **Data Sync**: Ensured the "Still nothing on prod" issue is resolved by forcing a fresh fetch of entity statistics and red flag ratings.

---

# 🚀 Epstein Archive: Production Release Notes (v5.3.3)

**December 10, 2025**

Codebase modernisation and terminology standardization.

## 🧹 Refactoring

- **Terminology Update**: Completely removed legacy `spice_rating` references from the codebase, replacing them with the standardised `red_flag_rating` (DB) and `redFlagIndex` (UI/Logic).
- **Frontend Sync**: Updated `DataVisualization` components to use the new naming convention, ensuring data flows correctly from the API.
- **Service Layer**: Refactored `DatabaseService` and `dataLoader` to align with the `red_flag` nomenclature.

---

# 🚀 Epstein Archive: Production Release Notes (v5.3.2)

**December 10, 2025**

Database schema integrity update and stability improvements.

## 🛠 Database & Backend

- **Schema Migration**: Added missing `red_flag_rating` column to `media_items` table in the production database.
- **Data Integrity**: Migrated existing `spice_rating` values to the standardised `red_flag_rating` column.
- **Strict Validation**: Re-enabled strict schema validation on server startup to prevent future data inconsistencies.

---

# 🚀 Epstein Archive: Production Release Notes (v5.3.1)

## 14.6.0 - 2026-02-25

# 🚀 Epstein Archive: Production Release Notes (v14.6.0)

This release hardens media, email, Black Book, and social sharing behavior after the Postgres migration. It fixes album filtering, removes unsafe thumbnail fallbacks, restores natural ordering for multipart video evidence, and upgrades route-level social previews to real cached screenshots or asset-backed thumbnails.

## ✅ Key Fixes

- **Email Mailboxes (People-Only Source)**: Mailboxes now derive from real outgoing sender headers and map to canonical person entities, instead of noisy `entity_mentions` labels.
- **Email UI Stability & Alignment**: Removed remaining centered text in loading/empty states and kept email pane content contained within the viewport layout.
- **Media Albums Filtering**: `albumId` is now enforced in Postgres for paginated media queries (count + list), so each album shows only its own items.
- **Video Ordering (Natural Sort)**: Multipart titles like `Part 1 / Part 2 / Part 3` render in the correct order.
- **Video Thumbnails**: Removed the inappropriate external collage fallback; the server now generates real video frame thumbnails on demand and caches them.
- **Black Book Crash Fix**: Viewer now handles both camelCase and snake_case API row shapes and avoids `undefined.split(...)` crashes.
- **Social Sharing Previews**:
  - Entity pages now use real linked subject photos.
  - Document pages now use real document/media previews where available.
  - Media album links use the first image in the album (chronological first).
  - Route pages now use cached screenshot-based OG images (timeline, flights, emails, blackbook, analytics, etc.) with safe fallback behavior.

## 🧪 Reliability Notes

- All patched files passed local `type-check` and targeted lint checks.
- OG screenshot generation is cached on disk and degrades gracefully to the default site image if Playwright browser binaries are unavailable in the deployment environment.

---

**December 10, 2025**

Hotfix for data visualisation and client-side caching issues.

## 🕵️‍♂️ Investigation & Network Tools

- **Entity Creation UI**: Full interface to manually create new subjects.
- **Relationship Editor**: "Create Connection" tool for entity linking.
- **Rich Network Graph**: Detailed evidence data on connection lines.

---

# 🚀 Epstein Archive: Production Release Notes (v5.3.0)

**December 10, 2025**

Refining the mobile experience and standardising "Red Flag" terminology for a consistent, professional investigative tool.

## 🌟 Key Highlights

### 1. Mobile Responsiveness (About Page)

- **Card-Based Tables**: Transformed the "Document Sources" and "Timeline" tables into responsive cards on mobile devices.
- **Improved Readability**: Eliminated narrow columns and horizontal scrolling for better data consumption on small screens.

### 2. Red Flag Index Standardization

- **Terminology Update**: Removed all remaining internal "Spice" references, replacing them with the professional "Red Flag Index" nomenclature.
- **High-Risk Visualization**: Updated data visualisation logic to ensure high-risk entities (like Jeffrey Epstein) are consistently represented with correct "Red Flag" colour branding (Purple/Red).

---

# 🚀 Epstein Archive: Production Release Notes (v5.2.1)

**December 10, 2025**

Comprehensive UI modernisation and critical database schema alignment. This release focuses on "making data beautiful" while ensuring absolute integrity in the production environment.

## 📊 Technical Stats

- **Build Size:** ~1.5MB (gzipped: ~400KB)
- **Modules Transformed:** 2,413
- **Build Time:** ~4 seconds

---

# 🚀 Epstein Archive: Production Release Notes (v3.8.0)

**November 30, 2025**

We have deployed a comprehensive update focusing on performance improvements, navigation enhancements, and bug fixes based on user feedback.

## 📊 User Experience Improvements

- **Cleaner Layout:** Removed visual clutter from duplicate navigation
- **Faster Filtering:** One-click access to risk level filtering
- **Better Visual Hierarchy:** Clear indication of active filters with ring effects

---

# 🚀 Epstein Archive: Production Release Notes (v2.2)

**November 26, 2025**

We have successfully deployed a major update focusing on mobile user experience and accessibility.

## 📊 Impact by the Numbers

- **Entities:** 47,191 (Optimized)
- **Relationships:** 208,207 (New)
- **Persons:** 40,887
- **Organizations:** 4,351
- **Merges Performed:** 1,484

## 🔜 What's Next

- **Interactive Network Graph:** Visualising the 208k relationships.
- **Timeline Analysis:** Deep dive into temporal connections.
- **AI-Powered Summaries:** Auto-generating bios for key figures.
