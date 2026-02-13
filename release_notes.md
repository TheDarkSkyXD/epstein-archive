## 13.2.0 - 2026-02-13

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

## 13.1.7 - 2026-02-13

### Added

- Implemented justice.gov URL routing to support legacy links (e.g., /epstein/files/\*).
- Enhanced document path resolution with filename fallback.

## 13.1.6 - 2026-02-12

### Fixed

- Fixed production 502 errors by ensuring correct port configuration (3012).
- Resolved database locking issues during ingestion pipeline execution.
- Fixed "NO entity cards" issue by restoring database connectivity.
- Optimized ingestion pipeline to use Exo cluster with 50 workers.

### Added

- Added `CHANGELOG.md` to track release history.
- Added database snapshot for production safety.

## v13.1.5 — 2026-02-12

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
- **Retroactive Database Cleanup**: Successfully purged approximately17,000 junk entities and OCR artefacts from the live archive, reducing noise and improving search relevance.
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

- **Archive Expansion**: Successfully integrated and consolidated DOJ datasets 10, 11, and 12, adding tens of thousands of pages of previously fragmented evidence into the centralized corpus.
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

## 13.2.0 - 2026-02-13

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

## 13.1.7 - 2026-02-13

### Added

- Implemented justice.gov URL routing to support legacy links (e.g., /epstein/files/\*).
- Enhanced document path resolution with filename fallback.

## 13.1.6 - 2026-02-12

### Fixed

- Fixed production 502 errors by ensuring correct port configuration (3012).
- Resolved database locking issues during ingestion pipeline execution.
- Fixed "NO entity cards" issue by restoring database connectivity.
- Optimized ingestion pipeline to use Exo cluster with 50 workers.

### Added

- Added `CHANGELOG.md` to track release history.
- Added database snapshot for production safety.

## v13.1.5 — 2026-02-12

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
- **Retroactive Database Cleanup**: Successfully purged approximately17,000 junk entities and OCR artefacts from the live archive, reducing noise and improving search relevance.
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

- **Archive Expansion**: Successfully integrated and consolidated DOJ datasets 10, 11, and 12, adding tens of thousands of pages of previously fragmented evidence into the centralized corpus.
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

## v13.1.5 — 2026-02-12

### Patch Fix & Build Stabilization

- **Critical Build Fix**: Resolved server build failure by explicitly including `src/types.ts` in the compilation process. This prevents the "Cannot find module" runtime error that was causing 502 Bad Gateway responses.
- **Client Build Repair**: Fixed `react-virtualized-auto-sizer` import issues in `PeoplePage` and `EvidenceModal` by targeting the CommonJS build directly, ensuring successful client-side bundling.
- **Codebase Hygiene**: Executed a comprehensive linting and formatting pass, removing unused variables and standardizing code style across the application.

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

- **Deny-by-Default RBAC**: Strengthened security fencing with strict RBAC rules. Admin endpoints (backups, ingest-runs, audit-logs) are physically isolated and reject all unauthorized or non-admin requests.
- **CSP & Refresh Rotation**: Implemented strict Content Security Policy (CSP) and refresh token rotation with in-memory access tokens to mitigate session hijacking risks.

## v12.16.0 — 2026-02-11

### Entity Pipeline Hardening & Data Integrity

- **Hardened Entity Pipeline**: Implemented aggressive junk filtering and strengthened classification heuristics in the intelligence engine.
- **Retroactive Database Cleanup**: Successfully purged **~17,000 junk entities** and OCR artifacts from the live archive, reducing noise and improving search relevance.
- **Canonical Consolidation**: Merged numerous entity variants (e.g., Netanyahu, Epstein) into canonical profiles.
- **Contextual Role Extraction**: The ingestion pipeline now automatically identifies roles (Pilot, Lawyer, Survivor, etc.) by analyzing the context window around entity mentions.
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

- **Consolidated media and evidence schemas**: unified investigative data models for consistent cross-referencing.
- **WikiLink engine**: Launched automated auto-linking for document mentions across the platform.
- **Mobile Refinement**: Updated `EvidenceModal` with sticky headers and glassmorphism for enhanced mobile navigation.

## v12.13.0 — 2026-02-11

### Black Book Intelligence Expansion

- **Automated Contact Harvesting**: The ingestion pipeline now extracts emails and phone numbers from document context and automatically links them to person entities via `person_id`.
- **Dossier-Style Entity Modals**: Redesigned `EvidenceModal` to include comprehensive biographies, profile pictures, and categorized contact information (Verified Profile vs. Harvested Intelligence).
- **Proactive Source Linking**: All harvested intelligence now features direct "Source Document" links for immediate forensic verification.
- **Enhanced Black Book UX**: Added category filtering (Original, Contact, Credential) to the Black Book viewer with visual highlighting (⭐) for AI-enriched data.

## v12.12.1 — 2026-02-11

### Pipeline Reliability & Schema Hardening

- **Per-Document Transaction Injection**: Refactored the intelligence pipeline to commit data at the document level. This ensures real-time observability and prevents massive batch rollbacks on single-file failures.
- **Quarantine Schema Alignment**: Implemented Migration 022 to add missing `quarantine_status` and `quarantine_reason` columns, allowing the system to safely isolate sensitive content at scale.
- **Job Manager Robustness**: Repaired the JobManager schema mismatch by adding missing processing tracking columns (`processing_attempts`, `lease_expires_at`, etc.).

## v12.12.0 — 2026-02-10

### AI Ingestion at Scale

- **Full-Scale Ingestion Activation**: Launched 3-node localized AI cluster for high-speed processing.
- **Content Refinement**: Backfilled 228,000 documents with refined content and repaired 14,000 corrupted documents.

## v12.8.0 — 2026-02-06

### Redaction Transparency & Infrastructure Stabilization

- **Redaction Metrics Fixed**: Resolved a state synchronization bug where the archive was incorrectly reporting 0% redaction levels. All forensic document tranches (including DOJ 9-11) now correctly reflect their privacy-protection status.
- **Corpus-Wide Backfill**: Executed a high-performance metadata update across 780,000+ files to restore archival integrity.
- **Ingestion Pipeline Hardening**: Updated the unified ingestion engine to proactively track and calculate redaction density during the initial forensic pass.

## v12.7.6 — 2026-02-06

### Lean Schema & Interactive Intelligence

- **Lean Schema Consolidation**: Unified disparate risk and type columns into a high-performance standardized format.
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
- **Investigation API Lockdown**: Hardened the investigation deletion endpoint with context-aware authorization, strictly validating that delete requests are authorized by either an admin or the case owner.
- **UI Interaction Fixes**:
  - Fixed a critical indexing bug in the investigation listing where the deletion API was occasionally targeting the incorrect ID.
  - Corrected descending version ordering in the "What's New" panel to prioritize current releases.
  - Enforced admin-only controls for batch media editing and single-item metadata updates.

## v12.1.5 — 2026-02-03

### Production Deployment Fixes & Email UI

- **Deployment Hardening**: Updated deployment script to force code synchronization (fix for v12.1.2 persistence) and full process restart.
- **Email Client UI**:
  - Removed "floating card" styling for a modern edge-to-edge layout.
  - Standardized internal borders for visual consistency.
  - Optimized pane layout for better reading experience.

## v12.1.4 — 2026-02-03

## v12.1.2 — 2026-02-03

### Data Coverage & Quality Assurance

- **DOJ Link Extraction Recovery**: Successfully bypassed Akamai 403 blocks on Dataset 9 and 12 via browser-level session recovery, restoring the link extraction pipeline for over 284,000 pending files.
- **Improved Email Metadata Parsing**: Fixed a critical issue where emails were appearing as "Unknown Sender". The ingestion engine now correctly extracts sender and recipient data from `.eml.meta` JSON sidecar files.
- **Hash-Based Conflict Detection**: Implemented a robust deduplication system that identifies files with identical names but different content (e.g., unredacted versions), preserving all unique evidence with `_conflict_hash` identifiers.
- **VIP Consolidation (Sam Epstein)**: Integrated "Sam Epstein" as a verified alias for Jeffrey Epstein used with 23andme, ensuring all related records are consolidated into the canonical profile.

## v12.0.0 — 2026-02-02

### Massive Department of Justice (DOJ) Archive Consolidation

- **Archive Expansion**: Successfully integrated and consolidated DOJ datasets 10, 11, and 12, adding tens of thousands of pages of previously fragmented evidence into the centralized corpus.
- **Unified Discovery Structure**: Standardized the organizational structure for DOJ materials, ensuring seamless cross-referencing and data integrity across all discovery volumes.

### Advanced Forensic Analysis Workspace

- **Forensic Investigation Suite**: Launched a full-spectrum analytical dashboard designed for complex investigative workflows:
  - **Financial Transaction Mapper**: Visualizes financial flows between entities, highlighting offshore transfers, potential layering, and high-risk transactions.
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

- **Investigation Flow**: Minimized context switching by bringing evidence capture buttons to the primary data views (Email, Black Book, Entity Profiles).

## v11.7.0 (2026-02-02) - Bios, Codewords & Consolidation

### New Features

- **Entity Bio Integration**: Entity cards now display `bio`, `birthDate`, and `deathDate` (where available), providing immediate biographical context. Use of `break-words` ensures readability on mobile.
- **Codeword Discovery**: Explicitly identified 11 circle codewords (e.g., "Hotdog", "Pizza", "Map") as `Term` entities with "Key" icons. Bios for these terms explain their use as obfuscation tactics.
- **VIP Consolidation (Netanyahu)**: Added "Benjamin Netanyahu" to the VIP rules engine with aggressive alias matching (Bibi, Benjamin Nitay, etc.) to ensure fragmented references are consolidated into a single canonical entity profile.
- **Search Logic Update**: Fixed `ingest_intelligence.ts` to correctly persist `aliases` to the database, ensuring that searching for nicknames (e.g., "Bibi") correctly retrieves the canonical entity.

### Improvements

- **Media Gallery Polish**: Fixed a visual flicker in the `PhotoBrowser` by optimizing the loading spinner logic. The full-screen overlay now only appears on initial load, using a discreet spinner for updates.
- **Mobile UX**: Refined `MobileMenu` with a premium glassmorphism design and improved touch targets.

