-- Migration: Re-initialize FTS triggers for Media Items
-- Separated from 033 to allow statement-by-statement execution of schema changes

DROP TRIGGER IF EXISTS media_items_ai;
CREATE TRIGGER media_items_ai AFTER INSERT ON media_items BEGIN
  INSERT INTO media_items_fts(rowid, title, description)
  VALUES (new.id, new.title, new.description);
END;

DROP TRIGGER IF EXISTS media_items_ad;
CREATE TRIGGER media_items_ad AFTER DELETE ON media_items BEGIN
  INSERT INTO media_items_fts(media_items_fts, rowid, title, description)
  VALUES('delete', old.id, old.title, old.description);
END;

DROP TRIGGER IF EXISTS media_items_au;
CREATE TRIGGER media_items_au AFTER UPDATE ON media_items BEGIN
  INSERT INTO media_items_fts(media_items_fts, rowid, title, description)
  VALUES('delete', old.id, old.title, old.description);
  INSERT INTO media_items_fts(rowid, title, description)
  VALUES (new.id, new.title, new.description);
END;
