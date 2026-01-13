import Database from 'better-sqlite3';

const DB_PATH = process.env.DB_PATH || 'epstein-archive.db';
const db = new Database(DB_PATH);

function recoverMediaTags() {
  console.log('🏷️ Recovering Media Tags from Transcripts & Filenames...');

  // 1. Recover from Transcripts (Document Mentions)
  // Join media_items -> documents -> entity_mentions
  const transcriptLinks = db
    .prepare(
      `
    SELECT DISTINCT m.id as media_id, em.entity_id, e.full_name, COUNT(em.id) as mention_count
    FROM media_items m
    JOIN documents d ON m.document_id = d.id
    JOIN entity_mentions em ON d.id = em.document_id
    JOIN entities e ON em.entity_id = e.id
    WHERE m.document_id IS NOT NULL
    GROUP BY m.id, em.entity_id
    HAVING mention_count > 0
  `,
    )
    .all() as { media_id: number; entity_id: number; full_name: string; mention_count: number }[];

  console.log(`   Found ${transcriptLinks.length} potential tags from transcripts.`);

  const insertTag = db.prepare(
    'INSERT OR IGNORE INTO media_item_people (media_item_id, entity_id) VALUES (?, ?)',
  );

  let tagsAdded = 0;

  db.transaction(() => {
    for (const link of transcriptLinks) {
      // Optional: Filter by specific role or significance?
      // For now, if they are mentioned in the video transcript, they are "in" the video (or discussed).
      // User wants "people tags".
      insertTag.run(link.media_id, link.entity_id);
      tagsAdded++;
    }
  })();

  console.log(`   ✅ Linked ${tagsAdded} people from transcripts.`);

  // 2. Recover from Filenames (Heuristic)
  // Scan all media items without tags? Or all of them.
  // "Epstein" -> Jeffrey Epstein
  // "Maxwell" -> Ghislaine Maxwell
  // "Prince Andrew" -> Prince Andrew

  // Get all entities to search for? Too many.
  // Get top 100 entities.
  const topEntities = db
    .prepare('SELECT id, full_name FROM entities ORDER BY mentions DESC LIMIT 100')
    .all() as { id: number; full_name: string }[];
  const allMedia = db
    .prepare('SELECT id, title, file_path, description FROM media_items')
    .all() as { id: number; title: string; file_path: string; description: string }[];

  const filenameTags = 0;

  /* 
     Simple substring match. 
     Be careful: "Andrew" matches "Prince Andrew" but also "Andrew Smith".
     Use full name match logic locally. 
  */

  // 2. Recover from Filenames & TITLES (Heuristic)
  console.log('   🔍 Scanning titles for partial matches...');

  // Custom Heuristic Map for High Value Targets
  const surnameMap: { [key: string]: string } = {
    epstein: 'Jeffrey Epstein',
    jeffrey: 'Jeffrey Epstein',
    maxwell: 'Ghislaine Maxwell',
    ghislaine: 'Ghislaine Maxwell',
    trump: 'Donald Trump',
    clinton: 'Bill Clinton',
    andrew: 'Prince Andrew',
    dershowitz: 'Alan Dershowitz',
    wexner: 'Les Wexner',
    brunel: 'Jean-Luc Brunel',
    giuffre: 'Virginia Giuffre',
  };

  const insertStmt = db.prepare(
    'INSERT OR IGNORE INTO media_item_people (media_item_id, entity_id) VALUES (?, ?)',
  );

  // Pre-fetch IDs for surname targets
  const targetIds: { [name: string]: number } = {};
  for (const targetName of Object.values(surnameMap)) {
    if (!targetIds[targetName]) {
      const row = db.prepare('SELECT id FROM entities WHERE full_name = ?').get(targetName) as
        | { id: number }
        | undefined;
      if (row) targetIds[targetName] = row.id;
    }
  }

  let fuzzyTags = 0;

  db.transaction(() => {
    for (const media of allMedia) {
      const text = (
        (media.title || '') +
        ' ' +
        (media.file_path || '') +
        ' ' +
        (media.description || '')
      ).toLowerCase();

      // Check Surname Map
      for (const [keyword, fullName] of Object.entries(surnameMap)) {
        if (text.includes(keyword)) {
          const id = targetIds[fullName];
          if (id) {
            insertStmt.run(media.id, id);
            fuzzyTags++;
          }
        }
      }

      // Optional: Check Top 100 Exact Matches (Full Name)
      for (const ent of topEntities) {
        if (text.includes(ent.full_name.toLowerCase())) {
          insertStmt.run(media.id, ent.id);
          fuzzyTags++;
        }
      }
    }
  })();

  console.log(`   ✅ Linked ${fuzzyTags} people using fuzzy/surname matching.`);

  // 3. Populate media_items.entity_id (Primary Entity)
  // Pick the most mentioned person for each media item?
  // Or just leave it?
  // Some UI might rely on 'entity_id'. Let's populate it with the first tag found.

  const itemsWithoutPrimary = db
    .prepare('SELECT id FROM media_items WHERE entity_id IS NULL')
    .all() as { id: number }[];
  const updatePrimary = db.prepare('UPDATE media_items SET entity_id = ? WHERE id = ?');

  let primaries = 0;
  db.transaction(() => {
    for (const item of itemsWithoutPrimary) {
      const tag = db
        .prepare('SELECT entity_id FROM media_item_people WHERE media_item_id = ? LIMIT 1')
        .get(item.id) as { entity_id: number } | undefined;
      if (tag) {
        updatePrimary.run(tag.entity_id, item.id);
        primaries++;
      }
    }
  })();
  console.log(`   ✅ Set primary entity for ${primaries} items.`);
}

recoverMediaTags();
