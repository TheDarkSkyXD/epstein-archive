/* eslint-disable no-undef */

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql('SET statement_timeout = 0;');
  pgm.sql(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'investigations'
          AND column_name = 'collaborator_ids'
      ) THEN
        ALTER TABLE investigations ADD COLUMN collaborator_ids TEXT DEFAULT '[]';
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'investigations'
          AND column_name = 'created_at'
      ) THEN
        ALTER TABLE investigations ADD COLUMN created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'investigations'
          AND column_name = 'updated_at'
      ) THEN
        ALTER TABLE investigations ADD COLUMN updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'documents'
          AND column_name = 'content_preview'
      ) THEN
        ALTER TABLE documents ADD COLUMN content_preview TEXT;
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'documents'
          AND column_name = 'created_at'
      ) THEN
        ALTER TABLE documents ADD COLUMN created_at TIMESTAMPTZ;
      END IF;
    END;
    $$;
  `);

  pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'documents'
          AND column_name = 'content_refined'
      ) THEN
        UPDATE documents
        SET content_preview = LEFT(COALESCE(content_refined, ''), 1800)
        WHERE content_preview IS NULL;
      ELSIF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'documents'
          AND column_name = 'content'
      ) THEN
        UPDATE documents
        SET content_preview = LEFT(COALESCE(content, ''), 1800)
        WHERE content_preview IS NULL;
      END IF;
    END;
    $$;
  `);

  pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'documents'
          AND column_name = 'date_created'
      ) THEN
        UPDATE documents
        SET created_at = date_created::timestamptz
        WHERE created_at IS NULL
          AND date_created IS NOT NULL;
      END IF;
    END;
    $$;
  `);

  pgm.sql(`
    UPDATE investigations
    SET updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP)
    WHERE updated_at IS NULL;
  `);
}

export async function down(pgm) {
  pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'documents'
          AND column_name = 'created_at'
      ) THEN
        ALTER TABLE documents DROP COLUMN created_at;
      END IF;

      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'documents'
          AND column_name = 'content_preview'
      ) THEN
        ALTER TABLE documents DROP COLUMN content_preview;
      END IF;

      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'investigations'
          AND column_name = 'updated_at'
      ) THEN
        ALTER TABLE investigations DROP COLUMN updated_at;
      END IF;

      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'investigations'
          AND column_name = 'created_at'
      ) THEN
        ALTER TABLE investigations DROP COLUMN created_at;
      END IF;

      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'investigations'
          AND column_name = 'collaborator_ids'
      ) THEN
        ALTER TABLE investigations DROP COLUMN collaborator_ids;
      END IF;
    END;
    $$;
  `);
}
