import { getDb } from '../src/server/db/connection.js';

const db = getDb();

console.log('--- Entities Table Schema ---');
const entitiesInfo = db.prepare('PRAGMA table_info(entities)').all();
console.table(entitiesInfo);

console.log('\n--- Documents Table Schema ---');
const documentsInfo = db.prepare('PRAGMA table_info(documents)').all();
console.table(documentsInfo);

console.log('\n--- Entity Relationships Table Schema ---');
const relationshipsInfo = db.prepare('PRAGMA table_info(entity_relationships)').all();
console.table(relationshipsInfo);
