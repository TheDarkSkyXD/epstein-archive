# Changelog

## [13.2.0] - 2026-02-13

### Performance

- Optimized Analytics page load time by reducing subquery scans (8→3 table scans).
- Implemented `node-cache` middleware for API response caching.
- Integrated Exo cluster (3-node) for distributed AI enrichment.
- Tuned ingest pipeline concurrency and batch processing for high-throughput cluster utilization.

### UI/UX

- Replaced "OBJ" text with color-coded badges and tooltips in flag ratings.
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

## [13.1.7] - 2026-02-13

### Added

- Implemented justice.gov URL routing to support legacy links (e.g., /epstein/files/\*).
- Enhanced document path resolution with filename fallback.

## [13.1.6] - 2026-02-12

### Fixed

- Fixed production 502 errors by ensuring correct port configuration (3012).
- Resolved database locking issues during ingestion pipeline execution.
- Fixed "NO entity cards" issue by restoring database connectivity.
- Optimized ingestion pipeline to use Exo cluster with 50 workers.

### Added

- Added `CHANGELOG.md` to track release history.
- Added database snapshot for production safety.
