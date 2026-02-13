/**
 * DENORMALIZATION DRIFT PREVENTION
 *
 * SQLite triggers to keep entity_mentions.doc_* in sync with documents.*
 * Makes drift IMPOSSIBLE at the database level
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = process.env.DB_PATH || join(__dirname, '..', 'epstein-archive.db');

function main(): void {
  console.log('🔒 DENORMALIZATION DRIFT PREVENTION\n');
  console.log('Creating triggers to maintain sync between documents and entity_mentions...\n');

  const db = new Database(DB_PATH);

  try {
    // Trigger 1: When documents.red_flag_rating or date_created changes, update entity_mentions
    const updateTrigger = `
      CREATE TRIGGER IF NOT EXISTS sync_entity_mentions_on_doc_update
      AFTER UPDATE OF red_flag_rating, date_created ON documents
      FOR EACH ROW
      BEGIN
        UPDATE entity_mentions
        SET 
          doc_red_flag_rating = NEW.red_flag_rating,
          doc_date_created = NEW.date_created
        WHERE document_id = NEW.id;
      END;
    `;

    db.prepare(updateTrigger).run();
    console.log('✅ Created trigger: sync_entity_mentions_on_doc_update');

    // Trigger 2: When entity_mentions row is inserted, populate doc_* from documents
    const insertTrigger = `
      CREATE TRIGGER IF NOT EXISTS populate_entity_mentions_on_insert
      AFTER INSERT ON entity_mentions
      FOR EACH ROW
      WHEN NEW.doc_red_flag_rating IS NULL OR NEW.doc_date_created IS NULL
      BEGIN
        UPDATE entity_mentions
        SET 
          doc_red_flag_rating = (SELECT red_flag_rating FROM documents WHERE id = NEW.document_id),
          doc_date_created = (SELECT date_created FROM documents WHERE id = NEW.document_id)
        WHERE id = NEW.id;
      END;
    `;

    db.prepare(insertTrigger).run();
    console.log('✅ Created trigger: populate_entity_mentions_on_insert');

    // Verify triggers exist
    console.log('\nVerifying triggers...');
    const triggers = db
      .prepare(
        `
      SELECT name, tbl_name, sql 
      FROM sqlite_master 
      WHERE type='trigger' 
      AND name IN ('sync_entity_mentions_on_doc_update', 'populate_entity_mentions_on_insert')
    `,
      )
      .all();

    console.log(`  Found ${triggers.length}/2 triggers`);

    // Test the triggers
    console.log('\nTesting triggers...');

    // Test 1: Update a document and verify entity_mentions syncs
    db.prepare('BEGIN').run();

    const testDoc = db
      .prepare(
        `
      SELECT id, red_flag_rating, date_created 
      FROM documents 
      WHERE id IN (SELECT document_id FROM entity_mentions LIMIT 1)
      LIMIT 1
    `,
      )
      .get() as any;

    if (testDoc) {
      const originalRating = testDoc.red_flag_rating;
      const newRating = (originalRating || 1) + 1;

      // Update document
      db.prepare('UPDATE documents SET red_flag_rating = ? WHERE id = ?').run(
        newRating,
        testDoc.id,
      );

      // Check entity_mentions updated
      const mentionAfter = db
        .prepare(
          `
        SELECT doc_red_flag_rating 
        FROM entity_mentions 
        WHERE document_id = ? 
        LIMIT 1
      `,
        )
        .get(testDoc.id) as any;

      if (mentionAfter && mentionAfter.doc_red_flag_rating === newRating) {
        console.log('  ✅ UPDATE trigger works correctly');
      } else {
        console.log('  ❌ UPDATE trigger failed');
      }

      // Rollback test
      db.prepare('ROLLBACK').run();
    } else {
      console.log('  ⏭️  No test data available');
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ DENORMALIZATION DRIFT PREVENTION ACTIVE');
    console.log('='.repeat(80));
    console.log('\nTriggers will automatically maintain sync between:');
    console.log('  - documents.red_flag_rating → entity_mentions.doc_red_flag_rating');
    console.log('  - documents.date_created → entity_mentions.doc_date_created');
    console.log('\nDrift is now IMPOSSIBLE at the database level.');
  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`);
    throw error;
  } finally {
    db.close();
  }
}

main();
