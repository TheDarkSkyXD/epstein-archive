# Codebase Diagnostic Design

**Date:** 2026-02-27
**Version:** 14.7.0
**Purpose:** Honest diagnostic of the Epstein Archive — code quality, UX, data utilisation, module interoperability, and investigator utility.

---

## Objective

Produce an honest, evidence-based diagnostic of the Epstein Archive codebase across five dimensions:

1. Code quality
2. User experience and cohesiveness
3. Data utilisation and visualisation
4. Module interoperability
5. Investigator/journalist utility — is this a useful tool for plumbing a 300GB+ corpus?

The deliverable is a diagnostic report (`docs/plans/2026-02-27-codebase-diagnostic.md`) with findings and top 10 recommendations ordered by impact.

---

## Approach: Layered Hybrid (Automated + Manual)

### Phase 1 — Automated Metrics Collection

Run the existing toolchain to surface objective findings:

| Tool            | Command                 | What it surfaces                                 |
| --------------- | ----------------------- | ------------------------------------------------ |
| TypeScript      | `pnpm type-check`       | Type errors across client/server/shared          |
| ESLint          | `pnpm lint`             | Code style and quality violations                |
| Boundary check  | `pnpm check:boundaries` | Client importing server-only code                |
| CI gates        | `pnpm ci:pg:nuclear`    | PG guard + schema hash integrity                 |
| Contract tests  | `pnpm test:contracts`   | API contract drift                               |
| Bundle analysis | vite build analysis     | Chunk sizes, vendor bloat                        |
| Slow query scan | Manual grep             | Missing indexes, N+1 patterns, unbounded queries |

### Phase 2 — Manual Layered Audit

Sample 3-5 files per architectural layer:

| Layer               | Files                                                 | Dimensions assessed                          |
| ------------------- | ----------------------------------------------------- | -------------------------------------------- |
| Client pages        | Documents, entities, network/relations, email, search | UX cohesion, data surfacing, navigation      |
| Client components   | Data viz, modals, filters, tables                     | Reusability, consistency, accessibility      |
| Server routes       | All `src/server/routes/` files                        | API design, error handling, input validation |
| Server repositories | Entities, documents, relationships repos              | Query quality, N+1, missing indexes          |
| Shared contracts    | DTOs, Zod schemas                                     | Type safety, contract completeness           |
| Scripts             | Ingest pipeline, intelligence stage                   | Robustness, error handling, data fidelity    |
| Tests               | E2e, contract, smoke                                  | Coverage gaps, false confidence              |

### Phase 3 — Mission-Fit Assessment

Six investigator-utility questions, each with a verdict: **Working / Partial / Gap**

1. **Discoverability** — Can a journalist find a person, document, or relationship without knowing what to search for?
2. **Relationship traversal** — Can you follow a thread? Entity → connections → documents → other entities?
3. **Data density vs. clarity** — Is the volume of data helpful or overwhelming? Are redactions and gaps labelled honestly?
4. **Evidence chain** — Can a user trace a claim back to source material (original PDF, email, page number)?
5. **Cohesiveness** — Do modules (documents, entities, network, email, media) feel like one investigation tool or disconnected features?
6. **Performance at scale** — Does the app stay usable with large result sets?

---

## Output: Diagnostic Report Structure

```
1. Executive Summary          — 3-5 bullet verdicts, overall health score
2. Automated Metrics          — hard numbers from Phase 1 tools
3. Code Quality Findings      — per-layer issues with severity
4. UX & Investigator Utility  — Phase 3 verdicts with evidence
5. Data Utilisation & Viz     — relationship surfacing, graph quality
6. Module Interoperability    — cross-module coupling, contract gaps
7. Top 10 Recommendations     — ordered by impact, not effort
```

**Severity scale:**

- **Critical** — broken or misleading for users
- **Warn** — degrades utility
- **Note** — improvement opportunity

---

## Success Criteria

- Every section backed by specific file references and line numbers where applicable
- Each recommendation tied to a concrete finding (no generic advice)
- Mission-fit verdicts honest — including where the app is genuinely strong
