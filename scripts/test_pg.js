import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function test() {
  console.log('--- Integer Test ---');
  try {
    const res = await pool.query('SELECT id FROM media_items WHERE id = $1', [1]);
    console.log('Success:', res.rows[0]);
  } catch (e) {
    console.error('Error:', e.message);
  }

  console.log('\n--- String Test ---');
  try {
    const res = await pool.query('SELECT id FROM media_items WHERE id = $1', ['1']);
    console.log('Success:', res.rows[0]);
  } catch (e) {
    console.error('Error:', e.message);
  }

  pool.end();
}

test();
