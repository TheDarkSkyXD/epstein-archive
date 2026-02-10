import Database from 'better-sqlite3';
import { join } from 'path';

const DB_PATH = process.env.DB_PATH || './epstein-archive.db';
const BATCH_SIZE = 1000;

console.log('🔄 Starting Content Reconcilation...');
const db = new Database(DB_PATH);

// 1. Reset Metadata for Corrupted Docs (so they get re-processed)
// Only target those that have summary but NO refined content, and contain '='
const corruptedQuery = `
  SELECT id FROM documents 
  WHERE content LIKE '%=%' 
    AND content_refined IS NULL 
    AND metadata_json LIKE '%ai_summary%'
`;

const corruptedIds = db
  .prepare(corruptedQuery)
  .all()
  .map((r: any) => r.id);
console.log(`\nfound ${corruptedIds.length} corrupted documents needing re-processing.`);

if (corruptedIds.length > 0) {
  const resetStmt = db.prepare('UPDATE documents SET metadata_json = NULL WHERE id = ?');

  db.transaction(() => {
    for (const id of corruptedIds) {
      resetStmt.run(id);
    }
  })();
  console.log('✅ Reset metadata for corrupted documents.');
}

// 2. Backfill Content for Clean Docs
// Target docs with NO '=' but summary exists, and refined content is NULL
const cleanQuery = `
  SELECT id FROM documents 
  WHERE content NOT LIKE '%=%' 
    AND content_refined IS NULL 
    AND metadata_json LIKE '%ai_summary%'
  LIMIT ?
`;

const updateStmt = db.prepare('UPDATE documents SET content_refined = content WHERE id = ?');
let totalCleanFixed = 0;

while (true) {
  const batch = db.prepare(cleanQuery).all(BATCH_SIZE) as { id: number }[];
  if (batch.length === 0) break;

  db.transaction(() => {
    for (const row of batch) {
      updateStmt.run(row.id);
    }
  })();

  totalCleanFixed += batch.length;
  process.stdout.write(`\r✅ Backfilled clean content for ${totalCleanFixed} documents...`);
}

console.log(`\n\n🎉 Reconciliation Complete!`);
console.log(`- Corrupted docs reset: ${corruptedIds.length}`);
console.log(`- Clean docs backfilled: ${totalCleanFixed}`);
