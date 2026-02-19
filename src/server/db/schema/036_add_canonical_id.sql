-- Add canonical_id for entity resolution
-- Default to self-referential ID (no merge)
ALTER TABLE entities ADD COLUMN canonical_id INTEGER REFERENCES entities(id);

-- Initialize existing rows
UPDATE entities SET canonical_id = id WHERE canonical_id IS NULL;

-- Index for performance (Graph lookups will use this heavily)
CREATE INDEX IF NOT EXISTS idx_entities_canonical ON entities(canonical_id);
