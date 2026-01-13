import Database from 'better-sqlite3';

const DB_PATH = process.env.DB_PATH || 'epstein-archive.db';
const db = new Database(DB_PATH);

function assignCovers() {
  console.log('🎨 Assigning alternating covers to Sascha Barros testimony...');

  const files = db
    .prepare(
      "SELECT id, title, metadata_json FROM media_items WHERE title LIKE 'Sascha Barros Testimony%' ORDER BY title ASC",
    )
    .all() as { id: number; title: string; metadata_json: string }[];

  const cover1 = '/data/media/audio/lvoocaudiop1/lvoocaudiop1.jpg';
  const cover2 = '/data/media/audio/lvoocaudiop1/lvoocaudiop1.webp';

  const updateStmt = db.prepare('UPDATE media_items SET metadata_json = ? WHERE id = ?');

  db.transaction(() => {
    let i = 0;
    for (const file of files) {
      const isEven = i % 2 !== 0; // 0-indexed: 0=Part1(odd), 1=Part2(even)...
      // Wait, user said Part 1, Part 2.
      // i=0 (Part 1) -> Odd -> cover1
      // i=1 (Part 2) -> Even -> cover2

      const cover = isEven ? cover2 : cover1;

      let meta: any = {};
      try {
        meta = JSON.parse(file.metadata_json || '{}');
      } catch {
        // Ignore parse errors, use empty object
      }

      meta.cover_image = cover;
      // Also set as 'thumbnail' just in case
      meta.thumbnail = cover;

      console.log(`   ${file.title} -> ${cover}`);

      updateStmt.run(JSON.stringify(meta), file.id);
      i++;
    }
  })();

  console.log('✅ Covers assigned.');
}

assignCovers();
