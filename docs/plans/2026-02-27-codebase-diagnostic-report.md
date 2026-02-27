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

### 3a. Server Layer

#### Routes

**[Critical] `src/server/routes/graphRoutes.ts:82–157` — Dijkstra path algorithm implemented inside a route handler**
A full weighted Dijkstra with a sorted priority queue (500-node cap, 5000-iteration guard) is embedded directly in the `/api/graph/global?mode=path` route. Business logic of this complexity belongs in a service or repository. The `pq.sort()` call on every iteration (line 96) is O(n²) — it re-sorts the entire queue each time instead of using a heap. For investigators querying long paths between actors, this will noticeably degrade under any real graph load.

**[Critical] `src/server/routes/graphRoutes.ts:68–72` — Hardcoded fake data in cluster mode response**
The cluster mode response sends `connectionCount: c.size * 10 // Fake degree for visual size` to the client. Investigators reading connection counts in the cluster view are seeing fabricated numbers. The code comment explicitly acknowledges this is fake.

**[Critical] `src/server/routes/evidenceRoutes.ts:215–263` — Forensic "authenticity score" is a fake metric**
The `/api/evidence/:id/analyze` route computes a `readability.fleschKincaid` score using a simplified formula (`100 - Math.min(100, wordCount / 10)`) and an `authenticityScore` that starts at a hardcoded 0.75 baseline and adds 0.15 for keyword matches. This is presented to investigators as forensic analysis. The Flesch-Kincaid formula is not correctly implemented. The authenticity score has no forensic validity — it will flag documents higher simply for mentioning "epstein", "maxwell", "payment" etc.

**[Warn] `src/server/routes/relationships.ts:27–28` — `entity_id` and `related_entity_id` both map to `neighborId`**
In the relationship mapping at line 21–33, both `entity_id` and `related_entity_id` are set to the same value (`neighborId`, the connection's ID). The queried entity's own ID is never returned. This makes it impossible for the client to distinguish which side of the relationship is which.

**[Warn] `src/server/routes/relationships.ts:14–18` — Limit not pushed to repository**
The `limit` parameter is parsed from the query string but only applied via `.slice(0, limit)` after the repository returns all relationships. The DB always fetches the full unbounded result set. For high-degree nodes (Epstein, Maxwell) this could return thousands of rows only to discard most of them.

**[Warn] `src/server/routes/graphRoutes.ts:76–77` — No validation on `sourceId`/`targetId` in path mode**
`sourceId = String(req.query.sourceId)` — if the parameter is absent, this evaluates to the string `"undefined"`, which will produce a confusing DB error rather than a 400 response.

**[Warn] `src/server/routes/evidenceRoutes.ts:90–96,118–119,165–166,273–275` — Error messages exposed to client**
Multiple routes return `message: String(error)` in 500 responses. Stack traces and internal error details are leaked to any client that hits an error path.

**[Note] `src/server/routes/graphRoutes.ts:53,61,79,139` — `console.time`/`console.timeEnd` left in production route**
Performance instrumentation left in production code adds log noise and should be replaced with the existing slow-query logging infrastructure.

---

#### Repositories

**[Critical] `src/server/db/documentsRepository.ts:235–282` — N+1 query in `getDocuments`**
`Promise.all(docs.map(async (doc) => { getDocumentEntities(doc.id) }))` fires one `getDocumentEntities` DB query per document in the result page concurrently. For a 50-document page, this dispatches 50 parallel queries. While `Promise.all` avoids sequential blocking, it saturates the connection pool and generates substantial DB load on every documents list request.

**[Critical] `src/server/db/documentsRepository.ts:316–341` — N+1 within `getDocumentById`**
Inside `getDocumentById`, after fetching the document's entities, a `for (const row of entityRows) { await getMentionContexts(docId, row.entityId) }` loop fires one query per entity in the document. For a document with 20 named entities, that's 20 sequential queries before the response is sent.

**[Critical] `src/server/db/relationshipsRepository.ts:109–154` — N+1-like pattern in `getGraphSlice`**
The BFS in `getGraphSlice` calls `getEntityDetailsAggregated` + `getTopPhotoForEntity` per visited node. For a depth-2 traversal with 500 queue iterations and the photo lookup, this can dispatch hundreds of queries per graph-slice request. The adjacency cache (`getNeighborsCached`) mitigates the edge-fetch cost but not the per-node detail fetches.

**[Warn] `src/server/db/entitiesRepository.ts:694–699` — `getEntityDocumentCount` fetches 1000 rows to count**
`getEntityDocumentCount` calls `getEntityMentions` with `limit: 1000` then returns `result.length` in JS. This loads up to 1000 rows from DB into memory to produce a single integer. A `COUNT(*)` query would be orders of magnitude cheaper.

**[Warn] `src/server/db/entitiesRepository.ts:702–718` — `getEntityDocumentsPaginated` slices 1000 rows in JS**
Same pattern: fetches all 1000 mentions from DB, then slices to the requested page in application memory. Pagination should use SQL `LIMIT/OFFSET` or a keyset cursor.

**[Warn] `src/server/db/entitiesRepository.ts:94–117,294,613` — `buildVipDisplayLookup()` called on every entity request with no caching**
`buildVipDisplayLookup` issues a DB query (`getVipEntities`) on every call. It is called inside `getSubjectCards` and `getEntityById` — i.e., on every page load and every entity detail view. This lookup is static data that should be warmed once at startup or cached with a long TTL.

**[Note] `src/server/db/searchRepository.ts:254–258` — `searchSentences` swallows errors silently**
The `catch` block returns `[]` without logging at a level that would surface to monitoring. A DB connection failure would look identical to "no results" from the caller's perspective.

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
