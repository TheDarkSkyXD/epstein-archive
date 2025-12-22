# Release Notes v8.1.0

## 🇦🇺 UI Localization
- **Complete Localization to Australian English**: Localized all user-facing text across the application from US English (e.g., "analyze", "center") to Australian English (e.g., "analyse", "centre").
- Specific updates in:
  - `AboutPage.tsx`
  - `ForensicReportGenerator.tsx`
  - `About.tsx`
  - `MultiSourceCorrelationEngine.tsx`
  - `DocumentUploader.tsx`

## ⏳ Timeline Overhaul
- **Curated Historical Events**: Transformed the Timeline from a simple document list to a curated experience featuring key historical events (e.g., "Epstein Arrest", "Plea Deal").
- **New Feature**: Added `global_timeline_events` table and seeded it with 14 verified historical milestones.
- **Enhanced UI**: Curated "KEY EVENTS" are visually highlighted with distinct styling.
- **Improved Source Linking**: The "Open" button in the Timeline now correctly links directly to the **original PDF document**, fixing a previous issue where it linked to text indexes.

## 🧹 Maintenance
- **Repository Cleanup**: Removed unused scripts (`check_doj_counts.ts`, etc.) and temporary SQL dump files to reduce repository size and technical debt.
- **Dynamic "About" Stats**: Updated hardcoded statistics on the About page to pull live data from the database.
