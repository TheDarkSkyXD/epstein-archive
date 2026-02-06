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
