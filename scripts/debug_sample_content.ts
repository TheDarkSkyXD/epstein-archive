import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || 'postgresql://epstein:epstein@localhost:5435/epstein_archive',
});

async function run() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`
      SELECT id, file_name, LEFT(content, 2000) as snippet
      FROM documents 
      WHERE content IS NOT NULL AND LENGTH(content) > 100
      LIMIT 10
    `);

    for (const doc of rows) {
      console.log('--- DOC ID:', doc.id, 'FILE:', doc.file_name);
      console.log(doc.snippet);
      console.log('-----------------------------------');
    }
  } finally {
    client.release();
    await pool.end();
  }
}

run();
