-- Optimizing default sort (mentions priority)
-- Existing idx_entities_rating_mentions_name optimizes for High Risk first.
-- This optimizes for Most Mentioned first (default sort).
CREATE INDEX IF NOT EXISTS idx_entities_mentions_ranking ON entities(mentions DESC, red_flag_rating DESC);

-- Optimizing role filtering
CREATE INDEX IF NOT EXISTS idx_entities_primary_role ON entities(primary_role);
