# Goal
Bring the `epstein-archive` codebase closer to a production-ready investigative application by implementing the previously identified improvements across schema/migrations, backend architecture, security, data model, investigation tooling, frontend UX/accessibility, and testing, while preserving existing behaviour where possible.
## Current context
* React + Vite SPA frontend (`src/main.tsx`, `src/App.tsx`, `src/components/**`).
* Express + better-sqlite3 backend (`src/server.ts`, `src/server.production.ts`, `api/server.ts`).
* Centralized `DatabaseService` monolith (`src/services/DatabaseService.ts`) with many responsibilities.
* Rich but partially inconsistent SQLite schema managed partly by `DatabaseService.initializeDatabase()` and partly by external/manual migrations.
* Playwright-based E2E tests under `tests/` and a curated SQLite database under `api/` / `data/`.
* Security hardening (auth, RBAC, audit logs, malware scanning hooks) is minimal or absent.
## High-level plan
### 1. Establish migration and schema management
* Create a `db/schema/` directory and add explicit, ordered SQL migration files that capture the canonical schema required by the codebase.
* Implement a small Node-based migration runner (`scripts/migrate.ts`) that:
    * Connects to the configured `DB_PATH` using `better-sqlite3`.
    * Ensures a `schema_migrations` bookkeeping table exists.
    * Applies any pending `.sql` migrations in lexicographical order inside transactions.
* Expand schema coverage through initial migrations:
    * `001_add_entity_core_columns.sql` to align `entities` with required columns (`primary_role`, `secondary_roles`, `likelihood_level`, `mentions`, `document_count`, `red_flag_description`, etc.).
    * `002_normalize_documents_and_relationships.sql` to normalise `documents` (ensure `file_name`, `content_hash`, provenance fields) and align `entity_relationships` columns and indexes.
    * `003_create_entity_mentions_and_indexes.sql` to introduce an `entity_mentions` table and supporting indexes on `entity_mentions`, `evidence_entity`, and `investigation_evidence`.
* Add a backfill script (e.g., `scripts/backfill_entity_mentions.ts`) that populates `entity_mentions` and updates `entities.mentions` / `document_count` from existing data.
* Wire migration runner into developer workflow via documentation and potentially an npm script.
### 2. Refactor DB access into repository layer
* Introduce a dedicated DB connection module `src/server/db/connection.ts` that:
    * Creates and exports a singleton `better-sqlite3` instance based on `DB_PATH`.
    * Applies SQLite pragmas and optionally runs `validateSchemaIntegrity`.
* Add repository modules under `src/server/db/`:
    * `entitiesRepository.ts` for entity listing, filtering, detail retrieval, and statistics.
    * `documentsRepository.ts` for paginated document queries, retrieval by ID, and page lookups.
    * `relationshipsRepository.ts` for relationship statistics, listing, and graph slices.
    * `investigationsRepository.ts` for CRUD on investigations and related queries.
    * (Optionally) `mediaRepository.ts` and `forensicRepository.ts` as thin wrappers around existing services and DB queries.
* Gradually refactor `src/server.production.ts` (and `src/server.ts`) endpoints to use these repositories instead of calling `databaseService` directly.
    * Start with `/api/health`, `/api/stats`, `/api/entities`, `/api/documents`, `/api/search`.
    * Then migrate investigation and relationship endpoints.
* Deprecate `DatabaseService` methods as they are replaced by repository functions.
    * Retain `DatabaseService` as a thin compatibility layer around `getDb()` and repository functions during the transition.
### 3. Security, auth, RBAC, and audit logging
* Introduce an auth module `src/server/auth/middleware.ts` that provides:
    * `authenticateRequest(req, res, next)` which:
        * Optionally enforces authentication when `process.env.ENABLE_AUTH === 'true'`.
        * Looks up a user from the `users` table based on a bearer token or `x-user-id` header.
        * Attaches `req.user` with `{ id, role, ... }` when present.
    * `requireAuth` and `requireRole(...roles)` wrappers that short-circuit with 401/403 when `ENABLE_AUTH` is enabled and the current user is missing or lacks required privileges.
* Add a minimal `POST /api/auth/login` endpoint that:
    * Accepts a username/password or access token (for local dev, a simple shared secret or password-less `?user=` flow is acceptable initially).
    * Issues a signed JWT or returns a short-lived token (stored client-side) that is used in `Authorization: Bearer <token>`.
    * For now, make this opt-in via `ENABLE_AUTH`; keep existing behaviour when disabled so tests and local dev still work.
* Introduce an `audit_log` table via migration and a `logAudit` helper module:
    * `logAudit({ userId, action, objectType, objectId, payload })` writing to `audit_log` with JSON payload.
    * Call `logAudit` from high-value mutation endpoints: investigation CRUD, evidence add/remove, document upload, relationship modifications, and hypothesis/task changes.
* Replace blanket `app.use(cors())` with a stricter configuration based on `config.corsOrigin` and `config.corsCredentials`.
* Extend `.env.example` and configuration to include:
    * `ENABLE_AUTH` (boolean)
    * `RAW_CORPUS_BASE_PATH`, `OCR_TEXT_BASE_PATH`, `OCR_IMAGES_PATH` (paths for external document corpora)
    * `MALWARE_SCAN_ENABLED` (boolean) and optionally `MALWARE_SCAN_COMMAND` or connection details.