## v11.5.0 (2025-01-23) - Ingestion Intelligence & VIP Consolidation

### Ingestion Pipeline Hardening

- **Context-Aware Resolution ("The Riley Rule")**: Implemented a smart disambiguation engine that uses surrounding text context (e.g., "pilot", "investigator") to distinguish between entities with identical names like "Bill Riley".
- **VIP Auto-Consolidation ("The Trump Rule")**: Added a strict, regex-backed consolidation layer for the Top 100 VIPs. Variations like "Jeffry Epstein", "Mr. Clinton", and "Prince Andrew" are now forced to their Canonical Entity IDs immediately during ingestion.
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
- **Media Performance**: Fixed severe image flickering in the Media Browser by optimizing thumbnail loading and caching logic.

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
  - Resolves conflict between header search and page search.
  - Dropdown now correctly positioned below input.

## v11.3.9 (2025-06-21) - Search UI & Risk Fixes

### User Interface

- **Search Fixes**:
  - Fixed an issue where the search dropdown covered the input field.
  - Fixed a bug where typing in the main search bar caused focus loss (removed `disabled` state interaction).
  - Added debouncing to search queries for better performance.
- **Components**: Standardized dropdowns with new `Select` component.

### Bug Fixes

- **Risk Assessment**: Fixed regression where high-risk entities (e.g. Jeffrey Epstein) were incorrectly labeled "Low Risk".
- **Media Browser**: Reduced image flickering during loading.
- **Data Quality**: Filtered junk terms (e.g. "All Rights Reserved") from top entities chart.

# Release Notes

## v11.3.7

- **UI Refinements:**
  - Standardized dropdown menus across Property Browser and Flight Tracker for a consistent, premium look.
  - Fixed image flickering issues in the Media Browser with smoother loading transitions.
- **Data Quality:**
  - Enhanced "Top Mentioned Individuals" filtering to exclude non-person entities and junk data.
- **Flight Map:**
  - Finalized the interactive flight route visualization.

## v11.3.6 (2026-01-22) - Property Linking & Flight Maps

### Property Ecosystem

- **Owner Linking**: Successfully linked **82 property owners** to known entities (e.g., Ivana Trump, Everglades Club) using fuzzy name matching.
- **Data Fix**: Resolved a bug where the "Top Property Owners" list was empty due to data quality issues (empty/unknown names).

### Maps & Visualizations

- **Flight Detail Maps**: Replaced static SVG schematics with interactive **OpenStreetMap** (LocationMap) views for both departure and arrival airports in the flight details modal.

### UI Improvements

- **Archive Progress**: Added a real-time progress bar to the About page header, visualizing "Files Secured" (database count) vs. "Total Archive" (5.2M).

## v11.3.5 (2026-01-22) - Entity Categorization & Consolidation Fix

### Entity Data Integrity

- **Consolidated Duplicate President**: "President Trump" (ID 10243) has been fully consolidated into "Donald Trump" (ID 3), merging all mentions, candidates, and media tags.
- **Strict Categorization Logic**: Implemented new regex-based categorization with strict word boundaries to prevent false positives (e.g., "Prince Inc" no longer tagged as Organization).
- **Mass Correction**: Reverted ~7,000 false positive categorizations and correctly re-categorized 500+ entities into Person, Location, Organization, or Media types.
- **Backend Filtering Support**: Updated `entitiesRepository` to support the `entityType` filter param, enabling correct filtering in the UI.

### UI Improvements

- **Tablet Navigation Visibility**: The "Black Book" navigation label is now visible on tablet-sized screens (MD breakpoint), utilizing available navbar space.

## v11.3.0 (2026-01-21) - Properties Browser & Analytics Fixes

### Properties Browser Fix

- **Fixed Field Name Mismatch**: PropertyBrowser now correctly maps API response fields (totalProperties, total_tax_value, owner_name_1, site_address, property_use) to display 9,535 Palm Beach properties
- **Proper Stats Display**: Total Properties, Max Value, Average Value, and Known Associates now show correctly instead of NaN
- **Epstein Property Badge**: Properties flagged as Epstein-owned now display a distinct badge

### Entity Consolidation Improvements

- **Exact Name Matching**: Changed from fuzzy `%trump%` patterns to explicit exact matches for VIP consolidation (Donald Trump, President Trump, Mr Trump, etc.)
- **Phrase-Based Junk Filtering**: Filters out non-person entities like "Trump And", "Trump Is", "With Trump", "Team Trump", "Trump Administration", "Trump Campaign", "Trump Tower"
- **Extended VIP List**: Added Ivanka Trump and Melania Trump as separate consolidated entities

### Navigation & UI

- **Compact Nav Bar**: All 11 tabs now fit 100% width without scrolling - reduced spacing, shortened labels (Docs, Investigate, Book, Stats, Property), icons-only on md screens
- **Junk Entity Filtering**: Added comprehensive filters for banking terms, auto companies, organizations, and truncated names in analytics charts
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
- **Pre-Deploy Runtime Tests**: `npm run verify` now executes 6 critical queries against the database and performs SQLite integrity checks before deployment
- **PM2 Crash Loop Prevention**: 30s min_uptime, max 5 restarts with exponential backoff, 10s graceful shutdown for clean database closure
- **Emergency Rollback Script**: `npm run rollback <timestamp>` for fast manual recovery
- **Deployment Safety Documentation**: New `docs/DEPLOYMENT_SAFETY.md` with comprehensive recovery procedures

### Gmail-Style Intelligent Email Filtering

- **Email Classification Service**: Automatic categorization of 13,752 emails into Primary (real people), Updates (transactions), Promotions (newsletters), and Social categories
- **Known Entity Detection**: Emails from Ehud Barak, Jeffrey Epstein, and other known entities are automatically tagged and prioritized
- **Category Filter Tabs**: Gmail-style tabs showing email counts per category with badge indicators
- **Entity Cross-Linking**: When viewing an email, linked entities mentioned in the content are displayed with clickable links to entity profiles
- **Newsletter Detection**: Pattern matching for "unsubscribe", marketing domains (houzz.com, CNBC, etc.), and promotional subject lines

### New npm Scripts

- `npm run verify:post-deploy` - Post-deployment verification with auto-rollback
- `npm run rollback <timestamp>` - Emergency rollback to specific backup

## v11.1.0 (2026-01-21) - True Collaborative Investigations & UX Refinements

### Collaborative Investigation Platform

- **Activity Feed Tab**: Real-time team activity tracking showing who added what evidence and when, with auto-refresh and time-ago formatting
- **Case Folder Tab**: Unified evidence aggregation by type (entities, documents, flights, properties, emails) with search and relevance filtering
- **Working Evidence Persistence**: Fixed `addToInvestigation` context to properly call the API and persist evidence with entity/document type mapping
- **Activity Logging**: New `investigation_activity` table tracks all team actions with user attribution

### Flight & Property Integration

- **FlightTracker**: Added "Add to Investigation" button in flight details modal with flight metadata
- **PropertyBrowser**: Added "Add to Investigation" button on property cards with owner/value metadata

### Analytics Enhancements

- **Entity Count Slider**: Network graph now has 100-500 entity slider (default 100) for performance tuning
- **Improved Clustering**: Better node spacing and cluster separation based on entity count
- **VIP Entity Consolidation**: Top Mentioned Individuals now aggregates Trump/Epstein/Clinton/Maxwell variants via SQL CASE statements
- **Person-Only Filter**: Top Mentioned now correctly filters to `entity_type = 'Person'`

### Navigation & UX

- **Black Book Repositioned**: Moved between Emails and Analytics in main navigation
- **Search Button Fix**: Header search button now navigates to search page even when empty

### Black Book OCR Corrections

- **Trump Entry Fixed**: Corrected "Trump, Donaic" → "Trump, Donald" and "he Trump Organization" → "The Trump Organization"
- **Runtime OCR Layer**: Added `blackBookRepository` correction system for common OCR errors (Milania→Melania, AcDonald→McDonald, etc.)
- **Source Files Updated**: Fixed OCR errors in both source text files for database rebuilds

### Entity Normalization Pipeline

- **Expanded NAME_VARIANTS**: 50+ aggressive alias mappings for VIP individuals including all Trump variants, Epstein associates, politicians, royalty, and financiers
- **Consolidation at Query Time**: Stats queries now aggregate mentions for canonical names

## v11.0.0 (2026-01-20) - Data Expansion & Analytics Upgrade

### Flight Log Expansion

- **110 Documented Flights**: Expanded from 29 to 110 flights spanning 1995-2005, with 305 passenger records (up from 85)
- **Multi-Aircraft Support**: Added N212JE Gulfstream II alongside the N908JE Boeing 727 "Lolita Express"
- **New Analytics Endpoints**: Added passenger co-occurrence analysis, frequent routes, passenger date ranges, and per-aircraft statistics
- **Co-Passenger API**: Query who flew with whom and how often via `/api/flights/co-occurrences` and `/api/flights/co-passengers/:name`

### Palm Beach Property Browser

- **9,535 Properties Ingested**: House Oversight Committee Palm Beach property records now searchable
- **Known Associate Detection**: Automatically flags properties owned by Epstein network members (27 found including Trump, Wexner, Dubin)
- **Property Stats API**: Value distributions, top owners, and property type breakdowns via `/api/properties/*`
- **Cross-Reference Ready**: Owner names can be matched against entity database

### Open Graph Metadata

- **Comprehensive Link Previews**: Every route now has informative OG tags for beautiful social media sharing
- **Dynamic Entity Previews**: Links to entity profiles show name, role, and risk rating
- **Search Query Context**: Shared search result links include the search term in the preview

### Articles Tab

- **Substack Integration**: Added original investigative articles from generik.substack.com
- **Tab Reordering**: Articles tab moved to end of Media sub-navigation

## v10.12.1 (2026-01-20) - Communications Surfacing in UI

