import pg from 'pg';
import dotenv from 'dotenv';
const { Client } = pg;
dotenv.config();

async function checkDetails() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();

    console.log('\n--- mv_docs_by_type Content ---');
    const res1 = await client.query('SELECT * FROM mv_docs_by_type');
    console.table(res1.rows);

    console.log('\n--- Evidence Type Distribution (Limited) ---');
    // Using a faster query if possible, or just a subset
    const res2 = await client.query(
      'SELECT evidence_type, count(*) FROM (SELECT evidence_type FROM documents LIMIT 1000000) t GROUP BY evidence_type',
    );
    console.table(res2.rows);

    console.log('\n--- Black Book Sample ---');
    const res3 = await client.query('SELECT * FROM black_book_entries LIMIT 5');
    console.table(res3.rows);

    console.log('\n--- mv_timeline_data Content ---');
    const res4 = await client.query('SELECT * FROM mv_timeline_data');
    console.table(res4.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}
checkDetails();
