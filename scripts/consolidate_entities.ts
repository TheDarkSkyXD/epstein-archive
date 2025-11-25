import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'epstein-archive.db');

// Normalization function
function normalizeName(name: string): string {
  if (!name) return '';
  
  let normalized = name.toLowerCase().trim();
  
  // Remove common suffixes that indicate email metadata rather than name part
  normalized = normalized.replace(/\s+sent$/, '');
  normalized = normalized.replace(/\s+wrote$/, '');
  normalized = normalized.replace(/\s+via$/, '');
  normalized = normalized.replace(/\s+to$/, '');
  normalized = normalized.replace(/\s+from$/, '');
  
  // Remove email addresses
  normalized = normalized.replace(/<[^>]+>/g, '');
  
  // Remove punctuation
  normalized = normalized.replace(/[.,;:"'()]/g, '');
  
  // Collapse whitespace
  normalized = normalized.replace(/\s+/g, ' ');
  
  return normalized.trim();
}

async function consolidateEntities() {
  console.log('Starting entity consolidation...');
  
  if (!fs.existsSync(DB_PATH)) {
    console.error('Database not found:', DB_PATH);
    process.exit(1);
  }

  const db = new Database(DB_PATH);
  
  // Backup database first
  console.log('Creating backup...');
  const backupPath = `${DB_PATH}.backup-${Date.now()}`;
  fs.copyFileSync(DB_PATH, backupPath);
  console.log(`Backup created at ${backupPath}`);

  try {
    // Get all entities
    const entities = db.prepare('SELECT id, full_name, mentions, spice_rating FROM entities').all() as any[];
    console.log(`Found ${entities.length} total entities.`);

    // Group by normalized name
    const groups = new Map<string, any[]>();
    
    for (const entity of entities) {
      const normalized = normalizeName(entity.full_name);
      if (normalized.length < 2) continue; // Skip very short names
      
      if (!groups.has(normalized)) {
        groups.set(normalized, []);
      }
      groups.get(normalized)?.push(entity);
    }

    let mergedCount = 0;
    let deletedCount = 0;

    db.transaction(() => {
      for (const [normalized, group] of groups.entries()) {
        if (group.length < 2) continue;

        // Sort group by mentions (desc) then ID (asc)
        // We want to keep the one with most mentions as master
        group.sort((a, b) => b.mentions - a.mentions || a.id - b.id);

        const master = group[0];
        const duplicates = group.slice(1);

        console.log(`Merging ${duplicates.length} duplicates into "${master.full_name}" (ID: ${master.id})`);
        
        for (const dup of duplicates) {
          console.log(`  - Merging "${dup.full_name}" (ID: ${dup.id})`);
          
          // 1. Update entity_mentions
          const updateMentions = db.prepare('UPDATE entity_mentions SET entity_id = ? WHERE entity_id = ?');
          updateMentions.run(master.id, dup.id);
          
          // 2. Update people table if linked
          // Check if duplicate has a people record
          const dupPerson = db.prepare('SELECT id FROM people WHERE entity_id = ?').get(dup.id);
          if (dupPerson) {
            // Check if master has a people record
            const masterPerson = db.prepare('SELECT id FROM people WHERE entity_id = ?').get(master.id);
            if (masterPerson) {
              // Both have people records. Delete duplicate's people record (or merge data? for now delete)
              db.prepare('DELETE FROM people WHERE entity_id = ?').run(dup.id);
            } else {
              // Master doesn't have people record, move duplicate's record to master
              db.prepare('UPDATE people SET entity_id = ? WHERE entity_id = ?').run(master.id, dup.id);
            }
          }

          // 3. Update organizations table if linked
          const dupOrg = db.prepare('SELECT id FROM organizations WHERE entity_id = ?').get(dup.id);
          if (dupOrg) {
            const masterOrg = db.prepare('SELECT id FROM organizations WHERE entity_id = ?').get(master.id);
            if (masterOrg) {
              db.prepare('DELETE FROM organizations WHERE entity_id = ?').run(dup.id);
            } else {
              db.prepare('UPDATE organizations SET entity_id = ? WHERE entity_id = ?').run(master.id, dup.id);
            }
          }

          // 4. Delete duplicate entity
          db.prepare('DELETE FROM entities WHERE id = ?').run(dup.id);
          deletedCount++;
        }

        // 5. Recalculate master stats
        // Sum mentions? Or recount from mentions table?
        // Recounting is safer
        const mentionCount = db.prepare('SELECT COUNT(*) as count FROM entity_mentions WHERE entity_id = ?').get(master.id) as any;
        
        // Update master entity
        db.prepare('UPDATE entities SET mentions = ? WHERE id = ?').run(mentionCount.count, master.id);
        
        mergedCount++;
      }
    })();

    console.log('Consolidation complete!');
    console.log(`Merged ${mergedCount} groups.`);
    console.log(`Deleted ${deletedCount} duplicate entities.`);

    // Vacuum to reclaim space
    console.log('Vacuuming database...');
    db.exec('VACUUM');

  } catch (error) {
    console.error('Error during consolidation:', error);
    // Restore backup? 
    // For now, just log. User can restore manually if needed.
  } finally {
    db.close();
  }
}

consolidateEntities();
