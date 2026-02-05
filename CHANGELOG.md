# Changelog

All notable changes to this project will be documented in this file. The format is based on Keep a Changelog, and this project adheres to Semantic Versioning.

## 12.7.4 — 2026-02-05

### Infrastructure

- **Storage Expansion**: Infrastructure scaled to 310GB to accommodate remaining DOJ datasets.
- **Ingestion Resumption**: Reactivated pipeline for Sets 9-11 (1.3M documents).

## 12.7.3 — 2026-02-05

### Infrastructure & Stability

- **Ingestion Pipeline Repair**: Resolved `SqliteError` crashes by adding schema checks for `claim_triples`, `document_sentences` and `document_pages`.
- **System Restoration**: Successfully restarted core ingestion (`ingest_pipeline.ts`) and analysis (`ingest_intelligence.ts`) services.

### Content

- **About Page Update**: Confirmed and documented completion of "Set 12" (202 files) in the project timeline.

## 12.7.2 — 2026-02-05

### Intelligence & Data Quality

- **Junk Entity Purge**: Implemented aggressive patterns in `entityFilters.ts` to block institutional footers and software artifacts (e.g., "All Rights Reserved", "Unsubscribe", "Font: Arial").
- **Institutional Memory Restoration**: Reconstructed `CHANGELOG.md` history back to **v3.0** (Nov 2025) using forensic git log analysis.
- **Top-Level Consolidation**: Merged "President Donald Trump" into the canonical **Donald Trump** entity in `vipRules.ts`.
- **OCR Artifact Detection**: Added heuristics to identify and hide mangled names (e.g., "Suark Ferrasl Niee") in analytics.

### UI Enhancements

- **Beautifully Clustered Radial Layout**: Re-engineered the network graph to use radial distribution and hub-directed forces centered on Jeffrey Epstein.
- **Visual Aesthetic Overhaul**:
  - Implemented node glowing and translucent edge rendering for a premium investigative look.
  - Synced component-level filters with global junk patterns.
- **Mobile Interactive Maps**:
  - **TreeMap Verticality**: Redesigned the Interactive Entity Map to automatically adjust for mobile viewports (portrait mode).
  - Increased label width (Y-Axis) in "Top Mentioned Individuals" graph to prevent truncation.

---

## 12.7.1 — 2026-02-04

### Intelligence & Risk Calibration

- **Dynamic Risk Scoring Engine**: Implemented an evidence-backed scoring algorithm (`recalculate_entity_risk.ts`) that recalibrates risk levels for all 82,000+ entities based on density, network links, and media.
- **VIP Entity Consolidation**:
  - "Trump, Doinac" (from the Black Book) now correctly resolves to **Donald Trump**.
  - "izmo" now correctly resolves to **Mark Epstein**.
  - "p daddy" now correctly resolves to **Sean "Diddy" Combs**.
- **Explainable Risk**: High-risk entities now display a "Signal Analysis" description.

## 12.7.0 — 2026-02-04

### Advanced Data Cleansing & MIME Repair

- **Contextual MIME Wildcard Repair**: Dictionary-based inference engine that treats `=` as an alphanumeric wildcard to repair corrupted text (e.g., `th=y` → `they`).
- **Robust Email Decoding**: Integrated the `quoted-printable` library for standard MIME artifacts.

## [12.6.1] - 2026-02-05

### Added

- **Social Previews**: Fixed dynamic `<title>` and OG tag injection for all routes. Added specific social preview images for About, Analytics, Timeline, and Flights pages.
- **Ingestion Dashboard**: Updated About page with real-time progress tracking for the massive 1.3M file DOJ ingestion.
- **Data Acquisition**: Verified and linked full DOJ datasets 9-11 (1.3M files) via symlinks.

### Changed

- **Performance**: Optimized `ingest_pipeline.ts` with WAL mode and busy timeouts for stability during heavy ingestion.
- **SEO**: Improved server-side rendering of metadata for better discovery on social platforms.

## 12.6.0 — 2026-02-04

### Entity UX Overhaul & Evidence Visibility

