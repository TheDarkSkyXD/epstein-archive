
import { DatabaseService } from '../src/services/DatabaseService';
import path from 'path';

// Initialize DB
const dbPath = path.join(process.cwd(), 'epstein-archive.db');
const dbService = DatabaseService.getInstance();
const db = dbService.getDatabase();

console.log(`Fixing duplicate albums in ${dbPath}...`);

const getDuplicates = () => {
  return db.prepare(`
    SELECT name, COUNT(*) as count 
    FROM media_albums 
    GROUP BY name 
    HAVING count > 1
  `).all() as { name: string; count: number }[];
};

try {
  const duplicates = getDuplicates();

  if (duplicates.length === 0) {
    console.log('No duplicate album names found.');
  } else {
    console.log(`Found ${duplicates.length} duplicate album names.`);

    const getAlbumIds = db.prepare('SELECT id FROM media_albums WHERE name = ? ORDER BY id ASC');
    const updateImages = db.prepare('UPDATE media_images SET album_id = ? WHERE album_id = ?');
    const deleteAlbum = db.prepare('DELETE FROM media_albums WHERE id = ?');

    db.transaction(() => {
      for (const dup of duplicates) {
        const albums = getAlbumIds.all(dup.name) as { id: number }[];
        if (albums.length < 2) continue;

        const keepId = albums[0].id;
        console.log(`Processing "${dup.name}": Keeping ID ${keepId}, merging ${albums.length - 1} others.`);

        for (let i = 1; i < albums.length; i++) {
          const removeId = albums[i].id;
          
          // Move images
          const result = updateImages.run(keepId, removeId);
          console.log(`  Moved ${result.changes} images from album ${removeId} to ${keepId}.`);

          // Delete album
          deleteAlbum.run(removeId);
          console.log(`  Deleted album ID ${removeId}.`);
        }
      }
    })();
    
    console.log('Duplicate albums merged successfully.');
  }
} catch (error) {
  console.error('Error fixing duplicates:', error);
}
