CREATE TABLE IF NOT EXISTS global_timeline_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  type TEXT CHECK(type IN ('email', 'flight', 'legal', 'financial', 'testimony', 'incident', 'other')) DEFAULT 'other',
  significance TEXT CHECK(significance IN ('high', 'medium', 'low')) DEFAULT 'medium',
  entities TEXT, -- JSON array of strings
  related_document_id INTEGER REFERENCES documents(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
