# Codebase Diagnostic Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Produce an honest, evidence-based diagnostic of the Epstein Archive across code quality, UX, data utilisation, module interoperability, and investigator utility.

**Architecture:** Three-phase layered hybrid — automated toolchain metrics first, then manual file-by-file audit of representative samples per layer, then mission-fit assessment against six investigator-utility questions. All findings compiled into a single structured report.

**Tech Stack:** pnpm, TypeScript, ESLint, Playwright, PostgreSQL, React 18, Express.js, Vite

---

## Output File

All findings go into: `docs/plans/2026-02-27-codebase-diagnostic.md`

Create this file at the start of Task 1 with the report skeleton, then fill each section as you complete each task.

---

## Task 1: Create Report Skeleton

**Files:**

- Create: `docs/plans/2026-02-27-codebase-diagnostic-report.md`

**Step 1: Create the report file with section headers**

```bash
cat > docs/plans/2026-02-27-codebase-diagnostic-report.md << 'EOF'
# Epstein Archive — Codebase Diagnostic Report
**Date:** 2026-02-27 | **Version:** 14.7.0

---

## 1. Executive Summary
_To be filled after all phases complete._

---

## 2. Automated Metrics
_To be filled in Task 2._

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
EOF
```

**Step 2: Commit skeleton**

```bash
git add docs/plans/2026-02-27-codebase-diagnostic-report.md
git commit -m "docs: scaffold diagnostic report"
```

---

## Task 2: Phase 1 — Automated Metrics

Run each tool, record output counts in the report. Do not fix anything — observe only.

**Files:**

- Modify: `docs/plans/2026-02-27-codebase-diagnostic-report.md` (Section 2)

**Step 1: TypeScript errors**

```bash
pnpm type-check 2>&1 | tail -20
```

Record: total error count, top 3 recurring error categories, which layers (client/server/shared) are affected.

**Step 2: ESLint violations**

```bash
pnpm lint 2>&1 | grep -E "error|warning" | wc -l
pnpm lint 2>&1 | grep "error" | sed 's/.*error //' | sort | uniq -c | sort -rn | head -10
```

Record: total errors vs warnings, top violation types.

**Step 3: Boundary check**

```bash
pnpm check:boundaries 2>&1
```

Record: pass/fail, any client→server violations.

**Step 4: CI gates**

```bash
pnpm ci:pg:nuclear 2>&1 | tail -20
```

Record: pass/fail, any schema drift.

**Step 5: Contract tests**

```bash
pnpm test:contracts 2>&1 | tail -20
```

Record: pass/fail counts, any failing contracts.

**Step 6: Bundle analysis**

```bash
pnpm build 2>&1 | grep -E "chunk|kB|MB" | head -30
```

Record: largest chunks, total bundle size, any chunks over 500kB.

**Step 7: Slow query scan**

```bash
grep -rn "SELECT \*" src/server/db/ --include="*.ts" | wc -l
grep -rn "LIMIT" src/server/db/ --include="*.ts" | wc -l
grep -rn "\.forEach\|\.map" src/server/db/ --include="*.ts" | grep -i "query\|pool\|client" | wc -l
```

Record: unbounded SELECT \* count, missing LIMIT count, potential N+1 patterns.

**Step 8: Fill Section 2 of the report**

Write a table in the report:

| Check                | Result               | Severity           |
| -------------------- | -------------------- | ------------------ |
| TypeScript errors    | N                    | Critical/Warn/Note |
| ESLint violations    | N errors, N warnings | ...                |
| Boundary check       | Pass/Fail            | ...                |
| CI gates             | Pass/Fail            | ...                |
| Contract tests       | N pass / N fail      | ...                |
| Largest bundle chunk | NkB                  | ...                |
| Unbounded SELECT \*  | N                    | ...                |

**Step 9: Commit**

```bash
git add docs/plans/2026-02-27-codebase-diagnostic-report.md
git commit -m "docs: diagnostic — automated metrics (Phase 1)"
```

---

## Task 3: Phase 2 — Server Layer Audit

Read and assess the server routes and repositories. Sample: 4 route files + 4 repo files.

**Files to read:**

- `src/server/routes/relationships.ts`
- `src/server/routes/graphRoutes.ts`
- `src/server/routes/evidenceRoutes.ts`
- `src/server/routes/emailRoutes.ts`
- `src/server/db/entitiesRepository.ts`
- `src/server/db/relationshipsRepository.ts`
- `src/server/db/documentsRepository.ts`
- `src/server/db/searchRepository.ts`

**Files:**

- Modify: `docs/plans/2026-02-27-codebase-diagnostic-report.md` (Section 3, Server subsection)

**Step 1: Read each file and assess against these questions**

For routes:

