-- Add community_id column for Louvain clustering
ALTER TABLE entities ADD COLUMN community_id INTEGER DEFAULT NULL;
CREATE INDEX idx_entities_community_id ON entities(community_id);
