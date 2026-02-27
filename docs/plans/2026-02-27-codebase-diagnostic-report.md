# Epstein Archive — Codebase Diagnostic Report

**Date:** 2026-02-27 | **Version:** 14.7.0

---

## 1. Executive Summary

**Health score: 5.5 / 10** — Solid investigative architecture with serious integrity gaps.

- **Biggest strength**: The investigation workspace (case folders, evidence linking, `AddToInvestigationButton`) provides real cross-module integration. The email module is well-engineered (virtualised list, typed API, good UX). Redaction visualisation is thoughtful and type-aware.

- **Most critical gap for investigators**: **Three features present fabricated data to investigators as real analysis** — the cluster graph shows fake connection counts (`c.size * 10`), the forensic authenticity score is algorithmically invalid (keyword matching with a 0.75 hardcoded baseline), and the financial module ships seeded mock transactions. An investigator using these features may draw false conclusions from fabricated outputs.

- **Biggest technical risk**: N+1 query patterns in the three most-used API paths (`getDocuments`, `getDocumentById`, `getGraphSlice`) will create significant DB load under real investigative use with a full corpus. The graph BFS in particular can dispatch hundreds of queries per request.

- **One-line verdict**: This is a useful investigative tool for corpus navigation and evidence linking — but three modules actively mislead investigators, the server-layer query architecture will not survive production load, and module isolation (no shared filter state, inconsistent data access patterns) makes the tool harder to use than it needs to be.

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

### 3b. Client Layer

#### Pages

**[Warn] `src/client/pages/EvidencePage.tsx:1–6` — Trivial wrapper renders into a design-system island**
`EvidencePage` is a one-liner that renders `<EvidenceDetail />`. `EvidenceDetail` uses `bg-gray-50` / `bg-white` Tailwind classes throughout (light-theme island) while the rest of the app is dark-themed. Investigators switching between modules experience a jarring visual mode shift with no semantic distinction — this is not a dark/light toggle, it is unintentional inconsistency.

**[Warn] `src/client/pages/DocumentsPage.tsx:20–31` — Silent no-render when `processor` is absent**
The page gates all output on `{processor && <DocumentBrowser .../>}`. If `processor` is undefined, the page renders an empty `<div>` with no loading state or error message. Investigators see a blank screen with no explanation.

**[Note] `src/client/pages/PeoplePage.tsx:44–51,98–107` — `handleSubjectClick` casts to `as any` to bridge DTO mismatch**
The `SubjectCardDTO` is manually mapped to a `Person` shape with `as any` cast. Several fields (`evidence_types`, `contexts`, `red_flag_rating`) are set to empty/zero placeholders. If downstream code reads those fields from the person object in the click handler, it will receive stale or empty data.

---

#### Components

**[Critical] `src/client/components/documents/DocumentBrowser.tsx` — God Component with 20+ state variables**
`DocumentBrowser` manages: `documents`, `filteredDocuments`, `selectedDocument`, `relatedDocuments`, `showFilters`, `sortBy`, `sortOrder`, `collection`, `viewMode`, `currentPage`, `showMetadata`, `hideLowCredibility`, `itemsPerPage`, `totalDocuments`, `densityMode`, `searchInput`, `selectedTranche`, `isHeaderCondensed`, `jumpToPage`, `filters`, `hoveredDoc`, `hoverRect`, `hasMore`, `isFetching`, `fetchBlockedUntil`. A component with this many state concerns is fragile to extend and difficult to reason about when bugs occur.

**[Critical] `src/client/components/documents/DocumentBrowser.tsx:393,393` — Raw `fetch()` bypasses typed `apiClient`**
The main data-fetch uses `fetch('/api/documents?...')` directly with manual URL construction and unvalidated `response.json()` cast. A parallel `apiClient.getDocument(id)` call exists in the same component for single-document fetches. Two inconsistent data-access patterns in the same file means contract breakage (API response shape change) will only surface at runtime for the raw-fetch path.

**[Critical] `src/client/components/documents/DocumentBrowser.tsx:359,553,554,565,566` — `console.log` left in production path**
Five `console.log` calls remain in the production fetch path: `"DocumentBrowser: Fetching page ${currentPage}..."`, `"DocumentBrowser: selectedDocumentId changed to..."`, `"DocumentBrowser: Found document in current list, selecting"`, `"DocumentBrowser: Document NOT found in current list, fetching..."`, `"DocumentBrowser: Fetched document successfully"`. These expose internal pagination state to the browser console and add log noise for every page load.