- Is input validated before hitting the DB? (Zod/middleware or raw `req.query`?)
- Are errors handled with meaningful status codes and messages?
- Are any routes doing business logic that belongs in a repository?
- Are there routes that appear unused or duplicated?

For repositories:

- Are queries bounded with LIMIT where result sets could be large?
- Is `SELECT *` used where specific columns should be named?
- Are there forEach/map loops that fire per-row queries (N+1)?
- Is error handling present, or do errors bubble raw to the route?

**Step 2: Write findings in Section 3 — Server**

Use this format per finding:

```
**[Severity] File:line — Short title**
Description of the issue and why it matters to investigators using the app.
```

**Step 3: Commit**

```bash
git add docs/plans/2026-02-27-codebase-diagnostic-report.md
git commit -m "docs: diagnostic — server layer audit (Phase 2a)"
```

---

## Task 4: Phase 2 — Client Layer Audit

Read and assess key page and component files. Sample: 5 pages + 3 component areas.

**Files to read:**

- `src/client/pages/PeoplePage.tsx`
- `src/client/pages/DocumentsPage.tsx`
- `src/client/pages/EvidencePage.tsx`
- `src/client/pages/EmailPage.tsx`
- `src/client/pages/TimelinePage.tsx`
- `src/client/components/entities/` (scan directory)
- `src/client/components/documents/` (scan directory)
- `src/client/components/evidence/` (scan directory)

**Files:**

- Modify: `docs/plans/2026-02-27-codebase-diagnostic-report.md` (Section 3, Client subsection)

**Step 1: Read each file and assess against these questions**

- Is loading/error state handled or are failures silent?
- Are there hardcoded values that belong in config or constants?
- Is there duplicated fetch logic that should be a shared hook?
- Are large lists virtualised or do they render all rows?
- Does the component do too many things (god components)?
- Are accessibility basics present (aria labels, keyboard nav, focus management)?
- Is there dead/commented-out code?

**Step 2: Write findings in Section 3 — Client**

Same format as Task 3.

**Step 3: Commit**

```bash
git add docs/plans/2026-02-27-codebase-diagnostic-report.md
git commit -m "docs: diagnostic — client layer audit (Phase 2b)"
```

---

## Task 5: Phase 2 — Shared Contracts & Tests Audit

Read DTOs, Zod schemas, and test files. Sample: all contracts + 4 test files.

**Files to read:**

- `src/shared/` (full directory scan)
- `tests/api-dto-contract.spec.ts`
- `tests/golden-path.spec.ts`
- `tests/epstein-archive.spec.ts`
- `tests/performance.spec.ts`

**Files:**

- Modify: `docs/plans/2026-02-27-codebase-diagnostic-report.md` (Section 3, Shared & Tests subsection)

**Step 1: Assess contracts**

- Are all API responses covered by a Zod schema?
- Are DTOs typed strictly or do they use `any`/loose types?
- Is there drift between what routes return and what contracts declare?

**Step 2: Assess tests**

- Do tests assert specific values or just "truthy"?
- Are edge cases covered (empty results, redacted content, large datasets)?
- Are there tests for the investigator-critical paths (search, entity relationships, evidence chain)?
- What is obviously NOT tested?

**Step 3: Write findings in Section 3 — Shared & Tests**

**Step 4: Commit**

```bash
git add docs/plans/2026-02-27-codebase-diagnostic-report.md
git commit -m "docs: diagnostic — shared contracts & tests audit (Phase 2c)"
```

---

## Task 6: Phase 3 — Mission-Fit Assessment (UX & Investigator Utility)

This is the qualitative core. Read the app through the lens of a journalist trying to investigate a story using this dataset.

**Files to read (in addition to what was read in Tasks 3-5):**

- `src/client/pages/AnalyticsPage.tsx`
- `src/client/pages/FlightsPage.tsx`
- `src/client/components/investigation/` (scan)
- `src/server/routes/graphRoutes.ts`
- `src/server/routes/advancedAnalytics.ts`
- `README.md` or any onboarding docs (check root)

**Files:**

- Modify: `docs/plans/2026-02-27-codebase-diagnostic-report.md` (Section 4)

**Step 1: Assess each of the six mission-fit questions**

Verdict per question: **Working** / **Partial** / **Gap**

1. **Discoverability** — Is there a meaningful search experience? Can you search across documents, people, relationships simultaneously? Or are they siloed?
2. **Relationship traversal** — From a person page, can you navigate to: their connections → shared documents → other connected people? Is this one click or five?
3. **Data density vs. clarity** — Are redactions surfaced clearly? Are gaps in data (missing pages, unknown entities) labelled or silently absent?
4. **Evidence chain** — From any claim or relationship, can you reach the original source document with page reference? Or does provenance get lost?
5. **Cohesiveness** — Do Documents, People, Network, Email, Media, Timeline modules share consistent UX patterns (filters, sort, pagination, detail views)?
6. **Performance at scale** — Are there pagination limits? Virtualization? Or does loading 10,000 results freeze the UI?