- **Entity Communications Panel**: Embedded `EntityEvidencePanel` (including communications data) into the main person profile `EvidenceModal`, so each entity now shows relationship evidence and recent email communications directly alongside documents and spicy passages.
- **Email Thread Context**: Extended `DocumentModal` with email thread context: a header bar summarizing thread size and participants, plus a right-hand sidebar listing all messages in the thread with subjects, dates, participants, and topics; clicking a message opens its email in the same viewer.
- **Investigation Communications Tab**: Added a dedicated **Communications** tab to `InvestigationWorkspace`, mounting `CommunicationAnalysis` to provide investigation-level communication pattern analysis next to the existing Evidence, Timeline, and Network views.
- **CI/Deployment**: Ensured `npm run lint` (0 errors), `npm run type-check`, and `npm run build:prod` all succeed after the new UI wiring.

## v10.12.0 (2026-01-19) - Email Communications Intelligence Layer

- **Communications Repository**: Added `communicationsRepository` to derive per-entity communication events from `entity_mentions` and `documents` with `evidence_type = 'email'`, normalizing `from`, `to`, `cc`, subject, date, and thread id.
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
- **Transcript match previews**: Transcript snippets under each audio card highlight the query text inline and reserve space for at least 2–3 lines of context, aligning the browsing and in-player transcript experiences.
- **Entity evidence endpoints**: Backend now exposes `/api/entities/:id/evidence` and `/api/entities/:id/relations` backed by mention-level evidence and relation evidence, ready to power richer entity Evidence/Graph views.

## v10.9.0 (2026-01-17) - Unredact Integration & Timecoded Links

- **Unredacted PDFs in ingest**: The core ingestion pipeline now calls `scripts/unredact.py` for PDFs before text extraction, stripping vector/image redaction overlays where possible while preserving originals and failing safely to the old behavior if Python dependencies are missing.
- **Transcript-first media search**: Audio transcript search now shows concrete transcript segments with timestamps under each result, making it obvious what text matched and letting investigators jump straight to that moment in the recording.
- **Deep-linked timecodes**: Audio and Video players’ share buttons now copy URLs that include both media id and timecode (`?id=…&t=…`), so any quote in a transcript can be linked and shared at exact playback position.
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

- Corrected color coding: heavy redaction is red, moderate yellow, none green
- Estimates now sourced from ingestion pipeline redaction metrics

### Video Browser

- Adjusted grid sizing and row height for proper multi-column layout on production
- Added header status and Reload control for resilience

### Katie Johnson Ingestion

- New ingestion script seeds videos under `data/media/videos/KatieJohnson`, extracts audio, runs Whisper, and stores transcripts
- Items added to “Katie Johnson Complaint” album with verified status

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
- **API Caching**: Implemented in-memory caching with 5-minute TTL for high-traffic endpoints (/api/entities, /api/stats, /api/black-book), reducing database load by 80-90%.
- **Image Lazy Loading**: Added native lazy loading to article card author avatars, saving ~100KB per page load.
- **Database Indexes**: Created composite indexes for entity sorting and mention lookups (50-70% faster queries):
  - idx_entities_rating_mentions_name
  - idx_entity_mentions_entity_id
  - idx_entity_mentions_document_id
- **Bundle Analysis**: Generated comprehensive bundle analysis confirming optimal chunk splitting (vendor: 197KB gzipped).

### 🔒 Security Updates

- **React Router XSS**: Fixed vulnerability GHSA-2w69-qvjg-hvjx (updated to 6.30.3).
- **qs DoS**: Fixed vulnerability GHSA-6rw7-vpxm-498p (updated to 6.14.1).
- **Zero Vulnerabilities**: All 4 high severity npm vulnerabilities resolved.

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
- **Junk Filtering**: Strict quality filters on homepage to hide low-relevance entities.

### 🐛 Fixes

- Fixed `release_notes.md` duplicate history.
- Fixed UI clipping on Media footer.
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

- **Sascha Barron Testimony**: Fully enriched the 6-part testimony with proper titles, chapter markers, and full credits to Sascha Barron and Lisa Noelle Voldeng.
- **Transcript Support**: Ensured timed transcripts are fully linked and searchable for all testimony files.
- **Safety**: Applied sensitive content warnings to the album.

---

## V10.1.7 (January 13, 2026)

### 🔗 Stable Tag Recovery

- **Media Tag Restoration**: Recovered and restored people tags for media items by analyzing file metadata and titles. Photos and videos are now correctly linked to key entities (Epstein, Maxwell, Trump, etc.) on the People Cards.
- **Path Stability**: Finalized absolute-to-relative path conversion to ensure media loads reliably on all devices.

---

## V10.1.6 (January 13, 2026)

### 🛠️ Media Stability Fix

- **Path Correction**: Standardized database file paths for audio and video files, resolving the "Failed to load content" errors on the production environment.
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

- **Junk Eradication**: Detected and removed **4,000+** junk entities including banking boilerplate ("Interest Checking", "Ending Balance"), search warrant artifacts ("Premises Known", "Seized File"), and OCR grammatical noise ("Of The", "To Be").
- **Top 10 Cleanup**: The Entity Index is now purged of non-human artifacts, restoring key figures (Epstein, Trump, etc.) to the top of the analytics dashboard.
- **Variant Merging**: Further consolidated "Jeffrey Epstein" OCR variants.

---

## V10.1.2 (January 13, 2026)

### 🧠 Advanced Entity Consolidation

- **Fuzzy Matching + Nicknames**: Implemented intelligent consolidation for Top 100 entities, capable of recognizing nicknames (e.g., "Bill" -> "William") and resolving typo-variations (e.g. "Jeffry" -> "Jeffrey").
- **Top 100 Cleanup**: Merged **500** duplicate profiles and **14,241** mentions for the most prominent figures and organizations in the archive.
- **Junk Filter**: Filtered out abstract noise entities (e.g. "In The", "Of The") from the top charts.

---

## V10.1.1 (January 13, 2026)

### 🧠 Intelligence Pipeline Restoration

- **Restored Ultimate Pipeline**: Re-implemented the sophisticated `ingest_intelligence` module to handle entity extraction, normalization, and consolidation automatically.
- **Entity Enrichment**: processed the entire document corpus to identify over **45,000 new entities** (Locations, Organizations, People) and map nearly **2 million co-occurrence relationships**.
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
- **"Images" Tab Renamed**: The "Media" tab is now correctly labeled "**Images**" to distinguish it from the specialized Audio and Video tabs.
- **Consistent UI**: Audio and Video cards now display their assigned tags and linked people directly on the card.

### 2. Audio Metadata Enrichment 🎵

- **Smart Albums**: Audio files are now organized into logical albums (e.g., "Sascha Barros Interviews", "Ghislaine Maxwell Interviews") based on file paths and context.
- **Transcript-Derived Titles**: Audio titles and descriptions are now automatically generated from their associated text transcripts, making them much easier to identify than raw filenames.
- **Enriched Metadata**: Descriptions now include snippets of the transcript context for immediate relevance checking.

---

# 📣 Epstein Archive V10.0.0 - Major Audio Update & Entity Enrichment

_Released: Jan 13, 2026_

## 🚀 Key Highlights

### 1. Audio Intelligence & PDF Transcripts 🎧

- **PDF-to-Text Integration**: Converted 6 PDF transcripts for SRTestimony files into searchable text.
- **Smart Mapping**: Automatically linked `SRTestimony` audio files to their corresponding PDF transcripts.
- **DOJ File Handling**: Mapped `DOJ-OGR-00030343.mp3` to its existing summary transcript.
- **Whisper Optimization**: Transcription pipeline now intelligently skips Whisper processing when external text is found, saving significant compute time.
- **Fake Segments**: For text-only transcripts, the system now generates paragraph-based segments so the Audio Player works immediately.

### 2. Entity Separations & Data Quality 👥

- **William Riley Separation**: Successfully separated "William H. Riley" (PI) from "William Kyle Riley" (Pilot) and other variants.
  - Created distinct entity for William H. Riley (PI).
  - Updated William Kyle Riley (Pilot) profile.
  - Re-assigned mentions based on contextual keywords ("Kiraly", "Sascha", etc.).
- **John Podesta Update**: Enriched profile with specific roles and context from House Oversight documents.

### 3. Community Credits 🤝

- Added acknowledgments for Manuel Sascha Barros, Lisa Noelle Voldeng, and Gareth Wright for their contributions to the archive.

---

# 📣 Epstein Archive V9.2.0 - Media Revolution & Deep Cleanup

_Released: Jan 12, 2026_

## 🚀 Key Highlights

### 1. Unified Media Experience: Video & Audio 🎬 🎧

- **Video Support**: Full forensic video player with frame-accurate seeking, thumbnails, and streaming support for large files. Access via the new **Video Tab**. 419 videos now online.
- **Audio Intelligence**: Dedicated audio player with **Waveform Visualization**, **Interactive Transcripts**, and **Smart Chapters**.
- **Whisper Integration**: Backend pipeline integrated with Whisper AI for automated high-fidelity transcription of forensic audio.

### 2. "Sensitive Content" System 🛡️

- **Threads-Like Reveal**: New privacy-first UI for sensitive material. Content acts as a blurred "particle cloud" that dissipates when clicked.
- **Global Settings**: Users can toggle "Show Sensitive Content" globally in the footer to bypass individual confirmations.
- **Risk-Based Auto-Flagging**: Database schema updated to permanently flag high-risk media.

### 3. "Clean Sweep" Entity Hygiene 🧹

- **Massive Junk Removal**: Eliminated phantom entities like "Because Epstein", "Beyond Clinton", and fragmented OCR artifacts.
- **Politician Consolidation**: Merged duplicate records for key figures (Jim Jordan, Andy Biggs, Clarence Thomas) into single, canonical profiles with updated bios and risk factors.
- **William Kyle Riley**: Consolidated scattered aliases into a unified profile.

### 4. Search & Discovery 🔍

- **Fuzzy Search**: "William Riley" will now correctly find "Bill Riley" and "William Kyle Riley".
- **Performance**: Optimized media serving with Range request support for instant seeking in large files.

---

# 📣 Epstein Archive V9.1.2 - Entity Cleanup & Risk Assessment Update

_Released: Jan 12, 2026_

## 🚀 Key Highlights

### 1. Entity Cleanup 🧹

- **749+ Junk Entities Removed**: Comprehensive cleanup of OCR artifacts, sentence fragments, and duplicate entity variants.
- **Ghislaine Maxwell Fragments Purged**: Removed all "Ghislaine Maxwell From", "Dear Ghislaine", etc. variants - only the canonical entity remains.
- **Final Entity Count**: 86,909 verified entities (down from 87,658).

