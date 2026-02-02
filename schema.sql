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
  date_taken DATETIME,
  date_added DATETIME DEFAULT CURRENT_TIMESTAMP,
  date_modified DATETIME,
  title_variants TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  risk_factor INTEGER DEFAULT 0,
  -- Entity classification
  entity_type TEXT DEFAULT 'Person',
  type TEXT DEFAULT 'Person',
  entity_category TEXT,
  risk_level TEXT,
  red_flag_rating INTEGER,
  red_flag_score INTEGER DEFAULT 0,
  red_flag_description TEXT,
  aliases TEXT DEFAULT NULL,
  entity_category TEXT,
  death_date TEXT,
  notes TEXT,
  bio TEXT,
  birth_date TEXT,
  aliases_json TEXT DEFAULT '[]',
  handles_json TEXT DEFAULT '[]',
  status_last_updated TEXT,
  evidence_type_distribution TEXT DEFAULT '{}'
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
  original_file_id INTEGER,
  original_file_path TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  -- Additional columns
  title TEXT,
  source_collection TEXT,
  red_flag_rating INTEGER,
  type TEXT,
  -- Redaction tracking
  redaction_count INTEGER DEFAULT 0,
  has_redactions BOOLEAN DEFAULT 0,
  page_count INTEGER DEFAULT 0,
  is_sensitive BOOLEAN DEFAULT 0,
  analyzed_at DATETIME,
  -- Unredaction tracking
  unredaction_attempted INTEGER DEFAULT 0,
  unredaction_succeeded INTEGER DEFAULT 0,
  redaction_coverage_before REAL,
  redaction_coverage_after REAL,
  unredacted_text_gain REAL,
  unredaction_baseline_vocab TEXT
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
  mention_context TEXT,
  assigned_by TEXT,
  score REAL,
  decision_version INTEGER,
  evidence_json TEXT,
  mention_id TEXT,
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

-- Investigations table
CREATE TABLE IF NOT EXISTS investigations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  owner_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Full-text search virtual table for entities
-- FIXED: Use actual column names (full_name, primary_role, connections_summary)
CREATE VIRTUAL TABLE IF NOT EXISTS entities_fts USING fts5(
  full_name,
  primary_role,
  connections_summary,
  content='entities',
  content_rowid='id'
);

-- Entity Relationships Table
CREATE TABLE IF NOT EXISTS entity_relationships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_entity_id INTEGER,
  target_entity_id INTEGER,
  relationship_type TEXT,
  strength REAL DEFAULT 1.0,
  confidence REAL DEFAULT 1.0,
  description TEXT,
  proximity_score REAL DEFAULT 0.0,
  risk_score REAL DEFAULT 0.0,
  first_seen_at DATETIME,
  last_seen_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_entity_id) REFERENCES entities(id),
  FOREIGN KEY (target_entity_id) REFERENCES entities(id),
  UNIQUE(source_entity_id, target_entity_id, relationship_type)
);

-- Detailed Relations Table (Standard Shape)
CREATE TABLE IF NOT EXISTS relations (
  id TEXT PRIMARY KEY,
  subject_entity_id INTEGER,
  object_entity_id INTEGER,
  predicate TEXT,
  direction TEXT,
  weight REAL DEFAULT 1.0,
  first_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'active',
  FOREIGN KEY (subject_entity_id) REFERENCES entities(id),
  FOREIGN KEY (object_entity_id) REFERENCES entities(id)
);

-- Document Spans Table
CREATE TABLE IF NOT EXISTS document_spans (
  id TEXT PRIMARY KEY,
  document_id INTEGER,
  page_num INTEGER,
  span_start_char INTEGER,
  span_end_char INTEGER,
  raw_text TEXT,
  cleaned_text TEXT,
  ocr_confidence REAL,
  layout_json TEXT,
  FOREIGN KEY (document_id) REFERENCES documents(id)
);

-- Mentions Table (Rich Schema)
CREATE TABLE IF NOT EXISTS mentions (
  id TEXT PRIMARY KEY,
  document_id INTEGER,
  span_id TEXT,
  mention_start_char INTEGER,
  mention_end_char INTEGER,
  surface_text TEXT,
  normalised_text TEXT,
  entity_type TEXT,
  ner_model TEXT,
  ner_confidence REAL,
  context_window_before TEXT,
  context_window_after TEXT,
  sentence_id TEXT,
  paragraph_id TEXT,
  extracted_features_json TEXT,
  FOREIGN KEY (document_id) REFERENCES documents(id),
  FOREIGN KEY (span_id) REFERENCES document_spans(id)
);

