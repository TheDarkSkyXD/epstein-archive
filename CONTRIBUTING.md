# Contributing to Epstein Archive

Thank you for your interest in contributing! We aim to make this codebase as accessible as possible.

## 📂 Repository Structure

We organize our React components by domain in `src/components/` to keep things tidy:

- **`common/`**: Reusable generic UI (Buttons, Cards, Icons, Modals).
- **`layout/`**: Application shell (Header, Footer, Navigation).
- **`visualizations/`**: D3/Recharts data visualizations (Graphs, Maps, Charts).
- **`entities/`**: UI specifically for displaying Persons/Organizations (Cards, Panels).
- **`documents/`**: Document viewing, listing, and annotation tools.
- **`investigation/`**: The core workspace for analysts (Boards, Timelines).
- **`media/`**: Audio/Video players and browsers.
- **`pages/`**: Route-level page components.

## 🛠️ Development Workflow

1.  **Dependencies**: We use `pnpm` (Node v18+).
2.  **Database**:
    - Use `sample.db` for UI work (lightweight).
    - Use full `epstein-archive.db` for heavy data analysis/ingestion work.
3.  **Commands**:
    - `pnpm dev`: Start dev server.
    - `pnpm type-check`: Verify TypeScript types.
    - `pnpm lint`: Run ESLint.

## 🎨 Coding Standards

- **TypeScript**: We use strict mode. Avoid `any` where possible.
- **Styling**: TailwindCSS for styling.
- **Files**: PascalCase for components (`MyComponent.tsx`), camelCase for hooks/utils.

## 🤝 Questions?

Check `GETTING_STARTED.md` for setup help, or open an issue!
