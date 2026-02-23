/* eslint-disable no-undef */

export const shorthands = undefined;

export async function up(pgm) {
  // 1. Create evidence_entity junction table
  pgm.createTable('evidence_entity', {
    evidence_id: { type: 'bigint', references: 'evidence(id)', onDelete: 'CASCADE' },
    entity_id: { type: 'bigint', references: 'entities(id)', onDelete: 'CASCADE' },
    role: { type: 'text', notNull: true, default: 'participant' },
    confidence: { type: 'real', default: 0.8 },
    mention_context: { type: 'text' },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });
  pgm.addConstraint('evidence_entity', 'pk_evidence_entity', {
    primaryKey: ['evidence_id', 'entity_id'],
  });
  pgm.createIndex('evidence_entity', 'entity_id');

  // 2. Add FTS to evidence
  pgm.addColumns('evidence', {
    fts_vector: { type: 'tsvector' },
  });
  pgm.createIndex('evidence', 'fts_vector', { method: 'gin' });

  // 3. Create FTS trigger for evidence
  pgm.sql(`
    CREATE OR REPLACE FUNCTION update_evidence_fts() RETURNS TRIGGER AS $$
    BEGIN
      NEW.fts_vector :=
        setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', left(coalesce(NEW.extracted_text, ''), 100000)), 'C');
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_evidence_fts
      BEFORE INSERT OR UPDATE ON evidence
      FOR EACH ROW EXECUTE FUNCTION update_evidence_fts();
  `);

  // 4. Backfill evidence FTS
  pgm.sql(`
    UPDATE evidence SET fts_vector =
      setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
      setweight(to_tsvector('english', left(coalesce(extracted_text, ''), 100000)), 'C');
  `);
}

export async function down(pgm) {
  pgm.sql(`DROP TRIGGER IF EXISTS trg_evidence_fts ON evidence`);
  pgm.sql(`DROP FUNCTION IF EXISTS update_evidence_fts`);
  pgm.dropIndex('evidence', 'fts_vector');
  pgm.dropColumn('evidence', 'fts_vector');
  pgm.dropTable('evidence_entity');
}
