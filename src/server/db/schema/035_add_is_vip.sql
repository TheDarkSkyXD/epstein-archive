-- Add is_vip column to entities table
ALTER TABLE entities ADD COLUMN is_vip INTEGER DEFAULT 0;

-- Create an index on is_vip for faster filtering
CREATE INDEX IF NOT EXISTS idx_entities_is_vip ON entities(is_vip);
