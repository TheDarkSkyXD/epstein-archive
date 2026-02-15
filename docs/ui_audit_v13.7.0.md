# UI Audit - v13.7.0

## Scope

- Homepage shell and global design primitives
- People grid
- Entity modal
- Email client
- Document viewer and document modal

## Design Token System

- Radius tokens: `--radius-sm`, `--radius-md`, `--radius-lg`
- Spacing scale: `--space-1` through `--space-8`
- Typography scale: `--text-xs` through `--text-3xl`
- Dark-first color system in CSS variables for background, surface, border, text, accent
- Shared UI primitives: `surface-glass`, `surface-quiet`, `control`, `chip`

## Before vs After (Clarity)

- Before: multiple local style patterns with mixed radii, repeated nested card wrappers, and emoji iconography in key workflows.
- After: single design language for surfaces and controls, icon consistency, stronger hierarchy in top-level views, and cleaner mobile control layout.

## Visual Audit Checklist

- [x] Three-token radius system defined globally and used in updated surfaces.
- [x] No sharp corners in updated core flows (People, Entity modal, Email, Document modal/viewer).
- [x] Emoji indicators replaced in updated primary flows (sort controls, risk indicators, metadata AI/risk badges).
- [x] Nested-box pressure reduced in updated views by flattening presentation layers.

## Accessibility Checklist (WCAG AA Baseline)

- [x] Focus-visible outline style standardized globally.
- [x] Interactive control height set to 44px minimum through `.control` on updated surfaces.
- [x] Contrast improved on updated dark surfaces using tokenized text/border colors.
- [x] Icon-only controls in updated modals include accessible labels where required.

## Performance Checklist

- [x] No new schema/API contract changes.
- [x] No heavy DOM wrapper additions in updated components.
- [x] Existing data-loading behavior preserved.
- [x] Styling consolidation reduces duplicated class complexity on touched screens.

## Follow-up Pass (Recommended)

- Extend tokenized classes to remaining legacy pages not touched in this release.
- Replace remaining emoji usage in low-priority/admin/legacy screens.
- Add visual regression snapshots for core mobile breakpoints.
