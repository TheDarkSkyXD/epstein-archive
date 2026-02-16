# Investigations module fix notes

## Date

2026-02-16

## Scope

Top-to-bottom fixes for Investigations reliability, including board lock-up, case-folder evidence click wiring, notebook persistence/editing, and full tab integrity pass (timeline, communications, forensic, team, analytics, export).

## Inventory and verification checklist

Entrypoints/components audited:

- `InvestigationWorkspace`
- `InvestigationBoard`
- `InvestigationCaseFolder`
- `EvidenceNotebook`
- `InvestigationTimelineBuilder`
- `CommunicationAnalysis`
- `ForensicAnalysisWorkspace`
- `InvestigationTeamManagement`
- `InvestigationExportTools`
- `InvestigationActivityFeed`
- `DocumentModal` / `EvidenceModal`

Investigations API/repository audited:

- `src/server/routes/investigations.ts`
- `src/server/db/investigationsRepository.ts`
- `src/services/apiClient.ts`

Checklist status:

- Board loads: fixed with shell-first progressive hydration
- Existing investigations list loads: verified
- Creating/opening case: verified
- Adding evidence: verified
- Clicking evidence opens meaningful target: fixed
- Notebook load/edit/save/reload: fixed
- Timeline drag/drop dead affordance: fixed (persisted)
- Timeline keyboard alternative: fixed (move up/down)
- Timeline click opens source context: fixed
- Communications action: fixed (real local analysis + explicit gating)
- Forensic confidence chips: fixed (derived + auditable semantics)
- Team model clarity: fixed (explicit local-device model)
- Analytics layout/functionality: rebuilt to progressive 3-section flow
- Export UX long-column confusion: fixed with step-based flow
- Dead buttons/fake actions: removed or gated with explicit reasons

## Root causes

1. Board lock-up

- Eager full hydration + large list rendering before shell visibility.
- Missing progressive boundaries for heavy loads.

2. Broken interaction contracts

- Evidence and timeline interactions lacked robust target resolution.
- Timeline drag had no persistence path.

3. Notebook instability

- Save/load effect churn and non-resilient write path.

4. Tab-level reliability gaps

- Team invite path called non-existent backend route.
- Forensic confidence was hardcoded and unauditable.
- Export/publish used simulated actions.
- Analytics mixed dense graph UI with weak investigative hierarchy.

## What changed

### Server/API

- Added `GET /api/investigations/:id/board` for lightweight board snapshot (additive).
- Added optional pagination to `GET /api/investigations/:id/evidence` with `limit`/`offset` (backward compatible).
- Added target inference fields to case-folder evidence payload (`target_type`, `target_id`, etc.) (additive).
- Kept notebook persistence contract additive/stable (`GET/PUT /api/investigations/:id/notebook`).

### Frontend

- `InvestigationBoard`
- Progressive shell render and deferred hydration.
- Perf monitor marks around board fetch/hydration/visible phases.
- Evidence/hypothesis list virtualization and paged loading.

- `InvestigationWorkspace`
- Timeline payload normalization (`startDate`, `documents`, `entities`) to avoid silent shape drift.
- Timeline source-opening wiring to existing modals/routes.
- Analytics rebuilt:
  - Section 1: KPI overview
  - Section 2: trends (evidence over time + source activity + spikes)
  - Section 3: network/signals (risk entities, strongest connections, cited docs)
- Analytics controls added: range, source-type filter, include/exclude agentic.
- Progressive loading states and stable skeleton/fallback blocks.
- Collapsed left navigation clipping/overflow protections retained.

- `InvestigationTimelineBuilder`
- Drag/drop now persists through existing timeline update route.
- Added keyboard-accessible move up/down controls.
- Added explicit “open linked source” action and card click handling.
- Added saved/failure toasts for reorder persistence.

- `CommunicationAnalysis`
- “Start communication analysis” now uses a real preflight:
  - entity IDs from investigation evidence (including case-folder evidence-by-type)
  - real communication fetch via existing entity communications API
- Added explicit empty-state gating with alternative action (`Open Case Folder`).
- Removed dead modal action and replaced with actionable navigation.

- `ForensicAnalysisWorkspace`
- Replaced hardcoded confidence with derived confidence model:
  - Coverage (40%)
  - Signal quality (25%)
  - Corroboration (25%)
  - Model certainty (10%)
- Confidence chips now show `N/A` when count is zero.
- Tool status added: `Not run`, `Running`, `Complete`, `Needs input`.
- Added “What does confidence mean?” explainability panel.
- Tool cards now include input requirements + run/view actions.
- “Export All” replaced with real backend briefing export action.

- `InvestigationTeamManagement`
- Removed fake invite endpoint flow.
- Implemented explicit local-device team profile model with banner:
  - “Local to this device”
  - JSON export/import for portability
- Added role editor, remove actions, and access/role matrix panel.
- Terminology aligned away from implied server accounts.

- `InvestigationExportTools`
- Rebuilt as step-based flow:
  1. Choose output type
  2. Configure sections/redaction/audit trail
  3. Preview (outline + estimated size)
  4. Generate
- Real generation paths:
  - Backend briefing export (`/api/investigations/:id/briefing`)
  - CSV evidence export
  - JSON timeline export
- Unsupported output now clearly gated (“Not available yet”) with reason.
- Generation metadata displayed: checksum, generated_at, version.

- `EvidenceNotebook` and annotation sync
- Markdown-oriented note editing, persistence, and conflict-safe autosave.
- Evidence annotations synchronized into notebook notes view.

## Performance notes

- Board visible shell: immediate on board route entry (before deep hydration).
- Board interactivity: hydration chunked/deferred to avoid long main-thread stalls.
- Hot-path payloads remain lightweight via board snapshot and evidence paging.
- Analytics now loads overview first and avoids one-shot heavy rendering.

## Validation

Executed:

- `npm run -s type-check` ✅
- `npm run -s lint` ✅
- `npm run -s test:smoke` ✅

Verify command:

- `npm run verify` started successfully and passed early credibility/integrity checks, then entered backup compression step (long-running in this repo) and was manually stopped.

## Primary files touched in this pass

- `src/components/investigation/InvestigationWorkspace.tsx`
- `src/components/investigation/InvestigationTimelineBuilder.tsx`
- `src/components/investigation/CommunicationAnalysis.tsx`
- `src/components/investigation/ForensicAnalysisWorkspace.tsx`
- `src/components/investigation/InvestigationTeamManagement.tsx`
- `src/components/investigation/InvestigationExportTools.tsx`
- `investigations_fix_notes.md`

Previously touched in related fixes:

- `src/components/investigation/InvestigationBoard.tsx`
- `src/components/investigation/InvestigationCaseFolder.tsx`
- `src/components/investigation/EvidenceNotebook.tsx`
- `src/components/documents/EvidenceAnnotation.tsx`
- `src/server/routes/investigations.ts`
- `src/server/db/investigationsRepository.ts`
- `src/services/apiClient.ts`
- `tests/investigation-casefolder.spec.ts`
