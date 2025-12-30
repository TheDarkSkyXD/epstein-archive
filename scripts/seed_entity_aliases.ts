/**
 * Seed Entity Aliases Script
 * Populates the aliases column in entities table for key figures
 * Uses known alias mappings from entity consolidation profiles
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '..', 'epstein-archive.db');

// Alias mappings: canonical_name -> aliases
const aliasProfiles: Record<string, string[]> = {
  'Jeffrey Epstein': ['Jeffrey E. Epstein', 'Jeffrey E Epstein', 'J. Epstein', 'J Epstein', 'Jeff Epstein', 'Epstein Jeffrey', 'Epstein, Jeffrey', 'Jeffrey Edward Epstein', 'JE'],
  'Ghislaine Maxwell': ['G. Maxwell', 'G Maxwell', 'Maxwell Ghislaine', 'Maxwell, Ghislaine', 'Ms. Maxwell', 'Ghislaine Noelle Marion Maxwell'],
  'Jean-Luc Brunel': ['Jean Luc Brunel', 'JL Brunel', 'Brunel Jean-Luc', 'Brunel, Jean-Luc'],
  'Sarah Kellen': ['Sarah Kellen Vickers', 'S. Kellen', 'Kellen Sarah', 'Sarah K.'],
  'Nadia Marcinkova': ['Nadia Marcinko', 'N. Marcinkova', 'Marcinkova Nadia'],
  'Lesley Groff': ['Leslie Groff', 'L. Groff', 'Groff Lesley'],
  'Prince Andrew': ['Prince Andrew of York', 'Andrew Windsor', 'Duke of York', 'HRH Prince Andrew', 'Andrew, Duke of York'],
  'Donald Trump': ['Donald J. Trump', 'Donald J Trump', 'DJT', 'Trump Donald', 'Trump, Donald', 'President Trump', 'Mr. Trump'],
  'Bill Clinton': ['William Clinton', 'William J. Clinton', 'President Clinton', 'Clinton Bill', 'Clinton, Bill', 'Wm. Clinton'],
  'Alan Dershowitz': ['Alan M. Dershowitz', 'Alan M Dershowitz', 'Prof. Dershowitz', 'Dershowitz Alan', 'Dershowitz, Alan'],
  'Leslie Wexner': ['Les Wexner', 'L. Wexner', 'Wexner Les', 'Wexner, Leslie', 'Les Wexner'],
  'Virginia Giuffre': ['Virginia Roberts', 'Virginia Roberts Giuffre', 'Virginia L. Giuffre', 'V. Giuffre', 'Giuffre Virginia'],
  'Alexander Acosta': ['Alex Acosta', 'R. Alexander Acosta', 'Acosta Alexander'],
  'Bill Richardson': ['William Richardson', 'Gov. Richardson', 'Richardson Bill'],
  'George Mitchell': ['Sen. Mitchell', 'Senator Mitchell', 'Mitchell George'],
  'Ehud Barak': ['E. Barak', 'Barak Ehud', 'PM Barak'],
  // Organizations and Locations
  'Little St. James Island': ['Little St James', 'Little Saint James', 'LSJ', 'Epstein Island', 'Pedophile Island', 'St. James Island', 'Private Island'],
  'Palm Beach Residence': ['Palm Beach Estate', 'Epstein Palm Beach', 'Palm Beach Property', '358 El Brillo Way'],
  'New York Mansion': ['East 71st Street', '9 East 71st Street', 'Epstein Manhattan', 'Manhattan Mansion', 'NYC Mansion']
};

async function seedAliases() {
  console.log('Opening database:', dbPath);
  const db = new Database(dbPath);
  
  // First, drop problematic triggers that reference non-existent columns
  console.log('Dropping old FTS triggers...');
  try {
    db.exec('DROP TRIGGER IF EXISTS entities_ai');
    db.exec('DROP TRIGGER IF EXISTS entities_ad');
    db.exec('DROP TRIGGER IF EXISTS entities_au');
    console.log('Old triggers dropped');
  } catch (e: any) {
    console.warn('Could not drop triggers:', e.message);
  }
  
  // Ensure aliases column exists
  try {
    db.exec('ALTER TABLE entities ADD COLUMN aliases TEXT DEFAULT NULL');
    console.log('Added aliases column');
  } catch (e: any) {
    if (e.message.includes('duplicate column')) {
      console.log('Aliases column already exists');
    } else {
      console.warn('Could not add aliases column:', e.message);
    }
  }
  
  // Prepare update statement
  const updateStmt = db.prepare(`
    UPDATE entities 
    SET aliases = @aliases 
    WHERE full_name = @name OR full_name LIKE @namePattern
  `);
  
  let updated = 0;
  
  for (const [name, aliases] of Object.entries(aliasProfiles)) {
    const aliasJson = JSON.stringify(aliases);
    const namePattern = `%${name}%`;
    
    try {
      const result = updateStmt.run({ aliases: aliasJson, name, namePattern });
      if (result.changes > 0) {
        console.log(`✓ Updated "${name}" with ${aliases.length} aliases`);
        updated += result.changes;
      } else {
        console.log(`⚠ No match found for "${name}"`);
      }
    } catch (e: any) {
      console.warn(`Error updating ${name}:`, e.message);
    }
  }
  
  console.log(`\nTotal entities updated: ${updated}`);
  
  // Rebuild FTS index with aliases (use only columns that exist)
  console.log('\nRecreating FTS table...');
  try {
    db.exec('DROP TABLE IF EXISTS entities_fts');
    db.exec(`
      CREATE VIRTUAL TABLE entities_fts USING fts5(
        full_name,
        primary_role,
        aliases,
        content='entities',
        content_rowid='id'
      )
    `);
    console.log('FTS table created');
    
    // Rebuild the index
    console.log('Building FTS index...');
    db.exec("INSERT INTO entities_fts(entities_fts) VALUES('rebuild')");
    console.log('FTS index built successfully');
    
    // Verify
    const testResult = db.prepare("SELECT COUNT(*) as cnt FROM entities_fts").get() as any;
    console.log(`FTS index contains ${testResult.cnt} entries`);
    
  } catch (e: any) {
    console.error('Error with FTS:', e.message);
  }
  
  db.close();
  console.log('\nDone!');
}

seedAliases().catch(console.error);
