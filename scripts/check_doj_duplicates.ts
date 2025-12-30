
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'epstein-archive.db');
const db = new Database(DB_PATH);

// Find Album IDs
const albums = db.prepare("SELECT id, name FROM media_albums WHERE name LIKE '%DOJ%'").all() as {id: number, name: string}[];
console.log('Albums found:', albums);

const suspects = db.prepare(`
    SELECT id, name, (SELECT COUNT(*) FROM media_images WHERE album_id = a.id) as count 
    FROM media_albums a 
    WHERE name LIKE '%DOJ%' OR name LIKE '%Perpetrator%' OR name LIKE '%People%'
`).all() as {id: number, name: string, count: number}[];

console.log('Suspect Albums:', suspects);

for (let i = 0; i < suspects.length; i++) {
    for (let j = i + 1; j < suspects.length; j++) {
        const a1 = suspects[i];
        const a2 = suspects[j];
        
        if (a1.count === 0 || a2.count === 0) continue;

        const overlap = db.prepare(`
            SELECT COUNT(*) as count 
            FROM media_images i1
            JOIN media_images i2 ON i1.original_filename = i2.original_filename 
            WHERE i1.album_id = ? AND i2.album_id = ?
        `).get(a1.id, a2.id) as {count: number};
        
        if (overlap.count > 0) {
            console.log(`❌ Overlap '${a1.name}' (${a1.count}) <-> '${a2.name}' (${a2.count}): ${overlap.count} duplicates`);
        }
    }
}


