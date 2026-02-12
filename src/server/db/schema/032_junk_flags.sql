ALTER TABLE entities ADD COLUMN junk_flag INTEGER DEFAULT 0;
ALTER TABLE entities ADD COLUMN junk_reason TEXT;
ALTER TABLE entities ADD COLUMN junk_probability REAL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_entities_junk_flag ON entities(junk_flag);
CREATE INDEX IF NOT EXISTS idx_entities_junk_prob ON entities(junk_probability);
