import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || 'postgresql://epstein:epstein@localhost:5435/epstein_archive',
});

async function run() {
  const client = await pool.connect();
  try {
    const { rows: tableCounts } = await client.query(`
      SELECT table_name, 
             (xpath('/row/cnt/text()', xmlforest(count(*) as cnt)))[1]::text::int as row_count
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      GROUP BY table_name
    `);
    console.log('Table Counts:', tableCounts);

    const { rows: docCounts } = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(content) as has_content_raw,
        COUNT(content_refined) as has_content_refined,
        COUNT(metadata_json) as has_metadata,
        COUNT(title) as has_title,
        COUNT(date_created) as has_date_created
      FROM documents
    `);
    console.log('Detailed Document Counts:', docCounts[0]);

    // Check if there are any mentions or sentences
    const { rows: extraCounts } = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM entity_mentions) as mentions,
        (SELECT COUNT(*) FROM document_sentences) as sentences
    `);
    console.log('Extra Table Counts:', extraCounts[0]);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
