# Epstein Archive — Codebase Diagnostic Report

**Date:** 2026-02-27 | **Version:** 14.7.0

---

## 1. Executive Summary

_To be filled after all phases complete._

---

## 2. Automated Metrics

| Check                      | Result                                                                                                                                                                                  | Severity     |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| TypeScript errors          | **0** — `tsc --noEmit` exits clean                                                                                                                                                      | Note         |
| ESLint violations          | **0 errors, 0 warnings** — lint exits clean                                                                                                                                             | Note         |
| Boundary check             | **PASS (manual)** — no `@server/` imports in `src/client/**/*.{ts,tsx}`. Script itself broken: requires `rg` (ripgrep) not in PATH                                                      | Warn (infra) |
| CI gates (`ci:pg:nuclear`) | **PASS** — all 5 guards pass (SQLite remnants, DB_DIALECT, raw SQL in routes, pgtyped misuse, documents SQL parity). Schema hash + pg_explain gates skipped locally (no `DATABASE_URL`) | Note         |
| Contract tests             | **1 failed / 1 passed / 2 did not run** — server not running during test run. Failure: `GET /api/documents` (response not OK). Passing: email endpoints.                                | Critical     |
| Largest bundle chunk       | `vendor-CtZEdbbI.js` **652 kB** (204 kB gzip); `vendor-pdf` 419 kB; `InvestigationWorkspace` 371 kB; `vendor-charts` 355 kB                                                             | Warn         |
| Unbounded `SELECT *`       | **19 instances** across repositories (`memoryRepository` 11, `propertiesRepository` 4, `forensicRepository` 2, `jobsRepository` 1, `articleRepository` 1)                               | Warn         |
| Missing `LIMIT`            | 28 LIMIT clauses present; 19 `SELECT *` without co-located LIMIT — partial coverage only                                                                                                | Warn         |
| N+1 query patterns         | **0** — only 2 `.map()` hits both in `batchQuery.ts` (safe batch-ID slicing)                                                                                                            | Note         |

### Notes

- **Contract test failure is diagnostic-only**: server must be running for these tests to be meaningful. The failure indicates the test harness is not designed for offline CI — not a contract drift issue per se.
- **`InvestigationWorkspace` at 371 kB** is the largest feature chunk and is not a standard vendor library — indicates the investigation workspace bundles heavy dependencies without further splitting.
- **`vendor` base chunk at 652 kB** is the largest single asset; likely React + React DOM + React Router. Worth splitting in a future optimisation pass.
- **`check:boundaries` script depends on `rg`** being available in PATH — this is an undocumented system dependency that will silently fail in any environment without ripgrep installed.

---

## 3. Code Quality Findings

_To be filled in Tasks 3–5._

---

## 4. UX & Investigator Utility

_To be filled in Task 6._

---

## 5. Data Utilisation & Visualisation

_To be filled in Task 7._

---

## 6. Module Interoperability

_To be filled in Task 8._

---

## 7. Top 10 Recommendations

_To be filled after all phases complete._
