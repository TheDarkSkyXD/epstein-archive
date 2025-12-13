
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DB_PATH = process.env.DB_PATH || path.join(PROJECT_ROOT, 'epstein-archive-production.db');

const db = new Database(DB_PATH);

console.log('🧹 Running Entity Cleanup V2...');

// 1. Rename "Jane Doe No" -> "Jane Doe"
console.log('1️⃣  Renaming "Jane Doe No"...');
const janeDoeNoId = 2273;
// Check if "Jane Doe" exists first (we checked, it didn't, but let's be safe)
const existingJane = db.prepare('SELECT id FROM entities WHERE full_name = ?').get('Jane Doe') as any;

if (existingJane) {
    console.log(`   Found existing "Jane Doe" (ID: ${existingJane.id}). Consolidating ID ${janeDoeNoId} into it...`);
    // Move mentions
    db.prepare('UPDATE entity_mentions SET entity_id = ? WHERE entity_id = ?').run(existingJane.id, janeDoeNoId);
    // Move relationships (Source)
    db.prepare('UPDATE OR IGNORE entity_relationships SET source_entity_id = ? WHERE source_entity_id = ?').run(existingJane.id, janeDoeNoId);
    // Move relationships (Target)
    db.prepare('UPDATE OR IGNORE entity_relationships SET target_entity_id = ? WHERE target_entity_id = ?').run(existingJane.id, janeDoeNoId);
    // Delete old
    db.prepare('DELETE FROM entities WHERE id = ?').run(janeDoeNoId);
    // Delete orphan relationships
    db.prepare('DELETE FROM entity_relationships WHERE source_entity_id = ? OR target_entity_id = ?').run(janeDoeNoId, janeDoeNoId);
    console.log('   ✅ Consolidated into existing.');
} else {
    // Just rename
    db.prepare('UPDATE entities SET full_name = ?, entity_type = ? WHERE id = ?').run('Jane Doe', 'Person', janeDoeNoId);
    console.log('   ✅ Renamed to "Jane Doe".');
}

// 2. Fix Vanity Fair
console.log('2️⃣  Fixing "Vanity Fair"...');
db.prepare("UPDATE entities SET entity_type = 'Organization', primary_role = 'Magazine', role = 'Magazine', title = 'Magazine' WHERE id = 2290").run();
console.log('   ✅ Set to Organization/Magazine.');

// 3. Fix World War
console.log('3️⃣  Fixing "World War"...');
db.prepare("UPDATE entities SET entity_type = 'Event', primary_role = 'Historical Event', role = 'Historical Event', title = 'Historical Event' WHERE id = 5387").run();
console.log('   ✅ Set to Event/Historical Event.');

// 4. Fix Rights Act
console.log('4️⃣  Fixing "Rights Act"...');
db.prepare("UPDATE entities SET entity_type = 'Law', primary_role = 'Legislation', role = 'Legislation', title = 'Legislation' WHERE id = 143").run();
console.log('   ✅ Set to Law/Legislation.');

console.log('✨ Cleanup Complete.');
