-- Migration: Unify Media Schema (Final Stable)
-- Canonical media schema hardening for media_items and media_item_people.

-- 1. Aggressively drop all potential conflicting triggers
DROP TRIGGER IF EXISTS media_items_fts_insert;
DROP TRIGGER IF EXISTS media_items_ai;
DROP TRIGGER IF EXISTS media_items_ad;
DROP TRIGGER IF EXISTS media_items_au;

-- 2. Drop existing FTS table to ensure a clean rebuild
DROP TABLE IF EXISTS media_items_fts;

-- 3. Ensure media_items has all missing columns for full compatibility
ALTER TABLE media_items ADD COLUMN filename TEXT;
ALTER TABLE media_items ADD COLUMN original_filename TEXT;
ALTER TABLE media_items ADD COLUMN thumbnail_path TEXT;
ALTER TABLE media_items ADD COLUMN width INTEGER;
ALTER TABLE media_items ADD COLUMN height INTEGER;
ALTER TABLE media_items ADD COLUMN file_size INTEGER;
ALTER TABLE media_items ADD COLUMN date_taken TEXT;
ALTER TABLE media_items ADD COLUMN camera_make TEXT;
ALTER TABLE media_items ADD COLUMN camera_model TEXT;
ALTER TABLE media_items ADD COLUMN lens TEXT;
ALTER TABLE media_items ADD COLUMN focal_length REAL;
ALTER TABLE media_items ADD COLUMN aperture REAL;
ALTER TABLE media_items ADD COLUMN shutter_speed TEXT;
ALTER TABLE media_items ADD COLUMN iso INTEGER;
ALTER TABLE media_items ADD COLUMN latitude REAL;
ALTER TABLE media_items ADD COLUMN longitude REAL;
ALTER TABLE media_items ADD COLUMN color_profile TEXT;
ALTER TABLE media_items ADD COLUMN orientation INTEGER DEFAULT 1;
ALTER TABLE media_items ADD COLUMN date_modified TEXT;

-- 4. Create media_items_fts virtual table for broad search support
CREATE VIRTUAL TABLE IF NOT EXISTS media_items_fts USING fts5(
    title,
    description,
    content='media_items',
    content_rowid='id'
);

-- 5. Add helper columns for better entity management if they don't exist
ALTER TABLE media_item_people ADD COLUMN role TEXT;
ALTER TABLE media_item_people ADD COLUMN confidence REAL DEFAULT 0.8;
ALTER TABLE media_item_people ADD COLUMN is_primary BOOLEAN DEFAULT 0;

-- 6. Reconcile entity_id from media_items (1:1) to media_item_people (M:M)
INSERT OR IGNORE INTO media_item_people (media_item_id, entity_id, role)
SELECT id, entity_id, 'referenced'
FROM media_items
WHERE entity_id IS NOT NULL;
