-- Main entities table
CREATE TABLE IF NOT EXISTS entities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  primary_role TEXT,
  secondary_roles TEXT,
  likelihood_level TEXT CHECK(likelihood_level IN ('HIGH', 'MEDIUM', 'LOW')),
  mentions INTEGER DEFAULT 0,
  current_status TEXT,
  connections_summary TEXT,
  spice_rating INTEGER CHECK(spice_rating >= 0 AND spice_rating <= 5),
  spice_score INTEGER DEFAULT 0,
  title TEXT,
  role TEXT,
  title_variants TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Evidence types lookup
CREATE TABLE IF NOT EXISTS evidence_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type_name TEXT UNIQUE NOT NULL,
  description TEXT
);

-- Entity evidence types (many-to-many)
CREATE TABLE IF NOT EXISTS entity_evidence_types (
  entity_id INTEGER,
  evidence_type_id INTEGER,
  PRIMARY KEY (entity_id, evidence_type_id),
  FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE,
  FOREIGN KEY (evidence_type_id) REFERENCES evidence_types(id) ON DELETE CASCADE
);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL UNIQUE,
  file_type TEXT,
  file_size INTEGER,
  date_created TEXT,
  date_modified TEXT,
  content_preview TEXT,
  evidence_type TEXT,
  mentions_count INTEGER DEFAULT 0,
  content TEXT,
  metadata_json TEXT,
  word_count INTEGER,
  spice_rating INTEGER,
  content_hash TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Entity mentions in documents (many-to-many relationship)
CREATE TABLE IF NOT EXISTS entity_mentions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_id INTEGER NOT NULL,
  document_id INTEGER NOT NULL,
  mention_context TEXT NOT NULL,
  mention_type TEXT DEFAULT 'mention',
  page_number INTEGER,
  position_in_text INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  context_type TEXT DEFAULT 'mention',
  context_text TEXT DEFAULT '',
  keyword TEXT,
  position_start INTEGER,
  position_end INTEGER,
  significance_score INTEGER DEFAULT 1,
  FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- Timeline events
CREATE TABLE IF NOT EXISTS timeline_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_id INTEGER NOT NULL,
  event_date TEXT,
  event_description TEXT,
  event_type TEXT,
  document_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL
);

-- Full-text search virtual table for entities
CREATE VIRTUAL TABLE IF NOT EXISTS entities_fts USING fts5(
  full_name,
  primary_role,
  secondary_roles,
  connections_summary,
  content='entities',
  content_rowid='id'
);

-- Full-text search virtual table for documents
CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
  file_name,
  content_preview,
  evidence_type,
  content,
  content='documents',
  content_rowid='id'
);

-- Triggers to keep FTS tables in sync
CREATE TRIGGER IF NOT EXISTS entities_fts_insert AFTER INSERT ON entities BEGIN
  INSERT INTO entities_fts(rowid, full_name, primary_role, secondary_roles, connections_summary)
  VALUES (NEW.id, NEW.full_name, NEW.primary_role, NEW.secondary_roles, NEW.connections_summary);
END;

CREATE TRIGGER IF NOT EXISTS entities_fts_update AFTER UPDATE ON entities BEGIN
  UPDATE entities_fts SET 
    full_name = NEW.full_name,
    primary_role = NEW.primary_role,
    secondary_roles = NEW.secondary_roles,
    connections_summary = NEW.connections_summary
  WHERE rowid = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS entities_fts_delete AFTER DELETE ON entities BEGIN
  DELETE FROM entities_fts WHERE rowid = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS documents_fts_insert AFTER INSERT ON documents BEGIN
  INSERT INTO documents_fts(rowid, file_name, content_preview, evidence_type, content)
  VALUES (NEW.id, NEW.file_name, NEW.content_preview, NEW.evidence_type, NEW.content);
END;

CREATE TRIGGER IF NOT EXISTS documents_fts_update AFTER UPDATE ON documents BEGIN
  UPDATE documents_fts SET 
    file_name = NEW.file_name,
    content_preview = NEW.content_preview,
    evidence_type = NEW.evidence_type,
    content = NEW.content
  WHERE rowid = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS documents_fts_delete AFTER DELETE ON documents BEGIN
  DELETE FROM documents_fts WHERE rowid = OLD.id;
END;

-- Entity Summary View
DROP VIEW IF EXISTS entity_summary;
CREATE VIEW entity_summary AS
SELECT 
    e.id,
    e.full_name,
    e.primary_role,
    e.likelihood_level,
    e.mentions,
    e.spice_rating,
    e.spice_score,
    e.title,
    e.role,
    e.title_variants,
    (
      SELECT GROUP_CONCAT(type_name)
      FROM (
        SELECT DISTINCT et.type_name AS type_name
        FROM entity_evidence_types eet2
        JOIN evidence_types et ON eet2.evidence_type_id = et.id
        WHERE eet2.entity_id = e.id
      ) AS distinct_types
    ) AS evidence_types,
    COUNT(DISTINCT em.document_id) as document_count,
    COUNT(DISTINCT em.id) as mention_count
FROM entities e
LEFT JOIN entity_mentions em ON e.id = em.entity_id
GROUP BY e.id;
