-- Phase 11: Junk Entity Quality Gate

ALTER TABLE entities ADD COLUMN junk_tier TEXT DEFAULT 'clean';
ALTER TABLE entities ADD COLUMN quarantine_status INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_entities_junk_tier ON entities(junk_tier);
CREATE INDEX IF NOT EXISTS idx_entities_quarantine_status ON entities(quarantine_status);
