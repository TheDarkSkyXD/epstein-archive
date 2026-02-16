# AGENTS.md

Repository-wide operating standard for human contributors and AI coding agents.

## 1. Scope And Precedence

This file applies to the entire repository unless a deeper-path `AGENTS.md` overrides parts of it.

Instruction priority:

1. Direct user request
2. Deeper-path `AGENTS.md`
3. This root `AGENTS.md`
4. Other project docs (`README.md`, `TECHNICAL_OVERVIEW.md`, etc.)

When instructions conflict, follow the highest-priority source and state the tradeoff briefly.

## 2. Project Intent

Epstein Archive is an investigative platform, not a neutral content browser.

Primary product goals:

- Surface high-signal evidence quickly.
- Preserve provenance and explainability.
- Prioritize data quality and entity consolidation.
- Keep workflows calm, readable, and reliable under pressure.

## 3. Core Principles

Design principles:

- Simplicity over ornament.
- Hierarchy over container nesting.
- Mobile-first, desktop-enriched.
- No sharp corners; consistent radius tokens only.
- Consistent iconography (Lucide), no emoji UI indicators.

Investigative principles:

- Bias toward relevance is intentional.
- Do not hide consequential evidence behind neutral styling.
- Label inference clearly.
- Favor deterministic behavior over cleverness.

## 4. Engineering Rules

- No schema changes unless explicitly requested.
- No API contract breaks unless explicitly requested.
- No feature removal unless explicitly requested.
- Keep DOM shallow; avoid unnecessary wrappers.
- Maintain or improve performance for touched flows.
- Meet WCAG AA minimum on touched UI.
- Prefer explicit code over dense abstractions.

## 5. Markdown Standards (All `.md` Files)

Use these standards for every markdown file in this repo (`release_notes.md`, docs in `/docs`, guides, runbooks, etc.):

- One H1 per file.
- Use sentence-case headings.
- Use consistent date format: `YYYY-MM-DD`.
- Keep bullets flat and concise.
- Prefer task-oriented writing and concrete commands.
- Avoid marketing language and filler.
- Keep examples executable and copy-safe.

For technical docs:

- Include purpose, prerequisites, commands, expected result, rollback path.
- Document assumptions and environment specifics.

For process docs:

- Define owner, trigger, steps, and failure handling.

## 6. Release and deployment discipline

For every release/deploy:

- Update `release_notes.md` before deploy.
- Add a new top entry using this exact heading format:
  - `## vX.Y.Z - YYYY-MM-DD - Descriptive Title`
- Do not duplicate versions.
- Avoid generic titles like “Maintenance Release” for major work.
- Summaries must reflect real shipped changes, not intent.
- Release notes must be user-facing only: never include internal file paths, local machine paths, repo structure, or implementation-only details.

Versioning:

- Patch: fixes and small improvements.
- Minor: user-visible feature or UX/system improvements.
- Major: breaking or fundamental architecture shifts.

Deployment:

- Canonical command: `./deploy.sh`
- “Deploy” means production unless explicitly told otherwise.

## 7. Data quality priorities

Entity quality is a top-level concern.

- Preserve and improve VIP-first surfacing rules.
- Ensure prominent entities have complete metadata (bio/role/aliases).
- Consolidate full-name variants, initials, misspellings, honorifics, and nicknames.
- Favor canonical identity resolution over duplicate display entities.
- Never reduce investigative coverage to simplify UI.

## 8. UI system baseline

Required baseline for touched frontend work:

- Use shared design tokens (radius/spacing/typography/color).
- Radius tokens only: `sm`, `md`, `lg`.
- Minimum interactive target size: 44px.
- Strong focus-visible states.
- Skeletons over spinners where feasible.
- Stable layout while loading.

## 9. Preferred workflow for agents

1. Read relevant code and local `AGENTS.md` files.
2. Identify constraints and risks first.
3. Make minimal coherent changes.
4. Validate with typecheck/tests/build as available.
5. Update docs/release notes if release-impacting.
6. Report what changed, what was verified, and what remains.

## 10. ULTRATHINK trigger mode

If the user explicitly says `ULTRATHINK`:

- Increase depth of analysis.
- Stress test assumptions and second-order effects.
- Evaluate security, evidentiary integrity, and reputational risk.
- Still return concrete actions and implementation decisions.

## 11. Mission-Critical Reliability Rules

Adopt the intent of mission-critical software discipline with stack-appropriate adaptation:

- Zero compiler/type warnings on touched code (`tsc`, lint).
- Zero new static-analysis warnings in CI.
- Check all meaningful return values and error paths.
- Every loop must have a clear upper bound or explicit termination condition.
- Prefer non-recursive solutions in hot paths; recursion is allowed only when depth is bounded and tested.
- Keep functions small and readable; split complex logic rather than enforcing a hard line-count limit.
- Add assertions/guards at trust boundaries and critical invariants (API input, parsing, persistence, auth, critical transforms).
- In JS/TS, treat `any`, unchecked casts, and nullable access as reliability hazards; minimize and guard them explicitly.
