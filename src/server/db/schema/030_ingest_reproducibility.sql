-- 030_ingest_reproducibility.sql
-- Phase 1 - Ingestion Reproducibility Spine

PRAGMA foreign_keys=OFF;

-- 1. Ingest Runs Table
CREATE TABLE IF NOT EXISTS ingest_runs (
  id TEXT PRIMARY KEY, -- UUID or ULID
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  finished_at DATETIME,
  status TEXT CHECK(status IN ('running', 'success', 'failed')),
  git_commit TEXT,
  schema_version TEXT,
  pipeline_version TEXT,
  extractor_versions JSON,
  ocr_versions JSON,
  agentic_enabled BOOLEAN,
  agentic_model_id TEXT,
  agentic_prompt_version TEXT,
  agentic_params JSON,
  notes TEXT
);

-- 2. Document Spans (Promoted to first-class)
CREATE TABLE IF NOT EXISTS document_spans (
  id TEXT PRIMARY KEY,
  document_id INTEGER NOT NULL,
  page_number INTEGER,
  start_offset INTEGER,
  end_offset INTEGER,
  extraction_method TEXT CHECK(extraction_method IN ('pdf_native', 'ocr', 'email_parser', 'other')),
  confidence REAL CHECK(confidence >= 0 AND confidence <= 1),
  text_hash TEXT,
  ingest_run_id TEXT,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (ingest_run_id) REFERENCES ingest_runs(id) ON DELETE SET NULL
);

-- 3. Entity Mentions (Promoted to first-class)
-- We use a new table name to avoid conflict with legacy entity_mentions if necessary,
-- but the user asked for entity_mentions. 
-- Let's rename legacy if it exists.
ALTER TABLE entity_mentions RENAME TO entity_mentions_legacy;

CREATE TABLE IF NOT EXISTS entity_mentions (
  id TEXT PRIMARY KEY,
  entity_id INTEGER NOT NULL,
  document_id INTEGER NOT NULL,
  span_id TEXT,
  start_offset INTEGER, -- Offsets relative to document text
  end_offset INTEGER,
  surface_text TEXT,
  mention_type TEXT, -- person/org/location/alias/other
  confidence REAL CHECK(confidence >= 0 AND confidence <= 1),
  ingest_run_id TEXT,
  FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (span_id) REFERENCES document_spans(id) ON DELETE CASCADE,
  FOREIGN KEY (ingest_run_id) REFERENCES ingest_runs(id) ON DELETE SET NULL
);

-- 4. Evidence Pack for Relationships
-- Existing table is 'entity_relationships'
ALTER TABLE entity_relationships ADD COLUMN ingest_run_id TEXT;
ALTER TABLE entity_relationships ADD COLUMN evidence_pack_json JSON;

-- 5. Claim Triples extension (used in pipeline)
ALTER TABLE claim_triples ADD COLUMN ingest_run_id TEXT;

PRAGMA foreign_keys=ON;
