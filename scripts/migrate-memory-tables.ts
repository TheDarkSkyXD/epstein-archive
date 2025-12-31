import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current directory (scripts folder)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect to the database
const dbPath = path.resolve(__dirname, '../epstein-archive-production.db');
const db = new Database(dbPath);

console.log('Starting memory tables migration...');

// Main memory entries table
db.exec(`
  CREATE TABLE IF NOT EXISTS memory_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL,
    memory_type TEXT NOT NULL CHECK(memory_type IN ('declarative', 'episodic', 'working', 'procedural')),
    content TEXT NOT NULL,
    metadata_json TEXT,
    context_tags TEXT, -- JSON array of tags
    importance_score REAL DEFAULT 0.0 CHECK(importance_score >= 0.0 AND importance_score <= 1.0),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    source_id INTEGER,
    source_type TEXT, -- Type of source (entity, document, investigation, etc.)
    version INTEGER DEFAULT 1,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'archived', 'deprecated')),
    quality_score REAL DEFAULT 0.0 CHECK(quality_score >= 0.0 AND quality_score <= 1.0),
    provenance_json TEXT -- JSON containing source provenance information
  );
`);

// Memory relationships table
db.exec(`
  CREATE TABLE IF NOT EXISTS memory_relationships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_memory_id INTEGER NOT NULL,
    to_memory_id INTEGER NOT NULL,
    relationship_type TEXT NOT NULL, -- e.g., 'supports', 'contradicts', 'related_to', 'derived_from'
    strength REAL DEFAULT 1.0 CHECK(strength >= 0.0 AND strength <= 1.0),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (from_memory_id) REFERENCES memory_entries(id) ON DELETE CASCADE,
    FOREIGN KEY (to_memory_id) REFERENCES memory_entries(id) ON DELETE CASCADE,
    UNIQUE(from_memory_id, to_memory_id, relationship_type)
  );
`);

// Memory audit log table
db.exec(`
  CREATE TABLE IF NOT EXISTS memory_audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    memory_entry_id INTEGER NOT NULL,
    action TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'ACCESS'
    actor TEXT, -- User or system component that performed the action
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    old_values_json TEXT, -- JSON of old values before change
    new_values_json TEXT, -- JSON of new values after change
    metadata_json TEXT, -- Additional context about the action
    FOREIGN KEY (memory_entry_id) REFERENCES memory_entries(id) ON DELETE CASCADE
  );
`);

// Memory quality metrics table
db.exec(`
  CREATE TABLE IF NOT EXISTS memory_quality_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    memory_entry_id INTEGER NOT NULL,
    source_reliability REAL CHECK(source_reliability >= 0.0 AND source_reliability <= 1.0),
    evidence_strength REAL CHECK(evidence_strength >= 0.0 AND evidence_strength <= 1.0),
    temporal_relevance REAL CHECK(temporal_relevance >= 0.0 AND temporal_relevance <= 1.0),
    entity_confidence REAL CHECK(entity_confidence >= 0.0 AND entity_confidence <= 1.0),
    overall_score AS ((source_reliability + evidence_strength + temporal_relevance + entity_confidence) / 4.0) STORED,
    calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (memory_entry_id) REFERENCES memory_entries(id) ON DELETE CASCADE
  );
`);

// Create indexes for performance
db.exec('CREATE INDEX IF NOT EXISTS idx_memory_entries_type_status ON memory_entries(memory_type, status);');
db.exec('CREATE INDEX IF NOT EXISTS idx_memory_entries_importance ON memory_entries(importance_score DESC);');
db.exec('CREATE INDEX IF NOT EXISTS idx_memory_entries_created_at ON memory_entries(created_at DESC);');
db.exec('CREATE INDEX IF NOT EXISTS idx_memory_entries_source ON memory_entries(source_id, source_type);');
db.exec('CREATE INDEX IF NOT EXISTS idx_memory_entries_quality ON memory_entries(quality_score DESC);');

// Create indexes for memory relationships
db.exec('CREATE INDEX IF NOT EXISTS idx_memory_relationships_from ON memory_relationships(from_memory_id);');
db.exec('CREATE INDEX IF NOT EXISTS idx_memory_relationships_to ON memory_relationships(to_memory_id);');
db.exec('CREATE INDEX IF NOT EXISTS idx_memory_relationships_type ON memory_relationships(relationship_type);');

// Create indexes for audit log
db.exec('CREATE INDEX IF NOT EXISTS idx_memory_audit_entry ON memory_audit_log(memory_entry_id);');
db.exec('CREATE INDEX IF NOT EXISTS idx_memory_audit_action ON memory_audit_log(action);');
db.exec('CREATE INDEX IF NOT EXISTS idx_memory_audit_timestamp ON memory_audit_log(timestamp);');

// Create indexes for quality metrics
db.exec('CREATE INDEX IF NOT EXISTS idx_memory_quality_entry ON memory_quality_metrics(memory_entry_id);');
db.exec('CREATE INDEX IF NOT EXISTS idx_memory_quality_score ON memory_quality_metrics(overall_score);');

// Enable full-text search for memory content
db.exec(`
  CREATE VIRTUAL TABLE IF NOT EXISTS memory_entries_fts USING fts5(
    content,
    memory_entry_id,
    tokenize='porter'
  );
`);

// Trigger to automatically update FTS index when memory entries are modified
db.exec(`
  CREATE TRIGGER IF NOT EXISTS memory_entries_ai AFTER INSERT ON memory_entries
  BEGIN
    INSERT INTO memory_entries_fts(rowid, content, memory_entry_id) 
    VALUES (new.id, new.content, new.id);
  END;
`);

db.exec(`
  CREATE TRIGGER IF NOT EXISTS memory_entries_ad AFTER DELETE ON memory_entries
  BEGIN
    DELETE FROM memory_entries_fts WHERE rowid = old.id;
  END;
`);

db.exec(`
  CREATE TRIGGER IF NOT EXISTS memory_entries_au AFTER UPDATE ON memory_entries
  BEGIN
    UPDATE memory_entries_fts SET content = new.content, memory_entry_id = new.id
    WHERE rowid = old.id;
  END;
`);

console.log('Memory tables migration completed successfully!');

// Verify tables were created
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'memory_%';").all();
console.log('Created tables:', tables.map((t: any) => t.name));

db.close();