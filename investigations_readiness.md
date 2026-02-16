# Investigations readiness report

## Date

2026-02-16

## What was broken

- Timeline had draggable affordance without reliable persisted ordering semantics for user workflows.
- Communications tab had a CTA that could return no value with weak operator guidance.
- Forensic confidence chips were hardcoded and not auditable.
- Team tab implied real invitations/accounts but backend invite route was absent.
- Analytics tab mixed graph-heavy UI with weak investigative hierarchy and inconsistent progressive loading.
- Export tab layout was confusing and contained simulated/ambiguous actions.
- Deep links for investigation workflows were incomplete (`/investigate/case/...` variants).
- Evidence provenance visibility was inconsistent inside case-folder rows.

## Implemented vs gated

### Implemented

- Board/workspace progressive loading + deferred heavy work + virtualized/paged evidence lanes.
- Case folder evidence click routing to real viewers (document/entity/media) with focus return.
- Notebook markdown editing, debounced autosave, persistence, reload stability, annotation sync.
- Timeline drag/drop save path, keyboard move up/down controls, source-open action.
- Communications analysis preflight + real entity communication aggregation + alternative path to Case Folder.
- Forensic tool status model (`Not run`, `Running`, `Complete`, `Needs input`) with derived confidence:
  - Coverage (40%)
  - Signal quality (25%)
  - Corroboration (25%)
  - Model certainty (10%)
  - `N/A` when inputs are absent.
- Team model corrected to explicit local-device profiles with JSON import/export and role matrix.
- Analytics rebuilt to 3-section hierarchy:
  - Overview KPIs
  - Trends
  - Network/signals
    with filters and progressive loading.
- Export rebuilt to step-flow:
  - type -> configure -> preview -> generate
    with real artifacts (briefing markdown, evidence CSV, timeline JSON) and checksum metadata.
- Deep-link support expanded:
  - `/investigations/:id`
  - `/investigations/:id/evidence/:evidenceId`
  - `/investigate/case/:id`
  - `/investigate/case/:id/evidence/:evidenceId`
- Case-folder provenance surfaced per item (ingest run, ladder, confidence if available, agentic marker).
- Add-to-investigation flow now supports no-existing-case state (`Create Case + Add`) rather than silently disappearing.
- Dev-only invariant warning added for suspicious placeholder affordances not explicitly gated.
- Ship checklist extended with investigation placeholder-gating scan.

### Gated (explicit)

- Export `Case bundle (zip)` remains gated as “Not available yet” because no backend bundle generation route exists in this build; alternative actionable exports are provided (briefing markdown, CSV, timeline JSON).

## Verification steps (manual)

1. Open investigations dashboard and create a new case (title + scope).
2. Add items from document/entity/media/email/flight/property surfaces via `Add to Investigation`.
3. Open case folder, confirm each evidence row opens a real source viewer.
4. Validate provenance chips/lines (run id, ladder, confidence or `N/A`, agentic marker).
5. Open Timeline tab, drag/reorder items and use keyboard move controls; verify save feedback.
6. Open Communications tab, run analysis; if no entities linked, verify explicit guidance and Case Folder alternative action.
7. Open Forensic tab, confirm status and confidence explanation; run at least one tool and view output pane.
8. Open Notebook, edit markdown notes, wait autosave, reload and confirm persistence.
9. Open Team tab, verify local-device labeling, add profile, change role, export/import JSON.
10. Open Analytics tab, verify KPI first, then trends/signals; filters change output.
11. Open Export tab, complete step flow, generate artifact, verify metadata block.
12. Test deep links:

- `/investigate/case/<id>/evidence/<evidenceId>`
- `/investigations/<id>/evidence/<evidenceId>`

## Automated verification

- `npm run -s type-check` passed.
- `npm run -s lint` passed with warnings = 0.
- `npm run -s test:smoke` passed.
- `npm run verify` starts and passes credibility checks but enters long backup compression step in this repository; run was manually stopped after entering compression.

## Performance metrics (before/after)

### Before

- Board open path performed eager full-data hydration and heavy synchronous rendering.
- Perceived lock-up during board load on larger cases.

### After

- Shell-first board visibility with deferred hydration and virtualization/pagination.
- Lean board/list hot-path payloads retained.
- Local measurements from existing fix cycle:
  - `GET /api/investigations?page=1&limit=20`: 1334 bytes
  - `GET /api/investigations/4/board?evidenceLimit=80&hypothesisLimit=20`: 2023 bytes, 2.94ms
  - `GET /api/investigations/4/evidence-summary`: 2507 bytes, 1.67ms
  - `GET /api/investigations/4/evidence-by-type`: 8413 bytes, 4.72ms
  - `GET /api/investigations/4/notebook`: 66 bytes, 1.55ms