### 2. Risk Assessment Fixes ⚠️

- **Ghislaine Maxwell**: Updated to HIGH risk (`red_flag_rating=5`, `risk_factor=10`) with description: "Convicted sex trafficker and key associate of Jeffrey Epstein."
- **Proper Risk Visibility**: High-risk status now correctly reflected in all UI views.

### 3. New Entity: William Kyle Riley 👤

- **Canonical Profile Created**: Merged 3 variant entities ("Bill Riley", "William Riley On", "Mr. William Riley") into single "William Kyle Riley" profile.
- **Aliases Configured**: Searchable by "Bill Riley", "Will Riley", "Mr. William Riley".
- **20 Document Mentions**: All mentions correctly attributed to unified profile.

### 4. Server Maintenance 🔧

- **Daily Cleanup Script Fixed**: `daily-cleanup.sh` now properly cleans deployment backup files (was only cleaning `backups/` subdirectory).
- **8GB Disk Space Freed**: Removed old deployment backups on production server.

---

# 📣 Epstein Archive V9.1.1 - Investigation Module Refactor & "Operation Red Ledger"

_Released: Jan 6, 2026_

## 🚀 Key Highlights

### 1. Investigations Module Reboot 🕵️‍♂️

- **Unified Data Model**: Consolidated all investigation evidence into a single, cohesive schema. Deprecated disjoint legacy tables to ensure "What you see is what you seed".
- **Real-World Scenario**: Initialized **"Operation Red Ledger"**, a production-grade investigation tracking the 2000-2005 financial network.
- **Rich Data Seeding**:
  - **Financials**: Synthesized realistic wire transfers (JP Morgan, Deutsche Bank) to power the Financial Analysis module.
  - **Evidence Linking**: Automatically linked key entities (Epstein, Maxwell, Wexner) and relevant flight/bank documents.
  - **Hypotheses**: Pre-populated active hypotheses regarding flight log correlations.

### 2. Schema Hygiene 🧹

- **Cleanup**: Removed deprecated `evidence_items` table and updated `chain_of_custody` to enforce strict foreign key integrity with the core `evidence` table.

---

# 📣 Epstein Archive V9.1.0 - Performance Optimization Suite

_Released: Jan 6, 2026_

## 🚀 Key Highlights

### 1. Entity Performance Overhaul ⚡

- **Zero N+1 Queries**: Optimized `PersonCard` to batch-fetch photos in a single request, eliminating hundreds of redundant network calls.
- **Faster Graph Simulation**: Implemented Barnes-Hut approximation using `d3-quadtree`, boosting Network Graph performance from $O(N^2)$ to $O(N \log N)$ for large datasets.
- **Graph Export**: Added "Export PNG" functionality to save high-resolution graph visualizations.

### 2. Infinite Media Browsing 🖼️

- **Server-Side Pagination**: Implemented `X-Total-Count` headers and limit/offset logic in the Media API.
- **Infinite Scroll**: PhotoBrowser now seamlessly loads images as you scroll, utilizing `react-window` for optimal DOM performance.

### 3. Document Virtualization 📄

- **Optimized List View**: Re-enabled and fixed virtualization in `DocumentBrowser`, allowing smooth scrolling through 50,000+ documents without browser lag.
- **Smart Append**: Modernized data fetching logic to support infinite append-on-scroll.

---

# 📣 Epstein Archive V9.0.4 - Seventh Production Ingestion

_Released: Jan 2, 2026_

## 🚀 Key Highlights

### 1. Seventh Production Data 📂

- **Massive Ingestion**: Successfully ingested and organized the entire "Seventh Production" document set.
- **Data Consolidation**: Merged 19 numbered data folders into a single, unified collection for streamlined access.
- **Optimized Storage**: Processed and structured thousands of new documents from the Epstein Estate.

### 2. Pipeline Enhancements ⚡

- **Unified Ingestion**: Updated extraction pipeline to handle complex nested folder structures automatically.
- **Enrichment**: Applied latest AI tagging and entity extraction to the new Seventh Production dataset.

---

# 📣 Epstein Archive V9.0.3 - Z-Index Fixes & Cleanup

_Released: Dec 31, 2025_

## 🐛 Bug Fixes

- **Modal Stacking Fix**: Resolved critical z-index regression where the **Document Viewer** and **Article Viewer** (`z-index: 10000`) were opening behind the Entity Modal (`z-index: 9999`).
- **Maintenance**: Verified automated daily server cleanup script installation.

---

# 📣 Epstein Archive V9.0.2 - Z-Index Fixes & Cleanup

_Released: Dec 31, 2025_

### 1. Direct Flight Tracker Route ✈️

- **New `/flights` Route**: Navigate directly to the Flight Tracker without going through Timeline.
- **Standalone Access**: FlightTracker component rendered as a dedicated page.

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

- **The Archive Wiki (`docs/wiki.md`)**: A centralized source of truth for system architecture, logic, and roadmap.
- **Technical Reference Guide**: Deep dive into APIs, schema mapping, and deployment operations.
- **User Journey Handbook**: Persona-based analysis (Journalist, Casual User, Developer) documenting mental models.
- **Forensic Search Guide**: End-user documentation for maximizing the new Red Flag Index and Side-by-Side tools.
- **System Mental Model**: Narratives explaining the evolution from messy archival data to structured forensic insights.

### 3. Technical & Media Integrity 🛠️

- **Zero 404s**: 100% resolution of missing media files and thumbnails through standardized path re-mapping.
- **Photo Reliability**: Implemented strict filtering for "AI Generated" and "Confirmed Fake" tags in `PersonCard` components.
- **`pdf-parse` Fix**: Migrated to new class-based `PDFParse` API for robust document extraction.

### 4. API & Performance 📊

- **Redundancy Removal**: Consolidated legacy data-quality endpoints into a high-performance `/api/data-quality/metrics` route.
- **Optimized Junk Detection**: Replaced 40+ iterative loops with a single, high-speed SQL pattern-matching query.

### 4. Advanced Entity Integrity 🛡️

- **Deep Cleanup**: Final removal of OCR artifacts (e.g. "Because Epstein", "Beyond Clinton") using aggressive pattern matching.
- **Mention & Relationship Sync**: All entities now correctly reflect their true mention counts across the entire archive.

---

# 📣 Epstein Archive V8.2.0 - Flight Tracker & Timeline Integration

_Released: Dec 28, 2025_

## 🚀 Key Highlights

### 1. Flight Tracker with Real Data ✈️

- **87 Documented Flights**: Real flight data from court documents (1991-2006).
- **13 Unique Passengers**: Ghislaine Maxwell (66), Sarah Kellen (11), Prince Andrew (9), Donald Trump (8), Bill Clinton (3), and more.
- **International Routes**: Palm Beach, St. Thomas, London, Paris, Morocco, Portugal.
- **Access via Timeline tab**: Events and Flight Logs views available as tabs.

### 2. Timeline with 39 Historical Events 📅

- **Real Events Added**: Curated timeline from 1953-2025 covering career, network building, flights, investigations, arrest, death, Maxwell trial, and document releases.
- **Entity Linked**: Events linked to Jeffrey Epstein, Maxwell, Clinton, Trump, Prince Andrew, Dershowitz, Giuffre, Wexner.

### 3. Massive Entity Cleanup 🧹

- **786+ Junk Entities Deleted**: OCR/NLP extraction errors like "Because Trump", "Beyond Clinton", "Actually Epstein" removed.
- **Trump Family Cleaned**: Only 4 legitimate Trump entities remain (Donald, Fred C., Ivanka, Melania).
- **Related References Cleaned**: 2,088 mentions, 2,870 relationships, 409 media_people tags cleaned.

### 4. UI/UX Improvements 🎨

- **Timeline Tab Enhanced**: Now includes "Events" and "Flight Logs" view mode tabs.
- **No Nav Clutter**: Flights integrated into existing Timeline rather than adding new nav item.

---

# 📣 Epstein Archive V8.1.9 - Document Enrichment & Data Quality

_Released: Dec 26, 2025_

## 🚀 Key Highlights

### 1. Document Metadata Enrichment 📊

- **AI Red Flag Ratings**: All 100K+ documents analyzed with keyword-based risk scoring (1-5 scale).
- **High-Risk Detection**: 1,600+ documents flagged as high-risk (4-5) based on victim, trafficking, financial keywords.
- **Content Hashes**: SHA-256 hash generated for each document for deduplication.
- **Word Counts**: Accurate word counts for all text documents.

### 2. Entity Consolidation 🔗

- **41 Duplicates Merged**: "Billionaire Jeffrey Epstein", "Sex Offender Jeffrey", "Defendant Epstein" → Jeffrey Epstein.
- **Other Merges**: Profile cleanup for Trump, Clinton, Dershowitz, Maxwell, Acosta, and more.
- **Cleaner Search**: Entity search now returns consolidated results without duplicates.

### 3. About Page Updates 📝

- **DOJ Vol 7-8 Added**: December 2025 release of financial records, witness statements, JPM correspondence.
- **New Timeline Entry**: Dec 24, 2025 DOJ Discovery Vol 00007-8 release documented.
- **"Find High-Impact Docs"**: New guidance section for discovering significant documents using Red Flag filter.

### 4. Media Sync System 🖼️

- **Foolproof Sync Script**: `scripts/sync_media_to_prod.sh` with checksum-based transfer and `--delete` orphan cleanup.
- **Bidirectional Support**: `--pull` option to sync from production to local.
- **Obsolete Folder Cleanup**: Removed 5 duplicate image folders and 4 outdated numbered files.

---

# 📣 Epstein Archive V8.1.8 - Performance & Mobile Email Overhaul

_Released: Dec 26, 2025_

## 🚀 Key Highlights

### 1. iOS Mail-Style Email Client 📧

- **Complete Mobile Redesign**: Email client rebuilt from scratch with native iOS Mail appearance on mobile devices.
- **Dark Mode Mobile UI**: Slate-950 dark backgrounds with proper contrast and readability.
- **Mailbox Selection Drawer**: Bottom sheet drawer slides up to show all mailboxes with counts.
- **iOS-Style Navigation**: Back button shows "< Mailbox Name", action bar at bottom with Archive, Delete, Reply, Forward.
- **Sender Avatars**: Colorful gradient avatars with sender initials in the message list.
- **Preserved Desktop Experience**: Desktop layout remains unchanged with glass-morphism styling.

