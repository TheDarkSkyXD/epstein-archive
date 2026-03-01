import pg from 'pg';
const { Client } = pg;
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({ connectionString: process.env.DATABASE_URL });
client
  .connect()
  .then(async () => {
    const res = await client.query('SELECT COUNT(*) FROM entities');
    const mentions = await client.query('SELECT COUNT(*) FROM entity_mentions');
    console.log(`Entities: ${res.rows[0].count}`);
    console.log(`Mentions: ${mentions.rows[0].count}`);

    const trump = await client.query("SELECT * FROM entities WHERE full_name LIKE '%Trump%'");
    console.log('Trump Entities found:', trump.rowCount);
    trump.rows.forEach((r) => console.log(`- ${r.full_name} (${r.evidence_count} mentions)`));

    client.end();
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
