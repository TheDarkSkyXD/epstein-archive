/* eslint-disable no-undef */

/**
 * Migration: Weighted fts_vector triggers for entities + documents.
 * Title/full_name → weight A, role/file_name → B, body/content → C.
 * Drops and recreates triggers from the previous migration.
 */
export const shorthands = undefined;

export async function up(pgm) {
  // ── Entity trigger: weighted fields ───────────────────────────────────────
  pgm.sql(`
    DROP TRIGGER IF EXISTS trg_entity_fts ON entities;

    CREATE OR REPLACE FUNCTION update_entity_fts() RETURNS TRIGGER AS $$
    BEGIN
      NEW.fts_vector :=
        setweight(to_tsvector('english', coalesce(NEW.full_name, '')), 'A') ||
        setweight(to_tsvector('english',
          coalesce(NEW.primary_role, '') || ' ' ||
          coalesce(NEW.aliases, '')
        ), 'B') ||
        setweight(to_tsvector('english',
          coalesce(NEW.bio, '') || ' ' ||
          coalesce(NEW.notes, '') || ' ' ||
          coalesce(NEW.connections_summary, '')
        ), 'C');
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_entity_fts
      BEFORE INSERT OR UPDATE ON entities
      FOR EACH ROW EXECUTE FUNCTION update_entity_fts();
  `);

  // ── Document trigger: title A, file_name B, content C ────────────────────
  pgm.sql(`
    DROP TRIGGER IF EXISTS trg_document_fts ON documents;

    CREATE OR REPLACE FUNCTION update_document_fts() RETURNS TRIGGER AS $$
    BEGIN
      NEW.fts_vector :=
        setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(NEW.file_name, '')), 'B') ||
        setweight(to_tsvector('english', left(coalesce(NEW.content, ''), 100000)), 'C');
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_document_fts
      BEFORE INSERT OR UPDATE ON documents
      FOR EACH ROW EXECUTE FUNCTION update_document_fts();
  `);

  // ── Backfill with weights — idempotent (overwrites flat vectors) ──────────
  // Batched in 10k chunks via DO block to avoid one huge transaction lock
  pgm.sql(`
    DO $$
    DECLARE
      batch_size INT := 10000;
      last_id    BIGINT := 0;
      max_id     BIGINT;
    BEGIN
      SELECT MAX(id) INTO max_id FROM entities;
      WHILE last_id <= COALESCE(max_id, 0) LOOP
        UPDATE entities SET fts_vector =
          setweight(to_tsvector('english', coalesce(full_name,'')), 'A') ||
          setweight(to_tsvector('english',
            coalesce(primary_role,'') || ' ' || coalesce(aliases,'')), 'B') ||
          setweight(to_tsvector('english',
            coalesce(bio,'') || ' ' || coalesce(notes,'') || ' ' || coalesce(connections_summary,'')), 'C')
        WHERE id > last_id AND id <= last_id + batch_size;
        last_id := last_id + batch_size;
      END LOOP;
    END;
    $$;
  `);

  pgm.sql(`
    DO $$
    DECLARE
      batch_size INT := 5000;
      last_id    BIGINT := 0;
      max_id     BIGINT;
    BEGIN
      SELECT MAX(id) INTO max_id FROM documents;
      WHILE last_id <= COALESCE(max_id, 0) LOOP
        UPDATE documents SET fts_vector =
          setweight(to_tsvector('english', coalesce(title,'')), 'A') ||
          setweight(to_tsvector('english', coalesce(file_name,'')), 'B') ||
          setweight(to_tsvector('english', left(coalesce(content,''), 100000)), 'C')
        WHERE id > last_id AND id <= last_id + batch_size;
        last_id := last_id + batch_size;
      END LOOP;
    END;
    $$;
  `);

  // ANALYZE after large backfill to update planner stats
  pgm.sql(`ANALYZE entities`);
  pgm.sql(`ANALYZE documents`);
}

export async function down(pgm) {
  pgm.sql(`DROP TRIGGER IF EXISTS trg_entity_fts ON entities`);
  pgm.sql(`DROP TRIGGER IF EXISTS trg_document_fts ON documents`);
  // Restore flat (unweighted) triggers
  pgm.sql(`
    CREATE OR REPLACE FUNCTION update_entity_fts() RETURNS TRIGGER AS $$
    BEGIN
      NEW.fts_vector := to_tsvector('english',
        coalesce(NEW.full_name,'') || ' ' || coalesce(NEW.primary_role,'') || ' ' ||
        coalesce(NEW.aliases,'') || ' ' || coalesce(NEW.bio,''));
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    CREATE TRIGGER trg_entity_fts BEFORE INSERT OR UPDATE ON entities
      FOR EACH ROW EXECUTE FUNCTION update_entity_fts();
  `);
}
