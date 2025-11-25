-- Data Ingestion Schema Enhancements
-- Phase 1: Add tables for high-quality data ingestion

-- Documents table: Store document metadata and generated titles
CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL UNIQUE,
  original_filename TEXT,
  generated_title TEXT,
  ai_description TEXT,
  document_type TEXT, -- email, deposition, financial, flight_log, legal, communication
  document_date DATE,
  case_number TEXT,
  participants TEXT, -- JSON array of participant names
  content_text TEXT,
  word_count INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Entity-Document junction table: Many-to-many relationships
CREATE TABLE IF NOT EXISTS entity_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_id INTEGER NOT NULL,
  document_id INTEGER NOT NULL,
  role_in_document TEXT, -- sender, recipient, subject, witness, mentioned, passenger, etc.
  mention_count INTEGER DEFAULT 1,
  context_snippets TEXT, -- JSON array of surrounding text
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (entity_id) REFERENCES people(id) ON DELETE CASCADE,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  UNIQUE(entity_id, document_id)
);

-- Timeline Events table: Human-readable events extracted from documents
CREATE TABLE IF NOT EXISTS timeline_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_date DATE NOT NULL,
  event_type TEXT NOT NULL, -- travel, legal, financial, communication, meeting, business
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  people_involved TEXT, -- JSON array of person IDs
  organizations_involved TEXT, -- JSON array of organization names
  source_document_ids TEXT, -- JSON array of document IDs
  significance_score INTEGER DEFAULT 5, -- 1-10 scale
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_date ON documents(document_date);
CREATE INDEX IF NOT EXISTS idx_documents_filename ON documents(filename);

CREATE INDEX IF NOT EXISTS idx_entity_documents_entity ON entity_documents(entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_documents_document ON entity_documents(document_id);
CREATE INDEX IF NOT EXISTS idx_entity_documents_role ON entity_documents(role_in_document);

CREATE INDEX IF NOT EXISTS idx_timeline_events_date ON timeline_events(event_date);
CREATE INDEX IF NOT EXISTS idx_timeline_events_type ON timeline_events(event_type);

-- Full-text search for documents
CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
  filename,
  generated_title,
  ai_description,
  content_text,
  content='documents',
  content_rowid='id'
);

-- Triggers to keep FTS in sync
CREATE TRIGGER IF NOT EXISTS documents_ai AFTER INSERT ON documents BEGIN
  INSERT INTO documents_fts(rowid, filename, generated_title, ai_description, content_text)
  VALUES (new.id, new.filename, new.generated_title, new.ai_description, new.content_text);
END;

CREATE TRIGGER IF NOT EXISTS documents_ad AFTER DELETE ON documents BEGIN
  DELETE FROM documents_fts WHERE rowid = old.id;
END;

CREATE TRIGGER IF NOT EXISTS documents_au AFTER UPDATE ON documents BEGIN
  UPDATE documents_fts 
  SET filename = new.filename,
      generated_title = new.generated_title,
      ai_description = new.ai_description,
      content_text = new.content_text
  WHERE rowid = new.id;
END;