**[Critical] `src/client/pages/EvidenceDetail.tsx:188–197` — Action buttons (Share, Bookmark, Download) are decorative only**
Three buttons in the evidence detail header (`Share2`, `Bookmark`, `Download` icons) have no `onClick` handlers. They render as interactive elements (keyboard-focusable, pointer-cursor) but do nothing when clicked. Investigators will click these and receive no feedback — silent UI lying.

**[Warn] `src/client/components/documents/DocumentBrowser.tsx:415–451,572–597` — Duplicate document-mapping logic**
The API response → `Document` type mapping appears in two separate locations: once in the paginated list fetch, and again in the `selectedDocumentId` direct-fetch path. If the API response shape changes, both paths must be updated — one is likely to be missed.

**[Warn] `src/client/components/documents/DocumentBrowser.tsx:291–293` — Commented-out virtual scrolling never implemented**
A `useEffect` labelled "Enable virtual scrolling for large datasets" has an empty body (implementation commented out: `// setUseVirtualScrolling(...)`). The associated state variable `useVirtualScrolling` is also commented out. The document list renders all results with no virtualisation. For a corpus with thousands of documents, this will cause significant paint and memory pressure.

**[Warn] `src/client/components/entities/EntityGraphPanel.tsx:10–11` — `any[]` typed graph state**
`nodes` and `edges` are typed as `any[]`. The component then passes these through `GraphService` normalization before rendering. If the API response shape changes, the failure is silent — the component simply renders nothing or a malformed graph.

**[Note] EmailClient.tsx:4–5 — Email list is properly virtualised**
`EmailClient` uses `react-window` `FixedSizeList` with `AutoSizer` and `React.memo` row components — the only module with correct virtualisation for large lists. This is the pattern the Documents module should adopt.

**[Note] `src/client/components/documents/DocumentBrowser.tsx:59–123` — Tranche configuration hardcoded in component**
The `DOJ_TRANCHE_OPTIONS` constant (58 lines of source data) is defined at module level inside the component file. This data configuration belongs in a constants or config file. Hardcoding it here makes it easy to miss when corpus metadata changes.

---

### 3c. Shared Contracts & Tests

#### Contracts (DTOs & Zod Schemas)

**[Critical] `src/shared/dto/documents.ts:1–24` — Dual camelCase/snake_case fields enshrine API instability**
`DocumentListItemDto` declares five field pairs in both naming conventions simultaneously: `entitiesCount`/`entities_count`, `keyEntities`/`key_entities`, `sourceType`/`source_type`, `previewText`/`preview_text`, `whyFlagged`/`why_flagged`. The server must return both forms or the contract test fails. This pattern preserves a transitional API shape as a permanent contract rather than resolving it. The Zod schema in `src/shared/schemas/documents.ts` mirrors this exactly.

**[Critical] `src/shared/dto/entities.ts:1` — `RiskLevel = 'HIGH' | 'MEDIUM' | 'LOW' | string` defeats the union type**
The `| string` suffix makes the union equivalent to plain `string`. The Zod schema validates this field as `z.string()`. Any value — including nullish strings, typos, or unexpected values from the DB — passes validation silently. There is no runtime guarantee that risk level is one of the three expected values.

**[Critical] No contracts for major investigator-facing endpoints**
The following routes have no Zod schema and no DTO contract test: `GET /api/entities/:id` (entity detail), `GET /api/graph/global` (network graph), `GET /api/evidence/:id` (evidence detail), `GET /api/relationships` (relationship list), `GET /api/flights`, `GET /api/timeline`, `GET /api/map`. For the most investigator-critical paths (evidence, graph, relationships), schema drift will not be caught until a user encounters a runtime error.

**[Warn] `src/shared/dto/documents.ts:34–51` — `DocumentDetailDto` makes all fields except `id` optional**
Every field in `DocumentDetailDto` is optional (`?`): `fileName`, `fileType`, `content`, `contentRefined`, `evidenceType`, `redFlagRating`, `sourceCollection`. A response with only `{id: "1"}` passes the contract. Consumers must null-check every field, and contract tests provide no guarantee that any particular field will be present.

