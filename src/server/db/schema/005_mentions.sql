CREATE TABLE IF NOT EXISTS entity_mentions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_id INTEGER NOT NULL,
  document_id INTEGER NOT NULL,
  mention_count INTEGER DEFAULT 1,
  context_snippet TEXT,
  first_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(entity_id) REFERENCES entities(id) ON DELETE CASCADE,
  FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE,
  UNIQUE(entity_id, document_id)
);

CREATE INDEX IF NOT EXISTS idx_mentions_entity ON entity_mentions(entity_id);
CREATE INDEX IF NOT EXISTS idx_mentions_document ON entity_mentions(document_id);
