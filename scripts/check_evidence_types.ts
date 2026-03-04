import pg from 'pg';
import dotenv from 'dotenv';
const { Client } = pg;
dotenv.config();

async function checkEvidenceTypes() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    const res = await client.query(
      "SELECT COALESCE(evidence_type, 'NULL') as type, count(*) FROM documents GROUP BY 1",
    );
    console.table(res.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}
checkEvidenceTypes();
