# QA Matrix: v14.7.x Postgres Stabilization Follow-up

Date: 2026-02-25
Scope: Postgres migration stabilization, API contract compatibility, UI regression validation, focused E2E coverage refresh

## Summary

- Local quality gates passed: `format:check`, `lint`, `type-check`, `build`
- Focused Playwright regression pack passed: `30 passed`, `5 skipped`, `0 failed`
- Production deployment verification passed on `v14.7.0`
- Follow-up hardening added in this pass:
  - Evidence modal evidence-list fallback render when virtualized viewport measures too small
  - Stable `data-testid` coverage for evidence count/list rows
  - Golden-path assertion now requires an evidence row render, not only the count badge

## Feature Report (Site Navigation Order)

| Area              | Primary Coverage                                                                                                                        | Status | Notes                                                                                                          |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------- |
| Subjects (People) | `tests/golden-path.spec.ts`, `tests/route-ui-sync.spec.ts`                                                                              | Pass   | Entity modal deeplink to Evidence tab validated. Evidence row render now asserted directly.                    |
| Docs              | `tests/golden-path.spec.ts`, `tests/api.spec.ts`, post-deploy checks                                                                    | Pass   | Document route/modal open path validated; `/api/documents` burst resilience passed in production verification. |
| Investigations    | `tests/investigation-communications.spec.ts`, `tests/investigation-deeplink-notebook.spec.ts`, `tests/investigation-casefolder.spec.ts` | Pass   | Deeplink tab-activation drift handled in tests; communications and notebook persistence flows passing.         |
| Timeline          | `tests/route-ui-sync.spec.ts` + build/runtime smoke                                                                                     | Pass   | No regression surfaced in route sync/build validation.                                                         |
| Flights           | `tests/route-ui-sync.spec.ts` + build/runtime smoke                                                                                     | Pass   | No regression surfaced in focused run.                                                                         |
| Property          | `tests/route-ui-sync.spec.ts` + build/runtime smoke                                                                                     | Pass   | No regression surfaced in focused run.                                                                         |
| Media             | `tests/route-ui-sync.spec.ts`, post-deploy `/api/media/images`                                                                          | Pass   | Media endpoint verified `200` in post-deploy checks.                                                           |
| Emails            | `tests/email-deeplink.spec.ts`, `tests/golden-path.spec.ts`                                                                             | Pass   | Email threads load, message render/search/add-to-investigation UI path validated.                              |
| Black Book        | `tests/route-ui-sync.spec.ts` + build/runtime smoke                                                                                     | Pass   | No regression surfaced in focused run.                                                                         |
| Stats             | `tests/api.spec.ts`, post-deploy `/api/stats` + deep health                                                                             | Pass   | DB connectivity and stats retrieval verified in production.                                                    |
| About             | `tests/route-ui-sync.spec.ts` + build/runtime smoke                                                                                     | Pass   | No regression surfaced in focused run.                                                                         |

## API / Platform Report

| Area                               | Status | Notes                                                   |
| ---------------------------------- | ------ | ------------------------------------------------------- |
| `/api/health/ready` compatibility  | Pass   | Alias restored; post-deploy readiness verified.         |
| `/api/graph` compatibility         | Pass   | Alias to global graph endpoint restored.                |
| `/api/search?query=` compatibility | Pass   | Query alias accepted.                                   |
| DTO/API contracts                  | Pass   | `tests/api-dto-contract.spec.ts` passing.               |
| Data validation                    | Pass   | `tests/data-validation.spec.ts` passing.                |
| Route/UI sync                      | Pass   | `tests/route-ui-sync.spec.ts` passing.                  |
| Postgres migrations                | Pass   | Local and remote migration passes are clean/idempotent. |
| DB explain/query certification     | Pass   | Production deploy pipeline explain checks all green.    |

## Issues Fixed (Urgent / High Impact)

1. Migration ledger reconciliation after Postgres migration chain drift.
2. Restore migration identity insert syntax errors (`OVERRIDING SYSTEM VALUE`) corrected.
3. Backfill migration timeout issue mitigated by disabling statement timeout in heavy update migration.
4. Evidence modal deeplink lazy-load bug fixed (`tabsLoaded` now honors initial active tab).
5. Evidence tab infinite-loader query storm fixed (pagination termination logic corrected).
6. Evidence tab render resiliency improved with fallback non-virtualized list on collapsed viewport dimensions.

## Residual Risk / Follow-up

- Evidence tab virtualization remains a complex render path; fallback now prevents empty-content experience when dimensions collapse.
- Legacy Playwright suite (`tests/epstein-archive.spec.ts`) remains excluded from modern regression runs due stale UI assumptions.
