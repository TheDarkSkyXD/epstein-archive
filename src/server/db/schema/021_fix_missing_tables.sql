-- Migration to add missing media tables that were only in schema.sql
-- And any other missing infrastructure tables

CREATE TABLE IF NOT EXISTS media_albums (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  cover_image_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  date_modified DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_sensitive BOOLEAN DEFAULT 0
);

CREATE TABLE IF NOT EXISTS media_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_id INTEGER,
  document_id INTEGER,
  album_id INTEGER,
  file_path TEXT NOT NULL,
  file_type TEXT,
  filename TEXT,
  original_filename TEXT,
  file_size INTEGER,
  width INTEGER,
  height INTEGER,
  format TEXT,
  date_taken DATETIME,
  camera_make TEXT,
  camera_model TEXT,
  lens TEXT,
  focal_length REAL,
  aperture REAL,
  shutter_speed REAL,
  iso INTEGER,
  latitude REAL,
  longitude REAL,
  orientation INTEGER,
  color_profile TEXT,
  thumbnail_path TEXT,
  title TEXT,
  description TEXT,
  verification_status TEXT DEFAULT 'unverified',
  red_flag_rating INTEGER DEFAULT 1,
  metadata_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  date_modified DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_sensitive BOOLEAN DEFAULT 0,
  CONSTRAINT fk_entity FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE,
  CONSTRAINT fk_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL,
  CONSTRAINT fk_album FOREIGN KEY (album_id) REFERENCES media_albums(id) ON DELETE SET NULL
);

-- Document sources view for About page and analytics
CREATE VIEW IF NOT EXISTS document_sources AS 
SELECT 
    source_collection as title,
    COUNT(*) as documentCount,
    SUM(CASE WHEN (has_redactions = 1 OR has_redactions = 'true' OR redaction_count > 0 OR content LIKE '%[REDACTED]%' OR content LIKE '%XXXXX%' OR content LIKE '%(redacted)%') THEN 1 ELSE 0 END) as redactedCount,
    ROUND(AVG(red_flag_rating), 1) as avgRisk
FROM documents 
WHERE source_collection IS NOT NULL AND source_collection != ''
GROUP BY source_collection;

CREATE TABLE IF NOT EXISTS media_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  category TEXT,
  color TEXT DEFAULT '#6366f1'
);

CREATE TABLE IF NOT EXISTS media_album_items (
  album_id INTEGER,
  media_item_id INTEGER,
  "order" INTEGER DEFAULT 0,
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (album_id, media_item_id),
  FOREIGN KEY (album_id) REFERENCES media_albums(id) ON DELETE CASCADE,
  FOREIGN KEY (media_item_id) REFERENCES media_items(id) ON DELETE CASCADE
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_media_items_entity ON media_items(entity_id);
CREATE INDEX IF NOT EXISTS idx_media_items_album ON media_items(album_id);
CREATE INDEX IF NOT EXISTS idx_media_items_red_flag ON media_items(red_flag_rating DESC);

-- Media FTS
CREATE VIRTUAL TABLE IF NOT EXISTS media_items_fts USING fts5(
  title,
  description,
  tags,
  content='media_items',
  content_rowid='id'
);

-- Re-sync triggers for media FTS if needed (conceptual)
CREATE TRIGGER IF NOT EXISTS media_items_fts_insert AFTER INSERT ON media_items BEGIN
  INSERT INTO media_items_fts(rowid, title, description)
  VALUES (NEW.id, NEW.title, NEW.description);
END;
