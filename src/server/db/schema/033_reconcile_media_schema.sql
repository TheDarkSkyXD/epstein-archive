-- Migration: Reconcile Media Schema
-- Ensures all required columns exist in media_items and FTS is active.

-- 1. Ensure core columns exist (safe to run multiple times with try/catch style or checking sqlite_master)
-- SQLite doesn't have "IF NOT EXISTS" for ALTER TABLE, but we can do it in the migrator.
-- However, we can also use a SQL script that handles it.

-- Use the same columns as 026 to be safe
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

-- 2. Ensure FTS table exists
CREATE VIRTUAL TABLE IF NOT EXISTS media_items_fts USING fts5(
    title,
    description,
    content='media_items',
    content_rowid='id'
);

-- Triggers moved to 034_media_fts_triggers.sql to avoid transaction block errors with duplicate columns

-- 4. Sync FTS data if it was empty
INSERT INTO media_items_fts(rowid, title, description)
SELECT id, title, description FROM media_items
WHERE id NOT IN (SELECT rowid FROM media_items_fts);
