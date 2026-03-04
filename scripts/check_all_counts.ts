import pg from 'pg';
import dotenv from 'dotenv';
const { Client } = pg;

// Load .env
dotenv.config();

async function checkCounts() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL at:', process.env.DATABASE_URL);

    const tables = [
      'entities',
      'documents',
      'flights',
      'flight_passengers',
      'palm_beach_properties',
      'media_items',
      'media_albums',
      'black_book_entries',
      'web_vitals',
      'audit_log',
      'users',
      'investigations',
      'timeline_events',
    ];

    console.log('\n--- Table Row Counts ---');
    for (const table of tables) {
      try {
        const res = await client.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`${table.padEnd(25)}: ${res.rows[0].count}`);
      } catch (err) {
        console.log(`${table.padEnd(25)}: [ERROR] ${err.message}`);
      }
    }

    console.log('\n--- Sub-type Counts ---');
    try {
      const res = await client.query(
        'SELECT evidence_type, COUNT(*) FROM documents GROUP BY evidence_type',
      );
      console.log('Evidence Types in documents:');
      res.rows.forEach((r) => console.log(`  - ${String(r.evidence_type).padEnd(15)}: ${r.count}`));
    } catch (err) {
      console.log(`Sub-types: [ERROR] ${err.message}`);
    }

    console.log('\n--- Materialized Views ---');
    const mvs = [
      'mv_docs_by_type',
      'mv_entity_type_dist',
      'mv_top_connected',
      'mv_timeline_data',
      'mv_redaction_stats',
    ];
    for (const mv of mvs) {
      try {
        const res = await client.query(`SELECT COUNT(*) FROM ${mv}`);
        console.log(`${mv.padEnd(25)}: ${res.rows[0].count}`);
      } catch (err) {
        console.log(`${mv.padEnd(25)}: [ERROR] ${err.message}`);
      }
    }
  } catch (err) {
    console.error('Error connecting to DB:', err);
  } finally {
    await client.end();
  }
}

checkCounts();
