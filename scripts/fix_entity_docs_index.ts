/**
 * FIX ENTITY DOCUMENTS TEMP B-TREE
 *
 * The Entity Documents query needs a covering index
 * that includes both the JOIN and ORDER BY columns
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = process.env.DB_PATH || join(__dirname, '..', 'epstein-archive.db');

function main(): void {
  console.log('🔧 Fixing Entity Documents Temp B-tree\n');

  const db = new Database(DB_PATH);

  // The issue: documents table needs covering index for ORDER BY
  // Current query: ORDER BY d.red_flag_rating DESC, d.date_created DESC
  // But we're joining on entity_mentions, so we need a composite approach

  // Strategy: Create covering index on documents(id, red_flag_rating DESC, date_created DESC)
  // This allows the query planner to use the index for sorting after the JOIN

  const index = {
    name: 'idx_documents_id_rating_date',
    table: 'documents',
    columns: 'id, red_flag_rating DESC, date_created DESC',
  };

  try {
    console.log(`Creating index: ${index.name}`);
    console.log(`  Table: ${index.table}`);
    console.log(`  Columns: ${index.columns}`);

    const sql = `CREATE INDEX IF NOT EXISTS ${index.name} ON ${index.table}(${index.columns})`;
    db.prepare(sql).run();

    console.log('✅ Index created successfully\n');

    // Run ANALYZE
    console.log('Running ANALYZE...');
    db.prepare('ANALYZE').run();
    console.log('✅ ANALYZE complete\n');

    // Verify the fix
    console.log('Verifying query plan...');
    const query = `
      SELECT d.id, d.file_name, d.red_flag_rating, d.date_created
      FROM documents d
      JOIN entity_mentions em ON d.id = em.document_id
      WHERE em.entity_id = 1
      ORDER BY d.red_flag_rating DESC, d.date_created DESC
      LIMIT 50
    `;

    const plan = db.prepare(`EXPLAIN QUERY PLAN ${query}`).all();

    let hasTempBtree = false;
    for (const step of plan as any[]) {
      console.log(`  ${step.detail}`);
      if (step.detail.toUpperCase().includes('USE TEMP B-TREE')) {
        hasTempBtree = true;
      }
    }

    if (hasTempBtree) {
      console.log('\n⚠️  Still has temp B-tree - may need different approach');
    } else {
      console.log('\n✅ No temp B-tree - FIXED!');
    }
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
  } finally {
    db.close();
  }
}

main();
