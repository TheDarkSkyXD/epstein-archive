-- Migration 010: Add Redaction Detection Support (Renamed from 008)
-- Adds table for storing detected redaction metadata and updates documents table

-- Create document_redactions table
CREATE TABLE IF NOT EXISTS document_redactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  page_number INTEGER NOT NULL,
  x0 REAL NOT NULL,
  y0 REAL NOT NULL,
  x1 REAL NOT NULL,
  y1 REAL NOT NULL,
  width REAL,
  height REAL,
  area REAL,
  redaction_type TEXT NOT NULL CHECK(redaction_type IN ('visual_redaction', 'text_gap')),
  confidence TEXT NOT NULL CHECK(confidence IN ('high', 'medium', 'low')),
  detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_redactions_document ON document_redactions(document_id);
CREATE INDEX IF NOT EXISTS idx_redactions_page ON document_redactions(document_id, page_number);
CREATE INDEX IF NOT EXISTS idx_redactions_type ON document_redactions(redaction_type);

-- Add redaction tracking columns to documents table
-- Use column existence check or just try adding them (SQLite supports ADD COLUMN recursively? No, linear)
-- But since this is a new migration running once, it should be fine.
ALTER TABLE documents ADD COLUMN redaction_count INTEGER DEFAULT 0;
ALTER TABLE documents ADD COLUMN has_redactions BOOLEAN DEFAULT 0;

-- Create view for redaction statistics
CREATE VIEW IF NOT EXISTS document_redaction_stats AS
SELECT 
  d.id,
  d.filename,
  d.file_path,
  d.redaction_count,
  d.has_redactions,
  COUNT(dr.id) as actual_redaction_count,
  SUM(CASE WHEN dr.redaction_type = 'visual_redaction' THEN 1 ELSE 0 END) as visual_redactions,
  SUM(CASE WHEN dr.redaction_type = 'text_gap' THEN 1 ELSE 0 END) as text_gaps,
  MAX(dr.page_number) as max_redacted_page
FROM documents d
LEFT JOIN document_redactions dr ON d.id = dr.document_id
WHERE d.has_redactions = 1
GROUP BY d.id;
