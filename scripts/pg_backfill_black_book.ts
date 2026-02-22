import Database from 'better-sqlite3';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const DB_PATH = process.env.DB_PATH || 'epstein-archive.db';
const PG_URL = process.env.DATABASE_URL;

if (!PG_URL) {
  console.error('❌ Error: DATABASE_URL is required.');
  process.exit(1);
}

const sqlite = new Database(DB_PATH, { readonly: true });
const pgPool = new pg.Pool({ connectionString: PG_URL });

const BATCH_SIZE = 500;

async function backfillBlackBook() {
  const columns = [
    'id',
    'person_id',
    'entry_text',
    'phone_numbers',
    'addresses',
    'email_addresses',
    'notes',
    'page_number',
    'document_id',
    'entry_category',
    'created_at',
  ];
  const colString = columns.join(', ');

  const countRow = sqlite.prepare(`SELECT COUNT(*) as count FROM black_book_entries`).get() as any;
  const total = countRow.count;
  console.log(`📦 Backfilling black_book_entries (${total} rows)...`);

  let lastId: number | null = null;
  let processed = 0;

  while (processed < total) {
    let rows: any[];
    if (lastId !== null) {
      rows = sqlite
        .prepare(
          `SELECT * FROM black_book_entries WHERE id > ? ORDER BY id ASC LIMIT ${BATCH_SIZE}`,
        )
        .all(lastId) as any[];
    } else {
      rows = sqlite
        .prepare(`SELECT * FROM black_book_entries ORDER BY id ASC LIMIT ${BATCH_SIZE}`)
        .all() as any[];
    }
    if (rows.length === 0) break;
    lastId = rows[rows.length - 1].id;

    const client = await pgPool.connect();
    try {
      await client.query('BEGIN');
      const values: any[] = [];
      const placeholders: string[] = [];

      rows.forEach((row) => {
        const rowPhs = columns.map((col) => {
          let val = row[col];
          if (typeof val === 'string') val = val.replace(/\x00/g, '');
          values.push(val);
          return `$${values.length}`;
        });
        placeholders.push(`(${rowPhs.join(', ')})`);
      });

      await client.query(
        `INSERT INTO black_book_entries (${colString}) VALUES ${placeholders.join(', ')} ON CONFLICT DO NOTHING`,
        values,
      );
      await client.query('COMMIT');
    } catch (err: any) {
      await client.query('ROLLBACK');
      console.warn('⚠ Batch failed, falling back to single-row inserts:', err.message);
      for (const row of rows) {
        const singleValues: any[] = [];
        const singlePhs = columns.map((col) => {
          let val = row[col];
          if (typeof val === 'string') val = val.replace(/\x00/g, '');
          singleValues.push(val);
          return `$${singleValues.length}`;
        });
        try {
          await pgPool.query(
            `INSERT INTO black_book_entries (${colString}) VALUES (${singlePhs.join(', ')}) ON CONFLICT DO NOTHING`,
            singleValues,
          );
        } catch (_) {
          /* skip invalid rows */
        }
      }
    } finally {
      client.release();
    }

    processed += rows.length;
    process.stdout.write(
      `   Progress: ${processed}/${total} (${((processed / total) * 100).toFixed(1)}%)\r`,
    );
  }

  console.log(`\n✅ Finished backfilling black_book_entries.`);

  // Reset sequence
  await pgPool.query(
    `SELECT setval(pg_get_serial_sequence('black_book_entries', 'id'), COALESCE(MAX(id), 1)) FROM black_book_entries`,
  );
  console.log('✅ Sequence reset.');

  sqlite.close();
  await pgPool.end();
}

backfillBlackBook().catch((err) => {
  console.error('❌', err);
  process.exit(1);
});
