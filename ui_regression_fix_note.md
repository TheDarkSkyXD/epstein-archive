# UI Regression Fix (Liquid Glass Restoration)

## What changed

- Restored shared liquid-glass tokens and utility recipes in `src/client/index.css`:
  - Added glass variables (`--glass-bg`, `--glass-border`, `--glass-highlight`, `--glass-shadow`, `--glass-blur`)
  - Added shared surfaces: `.surface-glass`, `.surface-glass-strong`, `.surface-glass-card`, `.surface-glass-header`
  - Added semantic risk classes: `.risk-critical`, `.risk-high`, `.risk-medium`, `.risk-low`, `.risk-minimal`, `.risk-unknown`
  - Added consistent control, chip, focus, and motion polish styles.
- Updated global header/search/nav in `src/client/App.tsx`:
  - Header now uses a translucent glass layer with blur and gradient depth.
  - Search is now a unified pill with embedded search action button (no hard divider).
  - Nav track/pill spacing and layout behavior improved; normal mode fills width cleanly, compact/icons mode prevents squish.
- Standardized risk semantics utility in `src/client/utils/riskSemantics.ts` and applied it to:
  - `src/client/components/pages/StatsDisplay.tsx`
  - `src/client/components/entities/cards/EvidenceBadge.tsx`
  - `src/client/components/email/EmailClient.tsx`
  - `src/client/components/entities/SubjectCardV2.tsx`
- Synced design tokens in `src/designTokens.ts` with restored accent/risk palette and glass blur values.

## Visual verification checklist

1. Header appears as glass (blur + subtle gradient), no harsh flat border.
2. Search control is a single pill; icon action is embedded; no vertical divider seam.
3. Top nav spacing is balanced and responsive; no trailing dead space near `About`.
4. Risk chips/markers are consistently color-coded (critical/high/medium/low/minimal/unknown).
5. Subject cards and KPI cards have layered depth (soft highlight + elevation) instead of flat rectangles.
6. Focus-visible states remain clear and touch targets stay at or above 44px for primary controls.

## Quality gates

- `pnpm -s lint` passed.
- `pnpm -s type-check` passed.
