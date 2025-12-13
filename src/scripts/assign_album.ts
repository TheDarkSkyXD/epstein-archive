
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'epstein-archive.db');
const db = new Database(DB_PATH);

const ALBUM_NAME = '12.11.25 Estate Production';
const ALBUM_DESCRIPTION = 'New tranche of photos from 12.11.25 Estate Production';

function run() {
  console.log(`Checking for album: "${ALBUM_NAME}"...`);
  
  // 1. Find or create album
  let album = db.prepare('SELECT * FROM media_albums WHERE name = ?').get(ALBUM_NAME) as any;
  
  if (!album) {
    console.log('Album not found. Creating...');
    const info = db.prepare('INSERT INTO media_albums (name, description, date_created, date_modified) VALUES (?, ?, datetime("now"), datetime("now"))')
      .run(ALBUM_NAME, ALBUM_DESCRIPTION);
    const id = info.lastInsertRowid;
    album = { id, name: ALBUM_NAME };
    console.log(`Created album with ID: ${id}`);
  } else {
    console.log(`Found existing album with ID: ${album.id}`);
  }

  // 2. Find images matching the folder path
  // Note: The path stored in DB is absolute: /home/deploy/epstein-archive/data/media/images/12.11.25 Estate Production/...
  const searchPattern = '%12.11.25 Estate Production%';
  
  console.log('Assigning images...');
  const result = db.prepare(`
    UPDATE media_images 
    SET album_id = ? 
    WHERE path LIKE ?
  `).run(album.id, searchPattern);
  
  console.log(`Updated ${result.changes} images to be in album "${ALBUM_NAME}" (ID: ${album.id}).`);
}

run();
