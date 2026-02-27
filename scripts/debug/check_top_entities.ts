import { getApiPool } from '../../src/server/db/connection.js';
import 'dotenv/config';

async function main() {
  const pool = getApiPool();
  console.log('Checking top 20 entities by mentions...');

  const result = await pool.query(`
    SELECT
        id,
        full_name,
        mentions,
        (SELECT COUNT(*) FROM entity_mentions WHERE entity_id = entities.id) as mention_count,
        (SELECT COUNT(*) FROM media_item_people WHERE entity_id = entities.id) as media_count,
        (SELECT COUNT(*) FROM entity_evidence_types WHERE entity_id = entities.id) as evidence_type_count
    FROM entities
    ORDER BY mentions DESC
    LIMIT 20
  `);

  console.table(result.rows);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
