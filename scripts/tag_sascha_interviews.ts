import Database from 'better-sqlite3';

const DB_PATH = process.env.DB_PATH || 'epstein-archive.db';
const db = new Database(DB_PATH);

function tagSaschaInterviews() {
  console.log('🏷️ Tagging Sascha Barron Interviews...');

  // 1. Ensure "Sascha Barron" exists
  let sascha = db.prepare('SELECT id FROM entities WHERE full_name = ?').get('Sascha Barron') as
    | { id: number }
    | undefined;
  if (!sascha) {
    console.log('   Creating Sascha Barron entity...');
    const info = db
      .prepare("INSERT INTO entities (full_name, entity_type) VALUES (?, 'Person')")
      .run('Sascha Barron');
    sascha = { id: info.lastInsertRowid as number };
  } else {
    console.log(`   Found Sascha Barron (ID: ${sascha.id})`);
  }

  // 2. Identify Target Entities
  const names = [
    'Donald Trump',
    'Andy Biggs',
    'Lindsey Graham', // DB spelling
    'Jim Jordan',
    'Clarence Thomas',
    'William Kyle Riley',
    'Sascha Barron',
  ];

  const entityIds: number[] = [];
  for (const name of names) {
    const row = db.prepare('SELECT id, full_name FROM entities WHERE full_name = ?').get(name) as
      | { id: number; full_name: string }
      | undefined;
    if (row) {
      entityIds.push(row.id);
      console.log(`   Resolved ${name} -> ${row.id}`);
    } else {
      console.log(`   ⚠️ Could not find exact match for ${name}, trying partial...`);
      const partial = db
        .prepare('SELECT id, full_name FROM entities WHERE full_name LIKE ?')
        .get(`%${name}%`) as { id: number; full_name: string } | undefined;
      if (partial) {
        entityIds.push(partial.id);
        console.log(`      Resolved to ${partial.full_name} -> ${partial.id}`);
      } else {
        console.log(`      ❌ FAILED to find ${name}. Skipping.`);
      }
    }
  }

  // 3. Find Media Items
  const mediaItems = db
    .prepare("SELECT id, title FROM media_items WHERE title LIKE 'Sascha Barron Testimony%'")
    .all() as { id: number; title: string }[];
  console.log(`   Tagging ${mediaItems.length} media items...`);

  const insertLink = db.prepare(
    'INSERT OR IGNORE INTO media_item_people (media_item_id, entity_id) VALUES (?, ?)',
  );

  let tags = 0;
  db.transaction(() => {
    for (const media of mediaItems) {
      for (const entId of entityIds) {
        insertLink.run(media.id, entId);
        tags++;
      }
      // Also set Sascha as primary entity if null?
      db.prepare('UPDATE media_items SET entity_id = ? WHERE id = ? AND entity_id IS NULL').run(
        sascha!.id,
        media.id,
      );
    }
  })();

  console.log(`✅ Added ${tags} tags.`);
}

tagSaschaInterviews();