**[Warn] `src/shared/dto/entities.ts:58–59` — `contexts: unknown[]` and `significant_passages: unknown[]` are opaque**
These fields appear in the entity list DTO but have no defined shape. Components that consume them must use runtime type assertions. The Zod schema validates them as `z.array(z.unknown())` — i.e., any array of anything passes.

---

#### Tests

**[Warn] `tests/api-dto-contract.spec.ts` — All contract tests require a live server**
The entire contract test suite is Playwright e2e tests that hit `http://localhost:3012`. They cannot run in offline CI without a live server. The contract test failure recorded in Section 2 is structural — this test suite is not appropriate for stateless CI. An HTTP-level integration test using a test server startup fixture (or a mock server with expected payloads) would be more reliable.

**[Warn] `tests/performance.spec.ts:15–23` — Wall-clock timing tests are inherently flaky**
`expect(loadTime).toBeLessThan(2000)` measures `Date.now()` delta from navigation start to element appearance. This is sensitive to system load, CI machine specs, and network latency. On a loaded CI runner, this test will produce intermittent failures that obscure real regressions.

**[Note] Missing test coverage for investigator-critical paths**
There are no tests asserting: search returns accurate results (not just results), evidence chain links from claim → document → page reference, redacted content displays the correct placeholder (not raw redacted text), graph paths return correct node sequences, relationship types are distinct and accurate. Tests assert structure and element visibility, not semantic correctness of the investigative data.

**[Note] `tests/golden-path.spec.ts` — Graceful skip when data absent**
The `resolveEntityWithEvidence` helper skips the test rather than failing when the dataset is empty. This is good defensive behaviour for a data-dependent corpus but means CI passing on an empty dataset provides no signal about the investigative paths actually working.

---

## 4. UX & Investigator Utility

Six mission-fit questions assessed against the codebase. Verdict: **Working** / **Partial** / **Gap**

---

### Q1: Discoverability — **Partial**

A global search bar exists in `App.tsx:308` that queries `/api/search?q=...` — but this returns **entities only** (people). Document search is siloed inside `DocumentBrowser`'s local state and only operates when the user is on the Documents tab. Email, Timeline, Flights, and Properties modules have no integration with the global search bar. An investigator who searches for "Maxwell" at the global level will see matching persons but not the documents or emails that contain the name. Discovery requires navigating to each module and searching independently.

---

### Q2: Relationship Traversal — **Partial**

The `EntityGraphPanel` displays a local graph of a person's connections from the entity detail page, which is good. `EvidenceDetail.tsx:301–327` links linked entities to their own detail pages — this provides one-hop navigation. However:

- Path from person → connections → shared documents requires: open entity modal → view graph → click connected entity → navigate to that entity's page → open their documents tab. This is 4–5 interactions.
- `GET /api/graph/global?mode=path` provides shortest-path queries between two entities (Dijkstra, `graphRoutes.ts`) but this endpoint does not appear to be surfaced in any visible UI beyond the graph page.
- There is no "show documents shared between person A and person B" affordance visible in the UI.

---

### Q3: Data Density vs. Clarity — **Working**

This is a genuine strength. `RedactionPlaceholder.tsx` renders type-aware labels (`[PERSON]`, `[LAWYER]`, `[ORG]`, `[CONTACT]`) with confidence-based degradation (low confidence falls back to `[REDACTED]`) and an informative hover tooltip (type, confidence, source kind). OCR quality score is surfaced on `EvidenceDetail.tsx:230–238` with a "Low OCR Quality" badge. The `previewKind` field (`ai_summary`/`excerpt`/`fallback`) communicates preview reliability. The DTO contract includes `whyFlagged` — the reason a document was flagged is returned alongside the flag score.

One caveat: the "Forensic Triage Preview" label on document hover (DocumentBrowser) uses `ShieldCheck` icon — forensic-sounding branding is applied to data that includes the fake authenticity score (see Section 3a, evidenceRoutes.ts finding).

---

### Q4: Evidence Chain — **Partial**

`ClaimsList.tsx` and `ProvenancePanel.tsx` exist as components, which shows intent to surface provenance. `EvidenceDetail` links from evidence to named entities. However:

- From a claim, there is no visible direct link to the specific page number in the source document.
- The `DocumentProvenance.tsx` component exists but is in the documents component directory — it is unclear whether it appears on the evidence detail view or only on document modals.
- The graph relationship between "investigator sees claim" → "views source document" → "reads verbatim passage" → "sees document provenance (page, source, tranche)" is not confirmed as a complete path in the visible UI.