### 4. Environment and filesystem hardening
* Replace hardcoded filesystem paths (e.g., `/Users/veland/Downloads/Epstein Files/...`) with lookups to `RAW_CORPUS_BASE_PATH` and related env vars in:
    * `DatabaseService.getDocumentPages`.
    * `/files` static mounts in `src/server.production.ts`.
* Add a startup-time environment validation function (e.g., `validateEnvironment()`):
    * Checks required config values (`DB_PATH`, `API_PORT`, `DATABASE_URL` if used, `RAW_CORPUS_BASE_PATH` if relevant).
    * Logs readable errors and fails fast if mandatory paths are missing or inaccessible in production.
### 5. Evidence ingestion hardening
* Enhance `POST /api/upload-document` handler to:
    * Enforce a whitelist of allowed MIME types and file extensions, configurable via a constant or env var.
    * Enforce a maximum file size using `MAX_FILE_SIZE` from `.env`.
    * Call a `scanFileForMalware(filePath)` helper when `MALWARE_SCAN_ENABLED === 'true'`:
        * Implement as a stub that logs the action and can later be wired to an external scanner.
    * Enrich `documents.metadata_json` with ingestion metadata (e.g. `ingestion_method`, `uploaded_by`, `ingested_at`, `original_filename`).
* Ensure the document ingestion path writes to a controlled uploads directory under the project root and does not allow directory traversal.
### 6. Investigation and relationship APIs
* Add or enhance REST endpoints for explicit entity and relationship management:
    * `POST /api/entities` to create new entities with core metadata (`fullName`, `primaryRole`, `likelihood`, `red_flag_rating`, etc.).
    * `PATCH /api/entities/:id` to update entity fields with server-side validation.
    * `POST /api/relationships` to create a new `entity_relationships` row with type, weight, confidence, evidence references.
    * `PATCH /api/relationships/:id` and `DELETE /api/relationships/:id` to update/delete relationships.
* Refine existing investigation endpoints:
    * Extend `/api/relationships` and `/api/graph` responses to include `evidence_count`, `evidence_types`, `first_seen_at`, `last_seen_at`, and referenced document IDs.
    * Update `/api/investigations/:id/evidence` and related endpoints to ensure they use `evidence_items` and `chain_of_custody` consistently.
* Wire audit logging and auth guards into all new mutation endpoints.
### 7. Frontend UX & accessibility improvements
* Replace direct `alert(...)` calls (e.g., in `InvestigationWorkspace.tsx`, `EvidenceSearch.tsx`) with `ToastProvider` notifications:
    * Add reusable helpers for success/error/info toasts.
    * Ensure failures from `fetch` calls display user-friendly error messages.
* For network and analytics visualizations:
    * Add accessible tabular summaries beneath or alongside visual components (e.g., a table listing nodes/edges with keyboard focus).
    * Ensure all interactive controls have appropriate `aria-label`s and keyboard focus states.
    * Avoid using colour alone to convey critical information; add icons/text labels for risk levels and relationship types.
* Review and standardise component styling and structure for key investigative views:
    * Subjects, Search, Documents, Media & Articles, Investigations, Analytics, Black Book.
    * Extract shared UI primitives (e.g. `InteractiveCard`, `MetricPill`, `SectionHeader`) to reduce duplication.
### 8. Testing and verification
* Add or update tests to cover new behaviour:
    * Unit tests for repository modules (entities/documents/relationships/investigations).
    * Integration tests for:
        * `/api/entities` create/update/list/search.
        * `/api/documents` filters (file type, evidence type, red flag bands, search).
        * Investigation workflows: create investigation, add evidence, retrieve evidence summary.
        * Relationship endpoints: stats and graph slices.
        * Auth middleware behaviour when `ENABLE_AUTH` is enabled vs disabled.
        * Migration runner sanity (e.g., apply migrations to an in-memory SQLite DB in tests).
* Update Playwright tests or their configuration to accommodate new behaviour where necessary:
    * If `ENABLE_AUTH` is used, ensure tests set appropriate headers or tokens.
    * Optionally keep `ENABLE_AUTH=false` in test env to avoid breaking existing suites.
* Run `npm run build` and the Playwright test suite (`npm test` in `tests/` or `npx playwright test`) and fix any regressions introduced by the refactor.
## Out of scope / future work
* Full multi-tenant RBAC with organisation-level boundaries and fine-grained permissions.
* Complete deprecation and removal of legacy modules (`DatabaseService`), `api/server.ts`, and old data loaders.
* Sophisticated, ML-based entity resolution or advanced NER-based ingestion.
* Full cryptographic attestation for evidence (e.g. external notarisation or blockchain anchoring).
## Execution strategy
* Use an incremental, repository-first refactor to minimise risk:
    * Introduce new modules and endpoints behind feature flags or environment toggles.
    * Maintain backwards compatibility until all callers are migrated.
* Use a dedicated feature branch and commit frequently with focused changes (schema, repositories, auth, frontend updates) to ease review.
* Prioritise Tier 1 (security/schema/env) and core repository refactors before deeper UX polish to avoid rework.
