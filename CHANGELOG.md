# Changelog

All notable changes to this project will be documented in this file. The format is based on Keep a Changelog, and this project adheres to Semantic Versioning.

## 12.0.0 — 2026-02-02

### Massive Department of Justice (DOJ) Archive Consolidation
- **Archive Expansion**: Successfully integrated and consolidated DOJ datasets 10, 11, and 12, adding tens of thousands of pages of previously fragmented evidence into the centralized corpus.
- **Unified Discovery Structure**: Standardized the organizational structure for DOJ materials, ensuring seamless cross-referencing and data integrity across all discovery volumes.

### Advanced Forensic Analysis Workspace
- **Forensic Investigation Suite**: Launched a full-spectrum analytical dashboard designed for complex investigative workflows:
  - **Financial Transaction Mapper**: Visualizes financial flows between entities, highlighting offshore transfers, potential layering, and high-risk transactions.
  - **Multi-Source Correlation Engine**: Cross-references entity mentions across the entire archive to verify facts and surface hidden connections.
  - **Forensic Report Generator**: Automated generation of comprehensive investigative summaries, supported by algorithmic authenticity scoring.
- **Evidence Integrity & Chain of Custody**: Introduced a verifiable provenance tracking system. Documents now maintain cryptographic SHA-256 integrity hashes and chronological logs of every analytical action or validation step.

### Backend Investigative Intelligence
- **Advanced Analytics Engine**: New intelligence layer providing automated investigative insights:
  - **Pattern Recognition**: Detects recurring entity co-occurrences and behavioral patterns across documents.
  - **Anomaly Detection**: Highlights high-risk materials based on unusual network connectivity or metadata inconsistencies.
  - **Predictive Risk Assessment**: Quantitatively scores entities based on their role, associations, and presence in red-flagged documents.
- **Content-Aware Forensic Analysis**: Upgraded the analysis engine to perform deep-text scanning for sensitive keywords and investigative signals, replacing randomized scoring with verifiable analytical metrics.

### Unified Intelligent Pipeline
- **Evidence-First Architecture**: Refined the ingestion pipeline to prioritize the connection between extracted people, places, and events and their specific supporting evidence within the archive.
- **Deep Semantic Extraction**: Enhanced the ability to identify the precise nature and strength of relationships between entities, providing a more navigable social graph.

---

## 11.1.0 — 2026-02-01

- Automated Data Retrieval Enhancements
  - **Dataset 9 Acquisition**: Successfully implemented automated retrieval for over 12,000 documents from high-security disclosure sources.
  - **Secure Pipeline Upgrades**: Enhanced the ingestion system to handle complex authentication and multi-page document sources seamlessly.
  - **Corpus Expansion**: Fully ingested and indexed the 12,000+ new files from Dataset 9, including advanced text and metadata extraction.

- Flight log expansion
  - Expanded from 29 to 110 documented flights (1995-2005) with 305 passenger records.
  - Added multi-aircraft support: N212JE Gulfstream II alongside N908JE Boeing 727.
  - New analytics endpoints: passenger co-occurrences, frequent routes, date ranges, aircraft stats.
  - Co-passenger API: `/api/flights/co-occurrences` and `/api/flights/co-passengers/:name` for network analysis.
- Palm Beach property browser
  - Ingested 9,535 House Oversight Committee property records from CSV.
  - Auto-flagged 27 known associate properties (Epstein, Trump, Wexner, Dubin families).
  - Full property API with filtering, stats, value distributions via `/api/properties/*`.
  - Cross-reference capability with entity database.
- Open Graph metadata
  - Comprehensive OG tags for all routes enabling rich social media previews.
  - Dynamic previews for entity profiles showing name, role, and risk rating.
  - Search-aware link previews include query context.
- Articles tab enhancements
  - Added original Substack investigative articles.
  - Reordered Media sub-navigation (Articles tab moved to end).

## 10.12.1 — 2026-01-20

- Communications surfacing in UI
  - Embedded `EntityEvidencePanel` (including communications data) into the main person profile `EvidenceModal`, so each entity now shows relationship evidence and recent email communications directly alongside documents and spicy passages.
  - Extended `DocumentModal` with email thread context: a header bar summarizing thread size and participants, plus a right-hand sidebar listing all messages in the thread with subjects, dates, participants, and topics; clicking a message opens its email in the same viewer.
  - Added a dedicated **Communications** tab to `InvestigationWorkspace`, mounting `CommunicationAnalysis` to provide investigation-level communication pattern analysis next to the existing Evidence, Timeline, and Network views.
- System Reliability & Performance
  - Comprehensive quality audit performed across all investigative modules.
  - Optimized production build for faster load times and enhanced profile responsiveness.
  - Deployed stable release 10.12.1 to production.

## 10.12.0 — 2026-01-19

- Email communications intelligence layer
  - Added `communicationsRepository` to derive per-entity communication events from `entity_mentions` and `documents` with `evidence_type = 'email'`, normalizing `from`, `to`, `cc`, subject, date, and thread id.
  - Introduced `/api/entities/:id/communications` for topic- and time-filtered views of who an entity is emailing, and `/api/documents/:id/thread` for full thread context around any email document.
  - Implemented a rule-based topic classifier over email subjects and bodies (e.g. `flight_logistics`, `financial_transfers`, `legal_strategy`, `victims_handling`, `public_relations`, `scheduling`, `misc`) to power future analytics and UI overlays.
