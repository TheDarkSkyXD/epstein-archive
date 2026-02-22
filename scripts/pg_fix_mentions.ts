import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const PG_URL = process.env.DATABASE_URL;
  if (!PG_URL) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString: PG_URL });
  const client = await pool.connect();

  try {
    console.log('🔄 Re-calculating mentions column in entities table...');

    // 1. Update mentions from entity_mentions counts
    const updateSql = `
      UPDATE entities
      SET mentions = m.cnt
      FROM (
        SELECT entity_id, COUNT(*) as cnt
        FROM entity_mentions
        GROUP BY entity_id
      ) m
      WHERE entities.id = m.entity_id;
    `;

    const start = Date.now();
    const result = await client.query(updateSql);
    console.log(
      `✅ Updated ${result.rowCount} entities with mention counts (${Date.now() - start}ms).`,
    );

    // 2. Set mentions=0 for entities with no mentions (to avoid NULL issues if any)
    const zeroSql = `UPDATE entities SET mentions = 0 WHERE mentions IS NULL;`;
    const zeroResult = await client.query(zeroSql);
    console.log(`✅ Set mentions=0 for ${zeroResult.rowCount} entities.`);
  } catch (err) {
    console.error('❌ Error fixing mentions:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
