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
      SELECT period, total 
      FROM mv_timeline_data 
      WHERE period LIKE '2000-%' OR period LIKE '2001-%' OR period LIKE '2002-%'
      ORDER BY period ASC
    `);
    console.log('2000-2002 Stats:', JSON.stringify(rows, null, 2));

    const { rows: totalExtracted } = await client.query(`
      SELECT COUNT(*) as count FROM documents WHERE extracted_date IS NOT NULL
    `);
    console.log('Total extracted dates:', totalExtracted[0].count);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
