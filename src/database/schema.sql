-- Epstein Files Database Schema
-- Optimized for 178,791+ records with full-text search and relationships

-- Main entities table
CREATE TABLE IF NOT EXISTS entities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    primary_role TEXT,
    secondary_roles TEXT,
    likelihood_level TEXT,
    mentions INTEGER DEFAULT 0,
    current_status TEXT,
    connections_summary TEXT,
    spice_rating INTEGER DEFAULT 0,
    spice_score REAL DEFAULT 0.0,
    title TEXT,                    -- Extracted title (e.g., "President", "Senator")
    role TEXT,                     -- Full role description (e.g., "President of the United States")
    title_variants TEXT,           -- JSON array of all title variants found
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Evidence types lookup
CREATE TABLE evidence_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type_name TEXT UNIQUE NOT NULL,
    description TEXT
);

-- Insert common evidence types
INSERT INTO evidence_types (type_name, description) VALUES
('financial', 'Financial records and transactions'),
('document', 'Official documents and reports'),
('testimony', 'Witness testimonies and depositions'),
('legal', 'Legal documents and court filings'),
('flight_log', 'Flight logs and travel records'),
('photo', 'Photographic evidence'),
('email', 'Email communications'),
('contract', 'Contracts and agreements'),
('bank_record', 'Banking and financial records'),
('property_record', 'Property and real estate records');

-- Entity evidence types (many-to-many)
CREATE TABLE entity_evidence_types (
    entity_id INTEGER,
    evidence_type_id INTEGER,
    PRIMARY KEY (entity_id, evidence_type_id),
    FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE,
    FOREIGN KEY (evidence_type_id) REFERENCES evidence_types(id) ON DELETE CASCADE
);

-- Documents/files table
CREATE TABLE documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    date_created DATETIME,
    date_modified DATETIME,
    content_hash TEXT,
    word_count INTEGER DEFAULT 0,
    spice_rating INTEGER DEFAULT 0,
    title TEXT,                -- Human-readable title with filename
    evidence_type TEXT,        -- Email, Legal, Flight Log, Article, Document
    content_preview TEXT,      -- First 500 chars for summary
    metadata_json TEXT, -- JSON metadata
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Entity mentions in documents (many-to-many with context)
CREATE TABLE entity_mentions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_id INTEGER NOT NULL,
    document_id INTEGER NOT NULL,
    context_text TEXT NOT NULL,
    context_type TEXT DEFAULT 'mention', -- 'mention', 'spicy', 'key_passage'
    keyword TEXT, -- For spicy passages
    position_start INTEGER,
    position_end INTEGER,
    significance_score INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- Timeline events
CREATE TABLE timeline_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_date DATE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    event_type TEXT CHECK(event_type IN ('email', 'document', 'flight', 'legal', 'financial', 'testimony', 'arrest', 'death', 'court')),
    document_id INTEGER,
    significance_level TEXT CHECK(significance_level IN ('high', 'medium', 'low')) DEFAULT 'medium',
    entities_json TEXT, -- JSON array of entity IDs involved
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL
);

-- Full-text search virtual table
CREATE VIRTUAL TABLE entities_fts USING fts5(
    entity_id,
    full_name,
    primary_role,
    secondary_roles,
    connections_summary,
    content='entities',
    content_rowid='id'
);

-- Full-text search for documents
CREATE VIRTUAL TABLE documents_fts USING fts5(
    document_id,
    filename,
    content_text,
    content='documents',
    content_rowid='id'
);

-- Indexes for performance
CREATE INDEX idx_entities_name ON entities(full_name);
CREATE INDEX idx_entities_mentions ON entities(mentions DESC);
CREATE INDEX idx_entities_spice_rating ON entities(spice_rating DESC);
CREATE INDEX idx_entities_likelihood ON entities(likelihood_level);
CREATE INDEX idx_entity_mentions_entity ON entity_mentions(entity_id);
CREATE INDEX idx_entity_mentions_document ON entity_mentions(document_id);
CREATE INDEX IF NOT EXISTS idx_entity_mentions_context ON entity_mentions(context_type);
CREATE INDEX IF NOT EXISTS idx_documents_filename ON documents(filename);
CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_filepath ON documents(file_path);
CREATE INDEX IF NOT EXISTS idx_documents_date ON documents(date_created);
CREATE INDEX idx_timeline_events_date ON timeline_events(event_date DESC);
CREATE INDEX idx_timeline_events_type ON timeline_events(event_type);

-- Triggers for maintaining search indices
CREATE TRIGGER entities_fts_insert AFTER INSERT ON entities BEGIN
    INSERT INTO entities_fts(rowid, entity_id, full_name, primary_role, secondary_roles, connections_summary)
    VALUES (new.id, new.id, new.full_name, new.primary_role, new.secondary_roles, new.connections_summary);
END;

CREATE TRIGGER entities_fts_update AFTER UPDATE ON entities BEGIN
    UPDATE entities_fts SET 
        full_name = new.full_name,
        primary_role = new.primary_role,
        secondary_roles = new.secondary_roles,
        connections_summary = new.connections_summary
    WHERE rowid = new.id;
END;

CREATE TRIGGER entities_fts_delete AFTER DELETE ON entities BEGIN
    DELETE FROM entities_fts WHERE rowid = old.id;
END;

-- Views for common queries
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

CREATE VIEW document_summary AS
SELECT 
    d.id,
    d.filename,
    d.file_type,
    d.word_count,
    d.spice_rating,
    COUNT(DISTINCT em.entity_id) as entity_count,
    COUNT(DISTINCT em.id) as mention_count,
    MIN(em.created_at) as first_mention_date,
    MAX(em.created_at) as last_mention_date
FROM documents d
LEFT JOIN entity_mentions em ON d.id = em.document_id
GROUP BY d.id;