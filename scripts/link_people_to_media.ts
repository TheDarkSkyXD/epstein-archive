import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DB_PATH || 'epstein-archive.db';
const db = new Database(DB_PATH);

// Targeted roles for linking
const RELEVANT_ROLES = [
  'Key Figure', 'Associate', 'Politician', 'Business Executive', 'Socialite', 
  'Pilot', 'Victim', 'Staff', 'Lawyer', 'Royalty', 'Scientist', 'Academic', 
  'Model', 'Actor', 'Actress', 'Public Figure', 'Journalist'
];

// Specific high-profile names to always check (even if role is generic)
const VIP_NAMES = [
  'Jeffrey Epstein', 'Ghislaine Maxwell', 'Prince Andrew', 'Bill Clinton', 
  'Donald Trump', 'Alan Dershowitz', 'Les Wexner', 'Virginia Giuffre', 
  'Sarah Ransome', 'Maria Farmer', 'Jean-Luc Brunel'
];

function linkPeopleToMedia() {
  console.log('🚀 Starting media-people linking...');

  // 1. Get relevant entities
  const entities = db.prepare(`
    SELECT id, full_name, primary_role 
    FROM entities 
    WHERE primary_role IN (${RELEVANT_ROLES.map(() => '?').join(',')})
    OR full_name IN (${VIP_NAMES.map(() => '?').join(',')})
  `).all(...RELEVANT_ROLES, ...VIP_NAMES);

  console.log(`Found ${entities.length} relevant entities to check.`);

  // 2. Get all images
  const images = db.prepare(`
    SELECT id, filename, title, description, original_filename
    FROM media_images
  `).all();

  console.log(`Found ${images.length} images to scan.`);

  let linkCount = 0;
  const insertStmt = db.prepare('INSERT OR IGNORE INTO media_people (media_id, entity_id) VALUES (?, ?)');

  db.transaction(() => {
    for (const entity of entities) {
      // Create variations of the name for matching
      // e.g. "Jeffrey Epstein" -> ["Jeffrey Epstein", "Epstein"] (careful with short names)
      const namesToCheck = [entity.full_name];
      const parts = entity.full_name.split(' ');
      if (parts.length > 1) {
        const lastName = parts[parts.length - 1];
        if (lastName.length > 3) { // Avoid short common names
             // Only add last name if it's unique enough or for VIPs
             if (VIP_NAMES.some(vip => vip.includes(lastName))) {
                 namesToCheck.push(lastName);
             }
        }
      }

      for (const image of images) {
        const textToSearch = `
          ${image.filename || ''} 
          ${image.original_filename || ''} 
          ${image.title || ''} 
          ${image.description || ''}
        `.toLowerCase();

        let match = false;
        for (const name of namesToCheck) {
          if (textToSearch.includes(name.toLowerCase())) {
            match = true;
            break;
          }
        }

        if (match) {
          insertStmt.run(image.id, entity.id);
          linkCount++;
          // console.log(`Linked ${entity.full_name} to image ${image.id} (${image.filename})`);
        }
      }
      
      if (entities.indexOf(entity) % 100 === 0) {
          process.stdout.write('.');
      }
    }
  })();

  console.log('\n');
  console.log(`✅ Linked ${linkCount} entity-media pairs.`);
}

linkPeopleToMedia();
