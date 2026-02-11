-- Migration 017: Add Entity Metadata (Death & Notes)
-- purpose: Store death timelines and additional context for entities

ALTER TABLE entities ADD COLUMN death_date TEXT; -- Store as YYYY-MM-DD
ALTER TABLE entities ADD COLUMN notes TEXT;
ALTER TABLE entities ADD COLUMN codename TEXT; -- Primary codename if applicable

-- Index for timeline queries
CREATE INDEX IF NOT EXISTS idx_entities_death_date ON entities(death_date);
