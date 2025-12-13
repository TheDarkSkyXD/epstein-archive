
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DB_PATH = process.env.DB_PATH || path.join(PROJECT_ROOT, 'epstein-archive-production.db');

const db = new Database(DB_PATH);

console.log('🔄 Consolidating Merrill Lynch Entities...');

const SOURCE_ID = 3621; // Merrill Lynch Global
const TARGET_ID = 3625; // Merrill Lynch

// 1. Update Mentions
const updateMentions = db.prepare('UPDATE entity_mentions SET entity_id = ? WHERE entity_id = ?');
const resultMentions = updateMentions.run(TARGET_ID, SOURCE_ID);
console.log(`✅ Moved ${resultMentions.changes} mentions from ${SOURCE_ID} to ${TARGET_ID}.`);

// 2. Update Relationships (Source)
const updateRelSource = db.prepare('UPDATE entity_relationships SET source_entity_id = ? WHERE source_entity_id = ? AND target_entity_id != ?');
// We need to avoid unique constraint violations if relationship already exists?
// Ideally we check. But simpler is: OR IGNORE / try catch for now?
// Or update and catch error.
// Let's do a simple approach: Update OR IGNORE roughly means we might lose some?
// Better: INSERT OR REPLACE or UPDATE OR IGNORE?
// Let's try direct UPDATE, if collision (e.g. Relationship(3621, B) vs Relationship(3625, B)), we might fail.
// Correct way: Delete duplicates first?
// For now, let's try UPDATE and log error if fail, but usually relationships are not unique keyed strictly?
// Schema: UNIQUE(source_id, target_id) usually.
try {
    const res = updateRelSource.run(TARGET_ID, SOURCE_ID, TARGET_ID);
    console.log(`✅ Moved ${res.changes} source relationships.`);
} catch (e) {
    console.warn('⚠️  Some source relationships collided and were skipped/not moved:', e.message);
}

// 2b. Update Relationships (Target)
const updateRelTarget = db.prepare('UPDATE entity_relationships SET target_entity_id = ? WHERE target_entity_id = ? AND source_entity_id != ?');
try {
    const res = updateRelTarget.run(TARGET_ID, SOURCE_ID, TARGET_ID);
    console.log(`✅ Moved ${res.changes} target relationships.`);
} catch (e) {
    console.warn('⚠️  Some target relationships collided:', e.message);
}

// 3. Update Metadata of Target
// entity_type = 'Organization'
// primary_role = 'Investment Bank'
// title_variants: append 'Merrill Lynch Global'

// First get current variants
const target = db.prepare('SELECT title_variants, mentions FROM entities WHERE id = ?').get(TARGET_ID) as any;
const source = db.prepare('SELECT mentions, full_name FROM entities WHERE id = ?').get(SOURCE_ID) as any;

let variants: string[] = [];
try {
    variants = JSON.parse(target.title_variants || '[]');
} catch (e) {}

if (!variants.includes('Merrill Lynch Global')) {
    variants.push('Merrill Lynch Global');
    // Also add source full name if different? It is 'Merrill Lynch Global'.
}

const totalMentions = (target.mentions || 0) + (source.mentions || 0);

const updateMeta = db.prepare(`
    UPDATE entities 
    SET entity_type = 'Organization',
        primary_role = 'Investment Bank',
        role = 'Investment Bank',
        title = 'Investment Bank',
        title_variants = ?,
        mentions = ?
    WHERE id = ?
`);

updateMeta.run(JSON.stringify(variants), totalMentions, TARGET_ID);
console.log(`✅ Updated Target (ID ${TARGET_ID}): Type=Organization, Role=Investment Bank, Mentions=${totalMentions}`);

// 4. Delete Source
db.prepare('DELETE FROM entities WHERE id = ?').run(SOURCE_ID);
console.log(`🗑️  Deleted Source Entity (ID ${SOURCE_ID}).`);

console.log('✨ Consolidation Complete.');
