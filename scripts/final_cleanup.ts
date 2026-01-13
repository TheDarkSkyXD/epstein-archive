import Database from 'better-sqlite3';

const DB_PATH = process.env.DB_PATH || 'epstein-archive.db';
const db = new Database(DB_PATH);

function finalCleanup() {
  console.log('🧹 Starting Final Entity Cleanup...');

  // 1. Delete Junk Entities
  // Based on the screenshot provided by user
  const junkTerms = [
    'Received Received From',
    'United Sister Magise',
    'Dear Mr',
    'Trust Fund',
    'Madison Ave',
    'After Amerting',
    'Allas Obscura',
    'Approved Emad',
    'Boat Permits',
    'Jeffrey E. Epstein Setire',
    'Jeffrey E. Epstein Voc',
    'Jeffrey E. Epstein Princ%',
    'Heurneau Released To',
    'Not Mill City',
    'Jeffrey Ambrosi Research Analyst',
    'Jeffrey D. Brody Founding',
    'Jeffrey Joerres Chairman',
    'Jeffrey L. Bewkes Chairman',
    'Jeffrey Sloman Becomes Involved',
    'Jeffrey Tyrone Majette Relatives',
    'Jeffrey Epsten Hoping',
  ];

  const deleteStmt = db.prepare('DELETE FROM entities WHERE full_name LIKE ?');
  let deleted = 0;

  db.transaction(() => {
    for (const term of junkTerms) {
      const res = deleteStmt.run(term);
      deleted += res.changes;
    }

    // Also pattern matching for "Jeffrey%" junk
    // Jeffrey ... Chairman
    db.prepare("DELETE FROM entities WHERE full_name LIKE 'Jeffrey%Chairman%'").run();
    db.prepare("DELETE FROM entities WHERE full_name LIKE 'Jeffrey%Founding%'").run();
    db.prepare("DELETE FROM entities WHERE full_name LIKE 'Jeffrey%Research%'").run();
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
