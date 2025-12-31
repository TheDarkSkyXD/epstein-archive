# ⚖️ Data Governance & Forensic Accountability Charter

## 📜 1. Purpose & Principles
The Epstein Archive (v9.0.0) is committed to the highest standards of transparency and accountability in the handling of archival records. This charter documents our "Forensic Procedures" for data ingestion, enrichment, and modification.

### Core Principles:
- **Immutable Source**: Original document content (OCR text) is never deleted or altered. Enrichment happens in separate metadata layers.
- **Provenance First**: Every data point must be traceable back to a source file ID or court filing.
- **Minimal Intervention**: Modifications are limited to entity normalization (merging duplicates) and error correction, with all logic documented in open-source maintenance scripts.

---

## 📥 2. Ingestion & Extraction Procedures
- **Raw Processing**: We use a dual-engine OCR pipeline (Tesseract + PDFExtract) to ensure maximum text fidelity. In cases of disagreement, the engine with the higher confidence score is prioritized.
- **Metadata Tagging**: All documents are assigned a `Source Collection` tag (e.g., "DOJ Discovery", "Flight Logs") to maintain clear provenance.
- **Redaction Policy**: We treat redaction as a data point. The "Redaction Score" represents the percentage of obscured text, provided to show the completeness of the public record.

---

## 🧪 3. Data Enrichment Methodology
- **Red Flag Index (1-5)**: Ratings are calculated algorithmically based on keyword density (traffic, minor, financial, witness) and cross-referencing with known evidentiary hubs.
- **Fuzzy Linking**: We use pattern-matching algorithms to link extracted text to original PDF assets. We prioritize accuracy: link strength must meet a high threshold or remain "unlinked."
- **AI/Synthetic Filtering**: Images identified as synthetic or fraudulent are tagged as "AI Generated" and filtered from primary entity profiles to prevent the spread of misinformation.

---

## 🧹 4. Entity Resolution & Modification
- **Normalization**: Names are merged (e.g., "D. Trump" → "Donald Trump") only when there is high confidence of historical identity.
- **Junk Removal**: OCR noise (artifacts that are not names) is aggressively cleaned using regex patterns documented in `scripts/deep_cleanup_junk_entities.ts`.
- **Relationship Mapping**: Proximity-based relationship scoring is transparent and based on co-occurrence within the same document or sentence.

---

## 🛡️ 5. Accountability & Auditing
- **Scripted Maintenance**: Every "cleanup" or "merge" is performed by a script in the `scripts/` directory, allowing for full auditability of how data was transformed.
- **Public Disclosure**: This documentation is live and linked directly from the application's "About" page to ensure the end researcher understands the processing history of any record.
- **Continual Audit**: Database statistics and integrity counts are verified before every production deployment.
