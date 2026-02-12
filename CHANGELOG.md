# Changelog

## [13.1.6] - 2026-02-12

### Fixed

- Fixed production 502 errors by ensuring correct port configuration (3012).
- Resolved database locking issues during ingestion pipeline execution.
- Fixed "NO entity cards" issue by restoring database connectivity.
- Optimized ingestion pipeline to use Exo cluster with 50 workers.

### Added

- Added `CHANGELOG.md` to track release history.
- Added database snapshot for production safety.
