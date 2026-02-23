const pg = require('pg');
const { Pool } = pg;
require('dotenv').config({ path: '../../.env' });

async function check() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const res = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name LIKE 'media%'
  `);
  console.log(res.rows.map((r) => r.table_name));
  await pool.end();
}
check();
