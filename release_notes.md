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

## v11.3.8 — 2025-06-21

### Risk Assessment & UI Polish

- **Risk Assessment Regression**: Fixed a critical issue where high-risk individuals (including Jeffrey Epstein) were incorrectly displayed as "Low Risk" in the Analytics dashboard.
- **Media Browser**: Reduced image flickering during loading states.
- **Top Mentioned Individuals**: Improved filtering to exclude junk terms (e.g., "All Rights Reserved", "We Deliver For") from the top entities chart.
- **Dropdowns**: Standardized all dropdown menus with a new, premium-styled `Select` component.
