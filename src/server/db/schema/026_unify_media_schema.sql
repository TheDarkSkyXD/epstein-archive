-- Migration: Unify Media Schema (Final Stable)
-- Merges legacy media_images into media_items and updates link tables.

-- 1. Aggressively drop all potential conflicting triggers
DROP TRIGGER IF EXISTS media_items_fts_insert;
DROP TRIGGER IF EXISTS media_images_ad;
DROP TRIGGER IF EXISTS media_images_ai;
DROP TRIGGER IF EXISTS media_images_au;
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

-- 5. Ensure media_items has all images from legacy media_images
INSERT INTO media_items (
    file_path,
    file_type,
    filename,
    original_filename,
    title,
    description,
    album_id,
    is_sensitive,
    created_at,
    verification_status
)
SELECT 
    path, 
    COALESCE(format, 'image/jpeg'), 
    filename, 
    original_filename, 
    title, 
    description, 
    album_id, 
    is_sensitive, 
    date_added,
    'verified'
FROM media_images
WHERE NOT EXISTS (
    SELECT 1 FROM media_items mi WHERE mi.file_path = media_images.path
);

-- 6. Migrate links from media_people to media_item_people
INSERT OR IGNORE INTO media_item_people (media_item_id, entity_id)
SELECT 
    mi.id as media_item_id,
    mp.entity_id
FROM media_people mp
JOIN media_images img ON mp.media_id = img.id
JOIN media_items mi ON img.path = mi.file_path;

-- 7. Add helper columns for better entity management if they don't exist
ALTER TABLE media_item_people ADD COLUMN role TEXT;
ALTER TABLE media_item_people ADD COLUMN confidence REAL DEFAULT 0.8;
ALTER TABLE media_item_people ADD COLUMN is_primary BOOLEAN DEFAULT 0;

-- 8. Reconcile entity_id from media_items (1:1) to media_item_people (M:M)
INSERT OR IGNORE INTO media_item_people (media_item_id, entity_id, role)
SELECT id, entity_id, 'referenced'
FROM media_items
WHERE entity_id IS NOT NULL;

-- 9. Backfill metadata from media_images for existing records
UPDATE media_items
SET 
    thumbnail_path = (SELECT thumbnail_path FROM media_images WHERE media_images.path = media_items.file_path),
    width = (SELECT width FROM media_images WHERE media_images.path = media_items.file_path),
    height = (SELECT height FROM media_images WHERE media_images.path = media_items.file_path),
    file_size = (SELECT file_size FROM media_images WHERE media_images.path = media_items.file_path),
    date_taken = (SELECT date_taken FROM media_images WHERE media_images.path = media_items.file_path),
    orientation = (SELECT COALESCE(orientation, 1) FROM media_images WHERE media_images.path = media_items.file_path),
    date_modified = datetime('now')
WHERE EXISTS (
    SELECT 1 FROM media_images WHERE media_images.path = media_items.file_path
) AND date_modified IS NULL;