- **Entity Card Redesign**: Integrated profile photos and refined stats hierarchy.
- **Entity Modal Refresh**: Tabbed interface (Overview, Evidence, Media, Network) and "Spicy Passages" section for immediate textual evidence.

## 12.1.2 — 2026-02-03

### DOJ Datasets 9-12 Full Ingestion

- **13,455 Documents Ingested**: Successfully processed DOJ Datasets 9-12.
- **Intelligence Pipeline Enhancement**: Extracted 1.5M+ entity mentions.

## 12.1.1 — 2026-02-03

### Production Deployment & Infrastructure

- **Zero-Downtime Deployment Pipeline**: Unified `./scripts/deploy.sh` command.
- **TypeScript Build Hardening**: Resolved compilation errors in Express route handlers.

## 12.0.0 — 2026-02-02

### Massive Department of Justice (DOJ) Archive Consolidation

- **Role Inception, Relational Intent & FAQ System**: Major upgrade to intelligence extraction and help documentation.

## 11.0.0 — 2026-01-20

### Data Expansion & Analytics Upgrade

- **Communications Surfacing**: Embedded `EntityEvidencePanel` into profile modals.
- **Email Thread Context**: Extended `DocumentModal` to show full thread history for emails.

## 10.12.0 — 2026-01-19

### Email Intelligence Layer

- **communicationsRepository**: Deriving communication events from `entity_mentions`.
- **Topic Classifier**: Rule-based classification of email intents (financial, legal, flight logistics).

## 10.10.0 — 2026-01-18

### Unredacted Corpus Quality

- **Unified Pipeline Run**: Reprocessed 14k source files into 51k documents.
- **Redaction Transparency**: Enhanced About page to detail unredaction status per collection.

## 10.9.0 — 2026-01-17

### Unredacted Document Ingestion

- **unredact.py Integration**: PDFs pre-processed to remove redaction overlays before OCR.
- **Transcript Deep-Links**: Timecode-aware shareable URLs for audio/video media.

## 10.5.0 — 2026-01-15

### Media & Investigation Seeding

- **Sascha Barros Testimony**: Automated investigation seeding with real evidence.
- **Fuzzy Cover Mapping**: Filename-based album cover detection during ingest.

## 9.0.0 — 2025-12-31

### Side-by-Side Verification

- **Integrated PDF Viewer**: Dual-pane renderer for text vs. source source verification.
- **Institutional Memory**: Created docs/wiki.md and comprehensive technical reference.
- **44,000 Verified Entities**: OCR cleanup and aggressive normalization pass.

## 8.1.0 — 2025-12-22

### Timeline & Localization

- **Timeline Overhaul**: New interactive visualization for document chronology.
- **UI Localization**: Initial support for multi-region UI strings.

## 7.2.0 — 2025-12-17

### Deep Linking & Suggestions

- **Shareable Entity URLs**: (/entity/:id) deep linking support.
- **API Search Suggestions**: Predictive search for 45k+ entities.

## 7.0.0 — 2025-12-14

### Email Ingestion Expansion

- **Source Ingestion**: Added Ehud Barak and Jeeproject email caches.
- **Batch Editing**: Multi-select support in the Media Browser.

## 6.5.0 — 2025-12-13

### Investigation Workspace

- **URL Routing**: Investigations now support deep linking.
- **LocationMap**: Integrated mini-map for document location metadata.

## 4.2.0 — 2025-12-09

### Mobile UX Overhaul

- **Responsive Redesign**: Major CSS refactor (530+ lines) for mobile-first usability.
- **DocumentViewer Fixes**: Optimized modal layering for small viewports.

## 3.7.0 — 2025-12-06

### Workflow Navigation

- **Navigation Improvements**: Fixed provider nesting and added AddToInvestigation functionality.
- **Quick-Add Actions**: Direct integration into Document and Media cards.

## 3.0.0 — 2025-11-16

### Initial Core Systems

- **Document Processing**: Baseline OCR and entity extraction pipeline.
- **Base UI**: Initial search, document browser, and analysis tabs.
