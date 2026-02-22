/* eslint-disable no-undef */

/**
 * Migration: Add black_book_entries table (missed in initial schema)
 */
export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS "black_book_entries" (
      "id"              serial PRIMARY KEY,
      "person_id"       bigint REFERENCES entities(id) ON DELETE CASCADE,
      "entry_text"      text,
      "phone_numbers"   text,
      "addresses"       text,
      "email_addresses" text,
      "notes"           text,
      "page_number"     integer,
      "document_id"     bigint REFERENCES documents(id) ON DELETE SET NULL,
      "entry_category"  text DEFAULT 'original',
      "created_at"      timestamp DEFAULT current_timestamp
    );
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS "idx_black_book_person"   ON "black_book_entries" ("person_id");
    CREATE INDEX IF NOT EXISTS "idx_black_book_document" ON "black_book_entries" ("document_id");
    CREATE INDEX IF NOT EXISTS "idx_black_book_category" ON "black_book_entries" ("entry_category");
  `);
}

export async function down(pgm) {
  pgm.sql(`DROP TABLE IF EXISTS "black_book_entries"`);
}
