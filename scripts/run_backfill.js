import pg from 'pg';
import fs from 'fs';
import path from 'path';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function runSql() {
  const sqlPath = './scripts/backfill_media_types.sql';
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Running backfill SQL...');
  try {
    const res = await pool.query(sql);
    console.log('Backfill complete.');

    const checkRes = await pool.query(
      'SELECT file_type, count(*) FROM media_items GROUP BY file_type',
    );
    console.log('Results:', JSON.stringify(checkRes.rows, null, 2));
  } catch (err) {
    console.error('Error running SQL:', err.message);
  } finally {
    await pool.end();
  }
}

runSql();
