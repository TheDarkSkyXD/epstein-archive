-- Cleanup legacy views/tables no longer used by the application
PRAGMA foreign_keys=OFF;
DROP VIEW IF EXISTS entity_summary;
-- Ensure helpful indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_entity_mentions_entity ON entity_mentions(entity_id);
CREATE INDEX IF NOT EXISTS idx_media_item_people_entity ON media_item_people(entity_id);
CREATE INDEX IF NOT EXISTS idx_black_book_person ON black_book_entries(person_id);
PRAGMA foreign_keys=ON;