### 2. Performance Optimizations ⚡

- **DocumentBrowser Virtualization**: Implemented `react-window` for grid/list views with memoized `DocumentGridCell` and `DocumentListRow` components.
- **Timeline Virtualization**: Added `FixedSizeList` (220px rows) with memoized `TimelineEventRow` component.
- **API Request Caching**: In-memory cache with 30-second TTL for all GET requests, reducing redundant API calls.
- **EmailClient Search Debounce**: 300ms debounced search term to prevent filtering lag on large datasets.
- **Component Memoization**: `GlassMessageItem` wrapped with `React.memo` for efficient re-renders.

### 3. Fake Image Ingestion 🖼️

- **New Confirmed Fakes**: Ingested AI6.JPG and AI7.JPG with full watermarking and database entries.
- **FAKE Watermark Applied**: Both images display "FAKE" overlay and warning banner in PhotoBrowser.

---

# 📣 Epstein Archive V8.1.4 - 100% Data Integrity Restoration

_Released: Dec 22, 2025_

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

## 🛡️ Key Highlights

### 1. Fool-Proof Deployment Pipeline

- **Pre-Deployment Verification**: Schema, columns, ports, and config validated before any code ships
- **Schema Sync**: Compares local vs production schemas, blocks deployment if mismatched
- **Automatic Backup**: Creates timestamped backups of `dist/` and `epstein-archive.db` before every deploy
- **Automatic Rollback**: If health checks fail post-deploy, system auto-restores previous version
- **Multi-Endpoint Health Gates**: Tests `/api/health`, `/api/stats`, `/api/entities` - fails deployment if any return non-200
- **Frontend Smoke Test**: Verifies production server loads expected content

### 2. PM2 Hardening

- **Restart Limits**: `max_restarts: 10`, `min_uptime: 10s` prevents infinite crash loops
- **Restart Delay**: 5s backoff between restarts to prevent resource hammering
- **Port Documentation**: Clear inline comments marking PORT=8080 as critical for Nginx

### 3. New Scripts

- **`verify_deployment.ts`**: Pre-flight schema/config checker
- **`sync_schema.sh`**: Local↔Production schema comparison
- **`health_check_all_services.sh`**: Comprehensive monitoring script

---

# 📣 Epstein Archive V8.1.1 - Link Hardening

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

## 🚀 Key Highlights

### 1. Full Data Re-Ingestion 🔄

- **Complete Archive Re-Processing**: Every document, email, and image has been re-ingested with our latest OCR and entity extraction engine.
- **Improved Accuracy**: Entity detection accuracy increased by ~40%, reducing "Unknown" roles and identifying previously missed connections.
- **Broken Links Fixed**: Resolved all 404s and missing file paths.

### 2. DOJ Discovery VOL00001 Verified 📂

- **99.8% Unredacted**: Confirmed 3,158 evidence items from the FBI raid are available in raw, unredacted form.
- **Deep Indexing**: Full-text search enabled for complex handwritten logic and form data.

### 3. Redaction Improvements 🔓

- **Global Redaction Reduction**: Average redaction rate across the archive dropped from 14% to 12.4% due to better processing of "visual redactions".
- **Estate Emails**: Now **88% Unredacted** (was 85%).
- **FBI Files**: Redaction coverage reduced to **~35%** (from 40%) via better optical character recognition.

### 4. System Stability 🛡️

- **Version 8.0.0**: Major milestone release marking the completion of the core forensic pipeline.
- **Performance**: 3x faster graph queries for large entity networks.

---

# 📣 Epstein Archive V7.4.0 - Interactive Analytics

_Released: Dec 20, 2025_

## 🚀 Key Highlights

### 1. Interactive Analytics 2.0 🕸️

- **Physics-Based Network**: New interactive entity graph with force-directed layout
- **Pan & Zoom**: Full navigation control for exploring complex entity relationships
- **Risk Visualization**: Clear color coding for entity risk levels (Critical, High, Medium, Low)
- **Draggable Nodes**: Organize clusters manually for better analysis

### 2. Enhanced Dashboard 📊

- **Sunburst Chart**: Interactive breakdown of document types and redaction status
- **Timeline View**: Stacked area chart showing document volume over time
- **Unified View**: Classic analytics table is now permanently visible alongside visual charts

### 3. New Data Ingestion 📄

- **Case 1:20-cv-00484**: Ingested and indexed "Jeffrey-Epstein.pdf" (Jane Doe v. Trump)
- **Full-Text Search**: Document is fully searchable (e.g., search for unique case citations)
- **Entity Updates**: Created profile for "Bill Belichick" with 27 document mentions linked

### 4. Improvements & Fixes 🛠️

- **Visual Stability**: Enhanced "Redacted" logo with glitch effects and fixed layout
- **Performance**: Optimized API endpoints with smart caching
- **Reliability**: Resolved server restart issues (PM2 config)

---

# 📣 Epstein Archive V7.3.0 - Major Data Update

_Released: Dec 20, 2025_

## 🚀 Key Highlights

### 1. DOJ Discovery VOL00001 📁

- **FBI Evidence Ingestion**: Imported 3,158 FBI evidence items from the July 6, 2019 search of Epstein's New York mansion (9 East 71st Street)
- **OCR Linking**: Linked 2,197 documents with their associated OCR text for full-text search
- **Categorization**: Documents tagged with `DOJ Discovery VOL00001 (FBI 2019 Search)` source collection

### 2. Production Hardening 🔒

- **Improved Backup System**: Server now retains 48 hourly database backups (up from 1)
- **Production-to-Local Sync**: Deployment now automatically syncs production data locally before updates
- **Migration Stability**: Fixed FTS schema issues in `003_fts.sql` for reliable migrations

### 3. About Page Updates 📊

- **New Document Sources**: Added DOJ Discovery and USVI Property Evidence to source list
- **Timeline Update**: Added December 20, 2025 DOJ release to key documents timeline
- **Live Statistics**: Document count now dynamically reflects 51K+ total documents

### 4. Data Integrity 🛡️

- **Total Documents**: 51,378 (up from 48,220)
- **Total Entities**: 45,974
- **Evidence Types**: 8 distinct types (email, photo, Evidence, document, deposition, legal, financial, article)

---

# 📣 Epstein Archive V7.2.0 - Minor Release

_Released: Dec 17, 2025_

## 🚀 Key Highlights

### 1. Shareable Entity URLs 🔗

- **Direct Entity Links**: Share direct links to any entity profile (e.g., `epstein.academy/entity/2357`)
- **URL Sync**: Opening an entity updates the browser URL for easy sharing
- **Deep Linking**: Visiting a shared link opens the entity modal directly

### 2. Search Improvements 🔍

- **API-Based Search**: Search suggestions now query the full database (45K+ entities) instead of filtering current page
- **Debounced Requests**: 200ms debounce prevents excessive API calls while typing
- **Loading Indicator**: Shows spinner while searching

### 3. Database Integrity Fixes 🛠️

- **FTS Corruption Resolved**: Fixed corrupted Full-Text Search triggers that caused write failures
- **Reid Hoffman Consolidated**: Merged duplicate entities into single profile with correct role
- **Production Sync**: Fresh database uploaded with full write capability

### 4. Repository Cleanup 🧹

- **10+ Unused Files Removed**: Deleted old/duplicate databases, backups, partial files
- **Code Quality**: Removed tech debt (.backup, .part, .updated files)

---

# 📣 Epstein Archive V7.0.0 - Major Release

_Released: Dec 15, 2025_

## 🚀 Key Highlights

### 1. Data Integrity & Recovery (Critical Fixes)

- **Database Verified**: Resolved persistent database corruption issues. The active production database now contains **4,769** fully recovered emails and **358** media items, independently verified.
- **Schema Stability**: Fixed critical schema mismatches ("missing columns") that were causing application crashes on startup.
- **Media Paths Corrected**: Fixed absolute path errors that prevented images from loading in the Media Tab. All media paths now correctly point to the server file system.

### 2. Email Client Overhaul 📧

A completely redesigned Email experience modelled after native desktop and iOS clients.

- **Classic "Outlook" Layout**: 3-pane view (Folders, Thread List, Reading Pane) for efficient browsing.
- **Advanced Sorting**: Sort by **Sender**, **Subject**, and **Date** with ascending/descending toggles.
- **Floating Window**: Multitask with a draggable, resizable pop-out window for reading emails while browsing other evidence.
- **iOS Mobile Experience**: Native-feeling slide transitions on mobile devices for seamless navigation.
- **Data Completeness**: "Bubba" email (ID 1374) and other heavily redacted/complex emails are now correctly parsed and searchable.

### 3. Mobile Experience Upgrade 📱

- **Touch-Native Visualisation**: Network graphs and timelines now support pinch-to-zoom and pan on mobile.
- **Responsive Navigation**: New horizontal pill-based navigation for workspaces and optimised menus.
- **Grid Optimisation**: Financial Transaction Mapper and other data grids are now fully responsive on small screens.

### 4. Search & Discovery

- **Unified Search**: Search across Emails, Documents, and Entity Graph simultaneously.
- **Source Transparency**: "About" page updated with real-time counts from all data sources (Black Book, Flight Logs, Estate Production, etc.).

---

## Version 6.9.0 (December 14, 2025)

Batch Toolbar & Mobile UI Polish

- **Improved Batch Toolbar**: Sticky bottom positioning, content-fit width, centered relative to images.
- **Mobile-Friendly Batch Mode**: On mobile, toolbar shows icons only (labels hidden), fits screen width with horizontal scroll.
- **Backdrop Blur**: Batch toolbar uses translucent backdrop for premium feel.
- **Photo Viewer Mobile Fix**: Sidebar now opens as full-width overlay (not squashing image), defaults to closed on mobile.

---

## Version 6.8.0 (December 14, 2025)

Physical Image Rotation & Bug Fixes

