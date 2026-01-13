import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'epstein-archive.db');

// --- CONFIGURATION: The "Code Reference" for Structure ---
const ALBUMS = [
  {
    id: 25, // Fixed ID to ensure linking works
    title: 'The Sascha Barros Testimony',
    description: 'Complete 6-part interview series with Sascha Barros. Credits: Interviews by Lisa Noelle Voldeng. Content Warning: Contains graphic descriptions of sexual abuse and trafficking.',
    is_sensitive: 1,
    cover_image_id: null,
    items: [
      { part: 1, filename_match: 'Sascha Barros Testimony - Part 1' },
      { part: 2, filename_match: 'Sascha Barros Testimony - Part 2' },
      { part: 3, filename_match: 'Sascha Barros Testimony - Part 3' },
      { part: 4, filename_match: 'Sascha Barros Testimony - Part 4' },
      { part: 5, filename_match: 'Sascha Barros Testimony - Part 5' },
      { part: 6, filename_match: 'Sascha Barros Testimony - Part 6' },
    ]
  }
];

// --- SEEDING LOGIC ---

function ensureStructure() {
  console.log(`[SEED] Ensuring structure in ${DB_PATH}...`);
  if (!fs.existsSync(DB_PATH)) {
    console.error(`[SEED] Database not found at ${DB_PATH}`);
    process.exit(1);
  }

  const db = new Database(DB_PATH);

  // 1. Ensure Albums
  const insertAlbum = db.prepare(`
    INSERT INTO media_albums (id, name, description, is_sensitive, created_at, date_modified)
    VALUES (@id, @title, @description, @is_sensitive, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      name = @title,
      description = @description,
      is_sensitive = @is_sensitive,
      date_modified = CURRENT_TIMESTAMP
  `);

  const findItem = db.prepare(`SELECT id FROM media_items WHERE title LIKE ? OR description LIKE ? LIMIT 1`);
  const insertAlbumItem = db.prepare(`
    INSERT OR IGNORE INTO media_album_items (album_id, media_item_id, "order", added_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
  `);

  db.transaction(() => {
    for (const album of ALBUMS) {
      console.log(`[SEED] Processing Album: ${album.title}`);
      insertAlbum.run(album);

      let order = 1;
      for (const itemDef of album.items) {
        const item = findItem.get(`%${itemDef.filename_match}%`, `%${itemDef.filename_match}%`);
        if (item) {
          insertAlbumItem.run(album.id, item.id, order);
          // Update item metadata if needed (optional)
        } else {
          console.warn(`[SEED] ⚠️ Could not find media item matching "${itemDef.filename_match}"`);
        }
        order++;
      }
    }
  })();

  console.log('[SEED] Structure ensured successfully.');
  db.close();
}

ensureStructure();
