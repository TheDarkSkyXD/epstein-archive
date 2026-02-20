-- Migration Bridge: Write-Ahead Logging Triggers for Increment Catch-up
-- This file implements a basic CDC (Change Data Capture) mechanism in SQLite

CREATE TABLE IF NOT EXISTS migration_write_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  operation TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME -- NULL means pending
);

-- 1. Entities
CREATE TRIGGER IF NOT EXISTS trg_entities_insert AFTER INSERT ON entities
BEGIN
  INSERT INTO migration_write_log (table_name, record_id, operation)
  VALUES ('entities', NEW.id, 'INSERT');
END;

CREATE TRIGGER IF NOT EXISTS trg_entities_update AFTER UPDATE ON entities
BEGIN
  INSERT INTO migration_write_log (table_name, record_id, operation)
  VALUES ('entities', NEW.id, 'UPDATE');
END;

-- 2. Documents
CREATE TRIGGER IF NOT EXISTS trg_documents_insert AFTER INSERT ON documents
BEGIN
  INSERT INTO migration_write_log (table_name, record_id, operation)
  VALUES ('documents', NEW.id, 'INSERT');
END;

CREATE TRIGGER IF NOT EXISTS trg_documents_update AFTER UPDATE ON documents
BEGIN
  INSERT INTO migration_write_log (table_name, record_id, operation)
  VALUES ('documents', NEW.id, 'UPDATE');
END;

-- 3. Mentions
CREATE TRIGGER IF NOT EXISTS trg_entity_mentions_insert AFTER INSERT ON entity_mentions
BEGIN
  INSERT INTO migration_write_log (table_name, record_id, operation)
  VALUES ('entity_mentions', CAST(NEW.id AS TEXT), 'INSERT');
END;

-- 4. Relationships (using composite key as record_id)
CREATE TRIGGER IF NOT EXISTS trg_entity_relationships_insert AFTER INSERT ON entity_relationships
BEGIN
  INSERT INTO migration_write_log (table_name, record_id, operation)
  VALUES ('entity_relationships', NEW.source_entity_id || '|' || NEW.target_entity_id || '|' || NEW.relationship_type, 'INSERT');
END;

-- 5. Investigations
CREATE TRIGGER IF NOT EXISTS trg_investigations_insert AFTER INSERT ON investigations
BEGIN
  INSERT INTO migration_write_log (table_name, record_id, operation)
  VALUES ('investigations', NEW.id, 'INSERT');
END;

-- 6. Media Items
CREATE TRIGGER IF NOT EXISTS trg_media_items_insert AFTER INSERT ON media_items
BEGIN
  INSERT INTO migration_write_log (table_name, record_id, operation)
  VALUES ('media_items', CAST(NEW.id AS TEXT), 'INSERT');
END;

-- 7. Financial Transactions
CREATE TRIGGER IF NOT EXISTS trg_financial_transactions_insert AFTER INSERT ON financial_transactions
BEGIN
  INSERT INTO migration_write_log (table_name, record_id, operation)
  VALUES ('financial_transactions', NEW.id, 'INSERT');
END;
