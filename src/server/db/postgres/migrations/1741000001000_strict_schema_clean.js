/* eslint-disable no-undef */

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql('SET statement_timeout = 0;');
  pgm.sql(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='documents' AND column_name='original_file_id'
      ) THEN
        ALTER TABLE documents ADD COLUMN original_file_id BIGINT;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='documents' AND column_name='original_file_path'
      ) THEN
        ALTER TABLE documents ADD COLUMN original_file_path TEXT;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='documents' AND column_name='has_failed_redactions'
      ) THEN
        ALTER TABLE documents ADD COLUMN has_failed_redactions BOOLEAN DEFAULT FALSE;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='documents' AND column_name='failed_redaction_count'
      ) THEN
        ALTER TABLE documents ADD COLUMN failed_redaction_count INTEGER DEFAULT 0;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='documents' AND column_name='failed_redaction_data'
      ) THEN
        ALTER TABLE documents ADD COLUMN failed_redaction_data TEXT;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='documents' AND column_name='unredaction_attempted'
      ) THEN
        ALTER TABLE documents ADD COLUMN unredaction_attempted BOOLEAN DEFAULT FALSE;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='documents' AND column_name='unredaction_succeeded'
      ) THEN
        ALTER TABLE documents ADD COLUMN unredaction_succeeded BOOLEAN DEFAULT FALSE;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='documents' AND column_name='redaction_coverage_before'
      ) THEN
        ALTER TABLE documents ADD COLUMN redaction_coverage_before NUMERIC;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='documents' AND column_name='redaction_coverage_after'
      ) THEN
        ALTER TABLE documents ADD COLUMN redaction_coverage_after NUMERIC;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='documents' AND column_name='unredacted_text_gain'
      ) THEN
        ALTER TABLE documents ADD COLUMN unredacted_text_gain INTEGER;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='documents' AND column_name='unredaction_baseline_vocab'
      ) THEN
        ALTER TABLE documents ADD COLUMN unredaction_baseline_vocab TEXT;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='entity_mentions' AND column_name='doc_red_flag_rating'
      ) THEN
        ALTER TABLE entity_mentions ADD COLUMN doc_red_flag_rating INTEGER;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='entity_mentions' AND column_name='doc_date_created'
      ) THEN
        ALTER TABLE entity_mentions ADD COLUMN doc_date_created TIMESTAMPTZ;
      END IF;
    END $$;
  `);

  pgm.sql(`
    DO $$
    DECLARE
      has_doc_red_flag_rating BOOLEAN;
      has_doc_date_created BOOLEAN;
    BEGIN
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='documents' AND column_name='red_flag_rating'
      ) INTO has_doc_red_flag_rating;

      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='documents' AND column_name='date_created'
      ) INTO has_doc_date_created;

      IF has_doc_red_flag_rating AND has_doc_date_created THEN
        UPDATE entity_mentions em
        SET doc_red_flag_rating = d.red_flag_rating,
            doc_date_created = COALESCE(d.date_created::timestamptz, em.doc_date_created)
        FROM documents d
        WHERE d.id = em.document_id
          AND (em.doc_red_flag_rating IS NULL OR em.doc_date_created IS NULL);
      ELSIF has_doc_red_flag_rating THEN
        UPDATE entity_mentions em
        SET doc_red_flag_rating = d.red_flag_rating
        FROM documents d
        WHERE d.id = em.document_id
          AND em.doc_red_flag_rating IS NULL;
      ELSIF has_doc_date_created THEN
        UPDATE entity_mentions em
        SET doc_date_created = COALESCE(d.date_created::timestamptz, em.doc_date_created)
        FROM documents d
        WHERE d.id = em.document_id
          AND em.doc_date_created IS NULL;
      END IF;
    END $$;
  `);

  pgm.sql(`
    CREATE TABLE IF NOT EXISTS document_pages (
      id BIGSERIAL PRIMARY KEY,
      document_id BIGINT NOT NULL,
      page_number INTEGER NOT NULL DEFAULT 1,
      page_path TEXT,
      page_url TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_document_pages_document_page ON document_pages(document_id, page_number);
  `);

  pgm.sql(`
    CREATE TABLE IF NOT EXISTS redaction_spans (
      id BIGSERIAL PRIMARY KEY,
      document_id BIGINT NOT NULL,
      span_start INTEGER NOT NULL,
      span_end INTEGER NOT NULL,
      replacement_text TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_redaction_spans_document ON redaction_spans(document_id, span_start);
  `);

  pgm.sql(`
    CREATE TABLE IF NOT EXISTS claim_triples (
      id BIGSERIAL PRIMARY KEY,
      document_id BIGINT NOT NULL,
      subject_entity_id BIGINT,
      object_entity_id BIGINT,
      confidence NUMERIC DEFAULT 0,
      claim_text TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_claim_triples_document ON claim_triples(document_id);
  `);

  pgm.sql(`
    CREATE TABLE IF NOT EXISTS document_sentences (
      id BIGSERIAL PRIMARY KEY,
      document_id BIGINT NOT NULL,
      sentence_index INTEGER NOT NULL DEFAULT 0,
      sentence_text TEXT NOT NULL DEFAULT '',
      is_boilerplate BOOLEAN DEFAULT FALSE,
      signal_score NUMERIC DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_document_sentences_document_idx ON document_sentences(document_id, sentence_index);
  `);

  pgm.sql(`
    CREATE TABLE IF NOT EXISTS media_item_people (
      id BIGSERIAL PRIMARY KEY,
      media_item_id BIGINT NOT NULL,
      entity_id BIGINT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_media_item_people_unique ON media_item_people(media_item_id, entity_id);
    CREATE INDEX IF NOT EXISTS idx_media_item_people_entity ON media_item_people(entity_id);
  `);
}

export async function down(pgm) {
  pgm.sql(`
    DROP TABLE IF EXISTS media_item_people;
    DROP TABLE IF EXISTS document_sentences;
    DROP TABLE IF EXISTS claim_triples;
    DROP TABLE IF EXISTS redaction_spans;
    DROP TABLE IF EXISTS document_pages;
  `);
}
