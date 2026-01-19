# Changelog

All notable changes to this project will be documented in this file. The format is based on Keep a Changelog, and this project adheres to Semantic Versioning.

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
- Deployment ergonomics
  - Added `npm run deploy:prod` wrapper for `deploy-to-production.sh` to standardize prod deploys.
  - Codified the rule that version history (CHANGELOG, release notes, and user-facing history) must be updated on every production deploy.

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
