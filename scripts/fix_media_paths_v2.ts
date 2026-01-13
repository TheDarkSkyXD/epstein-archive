
import Database from 'better-sqlite3';

const DB_PATH = process.env.DB_PATH || 'epstein-archive.db';
const db = new Database(DB_PATH);

function fixMediaPaths() {
  console.log('🔧 Fixing media paths...');
  
  const items = db.prepare('SELECT id, file_path FROM media_items').all() as {id: number, file_path: string}[];
  let fixed = 0;
  
  const update = db.prepare('UPDATE media_items SET file_path = ? WHERE id = ?');
  
  db.transaction(() => {
      for (const item of items) {
          let newPath = item.file_path;
          
          // 1. Remove leading slash if it starts with /data
          if (newPath.startsWith('/data/')) {
              newPath = newPath.substring(1); // 'data/...'
          }
          
          // 2. Add 'data/media/' if missing? 
          // If it starts with 'audio/' or 'video/', prepend 'data/media/'?
          // Current paths: "audio/DOJ-OGR-00030343.mp3"
          // Should be: "data/media/audio/DOJ-OGR-00030343.mp3"
          if (newPath.startsWith('audio/') || newPath.startsWith('video/')) {
              newPath = 'data/media/' + newPath;
          }
           
          // 3. Remove "epstein-archive/" prefix if present (rare)
          if (newPath.includes('epstein-archive/data/')) {
              newPath = newPath.split('epstein-archive/')[1];
          }

          if (newPath !== item.file_path) {
              console.log(`   ${item.file_path} -> ${newPath}`);
              update.run(newPath, item.id);
              fixed++;
          }
      }
  })();
  
  console.log(`✅ Fixed ${fixed} paths.`);
}

fixMediaPaths();
