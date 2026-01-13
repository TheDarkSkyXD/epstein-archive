# 🗺️ User Journey Mapping: Persona Analysis (V9.0.0)

## 👤 Persona 1: The Independent Researcher / Journalist

**Goal**: Find specific evidence to corroborate a witness statement.

- **Journey**:
  1.  Search for a specific entity (e.g., "Sarah Kellen").
  2.  Filter documents by "Red Flag Rating" (4-5) to find depositions.
  3.  Open the **Integrated Document Viewer**.
  4.  Use the **Side-by-Side View** to verify the extracted text against the original signed PDF.
  5.  Add the document to an **Investigation Workspace** to track the hypothesis.
- **UX Rationale**: Need high-fidelity provenance and easy export for reporting.

---

## 👤 Persona 2: The Casual Public User

**Goal**: Understand the scale and basic facts of the case.

- **Journey**:
  1.  Browse the **Timeline** to see major release milestones (e.g., Jan 2024 unsealing).
  2.  Click on a "Key Figure" (e.g., "Prince Andrew") from a Person Card.
  3.  View the **Flight Log Integration** to see flight frequency.
  4.  Read the **About Page** to understand what documents actually exist.
- **UX Rationale**: Need low-friction Discovery paths and clear "Basics" summaries.

---

## 👤 Persona 3: The Developer / System Builder (AI or Human)

**Goal**: Extend the data pipeline or fix a production issue.

- **Journey**:
  1.  Consult the **Technical Reference** for schema details.
  2.  Check the **Wiki** for deployment port strategies (3012 vs 8080).
  3.  Verify **Media Integrity** using the `check_media_404s.ts` script.
  4.  Update the version in `package.json` and generate release notes.
- **UX Rationale**: Need deep-linkable documentation and clear CLI tool signatures.
