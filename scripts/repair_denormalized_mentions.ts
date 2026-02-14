/**
 * REPAIR DENORMALIZED MENTIONS
 *
 * Syncs denormalized columns in entity_mentions with source documents table
 * Fixes mismatches in doc_red_flag_rating and doc_date_created
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = process.env.DB_PATH || join(__dirname, '..', 'epstein-archive.db');

function main(): void {
  console.log('🔧 REPAIRING DENORMALIZED MENTIONS\n');
  console.log('='.repeat(80));

  const db = new Database(DB_PATH);

  // Count mismatches before repair
  const beforeCount = db
    .prepare(
      `
    SELECT COUNT(*) as count
    FROM entity_mentions em
    JOIN documents d ON em.document_id = d.id
    WHERE 
      (em.doc_red_flag_rating IS NOT d.red_flag_rating)
      OR (em.doc_date_created IS NOT d.date_created)
  `,
    )
    .get() as { count: number };

  console.log(`\n📊 Found ${beforeCount.count} mismatches to repair\n`);

  if (beforeCount.count === 0) {
    console.log('✅ No repairs needed - all denormalized columns in sync!');
    db.close();
    return;
  }

  // Perform repair
  console.log('🔄 Syncing denormalized columns...\n');

  const result = db
    .prepare(
      `
    UPDATE entity_mentions
    SET 
      doc_red_flag_rating = (
        SELECT red_flag_rating 
        FROM documents 
        WHERE documents.id = entity_mentions.document_id
      ),
      doc_date_created = (
        SELECT date_created 
        FROM documents 
        WHERE documents.id = entity_mentions.document_id
      )
    WHERE EXISTS (
      SELECT 1 
      FROM documents d 
      WHERE d.id = entity_mentions.document_id
      AND (
        (entity_mentions.doc_red_flag_rating IS NOT d.red_flag_rating)
        OR (entity_mentions.doc_date_created IS NOT d.date_created)
      )
    )
  `,
    )
    .run();

  console.log(`✅ Updated ${result.changes} entity_mention records\n`);

  // Verify repair
  const afterCount = db
    .prepare(
      `
    SELECT COUNT(*) as count
    FROM entity_mentions em
    JOIN documents d ON em.document_id = d.id
    WHERE 
      (em.doc_red_flag_rating IS NOT d.red_flag_rating)
      OR (em.doc_date_created IS NOT d.date_created)
  `,
    )
    .get() as { count: number };

  console.log('='.repeat(80));

  if (afterCount.count === 0) {
    console.log('✅ REPAIR SUCCESSFUL - All denormalized columns now in sync!');
  } else {
    console.log(`⚠️  WARNING: ${afterCount.count} mismatches still remain`);
    console.log('   This may indicate orphaned entity_mentions or data integrity issues');
  }

  console.log('='.repeat(80) + '\n');

  db.close();

  if (afterCount.count > 0) {
    process.exit(1);
  }
}

main();
