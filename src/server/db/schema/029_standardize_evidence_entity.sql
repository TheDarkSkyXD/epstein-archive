-- Standardize evidence_entity with entity_mentions
-- 1. Rename context_snippet to mention_context
-- 2. Ensure consistency in naming conventions

PRAGMA foreign_keys=OFF;

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

PRAGMA foreign_keys=ON;
