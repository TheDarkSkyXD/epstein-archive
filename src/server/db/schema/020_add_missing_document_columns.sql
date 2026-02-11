-- Add missing columns to documents table for the unified pipeline
ALTER TABLE documents ADD COLUMN content_sha256 TEXT;
ALTER TABLE documents ADD COLUMN processing_status TEXT DEFAULT 'queued';
ALTER TABLE documents ADD COLUMN pipeline_version TEXT;
ALTER TABLE documents ADD COLUMN ingestion_run_id INTEGER;
ALTER TABLE documents ADD COLUMN hash_algo TEXT DEFAULT 'sha256';
ALTER TABLE documents ADD COLUMN parent_document_id INTEGER;

-- Add indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_documents_sha256 ON documents(content_sha256);
CREATE INDEX IF NOT EXISTS idx_documents_processing_status ON documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_documents_ingestion_run ON documents(ingestion_run_id);
