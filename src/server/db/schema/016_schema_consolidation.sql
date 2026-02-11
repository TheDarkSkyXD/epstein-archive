-- Migration 016: Schema Consolidation - Add all missing columns
-- This migration ensures both local and production databases have a consistent schema
-- Eliminates the need for backward-compatibility checks in the code

-- =============================================
-- ENTITIES TABLE UPDATES
-- =============================================

-- Add entity_type if missing (might already exist as entity_type)
-- Note: Production has entity_type, ensure it exists
-- ALTER TABLE entities ADD COLUMN entity_type TEXT DEFAULT 'Person';  -- Already exists

-- Add type column for entity classification (Person, Organization, Location, etc.)
ALTER TABLE entities ADD COLUMN type TEXT DEFAULT 'Person';

-- Add entity_category for categorization (associate, victim, staff, etc.)
ALTER TABLE entities ADD COLUMN entity_category TEXT;

-- Add risk_level for risk assessment (high, medium, low)
ALTER TABLE entities ADD COLUMN risk_level TEXT CHECK(risk_level IN ('high', 'medium', 'low', NULL));

-- Add red_flag_description for contextual information
ALTER TABLE entities ADD COLUMN red_flag_description TEXT;

-- =============================================
-- DOCUMENTS TABLE UPDATES  
-- =============================================

-- Add title column as alias/alternative to file_name
ALTER TABLE documents ADD COLUMN title TEXT;

-- Add page_count for multi-page documents
-- Note: This might already exist from migration 010
-- ALTER TABLE documents ADD COLUMN page_count INTEGER DEFAULT 0;

-- Add is_sensitive flag
-- Note: This might already exist from migration 010
-- ALTER TABLE documents ADD COLUMN is_sensitive BOOLEAN DEFAULT 0;

-- Add analyzed_at timestamp
-- Note: This might already exist
-- ALTER TABLE documents ADD COLUMN analyzed_at DATETIME;

-- Add unredaction tracking columns (may already exist from 010)
-- ALTER TABLE documents ADD COLUMN unredaction_attempted INTEGER DEFAULT 0;
-- ALTER TABLE documents ADD COLUMN unredaction_succeeded INTEGER DEFAULT 0;
-- ALTER TABLE documents ADD COLUMN redaction_coverage_before REAL;
-- ALTER TABLE documents ADD COLUMN redaction_coverage_after REAL;
-- ALTER TABLE documents ADD COLUMN unredacted_text_gain REAL;

-- Add unredaction_baseline_vocab for tracking vocabulary used in unredaction
ALTER TABLE documents ADD COLUMN unredaction_baseline_vocab TEXT;

-- =============================================
-- UPDATE EXISTING DATA
-- =============================================

-- Set default title from file_name where title is NULL
UPDATE documents SET title = file_name WHERE title IS NULL;

-- Set default type from entity_type where type is NULL
UPDATE entities SET type = entity_type WHERE type IS NULL AND entity_type IS NOT NULL;

-- =============================================
-- INDEXES FOR NEW COLUMNS
-- =============================================

CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(type);
CREATE INDEX IF NOT EXISTS idx_entities_category ON entities(entity_category);
CREATE INDEX IF NOT EXISTS idx_entities_risk_level ON entities(risk_level);
CREATE INDEX IF NOT EXISTS idx_documents_title ON documents(title);
