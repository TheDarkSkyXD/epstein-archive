-- Migration: Add album_id to media_items
-- Allows grouping audio/video files into albums, similar to media_images

ALTER TABLE media_items ADD COLUMN album_id INTEGER REFERENCES media_albums(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_media_items_album ON media_items(album_id);
