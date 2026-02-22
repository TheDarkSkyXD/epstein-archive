/* eslint-disable no-undef */

/**
 * Migration: Performance Indexes + FTS triggers + GIN backfill
 * noTransaction() is required for CREATE INDEX CONCURRENTLY.
 * ADD COLUMNs run first so dependent indexes can reference them.
 */
export const shorthands = undefined;

export async function up(pgm) {
  pgm.noTransaction(); // Required: CONCURRENTLY cannot run inside a transaction

  // ── 1. ADD COLUMNS FIRST (idempotent guards) ──────────────────────────────
  // location columns — needed before idx_entities_geo is created
  pgm.sql(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='entities' AND column_name='location_lat'
      ) THEN
        ALTER TABLE entities ADD COLUMN location_lat double precision;
        ALTER TABLE entities ADD COLUMN location_lng double precision;
      END IF;
    END;
    $$;
  `);

  // mentions column — some routes read e.mentions; add if absent
  pgm.sql(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='entities' AND column_name='mentions'
      ) THEN
        ALTER TABLE entities ADD COLUMN mentions integer DEFAULT 0;
      END IF;
    END;
    $$;
  `);

  // ── 2. INDEXES (CONCURRENTLY — no table lock) ─────────────────────────────

  // Composite covering index for analytics top-connected query
  pgm.sql(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_er_source_target_strength
      ON entity_relationships (source_entity_id, target_entity_id, strength DESC);
  `);

  // Graph global: entities by type + risk (clean only)
  pgm.sql(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entities_type_risk
      ON entities (entity_type, red_flag_rating DESC)
      WHERE junk_tier = 'clean' AND quarantine_status = 0;
  `);

  // Map: geospatial coordinate filter — needs location_lat/lng from step 1
  pgm.sql(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entities_geo
      ON entities (location_lat, location_lng)
      WHERE location_lat IS NOT NULL AND location_lng IS NOT NULL
        AND location_lat BETWEEN -90 AND 90
        AND location_lng BETWEEN -180 AND 180;
  `);

  // entity_mentions: document/entity join path
  pgm.sql(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_em_doc_entity
      ON entity_mentions (document_id, entity_id);
  `);

  // Media: batched image fetch — media_type is the real column name
  pgm.sql(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_media_entity_image
      ON media_items (entity_id, media_type)
      WHERE media_type LIKE 'image/%';
  `);

  // Documents: mime_type filter + date range (evidence_type/date_created don't exist)
  pgm.sql(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_docs_type_date
      ON documents (mime_type, created_at DESC)
      WHERE mime_type IS NOT NULL;
  `);

  // Entities: covering index by type + risk for graph global (canonical_id btree already exists)
  pgm.sql(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entities_risk_type
      ON entities (red_flag_rating DESC, entity_type)
      WHERE COALESCE(junk_tier,'clean') = 'clean';
  `);

  // ── 3. FTS TRIGGERS ───────────────────────────────────────────────────────

  pgm.sql(`
    CREATE OR REPLACE FUNCTION update_entity_fts() RETURNS TRIGGER AS $$
    BEGIN
      NEW.fts_vector := to_tsvector('english',
        coalesce(NEW.full_name, '') || ' ' ||
        coalesce(NEW.primary_role, '') || ' ' ||
        coalesce(NEW.aliases, '') || ' ' ||
        coalesce(NEW.bio, '') || ' ' ||
        coalesce(NEW.notes, '') || ' ' ||
        coalesce(NEW.connections_summary, '')
      );
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  pgm.sql(`
    DROP TRIGGER IF EXISTS trg_entity_fts ON entities;
    CREATE TRIGGER trg_entity_fts
      BEFORE INSERT OR UPDATE ON entities
      FOR EACH ROW EXECUTE FUNCTION update_entity_fts();
  `);

  pgm.sql(`
    CREATE OR REPLACE FUNCTION update_document_fts() RETURNS TRIGGER AS $$
    BEGIN
      NEW.fts_vector := to_tsvector('english',
        coalesce(NEW.file_name, '') || ' ' ||
        coalesce(NEW.title, '') || ' ' ||
        coalesce(left(NEW.content, 100000), '')
      );
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  pgm.sql(`
    DROP TRIGGER IF EXISTS trg_document_fts ON documents;
    CREATE TRIGGER trg_document_fts
      BEFORE INSERT OR UPDATE ON documents
      FOR EACH ROW EXECUTE FUNCTION update_document_fts();
  `);

  // ── 4. BACKFILL fts_vector for existing rows (idempotent) ─────────────────

  pgm.sql(`
    UPDATE entities SET fts_vector = to_tsvector('english',
      coalesce(full_name,'') || ' ' ||
      coalesce(primary_role,'') || ' ' ||
      coalesce(aliases,'') || ' ' ||
      coalesce(bio,'') || ' ' ||
      coalesce(notes,'') || ' ' ||
      coalesce(connections_summary,'')
    ) WHERE fts_vector IS NULL;
  `);

  pgm.sql(`
    UPDATE documents SET fts_vector = to_tsvector('english',
      coalesce(file_name,'') || ' ' ||
      coalesce(title,'') || ' ' ||
      coalesce(left(content, 100000),'')
    ) WHERE fts_vector IS NULL;
  `);
}

export async function down(pgm) {
  pgm.noTransaction();
  pgm.sql(`DROP TRIGGER IF EXISTS trg_entity_fts ON entities`);
  pgm.sql(`DROP TRIGGER IF EXISTS trg_document_fts ON documents`);
  pgm.sql(`DROP FUNCTION IF EXISTS update_entity_fts()`);
  pgm.sql(`DROP FUNCTION IF EXISTS update_document_fts()`);
  pgm.sql(`DROP INDEX CONCURRENTLY IF EXISTS idx_er_source_target_strength`);
  pgm.sql(`DROP INDEX CONCURRENTLY IF EXISTS idx_entities_type_risk`);
  pgm.sql(`DROP INDEX CONCURRENTLY IF EXISTS idx_entities_geo`);
  pgm.sql(`DROP INDEX CONCURRENTLY IF EXISTS idx_em_doc_entity`);
  pgm.sql(`DROP INDEX CONCURRENTLY IF EXISTS idx_media_entity_image`);
  pgm.sql(`DROP INDEX CONCURRENTLY IF EXISTS idx_docs_type_date`);
  pgm.sql(`DROP INDEX CONCURRENTLY IF EXISTS idx_entities_risk_type`);
}
