## v12.0.0 — 2026-02-02

### Massive Department of Justice (DOJ) Archive Consolidation
- **Archive Expansion**: Successfully integrated and consolidated DOJ datasets 10, 11, and 12, adding tens of thousands of pages of previously fragmented evidence into the centralized corpus.
- **Unified Discovery Structure**: Standardized the organizational structure for DOJ materials, ensuring seamless cross-referencing and data integrity across all discovery volumes.

### Advanced Forensic Analysis Workspace
- **Forensic Investigation Suite**: Launched a full-spectrum analytical dashboard designed for complex investigative workflows:
  - **Financial Transaction Mapper**: Visualizes financial flows between entities, highlighting offshore transfers, potential layering, and high-risk transactions.
  - **Multi-Source Correlation Engine**: Cross-references entity mentions across the entire archive to verify facts and surface hidden connections.
  - **Forensic Report Generator**: Automated generation of comprehensive investigative summaries, supported by algorithmic authenticity scoring.
- **Evidence Integrity & Chain of Custody**: Introduced a verifiable provenance tracking system. Documents now maintain cryptographic SHA-256 integrity hashes and chronological logs of every analytical action or validation step.

### Backend Investigative Intelligence
- **Advanced Analytics Engine**: New intelligence layer providing automated investigative insights:
  - **Pattern Recognition**: Detects recurring entity co-occurrences and behavioral patterns across documents.
  - **Anomaly Detection**: Highlights high-risk materials based on unusual network connectivity or metadata inconsistencies.
  - **Predictive Risk Assessment**: Quantitatively scores entities based on their role, associations, and presence in red-flagged documents.
- **Content-Aware Forensic Analysis**: Upgraded the analysis engine to perform deep-text scanning for sensitive keywords and investigative signals, replacing randomized scoring with verifiable analytical metrics.

### Unified Intelligent Pipeline
- **Evidence-First Architecture**: Refined the ingestion pipeline to prioritize the connection between extracted people, places, and events and their specific supporting evidence within the archive.
- **Deep Semantic Extraction**: Enhanced the ability to identify the precise nature and strength of relationships between entities, providing a more navigable social graph.

---

## v11.7.0 (2026-02-02) - Bios, Codewords & Consolidation

### New Features

- **Entity Bio Integration**: Entity cards now display `bio`, `birthDate`, and `deathDate` (where available), providing immediate biographical context. Use of `break-words` ensures readability on mobile.
- **Codeword Discovery**: Explicitly identified 11 circle codewords (e.g., "Hotdog", "Pizza", "Map") as `Term` entities with "Key" icons. Bios for these terms explain their use as obfuscation tactics.
- **VIP Consolidation (Netanyahu)**: Added "Benjamin Netanyahu" to the VIP rules engine with aggressive alias matching (Bibi, Benjamin Nitay, etc.) to ensure fragmented references are consolidated into a single canonical entity profile.
- **Search Logic Update**: Fixed `ingest_intelligence.ts` to correctly persist `aliases` to the database, ensuring that searching for nicknames (e.g., "Bibi") correctly retrieves the canonical entity.

### Improvements

- **Media Gallery Polish**: Fixed a visual flicker in the `PhotoBrowser` by optimizing the loading spinner logic. The full-screen overlay now only appears on initial load, using a discreet spinner for updates.
- **Mobile UX**: Refined `MobileMenu` with a premium glassmorphism design and improved touch targets.

---