---

### Q5: Cohesiveness — **Partial**

Cross-module inconsistencies that fragment the investigative experience:

- **Theme split**: Evidence module (`EvidenceDetail.tsx`) renders with `bg-gray-50`/`bg-white` light theme classes. All other modules use dark glass-card patterns. Switching to the Evidence tab is a jarring visual shift.
- **Filter state is not shared**: Each module maintains its own independent filter state (DocumentBrowser has local filter state; PeoplePage receives filter state from App; EmailClient has its own internal state). A date range applied in Documents does not apply to Emails or Flights.
- **Pagination patterns vary**: PeoplePage uses server-side pagination with Previous/Next buttons. DocumentBrowser uses page-fetch with an infinite-scroll-adjacent pattern. Email uses virtualised list with server-side pagination. Timeline renders all events. No consistent pagination pattern.
- **Positive**: Navigation breadcrumbs (`Breadcrumb.tsx`) and the `AddToInvestigationButton` component appear consistently across modules — evidence linking to investigations is a shared affordance.

---

### Q6: Performance at Scale — **Partial**

| Module    | Virtualisation                     | Pagination            | Notes                           |
| --------- | ---------------------------------- | --------------------- | ------------------------------- |
| People    | None                               | Server-side (24/page) | Good                            |
| Documents | None                               | Server-side (50/page) | Virtual scrolling commented out |
| Email     | react-window FixedSizeList         | Server-side (50/page) | Best implementation             |
| Timeline  | None                               | None                  | Renders all events              |
| Graph     | 500-node cap, 5000-iteration limit | N/A                   | BFS guard in place              |
| Flights   | None                               | Unknown               | Wraps FlightTracker             |

Documents is the highest-risk module at scale: it renders all fetched documents as DOM nodes with no virtualisation. For a corpus of 50k+ documents with 50 items per page, individual pages are manageable — but if the user scrolls through many pages without resetting, DOM node count accumulates.

---

## 5. Data Utilisation & Visualisation

### Network / Graph

A force-directed network graph (`NetworkGraph.tsx`, 1062 lines; `EntityGraphPanel.tsx`) renders the entity relationship network. The graph supports LOD (Level of Detail) fetching with a configurable node limit (10–2000, default 150), cluster mode, and shortest-path mode. This is a substantive feature.

**Critical gap**: Relationship types are stored as comma-separated strings in the DB but `relationshipsRepository.ts:143` takes only the first type: `relationshipTypes?.split(',')[0] || 'connected'`. When a relationship has multiple types (financial + communication, for example), only the first is surfaced in the graph. Type diversity is lost at the query layer.

**Critical gap (repeated from §3a)**: Cluster mode (`graphRoutes.ts:68`) sends `connectionCount: c.size * 10` to the client. Node connection counts shown in the cluster view are fabricated multipliers.

### Financial Data

A financial visualization module exists (`FinancialTransactionMapper.tsx`, 816 lines) with an API route (`financialRoutes.ts`). However, `financialRoutes.ts:28–74` contains a `/seed` endpoint that populates the database with 6 hardcoded mock transactions for "demonstration in the workspace". There is no indication in the code that real transaction data from the corpus populates this table. A `FinancialTransactionMapper` that renders seeded mock transactions is not investigative utility — it is a prototype placeholder that could mislead investigators into treating fabricated financial flows as evidentiary.

`FinancialTransactionMapper.tsx:797` contains `/* TODO: Open document */` — the action for clicking a financial transaction to view its source document is unimplemented.

### Timeline

`Timeline.tsx` (465 lines) renders a chronological event timeline. Events are sourced from the API but the origin of date fields (extracted from documents vs. synthesised) is not distinguished in the UI. No date-sourcing confidence indicator is displayed alongside timeline events.

### Geographic Data

`mapRoutes.ts` returns up to 500 entities with non-null, non-zero coordinates. `LocationMap.tsx` and `RouteMap.tsx` exist as visualization components. Geographic data is limited to entity locations (home, office, property coordinates) — flight path routing is not integrated into the map layer (flight data is a separate module).

### Relationship Type Distinctiveness

The relationship model supports typed edges (financial, travel, communication, association). However:

