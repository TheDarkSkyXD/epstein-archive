#!/usr/bin/env tsx
import { getDb } from '../src/server/db/connection.js';

async function recalculate() {
  const db = getDb();
  console.log('🚀 Recalculating Redaction Statistics...');

  // 1. Reset columns to 0 for all documents that have source_collection
  console.log('🧹 Clearing old redaction stats...');
  db.prepare(
    `
    UPDATE documents 
    SET has_redactions = 0, redaction_count = 0
    WHERE source_collection IS NOT NULL
  `,
  ).run();

  // 2. Count redactions per document from redaction_spans
  console.log('📊 Aggregating redaction spans...');
  const stats = db
    .prepare(
      `
    SELECT document_id, COUNT(*) as count
    FROM redaction_spans
    GROUP BY document_id
  `,
    )
    .all() as { document_id: number; count: number }[];

  console.log(`📝 Updating ${stats.length} documents with redaction data...`);

  const updateStmt = db.prepare(`
    UPDATE documents 
    SET has_redactions = 1, redaction_count = ?
    WHERE id = ?
  `);

  db.transaction(() => {
    let i = 0;
    for (const stat of stats) {
      updateStmt.run(stat.count, stat.document_id);
      i++;
      if (i % 1000 === 0) {
        process.stdout.write(`   Progress: ${i} / ${stats.length}\r`);
      }
    }
  })();

  console.log('\n✅ Redaction statistics successfully recalculated!');

  // 3. Verify counts
  const row = db
    .prepare(
      `
    SELECT COUNT(*) as count 
    FROM documents 
    WHERE has_redactions = 1
  `,
    )
    .get() as { count: number };

  console.log(`🏁 Total documents now marked as redacted: ${row.count}`);
}

recalculate().catch(console.error);
