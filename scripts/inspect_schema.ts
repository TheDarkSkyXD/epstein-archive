import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || 'postgresql://epstein:epstein@localhost:5435/epstein_archive',
});

async function run() {
  const client = await pool.connect();
  try {
    const { rows: cols } = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'documents'
    `);
    console.log(
      'Columns:',
      cols.map((c) => `${c.column_name} (${c.data_type})`),
    );

    const { rows: sample } = await client.query(`
      SELECT id, 
             file_name,
             LENGTH(content_refined) as content_len,
             metadata_json
      FROM documents 
      LIMIT 10
    `);
    console.log('Sample data:', JSON.stringify(sample, null, 2));

    const { rows: counts } = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(content_refined) as has_content,
        COUNT(metadata_json) as has_metadata
      FROM documents
    `);
    console.log('Counts:', counts[0]);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