- The graph query collapses multi-typed relationships to a single type.
- The UI graph does not visually distinguish relationship types through edge styling — all connections appear as uniform edges.
- Investigators cannot filter the graph to show "only financial connections" or "only communication links".

### Data Model vs. UI Utilisation

Fields present in the DB / DTO but not visibly surfaced in the UI:

- `previewKind` (ai_summary / excerpt / fallback) — returned in API but not displayed on document cards
- `whyFlagged` — text explanation for red flag score is in the DTO but its display placement in DocumentBrowser is not confirmed from a UI read
- `evidence_ladder` (L1/L2/L3/NONE) on entity cards — present in entity DTO; surfaced on subject cards but its meaning is not explained in the UI

---

## 6. Module Interoperability

### Shared Investigation Context — Working

`InvestigationsContext.tsx` wraps the app and exposes `addToInvestigation(investigationId, item, relevance)` — a genuine cross-module linking mechanism. The `AddToInvestigationButton` component appears throughout Documents, Emails, and Evidence modules, providing consistent evidence pinning to case folders. This is the strongest cross-module cohesion in the codebase.

### Shared Filter State — Gap

`FilterContext.tsx` provides URL-serialised filter state (readable via `?f=...` query params, shareable as links). However, each module maintains its own local filter state:

- `DocumentBrowser` has a `filters: BrowseFilters` state object with file type, date range, entity, category, and source filters.
- `EmailClient` has internal filter tabs (`all`/`primary`/`updates`/`promotions`) and its own search state.
- `PeoplePage` receives risk level and entity type filters from `App.tsx` as props.

A date range set in Documents does not carry to Emails or Flights. An investigator who wants to scope all modules to "2018–2019" must reset filters in each tab independently. The `FilterContext` handles risk level for People but is not wired into other modules.

### API Client — Partial

`apiClient.ts` (1077 lines) is a typed, centralised API service. However, `DocumentBrowser`, `EvidenceDetail`, `EntityGraphPanel`, and `InvestigationsContext` all call `fetch()` directly with inline URL strings. The typed client and raw fetch coexist — contract drift in any raw-fetch path will surface only at runtime.

### Context Re-Render Risk — Warn

`InvestigationsContext` bundles `investigations`, `selectedInvestigation`, `isLoading`, `error`, and three callback functions in a single context value object. Every state change (including loading spinners, errors, or adding a single piece of evidence) causes a new object reference, triggering re-renders across all consumers. For a module with frequent state updates, this will cause unnecessary repaints in consumers that only care about the investigations list.

### Cross-Module Navigation — Partial

The navigation surface is URL-driven (React Router v6), which is good for deep-linking. However, established cross-module links are incomplete:

- Entity page → emails sent by that person: no direct link (email tab is global mailbox, not per-entity)
- Document page → all emails that mention the same entities: no link
- Flight log → the people on that flight → their entity pages: requires manual navigation

### `GET /investigations/by-title` — Application-level Search on Small Dataset

`investigations.ts:39–51`: `GET /by-title` fetches investigations with `limit=5` then does JavaScript `Array.find()` on title. For title resolution, this should use a `WHERE title = $1` SQL query. The current implementation only works if the target investigation appears in the first 5 results.

---

## 7. Top 10 Recommendations

Ordered by **investigator impact** — harm prevention before performance.

---

### 1. Remove or clearly disclaim the fake forensic authenticity score

**Impact:** Investigators may use "Authenticity Score: 87%" as evidence of document legitimacy in their reporting. It is a keyword counter with a 0.75 baseline. If an investigator relies on this score in their work, the harm is evidentiary.
**Finding:** §3a — `evidenceRoutes.ts:215–263`
**Action:** Either replace with a valid, documented methodology (OCR confidence + source provenance), or add a prominent disclaimer: "This score is indicative only and has no forensic validity." Remove `ShieldCheck` icon and "Forensic Analysis" label from this section.
**Effort:** S

---

### 2. Remove fake connection counts from cluster graph mode

**Impact:** Investigators reading connection counts in the cluster view are seeing `c.size * 10`. A cluster of 15 entities shows "150 connections." This is misinformation presented as network analysis.
**Finding:** §3a — `graphRoutes.ts:68`
**Action:** Replace `c.size * 10` with actual degree sum from the DB (count edges for nodes in the cluster). If this is expensive to compute, remove the `connectionCount` field from cluster mode rather than fabricate it.
**Effort:** M

---

