-- Add location columns for Interactive Entity Map
ALTER TABLE entities ADD COLUMN location_lat REAL DEFAULT NULL;
ALTER TABLE entities ADD COLUMN location_lng REAL DEFAULT NULL;
ALTER TABLE entities ADD COLUMN location_label TEXT DEFAULT NULL;

-- Index for efficient map viewport querying
CREATE INDEX IF NOT EXISTS idx_entities_location ON entities(location_lat, location_lng) WHERE location_lat IS NOT NULL;
