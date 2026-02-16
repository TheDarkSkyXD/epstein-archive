# Investigations Domain Layer Smoke Paths

## 1) Workspace + board shell-first load

1. Open `/investigations/:id`.
2. Confirm workspace renders immediately and tab chrome is visible before heavy panels finish.
3. Open `Investigation Board` and verify the board shell appears first, then evidence/hypotheses hydrate progressively.

## 2) Case folder evidence click wiring

1. Open `Case Folder` tab.
2. Click a document evidence row: `DocumentModal` opens.
3. Click an entity evidence row: `EvidenceModal` opens.
4. Close modal and confirm focus returns to the original row.
5. If an item has a missing source, confirm warning toast appears and admins get `Remove link` action.

## 3) Deep-link reconstruction

1. Paste one of:
   - `/investigate/case/:id/evidence/:evidenceId`
   - `/investigations/:id/evidence/:evidenceId`
   - `/investigations/:id?evidenceId=:evidenceId`
2. Confirm case loads, `Case Folder` tab becomes active, deep-linked row is highlighted, and viewer opens.
3. Close viewer and verify you remain in case context.

## 4) Add-to-investigation event flow

1. Trigger `add-to-investigation` from another module.
2. Confirm evidence is added and success toast appears.
3. If current case is target, confirm evidence list and case folder both refresh.

## 5) Regression sanity

1. Create a new investigation from workspace.
2. Confirm it becomes selected and URL updates to `/investigations/:shareId`.
3. Confirm no dead CTA in Investigations tabs (disabled controls must include gating reason).
