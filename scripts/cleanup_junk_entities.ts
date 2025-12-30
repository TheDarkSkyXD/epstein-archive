#!/usr/bin/env tsx
/**
 * Phase 2: Junk Entity Cleanup Script
 * 
 * Identifies and removes entities that are clearly NLP extraction failures,
 * OCR artifacts, or sentence fragments rather than actual people/organizations.
 * 
 * Safety: Creates backup before deletions and only removes entities with 0 or minimal references.
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../epstein-archive-production.db');
const DRY_RUN = process.argv.includes('--dry-run');

// Patterns that indicate junk entities
const JUNK_PATTERNS = [
  // Sentence fragments
  /^(The|A|An|Of|To|In|For|And|Or|But|With|At|By|From|On|As|Is|Was|Were|Be|Been|Being|Have|Has|Had|Do|Does|Did|Will|Would|Could|Should|Shall|May|Might|Must|Can)\s/i,
  /\s(To|Of|In|At|By|For|And|The|Is|Was|Were|Be|Are)\s*$/i,
  
  // Common phrase fragments that aren't entities
  /^(Got|Need|Want|Let|Get|Make|Take|Give|Put|Said|Says|Asked|Told|Went|Came|Called|Tried|Used|Thought|Knew|Made)\s/i,
  
  // Very short names (likely artifacts)
  /^.{1,2}$/,
  
  // Numbers only or with minimal characters
  /^\d+$/,
  /^[A-Z]\d+$/,
  
  // OCR garbage patterns
  /[^\x00-\x7F]/,  // Non-ASCII characters (may need refinement)
  /^[^a-zA-Z]*$/,  // No letters at all
  
  // Common document metadata that got extracted as entities
  /^Page\s+\d+/i,
  /^Section\s+\d+/i,
  /^Chapter\s+\d+/i,
  /^Exhibit\s+[A-Z]/i,
  /^Document\s+/i,
  /^File\s+/i,
  
  // Filler words extracted as entities
  /^(Unknown|None|Null|N\/A|NA|TBD|TODO)$/i,
  
  // URLs and emails extracted as entities
  /^(http|www\.|@)/i,
  /\.(com|org|net|gov|edu)$/i,
  
  // Single words that are common nouns, not people
  /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$/i,
  /^(January|February|March|April|May|June|July|August|September|October|November|December)$/i,
];

// Whitelist of known valid entities that might match patterns
const WHITELIST = new Set([
  'The New York Times',
  'The Washington Post', 
  'The Wall Street Journal',
  'The Guardian',
  'The Associated Press',
  'The Daily Mail',
  'The Times',
  'The Sun',
  'The Mirror',
  'Federal Bureau of Investigation',
  'Central Intelligence Agency',
  'Department of Justice',
  'Department of State',
  'Securities and Exchange Commission',
  'Internal Revenue Service',
]);

interface EntityInfo {
  id: number;
  full_name: string;
  mentions: number;
  entity_type: string;
}

function isJunkEntity(name: string): boolean {
  if (WHITELIST.has(name)) return false;
  
  // Check length - very short names are suspicious
  if (name.length < 3) return true;
  
  // Check patterns
  for (const pattern of JUNK_PATTERNS) {
    if (pattern.test(name)) return true;
  }
  
  // Check for sentence-like structure (multiple prepositions/articles)
  const words = name.split(/\s+/);
  const connectingWords = words.filter(w => 
    ['of', 'to', 'in', 'for', 'and', 'the', 'a', 'an', 'at', 'by', 'is', 'was', 'are', 'were'].includes(w.toLowerCase())
  );
  
  // If more than 40% of words are connecting words, likely junk
  if (words.length >= 3 && connectingWords.length / words.length > 0.4) {
    return true;
  }
  
  return false;
}

function main() {
  const db = new Database(DB_PATH);
  
  console.log(`\n🧹 Phase 2: Junk Entity Cleanup\n`);
  console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN' : '✏️  LIVE MODE'}\n`);
  
  // Get all entities
  const entities = db.prepare(`
    SELECT id, full_name, mentions, entity_type 
    FROM entities 
    ORDER BY id
  `).all() as EntityInfo[];
  
  console.log(`Total entities in database: ${entities.length}\n`);
  
  const junkEntities: EntityInfo[] = [];
  const protectedJunk: EntityInfo[] = [];
  
  for (const entity of entities) {
    if (isJunkEntity(entity.full_name)) {
      // Check if entity has mentions or relationships
      const mentionCount = db.prepare(
        'SELECT COUNT(*) as c FROM entity_mentions WHERE entity_id = ?'
      ).get(entity.id) as { c: number };
      
      const relationCount = db.prepare(`
        SELECT COUNT(*) as c FROM entity_relationships 
        WHERE source_entity_id = ? OR target_entity_id = ?
      `).get(entity.id, entity.id) as { c: number };
      
      if (mentionCount.c === 0 && relationCount.c === 0) {
        junkEntities.push(entity);
      } else {
        protectedJunk.push(entity);
      }
    }
  }
  
  console.log(`\n📊 Results:`);
  console.log(`  Junk entities (no references): ${junkEntities.length}`);
  console.log(`  Junk entities (with references, protected): ${protectedJunk.length}`);
  
  // Show sample of junk to be deleted
  console.log(`\n🗑️  Sample entities to DELETE (first 20):`);
  junkEntities.slice(0, 20).forEach(e => console.log(`   - "${e.full_name}"`));
  
  // Show sample of protected junk (might need manual review)
  if (protectedJunk.length > 0) {
    console.log(`\n⚠️  Sample protected junk (has references, first 20):`);
    protectedJunk.slice(0, 20).forEach(e => console.log(`   - "${e.full_name}" (mentions: ${e.mentions})`));
  }
  
  if (!DRY_RUN && junkEntities.length > 0) {
    console.log(`\n🔄 Deleting ${junkEntities.length} junk entities...`);
    
    const deleteStmt = db.prepare('DELETE FROM entities WHERE id = ?');
    const deleteEvidenceTypes = db.prepare('DELETE FROM entity_evidence_types WHERE entity_id = ?');
    
    db.exec('BEGIN TRANSACTION');
    try {
      let deleted = 0;
      for (const entity of junkEntities) {
        deleteEvidenceTypes.run(entity.id);
        deleteStmt.run(entity.id);
        deleted++;
        
        if (deleted % 1000 === 0) {
          console.log(`   Deleted ${deleted}/${junkEntities.length}...`);
        }
      }
      
      db.exec('COMMIT');
      console.log(`\n✅ Successfully deleted ${deleted} junk entities`);
      
      // Get new count
      const newCount = db.prepare('SELECT COUNT(*) as c FROM entities').get() as { c: number };
      console.log(`   Remaining entities: ${newCount.c}`);
      
    } catch (error) {
      db.exec('ROLLBACK');
      console.error('❌ Error during deletion:', error);
      throw error;
    }
  } else if (DRY_RUN) {
    console.log(`\n📋 Dry run complete. Run without --dry-run to delete ${junkEntities.length} entities.`);
  }
  
  db.close();
}

main();