## Key changed files

- `/Users/veland/Downloads/Epstein Files/epstein-archive/src/components/investigation/InvestigationWorkspace.tsx`
- `/Users/veland/Downloads/Epstein Files/epstein-archive/src/components/investigation/InvestigationTimelineBuilder.tsx`
- `/Users/veland/Downloads/Epstein Files/epstein-archive/src/components/investigation/CommunicationAnalysis.tsx`
- `/Users/veland/Downloads/Epstein Files/epstein-archive/src/components/investigation/ForensicAnalysisWorkspace.tsx`
- `/Users/veland/Downloads/Epstein Files/epstein-archive/src/components/investigation/InvestigationTeamManagement.tsx`
- `/Users/veland/Downloads/Epstein Files/epstein-archive/src/components/investigation/InvestigationExportTools.tsx`
- `/Users/veland/Downloads/Epstein Files/epstein-archive/src/components/investigation/InvestigationCaseFolder.tsx`
- `/Users/veland/Downloads/Epstein Files/epstein-archive/src/components/common/AddToInvestigationButton.tsx`
- `/Users/veland/Downloads/Epstein Files/epstein-archive/src/components/documents/DocumentModal.tsx`
- `/Users/veland/Downloads/Epstein Files/epstein-archive/src/App.tsx`
- `/Users/veland/Downloads/Epstein Files/epstein-archive/src/server/db/investigationsRepository.ts`
- `/Users/veland/Downloads/Epstein Files/epstein-archive/scripts/ship_checklist_v2.ts`

## Final pass (2026-02-16)

### What changed

- Forensic confidence transparency is now explicit and auditable:
  - confidence chips are keyboard/click interactive and open **Confidence details**.
  - panel shows formula version, fixed weight breakdown, raw factor scores, missing inputs, final score, determinism statement, ingest run, ruleset, model id, and timestamp.
  - scoring moved to deterministic utility with revision-aware cache key (`ingest_run_id` + `rulesetVersion` + factors + inputs).
- Notebook save-state guarantees were completed:
  - explicit status line (`Saving...`, `Saved at ...`, `Offline`, `Failed`) + retry action.
  - local draft is retained until confirmed persistence.
  - render/save instrumentation marks were added in PerformanceMonitor, and notebook state remains local to avoid workspace-wide rerenders.
- Cold-load deep-link reconstruction hardened:
  - evidence deep links now set and retain `deepLinkedEvidenceId`, auto-open viewer, switch to Case Folder tab, highlight and focus the linked row.
  - query fallback (`?evidenceId=...`) remains supported.
- Export integrity/reproducibility hardened:
  - all generated artifacts now embed metadata block with case id, generated_at, ingest runs, pipeline version, stable evidence IDs, checksum, checksum algorithm, timeline ordering mode, and non-deterministic fields.
  - deterministic ordering implemented for CSV/JSON exports.
- Timeline semantics clarified and enforced:
  - toggle between `Chronological` and `Narrative order (manual)`.
  - chronological mode disables drag/move affordances with explicit reason.
  - narrative mode supports drag + keyboard move and persists ordering locally (clearly labeled local-device behavior).
  - semantics tooltip explains export impact.
- Communications now yields minimum investigative-grade signal:
  - added anomaly detection for hourly communication spikes with confidence/severity.
  - each pattern provides direct source actions (open underlying emails/threads) and `Add signal to case folder` with provenance note.
  - explicit `Needs input` guidance + one-click case-scoped email fallback when data is insufficient.

### Added/updated tests

- Determinism + cache invalidation:
  - `/Users/veland/Downloads/Epstein Files/epstein-archive/src/test/forensicConfidence.test.ts`
- Export metadata + stable ordering:
  - `/Users/veland/Downloads/Epstein Files/epstein-archive/src/test/exportIntegrity.test.ts`
- Router/deep-link + notebook + communications smokes (Playwright specs):
  - `/Users/veland/Downloads/Epstein Files/epstein-archive/tests/investigation-deeplink-notebook.spec.ts`
  - `/Users/veland/Downloads/Epstein Files/epstein-archive/tests/investigation-communications.spec.ts`

### Final verification commands

- `npm run -s type-check` ✅
- `npm run -s lint` ✅ (warnings = 0)
- `npx tsx src/test/forensicConfidence.test.ts` ✅
- `npx tsx src/test/exportIntegrity.test.ts` ✅
- `npx playwright test tests/investigation-deeplink-notebook.spec.ts tests/investigation-communications.spec.ts` ⚠️ blocked in this environment (`@playwright/test` package missing).
