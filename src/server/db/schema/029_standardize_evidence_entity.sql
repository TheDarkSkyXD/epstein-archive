-- Standardize evidence_entity with entity_mentions
-- 1. Rename context_snippet to mention_context
-- 2. Ensure consistency in naming conventions

PRAGMA foreign_keys=OFF;

-- Drop dependent and broken views
DROP VIEW IF EXISTS evidence_summary;
DROP VIEW IF EXISTS document_redaction_stats;

-- Create temporary table with new schema
CREATE TABLE evidence_entity_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  evidence_id INTEGER NOT NULL,
  entity_id INTEGER NOT NULL,
  role TEXT, -- sender, recipient, mentioned, subject, passenger, deponent, etc.
  confidence REAL CHECK(confidence >= 0.0 AND confidence <= 1.0),
  mention_context TEXT, -- Renamed from context_snippet
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (evidence_id) REFERENCES evidence(id) ON DELETE CASCADE,
  FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE,
  UNIQUE(evidence_id, entity_id, role)
);

-- Copy data
INSERT INTO evidence_entity_new (id, evidence_id, entity_id, role, confidence, mention_context, created_at)
SELECT id, evidence_id, entity_id, role, confidence, context_snippet, created_at
FROM evidence_entity;

-- Drop old table and rename new one
DROP TABLE evidence_entity;
ALTER TABLE evidence_entity_new RENAME TO evidence_entity;

-- Recreate indexes
CREATE INDEX idx_evidence_entity_evidence ON evidence_entity(evidence_id);
CREATE INDEX idx_evidence_entity_entity ON evidence_entity(entity_id);
CREATE INDEX idx_evidence_entity_role ON evidence_entity(role);

-- Recreate dependent views
CREATE VIEW evidence_summary AS
      SELECT 
        e.id,
        e.evidence_type,
        e.title,
        e.original_filename,
        e.created_at,
        e.red_flag_rating,
        e.word_count,
        e.file_size,
        COUNT(DISTINCT ee.entity_id) as entity_count,
        GROUP_CONCAT(DISTINCT ent.full_name) as entity_names
      FROM evidence e
      LEFT JOIN evidence_entity ee ON e.id = ee.evidence_id
      LEFT JOIN entities ent ON ee.entity_id = ent.id
      GROUP BY e.id;

-- Recreate/Fix broken document_redaction_stats view
CREATE VIEW document_redaction_stats AS
SELECT 
  d.id,
  d.file_name as filename, -- Mapping to expected alias
  d.file_path,
  d.redaction_count,
  d.has_redactions,
  COUNT(dr.id) as actual_redaction_count,
  SUM(CASE WHEN dr.redaction_type = 'visual_redaction' THEN 1 ELSE 0 END) as visual_redactions,
  SUM(CASE WHEN dr.redaction_type = 'text_gap' THEN 1 ELSE 0 END) as text_gaps,
  MAX(dr.page_number) as max_redacted_page
FROM documents d
LEFT JOIN document_redactions dr ON d.id = dr.document_id
WHERE d.has_redactions = 1 OR d.redaction_count > 0
GROUP BY d.id;

PRAGMA foreign_keys=ON;
