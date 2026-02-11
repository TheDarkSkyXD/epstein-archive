-- Migration 022: Add Quarantine Columns
ALTER TABLE documents ADD COLUMN quarantine_status TEXT DEFAULT 'none';
ALTER TABLE documents ADD COLUMN quarantine_reason TEXT;
ALTER TABLE documents ADD COLUMN quarantine_at DATETIME;

CREATE INDEX IF NOT EXISTS idx_documents_quarantine ON documents(quarantine_status);