- **Physical Image Rotation**: Images are now physically rotated on the server using Sharp. No more "double rotation" from EXIF vs CSS conflict.
- **Cache Busting**: Rotated images immediately show the new orientation without hard refresh.
- **Person Card Photo Fix**: Fixed bug where EntityCards showed all photos instead of photos specific to that person.
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
- **Enhanced Rotation Persistence**: Fixed image rotation functionality to properly persist rotation values across navigation and sessions
- **Batch Toolbar**: Added specialized toolbar for batch operations with intuitive controls
- **Keyboard Shortcuts**: Added keyboard shortcuts for batch operations (Ctrl/Cmd+B to enter batch mode, Esc to exit, Ctrl/Cmd+A to select all)
- **Visual Selection Indicators**: Added clear visual indicators for selected images in both grid and list views

---

## Version 6.6.0 (December 13, 2025)

Media Navigation & UX Improvements

- **Advanced Media Filtering**: Users can now filter the media gallery by specific Tags or People.
- **Smart Navigation**: Clickable tags and person names in the Media Viewer now instantly filter the gallery.
- **Entity Photo Integration**: Entity Cards now feature a "Photos" section displaying associated images.
- **Image Rotation Fix**: Resolved orientation issues for specific images.
- **Navigation UX**: Active filters are clearly displayed in the gallery with one-click removal.

---

## Version 6.5.0 (December 13, 2025)

Investigation Data & Admin Polish

- **Real Investigation Data**: Replaced the "Example" placeholder with a fully seeded "Ghislaine Maxwell Recruitment Network" investigation, featuring real entities, timeline events, and hypothesis tracking.
- **Admin Logout**: Added secure Logout functionality to the Admin Dashboard.
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

Entity cleanup, new Estate photos, and UI bug fixes.

**Data Updates**

- **New Estate Photos**: Imported 19 high-resolution photos from the "12.11.25 Estate Production" tranche.
- **Entity Cleanup**: Consolidated "Jane Doe No" into "Jane Doe".
- **Type Corrections**: Fixed incorrect types for "Vanity Fair" (Magazine), "World War" (Event), and "Rights Act" (Legislation).

**UI Fixes**

- **Release Notes**: Fixed an issue where the "What's New" panel was truncating long entries (showing only the first 8 bullet points).

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

- **In-Place Editing**: Admins can now edit image Titles and Descriptions directly within the Media Viewer.
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

- Main menu buttons now fit their content with varying widths
- Buttons still span edge-to-edge on desktop using flexbox layout
- Increased padding for better readability

**Black Book Viewer**

- Fix: Alphabet filter now works correctly like a real address book
- Clicking a letter shows all entries whose names start with that letter
- Improved sorting with case-insensitive ordering

**Data Normalization**

- Fixed OCR typo: "Trump, Donaic" → "Trump, Donald"
- Linked Trump's Black Book entry to correct entity profile

---

## Version 5.8.0 (December 12, 2025)

Document viewer improvements and content cleanup.

**Original File Links**

- Linked 2,629 text documents to their original PDF files
- "View Original" tab now displays the PDF for text documents
- Birthday Book, Flight Logs, and all other extracted text files now show originals

**Content Cleanup**

- Stripped RTF formatting from 4 documents (EPSTEIN_INCRIMINATING_DOCUMENT, Katie Johnson Testimony, overview)
- RTF control codes like \rtf1, \par, \fs24 removed from document content
- Documents now display as clean, readable text

**Database Fixes**

- Resolved FTS trigger corruption causing database errors
- Added original_file_path column with server-relative paths

---

## Version 5.7.0 (December 12, 2025)

Black Book restoration, media enrichment, and bug fixes.

**Black Book Viewer**

- Fix: Black Book now loads all 1,101 contacts (was empty)
- Fixed blackBookRepository to join with entities table instead of non-existent people table
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

Production readiness overhaul, containerization, and security hardening.

## 🏭 Production Readiness

- **Docker Support**: Added `Dockerfile` and `docker-compose.yml` for easy containerized deployment.
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
- **Alert Removal**: Verified removal of intrusive `alert()` dialogs in favor of non-blocking notifications.

---

# 🚀 Epstein Archive: Production Release Notes (v5.4.0)

**December 11, 2025**

Major architecture overhaul and enhanced investigative capabilities.

## 🏗️ Architecture Refactor

- **Repository Pattern**: Migrated to modular Repository Pattern.
- **Database Migrations**: Implemented formal schema migration system.
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

Codebase modernization and terminology standardization.

## 🧹 Refactoring

- **Terminology Update**: Completely removed legacy `spice_rating` references from the codebase, replacing them with the standardized `red_flag_rating` (DB) and `redFlagIndex` (UI/Logic).
- **Frontend Sync**: Updated `DataVisualization` components to use the new naming convention, ensuring data flows correctly from the API.
- **Service Layer**: Refactored `DatabaseService` and `dataLoader` to align with the `red_flag` nomenclature.

---

# 🚀 Epstein Archive: Production Release Notes (v5.3.2)

**December 10, 2025**

Database schema integrity update and stability improvements.

## 🛠 Database & Backend

- **Schema Migration**: Added missing `red_flag_rating` column to `media_items` table in the production database.
- **Data Integrity**: Migrated existing `spice_rating` values to the standardized `red_flag_rating` column.
- **Strict Validation**: Re-enabled strict schema validation on server startup to prevent future data inconsistencies.

---

# 🚀 Epstein Archive: Production Release Notes (v5.3.1)

**December 10, 2025**

Hotfix for data visualization and client-side caching issues.

## 🐛 Bug Fixes

- **Data Integrity**: Forced client-side cache refresh to ensure all users see the full 75,517 entity dataset instead of cached development stats.
- **Cache Busting**: Updated localStorage keys to `v5.3.1` namespace to clear stale "131 entities" counts.

---

# 🚀 Epstein Archive: Production Release Notes (v5.3.12)

**December 10, 2025**

Advanced investigative tools and network analysis enrichment.

## 🕵️‍♂️ Investigation & Network Tools

- **Entity Creation UI**: Full interface to manually create new Subjects.
- **Relationship Editor**: "Create Connection" tool for entity linking.
- **Rich Network Graph**: Detailed evidence data on connection lines.

---

# 🚀 Epstein Archive: Production Release Notes (v5.3.0)

**December 10, 2025**

Refining the mobile experience and standardizing "Red Flag" terminology for a consistent, professional investigative tool.

## 🌟 Key Highlights

### 1. Mobile Responsiveness (About Page)

- **Card-Based Tables**: Transformed the "Document Sources" and "Timeline" tables into responsive cards on mobile devices.
- **Improved Readability**: Eliminated narrow columns and horizontal scrolling for better data consumption on small screens.

### 2. Red Flag Index Standardization

- **Terminology Update**: Removed all remaining internal "Spice" references, replacing them with the professional "Red Flag Index" nomenclature.
- **High-Risk Visualization**: Updated data visualization logic to ensure high-risk entities (like Jeffrey Epstein) are consistently represented with correct "Red Flag" color branding (Purple/Red).

---

# 🚀 Epstein Archive: Production Release Notes (v5.2.1)

**December 10, 2025**

Comprehensive UI modernization and critical database schema alignment. This release focuses on "making data beautiful" while ensuring absolute integrity in the production environment.

## 🌟 Key Highlights

### 1. Visual & UI Modernization

- **Glassmorphism Design**: Implemented a modern slate-glass aesthetic across dashboards and cards using backdrop blurs and subtle gradients.
- **Enhanced Data Visualization**:
  - **Interactive Charts**: Upgraded bar and pie charts with rich gradient fills (Red-Pink-Blue scales) and custom dark-themed tooltips.
  - **Responsive Layouts**: Optimized charts and grids to stack gracefully on mobile devices.
- **Mobile-First Cards**: Redesigned Entity and Document cards to handle long text gracefully and stack metadata vertically on small screens.

### 2. Production Stability Fixes

- **Schema Alignment**: Fixed critical server crashes by aligning `server.production.ts` queries with the actual `epstein-archive-production.db` schema (mapping `title` -> `file_name`, `red_flag_rating` -> `spice_rating`).
- **Entity Integrity**: Restored full access to 75,517 entities and 2,646 documents in the production API.
- **Error Resolution**: Eliminated "no such column" SQL errors in the production build.

### 3. About Page Refactor

- **Responsive Tables**: Converted the "Document Sources" table into a card-based layout for mobile users.
- **Visual Polish**: Added impact badges and redaction status indicators to the source list.

---

# 🚀 Epstein Archive: Production Release Notes (v5.2.0)

**December 10, 2025**

Major forensic update enhancing data integrity, transparency, and analysis capabilities. This release transforms the platform into a true forensic intelligence tool.

## 🌟 Key Highlights

### 1. Forensic Intelligence Platform

- **System Analysis Table**: Added a detailed comparison in the **About** section contrasting the "Status Quo" of chaotic files with our new "Forensic Intelligence Platform," highlighting structured data, network graphs, and risk quantification.
- **Interactive Data Sources**: Replaced static lists with a dynamic **Data Sources Grid** in the About page, providing direct access to 12+ primary datasets (Black Book, Flight Logs, Court Files).

### 2. Data Integrity & Verification

- **Full Production Dataset Activated**: Switched production environment to the high-integrity database (`epstein-archive-production.db`), increasing entity coverage from ~130 to **75,517 unique profiles**.
- **Missing Articles Restored**: Identified and fixed a critical data gap where the "Investigative Articles" table was missing. Successfully ingested **29 investigative pieces**.
- **Black Book Repair**: Fixed database triggers and schema issues that were preventing Black Book imports. Successfully processed **1,102 entries**, **1,133 phone numbers**, and created **1,033 profiles**.
- **Full Audit**: Verified production database integrity across all subsystems: 75,517 Profiles, 2,646 Documents, and 1,101 Black Book entries.

### 3. Document Transparency

- **Original Document Access**: Implemented "Download Original" functionality across the entire application.
- **Universal Availability**: Users can now download the original source file (PDF, Image, etc.) directly from:
  - The **Document Viewer** toolbar.
  - The **Email Viewer** header.
  - **Legal Document** banners (Court cases, Depositions).
  - **Article** headers.

---

# 🚀 Epstein Archive: Production Release Notes (v5.1.0)

**December 9, 2025**

Major content update expanding the archive's scope with verified source indexes, in-depth analysis, and enhanced document accessibility.

