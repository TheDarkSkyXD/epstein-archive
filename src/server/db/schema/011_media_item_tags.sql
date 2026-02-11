-- Migration: Add tagging and entity linking for media_items (Audio/Video)

CREATE TABLE IF NOT EXISTS media_item_people (
  media_item_id INTEGER,
  entity_id INTEGER,
  PRIMARY KEY (media_item_id, entity_id),
  FOREIGN KEY (media_item_id) REFERENCES media_items(id) ON DELETE CASCADE,
  FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS media_item_tags (
  media_item_id INTEGER,
  tag_id INTEGER,
  PRIMARY KEY (media_item_id, tag_id),
  FOREIGN KEY (media_item_id) REFERENCES media_items(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES media_tags(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_media_item_people_item ON media_item_people(media_item_id);
CREATE INDEX IF NOT EXISTS idx_media_item_people_entity ON media_item_people(entity_id);
CREATE INDEX IF NOT EXISTS idx_media_item_tags_item ON media_item_tags(media_item_id);
CREATE INDEX IF NOT EXISTS idx_media_item_tags_tag ON media_item_tags(tag_id);
