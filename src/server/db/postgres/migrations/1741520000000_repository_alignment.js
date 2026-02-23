/* eslint-disable no-undef */

export async function up(pgm) {
  pgm.sql(`
    DO $$
    BEGIN
      -- Entities alignment
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='entities' AND column_name='community_id') THEN
        ALTER TABLE entities ADD COLUMN community_id BIGINT;
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='entities' AND column_name='junk_reason') THEN
        ALTER TABLE entities ADD COLUMN junk_reason TEXT;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='entities' AND column_name='title') THEN
        ALTER TABLE entities ADD COLUMN title TEXT;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='entities' AND column_name='junk_probability') THEN
        ALTER TABLE entities ADD COLUMN junk_probability REAL DEFAULT 0;
      END IF;

      -- Entity Mentions alignment
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='entity_mentions' AND column_name='sentence_id') THEN
        ALTER TABLE entity_mentions ADD COLUMN sentence_id BIGINT;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='entity_mentions' AND column_name='verified') THEN
        ALTER TABLE entity_mentions ADD COLUMN verified INTEGER DEFAULT 0;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='entity_mentions' AND column_name='verified_by') THEN
        ALTER TABLE entity_mentions ADD COLUMN verified_by TEXT;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='entity_mentions' AND column_name='verified_at') THEN
        ALTER TABLE entity_mentions ADD COLUMN verified_at TIMESTAMP;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='entity_mentions' AND column_name='rejection_reason') THEN
        ALTER TABLE entity_mentions ADD COLUMN rejection_reason TEXT;
      END IF;

      -- Claim Triples alignment
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='claim_triples' AND column_name='verified') THEN
        ALTER TABLE claim_triples ADD COLUMN verified INTEGER DEFAULT 0;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='claim_triples' AND column_name='verified_by') THEN
        ALTER TABLE claim_triples ADD COLUMN verified_by TEXT;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='claim_triples' AND column_name='verified_at') THEN
        ALTER TABLE claim_triples ADD COLUMN verified_at TIMESTAMP;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='claim_triples' AND column_name='rejection_reason') THEN
        ALTER TABLE claim_triples ADD COLUMN rejection_reason TEXT;
      END IF;

      -- Users alignment
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='last_active') THEN
        ALTER TABLE users ADD COLUMN last_active TIMESTAMP;
      END IF;

      -- Entity Relationships alignment
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='entity_relationships' AND column_name='was_agentic') THEN
        ALTER TABLE entity_relationships ADD COLUMN was_agentic INTEGER DEFAULT 0;
      END IF;

      -- Ingest Runs alignment
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ingest_runs' AND column_name='agentic_model_id') THEN
        ALTER TABLE ingest_runs ADD COLUMN agentic_model_id TEXT;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ingest_runs' AND column_name='extractor_versions') THEN
        ALTER TABLE ingest_runs ADD COLUMN extractor_versions TEXT;
      END IF;

      -- Media Items alignment
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='media_items' AND column_name='width') THEN
        ALTER TABLE media_items ADD COLUMN width INTEGER;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='media_items' AND column_name='height') THEN
        ALTER TABLE media_items ADD COLUMN height INTEGER;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='media_items' AND column_name='date_taken') THEN
        ALTER TABLE media_items ADD COLUMN date_taken TIMESTAMP;
      END IF;

    END;
    $$;
  `);
}

export async function down(pgm) {
  pgm.sql(`
    ALTER TABLE media_items DROP COLUMN IF EXISTS width;
    ALTER TABLE media_items DROP COLUMN IF EXISTS date_taken;
    ALTER TABLE media_items DROP COLUMN IF EXISTS height;
    ALTER TABLE ingest_runs DROP COLUMN IF EXISTS extractor_versions;
    ALTER TABLE ingest_runs DROP COLUMN IF EXISTS agentic_model_id;
    ALTER TABLE entity_relationships DROP COLUMN IF EXISTS was_agentic;
    ALTER TABLE users DROP COLUMN IF EXISTS last_active;
    ALTER TABLE claim_triples DROP COLUMN IF EXISTS rejection_reason;
    ALTER TABLE claim_triples DROP COLUMN IF EXISTS verified_at;
    ALTER TABLE claim_triples DROP COLUMN IF EXISTS verified_by;
    ALTER TABLE claim_triples DROP COLUMN IF EXISTS verified;
    ALTER TABLE entity_mentions DROP COLUMN IF EXISTS rejection_reason;
    ALTER TABLE entity_mentions DROP COLUMN IF EXISTS verified_at;
    ALTER TABLE entity_mentions DROP COLUMN IF EXISTS verified_by;
    ALTER TABLE entity_mentions DROP COLUMN IF EXISTS verified;
    ALTER TABLE entity_mentions DROP COLUMN IF EXISTS sentence_id;
    ALTER TABLE entities DROP COLUMN IF EXISTS junk_probability;
    ALTER TABLE entities DROP COLUMN IF EXISTS title;
    ALTER TABLE entities DROP COLUMN IF EXISTS junk_reason;
    ALTER TABLE entities DROP COLUMN IF EXISTS community_id;
  `);
}