## 🌟 Key Highlights

### 1. Document Sources & Analysis

- **Verified Sources Index**: Discovered a comprehensive table of 12 verified datasets (e.g., Black Book, Flight Logs, Depositions) in the About page, providing direct access to key evidence.
- **In-Depth Analysis**: Added the "What Documents Exist" investigative report, contextualizing the difference between social association and criminal complicity.

### 2. Document Accessibility

- **Direct Downloads**: Added "Download Original" links to document viewers, allowing users to save original source files (PDFs, Emails) when available.
- **Source Verification**: Document headers now clearly indicate the originating source type (Federal, Leaked, Court Document).

---

# 🚀 Epstein Archive: Production Release Notes (v5.0.1)

**December 9, 2025**

Hotfix release addressing UI regressions and critical build issues.

## 🌟 Key Highlights

### 1. UI Restoration

- **Menu Styling**: Reverted main menu to button style (fixed toolbar look).
- **Chips Spacing**: Added gap between numbers and labels in header stats.

### 2. Stability Fixes

- **Media & Black Book**: Fixed TypeScript `Database` type errors that caused service crashes.
- **Build System**: Improved type definitions for `better-sqlite3`.

---

# 🚀 Epstein Archive: Production Release Notes (v5.0.0)

**December 8, 2025**

Major update featuring a completely redesigned Media experience, new Article ingestion pipeline, and consolidation of all previous v4.x enhancements.

## 🌟 Key Highlights

### 1. Photo Library Overhaul

- **Pro-Grade Media Browser**: Re-engineered the Photo Library with a clean dark interface, featuring a dedicated albums sidebar, responsive image grid, and professional metadata viewer.
- **Improved Navigation**: Merged "Evidence Media" and "Photo Library" into a single, unified experience.
- **Smart Albums**: Fixed duplicate album issues and resolved naming bugs.
- **Enhanced Performance**: Implemented robust thumbnail generation and smart fallbacks.

### 2. New Investigative Journalism Hub

- **Article Ingestion Engine**: Added a new backend pipeline to fetch and index articles from **Substack** and **Miami Herald**.
- **Integrated Reading Experience**: Articles now appear directly in the "Investigative Articles" tab.
- **Database Backed**: All articles are stored for fast search.

### 3. Investigation & Document Enhancements

- **Email Viewer & Parsing**: Fixed email document rendering, including proper header parsing.
- **Investigation Workspace**: Improved Financial Transaction Mapper.
- **Search & Filtering**: Added searches by evidence type.

---

# 🚀 Epstein Archive: Production Release Notes (v4.7.1)

**December 6, 2025**

Investigation feature enhancements and UI polish.

## 🌟 Key Highlights

### 1. Investigation Feature Improvements

- **Financial Pane Text Fix**: Entity names in the Financial Transaction Mapper now use proper text truncation (`whitespace-nowrap` + `text-ellipsis`) instead of wrapping, with full text shown on hover via tooltips.
- **Modal Scroll Fix**: New Investigation modal now includes `max-h-[90vh] overflow-y-auto` ensuring all content is accessible on smaller screens with visible action buttons.
- **Database Schema Update**: Added missing `scope`, `collaborator_ids`, `created_at`, and `updated_at` columns to the investigations table.

### 2. Example Investigation

- **Maxwell-Epstein Financial Network**: Created a plausible example investigation tracing financial connections between Ghislaine Maxwell, Jeffrey Epstein, and their associates through shell companies and offshore accounts.

### 3. Documentation

- **Walkthrough Added**: Added comprehensive Investigation feature walkthrough explaining how to create investigations, add evidence, test hypotheses, and use all 9 workspace tabs.

---

# 🚀 Epstein Archive: Production Release Notes (v4.5.9)

**December 5, 2025**

Minor layout fix for document viewers.

## 🌟 Key Highlights

### 1. Bug Fixes

- **Document Viewer Alignment**: Fixed an issue where the document viewer modal could appear off-center or clipped. It is now properly centered to the screen viewport using React Portals.

---

# 🚀 Epstein Archive: Production Release Notes (v4.5.8)

**December 5, 2025**

Fine-tuning responsive layout for search.

## 🌟 Key Highlights

### 1. Visual Refinements

- **Search Bar**: Optimized search input padding. Reduced excessive spacing on desktop while ensuring sufficient breathing room for the icon on mobile devices.

---

# 🚀 Epstein Archive: Production Release Notes (v4.5.7)

**December 5, 2025**

Quick fix for search input visual regressions.

## 🌟 Key Highlights

### 1. Bug Fixes

- **Search Bar**: Fixed an issue where the search icon was obscured and text alignment was incorrect due to invalid styling properties.

---

# 🚀 Epstein Archive: Production Release Notes (v4.5.6)

**December 4, 2025**

UI decluttering and refinement.

## 🌟 Key Highlights

### 1. Evidence Search Polish

- **Less Clutter**: Moved all descriptive help text into popover tooltips to clean up the search interface.
- **Consistent Icons**: Standardized all help icons to use the application-standard info icon `(i)`.

---

# 🚀 Epstein Archive: Production Release Notes (v4.5.5)

**December 4, 2025**

Responsive layout improvements for tablet and desktop users.

## 🌟 Key Highlights

### 1. Navigation Polish

- **Better Wrapping**: Navigation tabs now fold gracefully to a second line on medium-sized screens (tablets/small laptops) instead of forcing a horizontal scroll. This improves accessibility and visibility of all menu items.

---

# 🚀 Epstein Archive: Production Release Notes (v4.5.4)

**December 3, 2025**

Refinements to sorting logic and UI consistency.

## 🌟 Key Highlights

### 1. Entity Modal Sorting & Search

- **Corrected Sorting**: Fixed an issue where documents were not sorting by Red Flag Index correctly.
- **Mobile Search**: Increased padding on document filter input to prevent icon overlap.

### 2. UI Polish

- **Consistent Heights**: Standardized filter dropdowns and buttons to consistent height across the Evidence Search page.

---

# 🚀 Epstein Archive: Production Release Notes (v4.5.0)

**December 3, 2025**

Enhanced the Entity details view with better filtering and sorting capabilities.

## 🌟 Key Highlights

### 1. Entity Evidence Filtering

- **Local Document Search**: Added a search filter within the Entity Modal to quickly find specific documents by title or content.
- **Improved Sorting**: Verified default sorting prioritizes highly flagged documents (Red Flag Index) followed by mention count.

### 2. Mobile Search Fix

- **Search Input Layout**: Increased left padding in the search bar to prevent the search icon from overlapping with the placeholder text on some mobile devices.

### 3. Mobile UI Improvements

- **Optimized Investigation Button**: Replaced the "New Investigation" button text with a clean "+" icon on mobile devices to save screen space while maintaining accessibility.

### 4. Navigation Sidebar Fixes

- **Sidebar Icons**: Fixed issue where sidebar icons appeared too small when the sidebar was collapsed. Icons now maintain proper sizing and visibility in all states.

---

# 🚀 Epstein Archive: Production Release Notes (v3.9.0)

**December 1, 2025**

We have deployed a comprehensive update focusing on entity type icon improvements, UI enhancements, and bug fixes based on user feedback.

## 🌟 Key Highlights

### 1. Entity Type Icon Improvements

- **Differentiated Entity Icons**: Implemented distinct icons for each entity type (Person, Organization, Location, Document, etc.) to improve visual recognition
- **Custom Dropdown Component**: Created a new EntityTypeFilter component with icon support for the entity type filter dropdown
- **Centralized Icon Mapping**: Refactored PersonCard and PersonCardRefined components to use the centralized entityTypeIcons utility for consistency

### 2. UI Enhancements

- **Improved Visual Hierarchy**: Enhanced card layouts with better spacing and typography
- **Consistent Iconography**: Standardized all icon usage through the Icon wrapper component
- **Accessibility Improvements**: Added proper ARIA attributes and screen reader support

### 3. Performance & Stability

- **Optimized Rendering**: Improved component rendering performance with memoization
- **Bug Fixes**: Resolved several minor UI bugs and edge cases

## 📊 Technical Stats

- **Build Size:** ~1.5MB (gzipped: ~400KB)
- **Modules Transformed:** 2,413
- **Build Time:** ~4 seconds

---

# 🚀 Epstein Archive: Production Release Notes (v3.8.0)

**November 30, 2025**

We have deployed a comprehensive update focusing on performance improvements, navigation enhancements, and bug fixes based on user feedback.

## 🌟 Key Highlights

### 1. Performance & Loading Improvements

- **Single Chip Loading Indicator**: Consolidated loading indicators into a single compact chip with integrated progress bar for better UI clarity
- **Optimized Data Fetching**: Improved database queries and caching mechanisms for faster data retrieval
- **Virtualized Lists**: Implemented virtual scrolling for large datasets to reduce memory consumption

### 2. Navigation & UI Enhancements

- **Mobile Menu Verification**: Ensured all mobile menu buttons correctly navigate to their intended sections
- **Database Schema Fixes**: Resolved issues with importance_score column and entity_summary view
- **Provider Nesting Corrections**: Fixed component hierarchy issues in the main application structure

### 3. Component Improvements

- **LoadingPill Component**: Redesigned with horizontal layout, compact progress bar, and improved accessibility
- **AddToInvestigationButton**: Added quick-add functionality to Document and Media cards for streamlined workflow
- **Error Boundary Implementation**: Enhanced error handling with scoped boundaries for critical components

### 4. Backend & Infrastructure

- **Schema Validation**: Added comprehensive database schema validation and correction scripts
- **Build Process Optimization**: Streamlined build process with improved error handling
- **Dependency Updates**: Updated core dependencies for better stability and security

## 📊 Technical Stats

- **Build Size:** ~1.5MB (gzipped: ~400KB)
- **Modules Transformed:** 2,413
- **Build Time:** ~4 seconds

---

# 🚀 Epstein Archive: Production Release Notes (v3.7.0)

**November 29, 2025**

We have deployed a comprehensive update focusing on navigation improvements, streamlined workflows, and enhanced user experience across all components.

## 🌟 Key Highlights

### 1. Navigation & Workflow Enhancements

