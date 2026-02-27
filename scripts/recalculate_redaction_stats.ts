#!/usr/bin/env tsx
import { getMaintenancePool } from '../src/server/db/connection.js';
import 'dotenv/config';

async function recalculate() {
  const pool = getMaintenancePool();
  console.log('Recalculating Redaction Statistics...');

  console.log('Clearing old redaction stats...');
  await pool.query(`
    UPDATE documents
    SET has_redactions = false, redaction_count = 0
    WHERE source_collection IS NOT NULL
  `);

  console.log('Aggregating redaction spans...');
  const statsResult = await pool.query(`
    SELECT document_id, COUNT(*) as count
    FROM redaction_spans
    GROUP BY document_id
  `);
  const stats = statsResult.rows as { document_id: number; count: number }[];

  console.log(`Updating ${stats.length} documents with redaction data...`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let i = 0;
    for (const stat of stats) {
      await client.query(
        'UPDATE documents SET has_redactions = true, redaction_count = $1 WHERE id = $2',
        [stat.count, stat.document_id],
      );
      i++;
      if (i % 1000 === 0) {
        process.stdout.write(`   Progress: ${i} / ${stats.length}\r`);
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  console.log('\nRedaction statistics successfully recalculated!');

  const row = (
    await pool.query(`
    SELECT COUNT(*) as count FROM documents WHERE has_redactions = true
  `)
  ).rows[0] as { count: number };

  console.log(`Total documents now marked as redacted: ${row.count}`);
}

recalculate().catch((e) => {
  console.error(e);
  process.exit(1);
});
