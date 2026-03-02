import pg from 'pg';
const { Client } = pg;
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({ connectionString: process.env.DATABASE_URL });
client
  .connect()
  .then(async () => {
    const res = await client.query('SELECT COUNT(*) FROM entities');
    const mentions = await client.query('SELECT COUNT(*) FROM entity_mentions');
    const runs = await client.query('SELECT * FROM ingest_runs ORDER BY created_at DESC LIMIT 1');

    console.log(`Entities: ${res.rows[0].count}`);
    console.log(`Mentions: ${mentions.rows[0].count}`);
    console.log('Last Run Status:', runs.rows[0]?.status);

    client.end();
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
