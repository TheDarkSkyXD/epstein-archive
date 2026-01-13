import Database from 'better-sqlite3';

const DB_PATH = process.env.DB_PATH || 'epstein-archive.db';
const db = new Database(DB_PATH);

// Import centralized blacklist
import { ENTITY_BLACKLIST, ENTITY_PARTIAL_BLOCKLIST } from '../src/config/entityBlacklist';

function finalCleanup() {
  console.log('🧹 Starting Final Entity Cleanup...');

  // 1. Delete Junk Entities using Shared Configuration
  const deleteStmt = db.prepare('DELETE FROM entities WHERE full_name LIKE ?');
  let deleted = 0;

  // A. Exact matches from Blacklist
  console.log(`   Processing ${ENTITY_BLACKLIST.length} blacklist terms...`);
  db.transaction(() => {
    for (const term of ENTITY_BLACKLIST) {
      const res = deleteStmt.run(term);
      deleted += res.changes;
    }
  })();

  // B. Partial matches from Blacklist
  console.log(`   Processing ${ENTITY_PARTIAL_BLOCKLIST.length} partial blocklist terms...`);
  const deleteLike = db.prepare('DELETE FROM entities WHERE full_name LIKE ?');
  db.transaction(() => {
    for (const term of ENTITY_PARTIAL_BLOCKLIST) {
      const res = deleteLike.run(`%${term}%`);
      deleted += res.changes;
    }

    // Legacy specific cleanup
    db.prepare("DELETE FROM entities WHERE full_name LIKE 'Jeffrey%Chairman%'").run();
    db.prepare("DELETE FROM entities WHERE full_name LIKE 'Jeffrey%Founding%'").run();
    db.prepare("DELETE FROM entities WHERE full_name LIKE 'Jeffrey%Research%'").run();

    // NUCLEAR OPTION: Specific user-reported junk that must die
    // Using broad LIKE patterns to catch whitespace/encoding variants
    const nuclearTargets = [
      '%Total Cash Disbursements%',
      '%Verizon%',
      '%Happy Birthday%',
      '%Received Received%',
      '%United Sister Magise%',
      '%Madison Ave%',
      '%Trust Fund%'
    ];
    
    console.log('☢️ Running NUCLEAR cleanup on persistent junk...');
    const nuclearStmt = db.prepare('DELETE FROM entities WHERE full_name LIKE ?');
    for (const target of nuclearTargets) {
      const res = nuclearStmt.run(target);
      if (res.changes > 0) {
        console.log(`   ☢️ Nuked ${res.changes} entities matching "${target}"`);
        deleted += res.changes;
      }
    }
  })();

  console.log(`✅ Deleted ${deleted} junk entities (approx).`);

  // 2. Consolidate "Jeffrey E. Epstein%" variants into ID 1
  console.log('🔄 Consolidating Epstein variants...');

  const epsteinId = 1; // Canonical
  const variants = db
    .prepare(
      "SELECT id, full_name FROM entities WHERE full_name LIKE 'Jeffrey E. Epstein%' AND id != 1",
    )
    .all() as { id: number; full_name: string }[];

  console.log(`   Found ${variants.length} epstein variants.`);

  const updateMentions = db.prepare('UPDATE entity_mentions SET entity_id = ? WHERE entity_id = ?');
  const updateMedia = db.prepare('UPDATE media_items SET entity_id = ? WHERE entity_id = ?');
  const updateTags = db.prepare('UPDATE media_item_people SET entity_id = ? WHERE entity_id = ?');
  const deleteEnt = db.prepare('DELETE FROM entities WHERE id = ?');

  db.transaction(() => {
    for (const v of variants) {
      console.log(`   Merging ${v.full_name} (${v.id}) -> ID 1`);
      try {
        updateMentions.run(epsteinId, v.id);
        updateMedia.run(epsteinId, v.id);
        // Handle Duplicate Tags
        try {
          updateTags.run(epsteinId, v.id);
        } catch (e) {
          // If tag exists for ID 1, just delete old one
          db.prepare('DELETE FROM media_item_people WHERE entity_id = ?').run(v.id);
        }
        deleteEnt.run(v.id);
      } catch (e) {
        console.error(`   Failed to merge ${v.id}`, e);
      }
    }
  })();

  console.log('✅ Cleanup Complete.');
}

finalCleanup();
