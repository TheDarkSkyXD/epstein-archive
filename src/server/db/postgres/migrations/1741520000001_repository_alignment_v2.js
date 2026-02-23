/* eslint-disable no-undef */

export async function up(pgm) {
  pgm.sql(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='entities' AND column_name='junk_probability') THEN
        ALTER TABLE entities ADD COLUMN junk_probability REAL DEFAULT 0;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='media_items' AND column_name='date_taken') THEN
        ALTER TABLE media_items ADD COLUMN date_taken TIMESTAMP;
      END IF;
    END;
    $$;
  `);
}

export async function down(pgm) {
  pgm.dropColumn('media_items', 'date_taken');
  pgm.dropColumn('entities', 'junk_probability');
}
