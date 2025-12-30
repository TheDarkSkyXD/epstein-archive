
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'epstein-archive.db');
const db = new Database(DB_PATH);

console.log('📊 Verifying Ingestion Counts...');

// Check Documents (DOJ Vol 7)
const doj7Count = db.prepare(`
    SELECT COUNT(*) as count 
    FROM documents 
    WHERE metadata_json LIKE '%DOJ Discovery VOL00007%'
`).get() as { count: number };

console.log(`📄 DOJ Vol 7 Documents: ${doj7Count.count} (Expected: ~17)`);

// Check Media Images
const mediaCount = db.prepare('SELECT COUNT(*) as count FROM media_images').get() as { count: number };
console.log(`📸 Total Media Images: ${mediaCount.count}`);

// Check specific new media albums
const usviCount = db.prepare(`
    SELECT COUNT(*) as count 
    FROM media_images i
    JOIN media_albums a ON i.album_id = a.id
    WHERE a.name LIKE '%USVI%'
`).get() as { count: number };
console.log(`📸 USVI Images: ${usviCount.count}`);

db.close();
