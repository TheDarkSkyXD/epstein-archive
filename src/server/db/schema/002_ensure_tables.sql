-- Core tables that might be missing in production DB

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE,
  email TEXT,
  role TEXT,
  password_hash TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details_json TEXT,
  ip_address TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS investigations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active', -- active, archived, closed
  priority TEXT DEFAULT 'medium',
  created_by TEXT,
  assigned_to TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  metadata_json TEXT
);

CREATE TABLE IF NOT EXISTS investigation_evidence (
  investigation_id INTEGER,
  document_id INTEGER,
  added_by TEXT,
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  PRIMARY KEY (investigation_id, document_id),
  FOREIGN KEY(investigation_id) REFERENCES investigations(id) ON DELETE CASCADE,
  FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS investigation_timeline_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  date TEXT, -- ISO8601
  description TEXT,
  event_type TEXT, -- flight, meeting, transaction, legal
  related_entity_id INTEGER,
  related_document_id INTEGER,
  confidence REAL DEFAULT 1.0,
  source TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