### 3. Replace financial module seed data with real corpus data or remove the module

**Impact:** `FinancialTransactionMapper` renders 6 hardcoded mock transactions as investigative financial intelligence. Investigators may screenshot or cite these transactions as evidentiary.
**Finding:** §5 — `financialRoutes.ts:28–74`
**Action:** If real transaction data exists in the corpus, wire the financial module to it. If not, gate the module behind an "experimental / no real data" label or remove it from the navigation entirely until real data is available.
**Effort:** M–L

---

### 4. Fix the N+1 query in `getDocuments` — replace with a single JOIN

**Impact:** Every page of 50 documents fires 50 parallel `getDocumentEntities` queries. Under investigative use with multiple users, this saturates the connection pool (8-connection ingestPool). Document loading will degrade before any other module.
**Finding:** §3a — `documentsRepository.ts:235–282`
**Action:** Rewrite `getDocuments` to use a single SQL query with a LEFT JOIN on document entities and aggregate entities into an array using `json_agg`. Eliminates the `Promise.all` map.
**Effort:** M

---

### 5. Fix the N+1 query loop in `getDocumentById` — sequential per-entity queries

**Impact:** A document with 20 entities fires 20 sequential `getMentionContexts` queries before responding. For investigator-intensive documents (Epstein, Maxwell with many entity mentions), detail page load time scales linearly with entity count.
**Finding:** §3a — `documentsRepository.ts:316–341`
**Action:** Batch `getMentionContexts` into a single query with `WHERE doc_id = $1 AND entity_id = ANY($2::int[])` and reshape results in application code.
**Effort:** M

---

### 6. Implement shared date-range filter that applies across modules

**Impact:** An investigator scoping their investigation to "events in 2017–2019" must reset the date range in Documents, then Emails, then Timeline independently. Shared filter state is a core investigative utility.
**Finding:** §4 (Q1, Q5), §6
**Action:** Extend `FilterContext` to include a global date range. Thread it into DocumentBrowser's `filters.dateRange`, EmailClient's date filter params, and Timeline's event range query. Expose a persistent date range control in the global nav bar.
**Effort:** L

---

### 7. Implement virtualised list in DocumentBrowser

**Impact:** Rendering 50 DOM-heavy document cards at a time is manageable, but page-after-page browsing accumulates nodes. The email module demonstrates the correct pattern. Documents is the most-used module.
**Finding:** §3b — `DocumentBrowser.tsx:237–238` (commented-out virtual scrolling)
**Action:** Replace the CSS grid render of `filteredDocuments.map(...)` with `react-window`'s `FixedSizeList` or `VariableSizeList`. The `useVirtualScroll` hook already exists in `src/client/hooks/`.
**Effort:** M

---

### 8. Fix the relationships endpoint to return both sides of the relationship correctly

**Impact:** `relationships.ts:27–28` returns the same `neighborId` for both `entity_id` and `related_entity_id`. The client cannot distinguish which entity is the subject and which is the connection. Relationship directionality is lost.
**Finding:** §3a — `relationships.ts:21–33`
**Action:** Fix the query mapping to return the queried entity's own ID as `entity_id` and the connected entity as `related_entity_id`. Verify with a unit test asserting both IDs differ.
**Effort:** S

---

### 9. Consolidate document data access to use `apiClient` exclusively

**Impact:** `DocumentBrowser`, `EvidenceDetail`, `EntityGraphPanel`, and `InvestigationsContext` call `fetch()` directly. Any API response contract change will only surface at runtime in these paths, not in TypeScript compile or contract tests.
**Finding:** §3b — `DocumentBrowser.tsx:393`, `EvidenceDetail.tsx:79`
**Action:** Move all API calls through typed methods on `apiClient`. Add methods for `getDocumentsList(params)` and `getEvidence(id)` if not already present.
**Effort:** M

---

### 10. Add contract schemas for `GET /api/entities/:id`, `GET /api/evidence/:id`, and `GET /api/graph/global`

**Impact:** Three of the most investigator-critical API paths have no Zod schema. Schema drift (field rename, type change, missing field) is undetectable until a user sees a broken UI.
**Finding:** §3c — missing contracts
**Action:** Add Zod schemas to `src/shared/schemas/` for entity detail, evidence detail, and graph response. Add contract test stubs for each that test against the live API in the existing `api-dto-contract.spec.ts`.
**Effort:** M
