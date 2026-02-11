CREATE TABLE IF NOT EXISTS document_forensic_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER,
  metrics_json TEXT, 
  authenticity_score REAL,
  scan_status TEXT,
  last_analyzed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_forensic_doc ON document_forensic_metrics(document_id);

CREATE TABLE IF NOT EXISTS chain_of_custody (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    evidence_id INTEGER,
    actor TEXT,
    action TEXT,
    date DATETIME,
    notes TEXT,
    signature TEXT
);