**Step 2: Write Section 4 with verdicts and evidence**

For each question, cite specific files/components that support the verdict.

**Step 3: Commit**

```bash
git add docs/plans/2026-02-27-codebase-diagnostic-report.md
git commit -m "docs: diagnostic — mission-fit assessment (Phase 3)"
```

---

## Task 7: Data Utilisation & Visualisation Assessment

Assess whether the data model and visualisations actually surface the relationships in the corpus.

**Files to read:**

- `src/server/routes/graphRoutes.ts`
- `src/server/db/relationshipsRepository.ts`
- `src/client/components/` — look for graph/network/chart components
- `src/server/routes/financialRoutes.ts`
- `src/server/db/financialRepository.ts`
- `src/server/routes/mapRoutes.ts`

**Files:**

- Modify: `docs/plans/2026-02-27-codebase-diagnostic-report.md` (Section 5)

**Step 1: Assess these questions**

- Is there a network/graph visualisation? What does it show — all connections or filtered?
- Are relationship types distinct (financial, travel, communication, association) or collapsed into one?
- Are timelines generated from actual date fields or synthesised?
- Is financial data (transactions, amounts) surfaced visually or only in tables?
- Are geographic data (flights, properties) visualised on a map or only listed?
- Is the data model capturing the richest possible relationships, or are there obvious columns/joins that go unused in the UI?

**Step 2: Write Section 5**

**Step 3: Commit**

```bash
git add docs/plans/2026-02-27-codebase-diagnostic-report.md
git commit -m "docs: diagnostic — data utilisation & visualisation (Task 7)"
```

---

## Task 8: Module Interoperability Assessment

Assess whether modules share state, types, and patterns or operate as silos.

**Files to read:**

- `src/client/App.tsx`
- `src/client/contexts/` (all context files)
- `src/client/services/` (API client)
- `src/client/hooks/` (all hooks)
- `src/server/routes/investigations.ts`
- `src/server/db/investigationsRepository.ts`

**Files:**

- Modify: `docs/plans/2026-02-27-codebase-diagnostic-report.md` (Section 6)

**Step 1: Assess these questions**

- Is there a shared investigation/case context that ties documents, people, and evidence together? Or is each module standalone?
- Do modules share filter state (e.g., date range applied across Documents AND Emails AND Flights)?
- Is the API client a typed, centralised service, or do components fetch ad-hoc?
- Are context providers causing unnecessary re-renders (too many values in one context)?
- Are there circular dependencies between modules?
- Is there a consistent navigation pattern for cross-module links (e.g., person → their emails → related documents)?

**Step 2: Write Section 6**

**Step 3: Commit**

```bash
git add docs/plans/2026-02-27-codebase-diagnostic-report.md
git commit -m "docs: diagnostic — module interoperability (Task 8)"
```

---

## Task 9: Executive Summary & Top 10 Recommendations

Synthesise all findings into the executive summary and prioritised recommendations.

**Files:**

- Modify: `docs/plans/2026-02-27-codebase-diagnostic-report.md` (Sections 1 & 7)

**Step 1: Write Executive Summary (Section 1)**

3-5 bullet verdicts covering:

- Overall health score (0-10, honest)
- Biggest strength
- Most critical gap for investigators
- Biggest technical risk
- One-line verdict: "Is this a useful tool for investigators?"

**Step 2: Write Top 10 Recommendations (Section 7)**

Order by **investigator impact**, not engineering effort. Format:

```
### 1. [Title]
**Impact:** Why this matters to an investigator
**Finding:** Which task surfaced this
**Action:** What specifically to do (1-2 sentences)
**Effort:** S / M / L
```

**Step 3: Final commit**

```bash
git add docs/plans/2026-02-27-codebase-diagnostic-report.md
git commit -m "docs: diagnostic report — complete (executive summary + recommendations)"
```

---

## Severity Reference

| Severity     | Meaning                                                                |
| ------------ | ---------------------------------------------------------------------- |
| **Critical** | Broken or misleading for investigators — fix before relying on the app |
| **Warn**     | Degrades investigative utility — should be addressed                   |
| **Note**     | Improvement opportunity — nice to have                                 |

## What NOT To Do

- Do not fix anything while auditing — observe and record only
- Do not skip a file because it "looks fine" — read it and confirm
- Do not use vague findings ("could be improved") — cite file:line and explain impact
- Do not rate things charitably — this is an honest diagnostic, not a PR review
