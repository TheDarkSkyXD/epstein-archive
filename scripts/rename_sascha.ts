
import Database from 'better-sqlite3';

const DB_PATH = process.env.DB_PATH || 'epstein-archive.db';
const db = new Database(DB_PATH);

function renameSascha() {
  console.log('🔄 Renaming Sascha Barron to Sascha Barros...');

  // 1. Update Entity
  const entityRes = db.prepare("UPDATE entities SET full_name = 'Sascha Barros' WHERE full_name = 'Sascha Barron'").run();
  console.log(`   Updated Entity: ${entityRes.changes} changes`);

  // 2. Update Album
  const albumRes = db.prepare(`
    UPDATE media_albums 
    SET name = REPLACE(name, 'Barron', 'Barros'),
        description = REPLACE(description, 'Barron', 'Barros')
    WHERE name LIKE '%Barron%'
  `).run();
  console.log(`   Updated Albums: ${albumRes.changes} changes`);

  // 3. Update Media Items (Titles and Descriptions)
  const mediaRes = db.prepare(`
    UPDATE media_items 
    SET title = REPLACE(title, 'Barron', 'Barros'),
        description = REPLACE(description, 'Barron', 'Barros')
    WHERE title LIKE '%Barron%' OR description LIKE '%Barron%'
  `).run();
  console.log(`   Updated Media Items: ${mediaRes.changes} changes`);

  // 4. Verify
  const newEntity = db.prepare("SELECT id, full_name FROM entities WHERE full_name = 'Sascha Barros'").get();
  console.log('   Verification:', newEntity);

  console.log('✅ Rename Complete.');
}

renameSascha();
