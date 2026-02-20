-- Migration 043: Postgres Migration Outbox
-- This table captures all changes to SQLite during the dual-write period.

CREATE TABLE IF NOT EXISTS pg_outbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
  primary_key_val TEXT NOT NULL,
  data_json TEXT, -- Packed row data for replay
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for replayer performance
CREATE INDEX IF NOT EXISTS idx_pg_outbox_created ON pg_outbox(created_at);

-- =============================================
-- TRIGGERS FOR ENTITIES
-- =============================================

DROP TRIGGER IF EXISTS entities_outbox_ai;
CREATE TRIGGER entities_outbox_ai AFTER INSERT ON entities
BEGIN
  INSERT INTO pg_outbox (table_name, operation, primary_key_val, data_json)
  VALUES ('entities', 'INSERT', CAST(new.id AS TEXT), 
    json_object(
      'id', new.id,
      'full_name', new.full_name,
      'entity_type', new.entity_type,
      'type', new.type,
      'entity_category', new.entity_category,
      'risk_level', new.risk_level,
      'red_flag_rating', new.red_flag_rating,
      'red_flag_description', new.red_flag_description,
      'bio', new.bio,
      'birth_date', new.birth_date,
      'death_date', new.death_date,
      'aliases', new.aliases,
      'notes', new.notes,
      'primary_role', new.primary_role,
      'connections_summary', new.connections_summary,
      'canonical_id', new.canonical_id,
      'junk_tier', new.junk_tier,
      'quarantine_status', new.quarantine_status,
      'is_vip', new.is_vip,
      'location_lat', new.location_lat,
      'location_lng', new.location_lng,
      'location_label', new.location_label
    )
  );
END;

DROP TRIGGER IF EXISTS entities_outbox_au;
CREATE TRIGGER entities_outbox_au AFTER UPDATE ON entities
BEGIN
  INSERT INTO pg_outbox (table_name, operation, primary_key_val, data_json)
  VALUES ('entities', 'UPDATE', CAST(new.id AS TEXT), 
    json_object(
      'id', new.id,
      'full_name', new.full_name,
      'entity_type', new.entity_type,
      'type', new.type,
      'entity_category', new.entity_category,
      'risk_level', new.risk_level,
      'red_flag_rating', new.red_flag_rating,
      'red_flag_description', new.red_flag_description,
      'bio', new.bio,
      'birth_date', new.birth_date,
      'death_date', new.death_date,
      'aliases', new.aliases,
      'notes', new.notes,
      'primary_role', new.primary_role,
      'connections_summary', new.connections_summary,
      'canonical_id', new.canonical_id,
      'junk_tier', new.junk_tier,
      'quarantine_status', new.quarantine_status,
      'is_vip', new.is_vip,
      'location_lat', new.location_lat,
      'location_lng', new.location_lng,
      'location_label', new.location_label
    )
  );
END;

DROP TRIGGER IF EXISTS entities_outbox_ad;
CREATE TRIGGER entities_outbox_ad AFTER DELETE ON entities
BEGIN
  INSERT INTO pg_outbox (table_name, operation, primary_key_val)
  VALUES ('entities', 'DELETE', CAST(old.id AS TEXT));
END;

-- =============================================
-- TRIGGERS FOR ENTITY_MENTIONS
-- =============================================

DROP TRIGGER IF EXISTS entity_mentions_outbox_ai;
CREATE TRIGGER entity_mentions_outbox_ai AFTER INSERT ON entity_mentions
BEGIN
  INSERT INTO pg_outbox (table_name, operation, primary_key_val, data_json)
  VALUES ('entity_mentions', 'INSERT', CAST(new.id AS TEXT), 
    json_object(
      'id', new.id,
      'entity_id', new.entity_id,
      'document_id', new.document_id,
      'mention_count', new.mention_count,
      'context_snippet', new.context_snippet,
      'first_seen_at', new.first_seen_at,
      'last_seen_at', new.last_seen_at,
      'confidence_score', new.confidence_score,
      'link_method', new.link_method,
      'verified', new.verified,
      'verified_by', new.verified_by,
      'verified_at', new.verified_at,
      'rejection_reason', new.rejection_reason
    )
  );
END;

-- =============================================
-- TRIGGERS FOR DOCUMENTS
-- =============================================

DROP TRIGGER IF EXISTS documents_outbox_ai;
CREATE TRIGGER documents_outbox_ai AFTER INSERT ON documents
BEGIN
  INSERT INTO pg_outbox (table_name, operation, primary_key_val, data_json)
  VALUES ('documents', 'INSERT', CAST(new.id AS TEXT), 
    json_object(
      'id', new.id,
      'file_name', new.file_name,
      'file_path', new.file_path,
      'title', new.title,
      'content', new.content,
      'mime_type', new.mime_type,
      'file_size_bytes', new.file_size_bytes,
      'page_count', new.page_count,
      'is_sensitive', new.is_sensitive,
      'signal_score', new.signal_score,
      'processing_status', new.processing_status,
      'processing_error', new.processing_error,
      'processing_attempts', new.processing_attempts,
      'worker_id', new.worker_id,
      'lease_expires_at', new.lease_expires_at,
      'last_processed_at', new.last_processed_at,
      'source_collection', new.source_collection
    )
  );
END;

DROP TRIGGER IF EXISTS documents_outbox_au;
CREATE TRIGGER documents_outbox_au AFTER UPDATE ON documents
BEGIN
  INSERT INTO pg_outbox (table_name, operation, primary_key_val, data_json)
  VALUES ('documents', 'UPDATE', CAST(new.id AS TEXT), 
    json_object(
      'id', new.id,
      'file_name', new.file_name,
      'file_path', new.file_path,
      'title', new.title,
      'content', new.content,
      'mime_type', new.mime_type,
      'file_size_bytes', new.file_size_bytes,
      'page_count', new.page_count,
      'is_sensitive', new.is_sensitive,
      'signal_score', new.signal_score,
      'processing_status', new.processing_status,
      'processing_error', new.processing_error,
      'processing_attempts', new.processing_attempts,
      'worker_id', new.worker_id,
      'lease_expires_at', new.lease_expires_at,
      'last_processed_at', new.last_processed_at,
      'source_collection', new.source_collection
    )
  );
END;
