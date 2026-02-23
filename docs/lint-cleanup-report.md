# Lint Cleanup Report

## Summary

Completed a comprehensive pass to eliminate ESLint warnings and TypeScript errors across the codebase.
The focus was on removing unused variables, fixing React Hook dependencies, and ensuring React Fast Refresh compliance by separating hooks from components.

## Changes

### Client Side

- **src/client/contexts/DegradedModeContext.tsx**:
  - Removed unused `DegradedModeState` import.
  - Moved `useDegradedMode` hook to `src/client/contexts/useDegradedMode.ts` to resolve `react-refresh/only-export-components` warning.
- **src/client/contexts/FilterContext.tsx**:
  - Moved `useFilters` hook to `src/client/contexts/useFilters.ts` to resolve `react-refresh/only-export-components` warning.
- **src/client/components/documents/DocumentContentRenderer.tsx**: Removed unused `apiClient` import.
- **src/client/components/entities/EntityGraphPanel.tsx**: Removed unused `idx` parameter.
- **src/client/App.tsx**: Updated imports for `useFilters`.
- **src/client/components/pages/EnhancedAnalytics.tsx**: Updated imports for `useFilters`.
- **src/client/components/shared/DegradedBanner.tsx**: Updated imports for `useDegradedMode`.

### Server Side

- **src/server/db/routesDb.ts**:
  - Replaced legacy `db` import with `getApiPool()`.
  - Removed unused `EmailThreadRow` interface.
- **src/server/routes/emails-optimized.ts**: Removed unused `offset` variable.
- **src/server/services/MediaService.ts**: Renamed unused caught error to `_error`.
- **src/server/services/matViewRefresh.ts**: Renamed unused caught error to `_concErr`.
- **src/server/routes/entityEvidenceRoutes.ts**: Removed unused `search`, `source`, `sort` variables.
- **src/server/routes/investigations.ts**: Removed unused `scope`, `collaboratorIds` variables.
- **src/server/db/documentsRepository.ts**, **entitiesRepository.ts**, **evidenceRepository.ts**, **investigationsRepository.ts**:
  - Refactored to use `getApiPool()`.
  - Fixed TypeScript errors related to `pgtyped` query types using `any` casting where necessary for transition.

## Verification

- `pnpm lint` passes with 0 errors and 0 warnings.
- `pnpm type-check` passes with 0 errors.

## Post-Clean Update (Scorched Earth Migration)

- **Removed SQLite**: Completely removed `better-sqlite3` dependency, all `sqlite` related scripts, and documentation references.
- **Updated `deploy.sh`**: Removed legacy SQLite cleanup steps.
- **Updated `connection.ts`**: Removed `better-sqlite3` imports and `DB_DIALECT` checks. Now strictly enforces `postgres://` URL.
- **Updated `package.json`**: Removed `better-sqlite3` from dependencies.