- System Stability & Accuracy
  - Resolved core data processing inconsistencies to ensure 100% accurate entity reporting.
  - Enhanced API testing suite to verify production data integrity under load.

## 10.10.0 — 2026-01-18

- Unredacted corpus quality pass
  - Ran the full unified ingestion pipeline (including `unredact.py`) across DOJ Discovery VOL00001–VOL00008, Court Case Evidence, Maxwell Proffer, and DOJ Phase 1, reprocessing 14,718 source files into a stable set of 51,380 documents.
  - Confirmed end-to-end success (0 skipped, 0 errors) with 3,233,072 relationships recomputed in the intelligence pipeline.
- Redaction/unredaction transparency
  - Extended About page copy to explain which collections are effectively unredacted (e.g. Vol 1 FBI raid evidence, Black Book, Flight Logs) vs. partially or heavily redacted DOJ volumes.
  - Highlighted that unredaction is now applied automatically during ingest where safe, with fallbacks that preserve original PDFs and annotate failures.
- Dataset quality framing
  - Updated About copy to emphasize the step-change in data quality compared to the “chaotic archive” baseline—structured entities, 51k+ documents, and a 3.2M-edge relationship graph backed by the latest pipeline.

## 10.9.1 — 2026-01-17

- Transcript search UX polish
  - Audio Player now highlights the searched text inline in both the sidebar transcript and the full transcript overlay.
  - While a transcript search is active, automatic scroll-follow is temporarily paused so investigators can stay anchored on their search context; it resumes once the search is cleared.
- Audio browser alignment
  - Audio Browser cards now use a 3-column layout by default on desktop (mirroring the Video Browser density) with taller cards that comfortably fit multiple transcript snippets.
  - Transcript match previews under each audio item now inline-highlight the query text and reserve space for at least two to three lines of context.
- Entity evidence substrate
  - Added `entityEvidenceRepository` and `/api/entities/:id/evidence` + `/api/entities/:id/relations` endpoints to expose mention-based entity evidence and relation evidence to the UI.

## 10.9.0 — 2026-01-17

- Unredacted document ingestion
  - Wired `scripts/unredact.py/src/unredact.py` into the unified ingestion pipeline so PDFs are pre-processed to remove vector/image redaction overlays before OCR, while safely falling back to originals on any error.
  - Keeps original files and redaction metadata intact so downstream spans and entities can be traced back to both redacted and unredacted variants.
- Transcript timecode links
  - Audio and Video players now generate share links that include both the media id and precise timecode (`?id=…&t=…`), allowing deep-links to any moment in a recording.
  - Audio Browser transcript search surfaces matching segments with timecodes under each result, enabling one-click jumps to the relevant point in the player.
- Deployment Capabilities
  - Standardized production deployment workflows for multi-region scalability.
  - Optimized record-keeping for all system-wide updates and versioning.

## 10.8.0 — 2026-01-17

- Katie Johnson video evidence
  - Added **Katie Johnson Complaint** album under Video, ingesting all deposition clips and aligning them as verified, high red-flag media items.
  - Whisper-generated transcripts stored in `metadata_json` and wired into the Video tab so playback includes structured transcript segments.
- Transcript search & navigation
  - Audio & Video browsers now support **transcript text search**, optionally scoped to the selected album (via `transcriptQuery` on `/api/media/audio` and `/api/media/video`).
  - In-player transcript panes and full-screen overlays gained **search boxes with hit counters** and next/previous match controls, keeping audio/video and scroll position in sync.
  - Keyboard shortcuts: `/` focuses the transcript search box; `n` / `Shift+n` (or `N`) jump to next/previous match.
- Media viewer robustness
  - Photo, audio, and video viewers are now rendered at a very high z-index so they always appear **above the global footer and layout chrome**.
  - Fixed layering issues where the footer could overlap the Video player on some viewports.
- Image backend hardening
  - `/api/media/images` and `MediaService` made schema-aware to cope with older production databases, preventing 500s and ensuring Photos load reliably in production.

## 10.4.0 — 2026-01-15

- Media UX improvements
  - Audio: slideshow alternates JPG/WEBP covers; EQ more responsive with smooth decay.
  - Transcript: auto-center with idle snapback; click-to-seek; windowed rendering for performance.
  - Video: added “Read Full Transcript” overlay with play/pause and click-to-seek.
  - Global totals for Audio/Video show stable counts, not page-bound values.
- Photos continuous scrolling
  - Infinite scroll via IntersectionObserver; idle prefetch for next page.
- Zero-404 images
  - Introduced resilient /api/static file resolver.
  - Tiles/slideshow auto-switch JPG↔WEBP; fallback to transparent pixel on error.
- Album covers ingestion
  - Both JPG and WEBP covers ingested as separate images.
  - Fuzzy cover mapping for audio items: filename base, folder segment, or album name to pick best image.
- Reliability
  - Deployment script hardened: backups, health checks, rollback path.

## 10.3.x — 2026-01-13

- Initial media browsing with transcripts and chapters
- Photo browser performance and global totals

## 10.5.0 — 2026-01-15

- Audio routing fix
  - Media landing respects audio params; routes to Audio tab directly to avoid error screens.
- Quickstart and CTA
  - Front-page “Listen Now” opens Sascha album and auto-plays first recording.
  - CTA includes “Open Investigation” linking to the Sascha investigation.
- Investigation seeding
  - New “Sascha Barros Testimony” investigation created; links testimony audio and top related documents.
  - Deployment runs the investigation seed automatically.
