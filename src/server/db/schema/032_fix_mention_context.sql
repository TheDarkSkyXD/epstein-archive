-- 032_fix_mention_context.sql
-- Restores the missing mention_context column to entity_mentions
-- This column was accidentally dropped during the Phase 1 Ingestion Reproducibility promotion 

-- Safe ALTER TABLE approach
ALTER TABLE entity_mentions ADD COLUMN mention_context TEXT;

-- Re-verify indexes (likely already there but good for safety)
CREATE INDEX IF NOT EXISTS idx_entity_mentions_doc ON entity_mentions(document_id);
CREATE INDEX IF NOT EXISTS idx_entity_mentions_entity ON entity_mentions(entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_mentions_run ON entity_mentions(ingest_run_id);
