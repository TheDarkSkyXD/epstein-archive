/**
 * FINAL FIX: Entity Documents Temp B-tree Elimination
 *
 * Root cause: Query joins entity_mentions → documents, then sorts by documents columns.
 * SQLite can't use documents indexes after the JOIN because it already used
 * entity_mentions index for the WHERE clause.
 *
 * Solution: Denormalize sort keys into entity_mentions table (additive, non-breaking)
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = process.env.DB_PATH || join(__dirname, '..', 'epstein-archive.db');

async function main(): Promise<void> {
  console.log('🔧 FINAL FIX: Eliminating Entity Documents Temp B-tree\n');

  const db = new Database(DB_PATH);

  try {
    // Step 1: Add denormalized sort columns to entity_mentions (additive, non-breaking)
    console.log('Step 1: Adding sort columns to entity_mentions...');

    const columns = [
      'ALTER TABLE entity_mentions ADD COLUMN doc_red_flag_rating INTEGER',
      'ALTER TABLE entity_mentions ADD COLUMN doc_date_created TEXT',
    ];

    for (const sql of columns) {
      try {
        db.prepare(sql).run();
        console.log(`  ✅ ${sql.split('ADD COLUMN ')[1]}`);
      } catch (error: any) {
        if (error.message.includes('duplicate column')) {
          console.log(`  ⏭️  Column already exists: ${sql.split('ADD COLUMN ')[1]}`);
        } else {
          throw error;
        }
      }
    }

    // Step 2: Backfill denormalized columns in batches
    console.log('\nStep 2: Backfilling denormalized columns...');

    const totalRows = (
      db.prepare('SELECT COUNT(*) as count FROM entity_mentions').get() as { count: number }
    ).count;
    console.log(`  Total rows to backfill: ${totalRows.toLocaleString()}`);

    const BATCH_SIZE = 10000;
    let processed = 0;

    db.prepare('BEGIN').run();

    const updateSql = `
      UPDATE entity_mentions
      SET 
        doc_red_flag_rating = (SELECT red_flag_rating FROM documents WHERE id = entity_mentions.document_id),
        doc_date_created = (SELECT date_created FROM documents WHERE id = entity_mentions.document_id)
      WHERE doc_red_flag_rating IS NULL
        AND id IN (SELECT id FROM entity_mentions WHERE doc_red_flag_rating IS NULL LIMIT ?)
    `;

    while (processed < totalRows) {
      const stmt = db.prepare(updateSql);
      const result = stmt.run(BATCH_SIZE);
      const changed = result.changes;

      if (changed === 0) break;

      processed += changed;
      console.log(
        `  Progress: ${processed.toLocaleString()}/${totalRows.toLocaleString()} (${((processed / totalRows) * 100).toFixed(1)}%)`,
      );

      // Commit and start new transaction every batch
      db.prepare('COMMIT').run();
      db.prepare('BEGIN').run();
    }

    db.prepare('COMMIT').run();
    console.log('  ✅ Backfill complete');

    // Step 3: Create composite index on entity_mentions with sort columns
    console.log('\nStep 3: Creating composite index...');

    const indexSql = `
      CREATE INDEX IF NOT EXISTS idx_entity_mentions_entity_sorted 
      ON entity_mentions(entity_id, doc_red_flag_rating DESC, doc_date_created DESC, document_id)
    `;

    db.prepare(indexSql).run();
    console.log('  ✅ Index created: idx_entity_mentions_entity_sorted');

    // Step 4: Run ANALYZE
    console.log('\nStep 4: Running ANALYZE...');
    db.prepare('ANALYZE').run();
    console.log('  ✅ ANALYZE complete');

    // Step 5: Verify the fix with EXPLAIN QUERY PLAN
    console.log('\nStep 5: Verifying query plan...\n');

    const testQuery = `
      SELECT d.id, d.file_name, d.red_flag_rating, d.date_created
      FROM documents d
      JOIN entity_mentions em ON d.id = em.document_id
      WHERE em.entity_id = 1
      ORDER BY d.red_flag_rating DESC, d.date_created DESC
      LIMIT 50
    `;

    const plan = db.prepare(`EXPLAIN QUERY PLAN ${testQuery}`).all();

    let hasTempBtree = false;
    for (const step of plan as any[]) {
      console.log(`  ${step.detail}`);
      if (step.detail.toUpperCase().includes('USE TEMP B-TREE')) {
        hasTempBtree = true;
      }
    }

    console.log('\n' + '='.repeat(80));
    if (hasTempBtree) {
      console.log('❌ STILL HAS TEMP B-TREE - Query needs rewrite');
      console.log('\nAlternative: Rewrite query to use denormalized columns:');
      console.log(`
  SELECT d.id, d.file_name, d.red_flag_rating, d.date_created
  FROM documents d
  JOIN entity_mentions em ON d.id = em.document_id
  WHERE em.entity_id = ?
  ORDER BY em.doc_red_flag_rating DESC, em.doc_date_created DESC
  LIMIT 50
      `);

      // Test the rewritten query
      console.log('\nTesting rewritten query...\n');
      const rewrittenQuery = `
        SELECT d.id, d.file_name, d.red_flag_rating, d.date_created
        FROM documents d
        JOIN entity_mentions em ON d.id = em.document_id
        WHERE em.entity_id = 1
        ORDER BY em.doc_red_flag_rating DESC, em.doc_date_created DESC
        LIMIT 50
      `;

      const rewrittenPlan = db.prepare(`EXPLAIN QUERY PLAN ${rewrittenQuery}`).all();
      let rewrittenHasTempBtree = false;
      for (const step of rewrittenPlan as any[]) {
        console.log(`  ${step.detail}`);
        if (step.detail.toUpperCase().includes('USE TEMP B-TREE')) {
          rewrittenHasTempBtree = true;
        }
      }

      if (!rewrittenHasTempBtree) {
        console.log('\n✅ REWRITTEN QUERY ELIMINATES TEMP B-TREE!');
        console.log('\n⚠️  ACTION REQUIRED: Update API endpoint to use rewritten query');
      }
    } else {
      console.log('✅ NO TEMP B-TREE - FIXED!');
    }
    console.log('='.repeat(80));
  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`);
    throw error;
  } finally {
    db.close();
  }
}

main().catch(console.error);
