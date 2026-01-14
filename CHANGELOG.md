# Changelog

All notable changes to this project will be documented in this file. The format is based on Keep a Changelog, and this project adheres to Semantic Versioning.

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
