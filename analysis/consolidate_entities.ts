import Database from 'better-sqlite3';
import { join } from 'path';
import * as fs from 'fs';

const DB_PATH = join(process.cwd(), 'epstein-archive.db');
const db = new Database(DB_PATH);

console.log('='.repeat(80));
console.log('ENTITY CONSOLIDATION (MERGING DUPLICATES)');
console.log('='.repeat(80));

// Common name variations and nicknames to normalize
const NAME_MAPPINGS: Record<string, string> = {
  'Bill Clinton': 'William Clinton',
  'Hillary Clinton': 'Hillary Rodham Clinton',
  'Donald Trump': 'Donald J. Trump',
  'Jeff Epstein': 'Jeffrey Epstein',
  'Ghislaine Maxwell': 'Ghislaine Noelle Marion Maxwell',
  'Prince Andrew': 'Andrew Albert Christian Edward',
  'Alan Dershowitz': 'Alan M. Dershowitz',
  'Les Wexner': 'Leslie Wexner',
  'Virginia Roberts': 'Virginia Giuffre',
  'Sarah Ferguson': 'Sarah, Duchess of York',
  'Kathy Alexander': 'Kathryn Alexander',
  'Miles Alexander': 'Miles J. Alexander',
  'Emmy Tayler': 'Emmy Taylor',
  'Nadia Marcinkova': 'Nadia Marcinko',
  'Sarah Kellen': 'Sarah Kellen Vickers',
  'Haley Robson': 'Haley Marie Robson',
  'Chauntae Davies': 'Chauntae Davis',
  'Cecilia Marshall': 'Cecilia Vega',
  'Adriana Ross': 'Adriana Rossel',
  'Sophie B': 'Sophie Biddle',
  'Joanna S': 'Joanna Sjoberg',
  'Doug Band': 'Douglas Band',
  'George Mitchell': 'George J. Mitchell',
  'Bill Richardson': 'William Richardson',
  'Barack Obama': 'Barack H. Obama'
};

function consolidateEntities() {
  console.log('\n[1/2] Finding and merging duplicates...');
  
  let mergedCount = 0;
  
  // 1. Merge based on explicit mappings
  for (const [alias, canonical] of Object.entries(NAME_MAPPINGS)) {
    const aliasEntity = db.prepare('SELECT id FROM entities WHERE full_name = ?').get(alias) as any;
    const canonicalEntity = db.prepare('SELECT id FROM entities WHERE full_name = ?').get(canonical) as any;
    
    if (aliasEntity && canonicalEntity) {
      console.log(`  Merging "${alias}" -> "${canonical}"...`);
      mergeEntities(aliasEntity.id, canonicalEntity.id);
      mergedCount++;
    } else if (aliasEntity && !canonicalEntity) {
      // Rename alias to canonical if canonical doesn't exist
      console.log(`  Renaming "${alias}" -> "${canonical}"...`);
      db.prepare('UPDATE entities SET full_name = ? WHERE id = ?').run(canonical, aliasEntity.id);
    }
  }
  
  // 2. Merge based on "Sent" suffix (e.g., "Bill Clinton Sent" -> "Bill Clinton")
  const sentEntities = db.prepare(`
    SELECT id, full_name 
    FROM entities 
    WHERE full_name LIKE '% Sent' OR full_name LIKE '% Subject'
  `).all() as any[];
  
  for (const entity of sentEntities) {
    const cleanName = entity.full_name.replace(/\s+(Sent|Subject)$/i, '').trim();
    const targetEntity = db.prepare('SELECT id FROM entities WHERE full_name = ?').get(cleanName) as any;
    
    if (targetEntity) {
      console.log(`  Merging "${entity.full_name}" -> "${cleanName}"...`);
      mergeEntities(entity.id, targetEntity.id);
      mergedCount++;
    }
  }
  
  console.log(`✓ Merged ${mergedCount} duplicate entities`);
}

function mergeEntities(sourceId: number, targetId: number) {
  db.transaction(() => {
    // 1. Move mentions
    db.prepare(`
      UPDATE OR IGNORE entity_mentions 
      SET entity_id = ? 
      WHERE entity_id = ?
    `).run(targetId, sourceId);
    
    // 2. Update mention counts
    const sourceMentions = db.prepare('SELECT mentions FROM entities WHERE id = ?').get(sourceId) as any;
    db.prepare('UPDATE entities SET mentions = mentions + ? WHERE id = ?').run(sourceMentions.mentions, targetId);
    
    // 3. Update spice scores (take max)
    const sourceSpice = db.prepare('SELECT spice_score, spice_rating FROM entities WHERE id = ?').get(sourceId) as any;
    const targetSpice = db.prepare('SELECT spice_score, spice_rating FROM entities WHERE id = ?').get(targetId) as any;
    
    if (sourceSpice.spice_score > targetSpice.spice_score) {
      db.prepare('UPDATE entities SET spice_score = ?, spice_rating = ? WHERE id = ?')
        .run(sourceSpice.spice_score, sourceSpice.spice_rating, targetId);
    }
    
    // 4. Delete source entity and related records
    db.prepare('DELETE FROM entity_mentions WHERE entity_id = ?').run(sourceId); // Delete remaining duplicates
    db.prepare('DELETE FROM people WHERE entity_id = ?').run(sourceId);
    db.prepare('DELETE FROM organizations WHERE entity_id = ?').run(sourceId);
    db.prepare('DELETE FROM entities WHERE id = ?').run(sourceId);
  })();
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  try {
    // Create backup
    console.log('\nCreating database backup...');
    const backupDir = join(process.cwd(), 'database_backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = join(backupDir, `epstein-archive_backup_${timestamp}.db`);
    fs.copyFileSync(DB_PATH, backupPath);
    console.log(`✓ Backup created: ${backupPath}`);
    
    consolidateEntities();
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ ENTITY CONSOLIDATION COMPLETE');
    console.log('='.repeat(80));
    
    db.close();
  } catch (error) {
    console.error('\n❌ Error:', error);
    db.close();
    process.exit(1);
  }
}

main();