-- Resolution Candidates Table
CREATE TABLE IF NOT EXISTS resolution_candidates (
  id TEXT PRIMARY KEY,
  left_entity_id INTEGER,
  right_entity_id INTEGER,
  mention_id TEXT,
  candidate_type TEXT,
  score REAL,
  feature_vector_json TEXT,
  decision TEXT,
  decided_at DATETIME,
  decided_by TEXT,
  FOREIGN KEY (left_entity_id) REFERENCES entities(id),
  FOREIGN KEY (right_entity_id) REFERENCES entities(id),
  FOREIGN KEY (mention_id) REFERENCES mentions(id)
);

-- Quality Flags Table
CREATE TABLE IF NOT EXISTS quality_flags (
  id TEXT PRIMARY KEY,
  target_type TEXT,
  target_id TEXT,
  flag_type TEXT,
  severity TEXT,
  details_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME
);

-- Relation Evidence Table
CREATE TABLE IF NOT EXISTS relation_evidence (
  id TEXT PRIMARY KEY,
  relation_id TEXT,
  document_id INTEGER,
  span_id TEXT,
  quote_text TEXT,
  confidence REAL,
  mention_ids TEXT,
  FOREIGN KEY (relation_id) REFERENCES relations(id),
  FOREIGN KEY (document_id) REFERENCES documents(id),
  FOREIGN KEY (span_id) REFERENCES document_spans(id)
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
-- FIXED: Use correct column names for entities table
CREATE TRIGGER IF NOT EXISTS entities_fts_insert AFTER INSERT ON entities BEGIN
  INSERT INTO entities_fts(rowid, full_name, primary_role, connections_summary)
  VALUES (NEW.id, NEW.full_name, NEW.primary_role, NEW.connections_summary);
END;

CREATE TRIGGER IF NOT EXISTS entities_fts_update AFTER UPDATE ON entities BEGIN
  UPDATE entities_fts SET 
    full_name = NEW.full_name,
    primary_role = NEW.primary_role,
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
    COUNT(DISTINCT em.id) as mention_count
FROM entities e
LEFT JOIN entity_mentions em ON e.id = em.entity_id
GROUP BY e.id;

-- MEDIA TABLES (Consolidated)

CREATE TABLE IF NOT EXISTS media_albums (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  cover_image_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  date_modified DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_sensitive BOOLEAN DEFAULT 0
);

CREATE TABLE IF NOT EXISTS media_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_id INTEGER,
  document_id INTEGER,
  file_path TEXT NOT NULL,
  file_type TEXT,
  title TEXT,
  description TEXT,
  verification_status TEXT DEFAULT 'unverified',
  red_flag_rating INTEGER DEFAULT 1,
  metadata_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_sensitive BOOLEAN DEFAULT 0,
  album_id INTEGER REFERENCES media_albums(id) ON DELETE SET NULL,
  FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS media_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  category TEXT,
  color TEXT DEFAULT '#6366f1'
);

CREATE TABLE IF NOT EXISTS media_album_items (
  album_id INTEGER,
  media_item_id INTEGER,
  "order" INTEGER DEFAULT 0,
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (album_id, media_item_id),
  FOREIGN KEY (album_id) REFERENCES media_albums(id) ON DELETE CASCADE,
  FOREIGN KEY (media_item_id) REFERENCES media_items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_media_items_entity ON media_items(entity_id);
CREATE INDEX IF NOT EXISTS idx_media_items_album ON media_items(album_id);
CREATE INDEX IF NOT EXISTS idx_media_items_red_flag ON media_items(red_flag_rating DESC);

-- Media FTS
CREATE VIRTUAL TABLE IF NOT EXISTS media_images_fts USING fts5(
  title,
  description,
  tags,
  content='media_items', -- Note: Using media_items as content source conceptual mapping
  content_rowid='id'
);


-- Performance Indices V2 (Migration 018)
CREATE INDEX IF NOT EXISTS idx_entities_mentions_ranking ON entities(mentions DESC, red_flag_rating DESC);
CREATE INDEX IF NOT EXISTS idx_entities_primary_role ON entities(primary_role);

-- Financial transactions for forensic analysis
CREATE TABLE IF NOT EXISTS financial_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_entity TEXT NOT NULL,
  to_entity TEXT NOT NULL,
  amount DECIMAL(18, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  transaction_date DATETIME NOT NULL,
  transaction_type TEXT NOT NULL, -- payment, transfer, offshore, shell_company, etc.
  method TEXT NOT NULL, -- wire, cash, crypto, etc.
  risk_level TEXT DEFAULT 'medium', -- low, medium, high, critical
  description TEXT,
  investigation_id INTEGER,
  source_document_id TEXT,
  metadata_json TEXT, -- flexible field for extra data like shell bank info
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (investigation_id) REFERENCES investigations(id),
  FOREIGN KEY (source_document_id) REFERENCES documents(id)
);

CREATE INDEX IF NOT EXISTS idx_financial_from ON financial_transactions(from_entity);
CREATE INDEX IF NOT EXISTS idx_financial_to ON financial_transactions(to_entity);
CREATE INDEX IF NOT EXISTS idx_financial_investigation ON financial_transactions(investigation_id);
