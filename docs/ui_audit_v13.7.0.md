# UI Audit - v13.7.0

## Scope

- Homepage shell and global design primitives
- People grid
- Entity modal
- Email client
- Document viewer and document modal
- Release notes modal
- About page iconography and readability surfaces

## Enforcement audit findings

### Violations found

- Design drift: mixed legacy radius utilities (`rounded-lg`, `rounded-xl`, `rounded-2xl`) across core and adjacent surfaces.
- Icon drift: emoji indicators still present in investigative UI (`DocumentBrowser`, `DocumentContentRenderer`, `AboutPage`, release timeline bullets).
- Modal stability: release notes panel did not lock background scroll, causing dual-scroll behavior behind overlay.
- Accessibility drift: icon-only actions without explicit labels/tooltips in some critical controls.
- Layout hierarchy: repeated nested sub-surfaces in high-density views (cards-within-cards), especially in document/detail pathways.

### Files touched in enforcement pass

- `/src/index.css`
- `/src/pages/PeoplePage.tsx`
- `/src/components/pages/StatsDisplay.tsx`
- `/src/components/entities/SubjectCardV2.tsx`
- `/src/components/common/EvidenceModal.tsx`
- `/src/components/documents/DocumentModal.tsx`
- `/src/components/evidence/DocumentViewer.tsx`
- `/src/components/documents/DocumentContentRenderer.tsx`
- `/src/components/documents/DocumentBrowser.tsx`
- `/src/components/email/EmailClient.tsx`
- `/src/components/ReleaseNotesPanel.tsx`
- `/src/components/pages/AboutPage.tsx`
- `/scripts/token_compliance.ts`
- `/scripts/ship_checklist.ts`

## Design Token System

- Radius tokens: `--radius-sm`, `--radius-md`, `--radius-lg`
- Spacing scale: `--space-1` through `--space-8`
- Typography scale: `--text-xs` through `--text-3xl`
- Dark-first color system in CSS variables for background, surface, border, text, accent
- Shared UI primitives: `surface-glass`, `surface-quiet`, `control`, `chip`

## Before vs After (Clarity)

- Before: multiple local style patterns with mixed radii, repeated nested card wrappers, and emoji iconography in key workflows.
- After: single design language for surfaces and controls, icon consistency, stronger hierarchy in top-level views, and cleaner mobile control layout.

## What was fixed in this pass

- Added reduced-motion guardrails (`prefers-reduced-motion`) and preserved visible focus states.
- Normalized People controls into a compact, always-visible filter tray with explicit sort-state visibility.
- Simplified Subject cards to identity + key signals + actions with reduced nested shelling.
- Rebalanced stats toward investigative signal (risk + mentions + documents) with icon + label cues.
- Improved modal behavior in release notes panel:
  - background scroll lock active while open
  - consistent close control and dialog semantics
  - cleaner timeline indicators with icons instead of glyph bullets
- Removed emoji signaling in touched high-priority surfaces (About, Document content/browser, release notes).
- Added explicit aria labels/titles on key icon-only email thread actions.

## Visual Audit Checklist

- [x] Three-token radius system defined globally and used in updated surfaces.
- [x] No sharp corners in updated core flows (People, Entity modal, Email, Document modal/viewer).
- [x] Emoji indicators replaced in updated primary flows (sort controls, risk indicators, metadata AI/risk badges).
- [x] Nested-box pressure reduced in updated views by flattening presentation layers.
- [x] Release notes overlay no longer leaves background content scrollable.

## Accessibility Checklist (WCAG AA Baseline)

- [x] Focus-visible outline style standardized globally.
- [x] Interactive control height set to 44px minimum through `.control` on updated surfaces.
- [x] Contrast improved on updated dark surfaces using tokenized text/border colors.
- [x] Icon-only controls in updated modals include accessible labels where required.
- [x] Reduced-motion preference now respected globally for animation/transition-heavy flows.

## Performance Checklist

- [x] No new schema/API contract changes.
- [x] No heavy DOM wrapper additions in updated components.
- [x] Existing data-loading behavior preserved.
- [x] Styling consolidation reduces duplicated class complexity on touched screens.
- [x] No additional expensive blur layers introduced in updated modals and core surfaces.

## Guardrails added

- New script: `/scripts/token_compliance.ts`
  - error-level: emoji usage and raw color literals in enforced surfaces
  - warning-level: legacy radius utility classes
- Integrated into `/scripts/ship_checklist.ts` as a required check.

## Before/after screenshot checklist (acceptance criteria)

- People page mobile:
  - one compact filter tray visible
  - clear active sort state
  - thumb-friendly pagination controls
- Entity modal:
  - identity-first header remains fixed
  - one vertical scroll axis in body
- Document modal:
  - action row is stable and consistent
  - tabs clear and non-jittery
  - no emoji risk markers
- Email client:
  - single-pane drill-in on mobile
  - split-view coherence on desktop
  - icon-only actions have accessible names
- Release notes:
  - opening panel does not allow underlying page to scroll
  - timeline badges and bullets use icons, not emoji/glyph artifacts

## Follow-up Pass (Recommended)

- Extend tokenized classes to remaining legacy pages not touched in this release.
- Replace remaining emoji usage in low-priority/admin/legacy screens.
- Add visual regression snapshots for core mobile breakpoints.
