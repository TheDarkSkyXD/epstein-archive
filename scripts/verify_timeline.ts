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
      WHERE period != 'Unknown' 
      ORDER BY period ASC 
      LIMIT 100
    `);
    console.log(JSON.stringify(rows, null, 2));
  } finally {
    client.release();
    await pool.end();
  }
}

run();
