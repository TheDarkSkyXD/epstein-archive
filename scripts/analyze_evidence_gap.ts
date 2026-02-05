import { getDb } from '../src/server/db/connection.js';

const db = getDb();

// Junk filter similar to repository
const junkPatterns = [
  '%House%',
  '%Office%',
  '%Street%',
  '%Road%',
  '%Avenue%',
  '%Park%',
  '%Beach%',
  '%Islands%',
  '%Times%',
  '%Post%',
  '%News%',
  '%Press%',
  '%Journal%',
  '%Magazine%',
  '%Inc%',
  '%LLC%',
  '%Corp%',
  '%Ltd%',
  '%Group%',
  '%Trust%',
  '%Foundation%',
  '%University%',
  '%College%',
  '%School%',
  '%Academy%',
  '%Judge%',
  '%Court%',
  '%Attorney%',
  '%Justice%',
  '%Department%',
  '%Bureau%',
  '%Agency%',
  '%Police%',
  '%Sheriff%',
  '%FBI%',
  '%CIA%',
  '%Secret Service%',
  '%Bank%',
  '%Checking%',
  '%Savings%',
  '%Additions%',
  '%Subtractions%',
];

console.log('Analyzing Top 100 *People* Evidence Coverage...');

const junkConditions = junkPatterns.map((_, i) => `full_name NOT LIKE ?`).join(' AND ');

const sql = `
    SELECT 
        id, 
        full_name, 
        mentions,
        (SELECT COUNT(*) FROM entity_mentions WHERE entity_id = entities.id) as mention_count,
        (SELECT COUNT(*) FROM media_item_people WHERE entity_id = entities.id) as photo_count
    FROM entities
    WHERE ${junkConditions}
    AND full_name NOT LIKE '%unknown%'
    ORDER BY mentions DESC
    LIMIT 100
`;

const topPeople = db.prepare(sql).all(...junkPatterns);

console.log(`\nFound ${topPeople.length} Top People.`);

const needsFix = topPeople.filter((p) => p.photo_count === 0);

console.table(
  topPeople.slice(0, 20).map((p) => ({
    id: p.id,
    name: p.full_name.substring(0, 20),
    mentions: p.mentions,
    photos: p.photo_count,
    NEEDS_FIX: p.photo_count === 0 ? 'YES' : '',
  })),
);

console.log(`\nEntities with NO Photos: ${needsFix.length} / ${topPeople.length}`);
if (needsFix.length > 0) {
  console.log('Top 10 needing photos:');
  console.log(
    needsFix
      .slice(0, 10)
      .map((p) => p.full_name)
      .join(', '),
  );
}
