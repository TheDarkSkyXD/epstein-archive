import pg from 'pg';
import crypto from 'crypto';

// Minimal PgWrapper simulation to test the type mismatch
class MockPgWrapper {
  constructor(private pool: pg.Pool) {}
  prepare(sql: string) {
    const pgSql = sql.replace(/\?/g, (_, i) => `$${i + 1}`); // simplified
    return {
      get: async (...args: any[]) => {
        try {
          const res = await this.pool.query(
            sql.replace(/\?/g, (_, idx) => `$${idx + 1}`),
            args,
          );
          return res.rows[0] || null;
        } catch (err) {
          console.error('[TEST ERROR]', err.message);
          throw err;
        }
      },
    };
  }
}

async function test() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const wrapper = new MockPgWrapper(pool);

  console.log('Testing image lookup with integer ID...');
  try {
    // MediaService style lookup
    const id = 1;
    const query = 'SELECT * FROM media_items WHERE id = ?';
    const result = await wrapper.prepare(query).get(id);
    console.log('Result:', result ? 'Found' : 'Not Found');
  } catch (e) {
    console.error('Failed with integer ID');
  }

  console.log('\nTesting image lookup with string ID...');
  try {
    const id = '1';
    const query = 'SELECT * FROM media_items WHERE id = ?';
    const result = await wrapper.prepare(query).get(id);
    console.log('Result:', result ? 'Found' : 'Not Found');
  } catch (e) {
    console.error('Failed with string ID');
  }

  await pool.end();
}

test();