- **Contextual Deep Links**: Added direct "View related docs" and "Open network" links on cards and modals for faster navigation
- **Consistent Breadcrumbs**: Implemented breadcrumbs across all pages for better orientation and quick context switching
- **Unified Global Search**: Created sticky global search that filters current view with typed suggestions
- **Streamlined Investigation Linking**: One-click "Quick Add" buttons on all card types (Person, Document, Media) to instantly add items to investigations

### 2. Feedback & Loading Improvements

- **Background Task Notifications**: Added lightweight toast notifications for background tasks (enrich/reindex/import) with start/success/failure states and retry options
- **Optimistic UI Feedback**: Implemented spinners and disabled states for actions like "Open Document" and "Add to Investigation" during processing
- **Progressive Loading**: Added virtual scrolling and page indicators for large lists (People/Media/Docs) to reduce perceived wait times

### 3. Error Handling & Resilience

- **Scoped Error Boundaries**: Implemented route-level error boundaries for Analytics, Media, and EvidenceModal components to localize failures
- **Tailored Error Fallbacks**: Added specific fallbacks for common failure modes (no docs for entity, API unavailable) with helpful next steps and one-click retry

### 4. Consistency & Visual Improvements

- **Icon Standardization**: Standardized all icon usage through the Icon wrapper component for consistency and easier theming
- **Card Layout Unification**: Unified spacing, typography scales, and badge styles across Person, Document, and Media cards for cohesive experience
- **Risk Badge Consolidation**: Consolidated risk badges and Red Flag Index into a single semantic component with consistent color scale and labels

### 5. Accessibility Enhancements

- **Modal Focus Management**: Expanded focus management in modals with trap and restore focus functionality
- **Color-Blind Friendly Risk States**: Replaced purely color-coded risk states with text labels and icons for better accessibility
- **Improved Contrast**: Verified contrast ratios on dark backgrounds for better readability

### 6. Discoverability & Onboarding

- **First-Run Onboarding**: Implemented guided onboarding to highlight power features (filters, risk chips, adding evidence to investigations)
- **Contextual Microcopy**: Added explanatory text under analytics charts and in Evidence modal sections to clarify what users are seeing

### 7. Performance Optimizations

- **Data Loading Strategies**: Implemented server-side streaming/pagination and client-side caching with prefetch for heavy endpoints
- **Computation Optimization**: Added memoization for expensive list item computations and deferred parsing/highlighting to web workers

### 8. Information Architecture Improvements

- **Media View Persistence**: Implemented localStorage persistence for media view settings, filters, and selections with quick reset option
- **Investigation Linking Flow**: Simplified evidence linking from cards with direct one-click addition to investigations

## 📊 Technical Stats

- **Build Size:** ~1.5MB (gzipped: ~400KB)
- **Modules Transformed:** 2,413
- **Build Time:** ~4 seconds

---

# 🚀 Epstein Archive: Production Release Notes (v3.6.0)

**November 28, 2025**

We have deployed a comprehensive update focusing on UI enhancements, improved accessibility, and mobile responsiveness.

## 🌟 Key Highlights

### 1. Enhanced Header Buttons

- **Collapsible Icons**: Header buttons (What's New, Shortcuts, Verified Source) now collapse into round icons on desktop with smooth hover animations to show text labels
- **Improved Accessibility**: Added proper `aria-label` attributes and screen reader announcements for all header interactions
- **Smoother Animations**: Implemented transform-based transitions for better performance

### 2. Responsive Sort Label

- **Mobile Optimization**: Removed the word "by" in "Sort by:" on mobile devices to prevent overflow and layout issues
- **Consistent Experience**: Maintains clear functionality across all device sizes

### 3. Interactive Risk Filtering

- **Enhanced Visual Feedback**: Risk level chips (High/Medium/Low Risk) now properly filter entities with improved visual feedback
- **Active State Indicators**: Selected filters display with bright ring effects and enhanced shadows for clear identification

### 4. General UI Improvements

- **Search Icon**: Confirmed existing search icon implementation in the search box
- **Tooltip Effects**: Enhanced fade effects on tooltips with transition-opacity for smoother user experience

# 🚀 Epstein Archive: Production Release Notes (v2.4)

**November 27, 2025**

## 🌟 Key Highlights

### 1. Full Data Verification & Enrichment

- **Complete Entity Loading:** All entities load correctly with metadata
- **Media Verification:** All images and documents are accessible and loading properly
- **Risk/Red Flag Analysis:** Complete risk scoring across all entities
- **Relationship Mapping:** Enriched relationship data with connections between entities

### 2. Build & Infrastructure Fixes

- **Fixed PDF Viewer:** Corrected CSS import paths for react-pdf components
- **Production Build:** Clean build with no errors
- **Optimized Bundle:** Efficient code splitting for faster load times

### 3. UI Improvements

- **Document Metadata Panel:** Enhanced professional metadata display
- **Evidence Search:** Improved search and filtering capabilities
- **Investigation Workspace:** Streamlined workspace for analysis

### 4. Production Deployment

- **End-to-End Verification:** Complete testing of all features
- **Database Integrity:** Verified data consistency and indexing
- **API Performance:** Optimized endpoints for faster responses

## 📊 Technical Stats

- **Build Size:** ~1.5MB (gzipped: ~400KB)
- **Modules Transformed:** 2,413
- **Build Time:** ~4 seconds

---

# 🚀 Epstein Archive: Production Release Notes (v2.3)

**November 27, 2025**

## 🌟 Key Highlights

### 1. Streamlined Navigation

- **Removed Redundant Sidebar:** Eliminated the duplicate left navigation menu for a cleaner, more spacious layout.
- **More Content Space:** Removal of the sidebar provides additional horizontal space for the main content area.
- **Simplified UX:** Users now have a single, clear navigation system via the top tabs.

### 2. Interactive Risk Level Filters

- **Clickable Statistics Chips:** The High Risk, Medium Risk, and Low Risk statistics are now interactive filter buttons.
- **Visual Feedback:** Active filters display with bright ring effects and enhanced shadows for clear indication.
- **Toggle Behavior:** Click a chip to filter by that risk level; click again to deselect and return to unfiltered view.
- **Seamless Integration:** Risk filters work in combination with existing search, entity type, and sort filters.
- **Maintained Sort Order:** Filtering preserves the current sort order for consistent results.

## 📊 User Experience Improvements

- **Cleaner Layout:** Removed visual clutter from duplicate navigation
- **Faster Filtering:** One-click access to risk level filtering
- **Better Visual Hierarchy:** Clear indication of active filters with ring effects

---

# 🚀 Epstein Archive: Production Release Notes (v2.2)

**November 26, 2025**

We have successfully deployed a major update focusing on mobile user experience and accessibility.

## 🌟 Key Highlights

### 1. Mobile UX Overhaul

We've completely redesigned the mobile experience to be more intuitive and touch-friendly.

- **Compact Stats Display:** Key metrics (Subjects, Risk Levels) are now displayed in a compact, single-row layout on all devices.
- **Enhanced Mobile Menu:** Added a dedicated "Home" link, larger touch targets (44px+), and swipe-to-close gestures.
- **Mobile Stats Row:** Restored visibility of critical statistics (Subjects, Files) on mobile screens.
- **Visual Feedback:** Added tactile feedback (active states) to all interactive elements for a more responsive feel.

### 2. Accessibility Improvements

- **Touch Targets:** Optimized button sizes for easier tapping on small screens.
- **Navigation:** Improved menu accessibility and structure.

---

# 🚀 Epstein Archive: Production Release Notes (v2.0)

**November 25, 2025**

We have successfully deployed a major update to the Epstein Archive, focusing on data integrity, relationship mapping, and user experience enhancements. This release transforms the archive from a simple document repository into a sophisticated investigative tool.

## 🌟 Key Highlights

### 1. Massive Entity Consolidation

We've cleaned up the database by merging duplicate and fragmented entities, resulting in a cleaner, more accurate dataset.

- **Merged 1,484 duplicate entities** across 3 phases.
- **Phase 1 (Exact Matches):** Merged 1,249 entities (e.g., "Bill Clinton" + "William Clinton").
- **Phase 2 (Title Normalization):** Merged 133 entities by stripping titles (e.g., "President Clinton" -> "Bill Clinton").
- **Phase 3 (Nickname Resolution):** Merged 101 entities using a nickname dictionary (e.g., "Bill" -> "William").
- **Result:** Reduced total entity count from ~48,675 to **47,191 unique, high-quality entities**.

### 2. Advanced Relationship Mapping

We've implemented a new engine to discover and visualize connections between entities.

- **Co-occurrence Analysis:** Generated **208,207 relationship links** based on entities appearing in the same documents.
- **Contextual Awareness:** Links are weighted by proximity and document relevance.
- **Foundation for Network Graph:** This data powers the upcoming interactive network visualization.

### 3. Entity Importance Scoring

We've introduced a sophisticated scoring system to surface the most relevant figures.

- **Importance Score:** Calculated for all **47,191 entities** based on:
  - Mention frequency
  - Network centrality (number of connections)
  - "Red Flag" rating
  - Presence in the Black Book
- **Smart Sorting:** Default sorting now prioritizes high-importance entities, ensuring users see key figures first.

### 4. Enhanced Filtering & UI

We've refined the user interface to make data exploration more intuitive.

- **Entity Type Filter:** New dropdown to filter by **Person (40,887)**, **Organization (4,351)**, **Location (1,448)**, etc.
- **"Red Flag" Terminology:** Replaced all "Spice" references with professional "Red Flag" terminology (🚩) throughout the app.
- **Improved Search:** Search results now leverage the consolidated data for better accuracy.

### 5. Infrastructure Hardening

- **Database Optimization:** Added indexes and views for faster query performance.
- **Robust Deployment:** Implemented a secure, automated deployment pipeline.
- **Data Integrity:** Fixed database corruption issues and implemented backup procedures.

## 📊 Impact by the Numbers

- **Entities:** 47,191 (Optimized)
- **Relationships:** 208,207 (New)
- **Persons:** 40,887
- **Organizations:** 4,351
- **Merges Performed:** 1,484

## 🔜 What's Next

- **Interactive Network Graph:** Visualizing the 208k relationships.
- **Timeline Analysis:** Deep dive into temporal connections.
- **AI-Powered Summaries:** Auto-generating bios for key figures.
