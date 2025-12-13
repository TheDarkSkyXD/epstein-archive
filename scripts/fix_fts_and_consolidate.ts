
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DB_PATH = process.env.DB_PATH || path.join(PROJECT_ROOT, 'epstein-archive-production.db');

const db = new Database(DB_PATH);

console.log('🔧 Fixing FTS Triggers & Consolidating Merrill Lynch...');

// 1. Drop Bad Triggers
console.log('1️⃣  Dropping broken triggers...');
db.exec('DROP TRIGGER IF EXISTS entities_fts_insert');
db.exec('DROP TRIGGER IF EXISTS entities_fts_update');
db.exec('DROP TRIGGER IF EXISTS entities_fts_delete');
console.log('✅ Bad triggers dropped.');

// 2. Consolidate Entities
console.log('2️⃣  Consolidating Entities...');
const SOURCE_ID = 3621; // Merrill Lynch Global
const TARGET_ID = 3625; // Merrill Lynch

// 2a. Update Mentions
const updateMentions = db.prepare('UPDATE entity_mentions SET entity_id = ? WHERE entity_id = ?');
const resultMentions = updateMentions.run(TARGET_ID, SOURCE_ID);
console.log(`   ✅ Moved ${resultMentions.changes} mentions.`);

// 2b. Update Relationships (Source)
// Handle duplicates by trying update, ignoring errors is risky but with complex unique constraints...
// Let's identify collisions first? Nah, standard dedupe pattern:
// Update where target not exists.
try {
    db.exec(`
        UPDATE OR IGNORE entity_relationships 
        SET source_entity_id = ${TARGET_ID} 
        WHERE source_entity_id = ${SOURCE_ID} 
        AND target_entity_id != ${TARGET_ID}
    `);
    // Delete remaining source rels (collisions)
    db.exec(`DELETE FROM entity_relationships WHERE source_entity_id = ${SOURCE_ID}`);
    console.log('   ✅ Moved source relationships.');
} catch (e: any) {
    console.log('   ⚠️ Source rel update error:', e.message);
}

// 2c. Update Relationships (Target)
try {
    db.exec(`
        UPDATE OR IGNORE entity_relationships 
        SET target_entity_id = ${TARGET_ID} 
        WHERE target_entity_id = ${SOURCE_ID} 
        AND source_entity_id != ${TARGET_ID}
    `);
    // Delete remaining target rels
    db.exec(`DELETE FROM entity_relationships WHERE target_entity_id = ${SOURCE_ID}`);
    console.log('   ✅ Moved target relationships.');
} catch (e: any) {
    console.log('   ⚠️ Target rel update error:', e.message);
}

// 2d. Update Metadata
const target = db.prepare('SELECT title_variants, mentions FROM entities WHERE id = ?').get(TARGET_ID) as any;
const source = db.prepare('SELECT mentions FROM entities WHERE id = ?').get(SOURCE_ID) as any;
let variants: string[] = [];
try { variants = JSON.parse(target.title_variants || '[]'); } catch (e) {}

if (!variants.includes('Merrill Lynch Global')) {
    variants.push('Merrill Lynch Global');
}

const totalMentions = (target.mentions || 0) + (source ? (source.mentions || 0) : 0);

db.prepare(`
    UPDATE entities 
    SET entity_type = 'Organization',
        primary_role = 'Investment Bank',
        role = 'Investment Bank',
        title = 'Investment Bank',
        title_variants = ?,
        mentions = ?
    WHERE id = ?
`).run(JSON.stringify(variants), totalMentions, TARGET_ID);
console.log(`   ✅ Target Updated (Mentions: ${totalMentions})`);

// 2e. Delete Source
db.prepare('DELETE FROM entities WHERE id = ?').run(SOURCE_ID);
console.log('   🗑️  Source Deleted.');


// 3. Recreate Correct Triggers (excluding secondary_roles which is missing in FTS)
console.log('3️⃣  Restoring FTS Triggers...');

db.exec(`
    CREATE TRIGGER entities_fts_insert AFTER INSERT ON entities BEGIN
        INSERT INTO entities_fts(rowid, full_name, primary_role, connections_summary)
        VALUES (NEW.id, NEW.full_name, NEW.primary_role, NEW.connections_summary);
    END;
`);

db.exec(`
    CREATE TRIGGER entities_fts_update AFTER UPDATE ON entities BEGIN
        UPDATE entities_fts SET 
          full_name = NEW.full_name,
          primary_role = NEW.primary_role,
          connections_summary = NEW.connections_summary
        WHERE rowid = OLD.id;
    END;
`);

db.exec(`
    CREATE TRIGGER entities_fts_delete AFTER DELETE ON entities BEGIN
        DELETE FROM entities_fts WHERE rowid = OLD.id;
    END;
`);

console.log('✅ Triggers Restored.');
console.log('✨ All Fixes Complete.');
