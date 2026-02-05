import { getDb } from '../src/server/db/connection.js';

const db = getDb();
console.log('Checking top 20 entities by mentions...');

const top20 = db
  .prepare(
    `
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
`,
  )
  .all();

console.table(top20);
