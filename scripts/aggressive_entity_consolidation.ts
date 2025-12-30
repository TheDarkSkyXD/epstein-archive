#!/usr/bin/env tsx
/**
 * Aggressive Entity Consolidation Script
 * 
 * Purpose: Consolidate entities using comprehensive name variations including:
 * - Full names (Jeffrey Epstein)
 * - Last names only (Epstein)
 * - First names only (Jeffrey) - with caution
 * - Title + name (Mr. Epstein, President Trump)
 * - Nicknames (Donnie, DJ, JE)
 * - Initials (DJT, JE)
 * 
 * Uses Known Entities list as authoritative source.
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../epstein-archive.db');
const AUDIT_LOG_PATH = path.join(__dirname, '../aggressive_consolidation_audit.json');

const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

// Comprehensive name variation mappings
// Format: canonical name -> [all variations to consolidate]
const AGGRESSIVE_CONSOLIDATION_MAP: Record<string, string[]> = {
  // Jeffrey Epstein - CORE FIGURE
  'Jeffrey Epstein': [
    'Epstein', 'Jeffrey', 'Jeff Epstein', 'J Epstein', 'JE', 
    'Mr Epstein', 'Mr. Epstein', 'Dear Jeffrey', 'Dear Mr Epstein',
    'Billionaire Jeffrey Epstein', 'Billionaire Epstein',
    'Jeffrey E Epstein', 'Jeffrey Edward Epstein',
    'Defendant Epstein', 'Plaintiff Epstein',
    'Is Mr Epstein', 'Should Mr Epstein', 'Does Mr Epstein', 'Has Mr Epstein',
    'Jeffrey Epstein Pleads', 'Jeffrey Epstein Faces',
    // Additional junk entries found in database
    'Sex Offender Jeffrey', 'Offender Jeffrey',
    'Because Epstein', 'While Epstein', 'Another Epstein',
    'Following Epstein', 'Isaid Epstein',
    'Defendant Jeffrey', 'Epstein Case',
    'Epstein House', 'Epstein Depo', 'Epstein Deposition',
    'Representing Epstein', 'Suits Against Epstein', 
    'Whether Jeffrey Epstein', 'Unseal Epstein Appeal',
    'Epstein Vic', 'Epstein Takes', 'Jeffrey Mac',
    'While Jeffrey', 'Against Epstein', 'With Epstein',
  ],
  
  // Donald Trump
  'Donald Trump': [
    'Trump', 'Donald', 'Donald J Trump', 'Donald John Trump',
    'DJT', 'DJ Trump', 'Donnie', 'The Donald',
    'Mr Trump', 'Mr. Trump', 'President Trump', 'Pres Trump',
    'President Donald Trump', 'Pres Donald Trump',
    'Defendant Trump', 'Plaintiff Trump',
    'Donald J. Trump', 'D Trump', 'D. Trump',
    'Republican Donald Trump', 'Candidate Trump',
    'Was Donald Trump', 'Has Donald Trump', 'Is Donald Trump',
    'Enter Donald Trump', 'Consider President Trump',
  ],
  
  // Bill Clinton
  'Bill Clinton': [
    'Clinton', 'Bill', 'William Clinton', 'William J Clinton',
    'William Jefferson Clinton', 'WJC', 'BC',
    'Mr Clinton', 'Mr. Clinton', 'President Clinton', 'Pres Clinton',
    'President Bill Clinton', 'Pres Bill Clinton',
    'Former President Clinton', 'Ex-President Clinton',
    'Billy Clinton', 'Slick Willie',
  ],
  
  // Hillary Clinton  
  'Hillary Clinton': [
    'Hillary', 'Hillary Rodham Clinton', 'Hillary R Clinton',
    'HRC', 'Mrs Clinton', 'Mrs. Clinton', 'Secretary Clinton',
    'Senator Clinton', 'First Lady Clinton',
    'Hillary Rodham', 'H Clinton', 'State Hillary Clinton',
    'Hillary Clint', 'Get Hillary',
  ],
  
  // Prince Andrew
  'Prince Andrew': [
    'Andrew', 'Duke of York', 'The Duke', 'HRH Prince Andrew',
    'Prince Andrew of York', 'Andrew Windsor',
    'Andrew Albert Christian Edward', 'Randy Andy',
  ],
  
  // Ghislaine Maxwell
  'Ghislaine Maxwell': [
    'Maxwell', 'Ghislaine', 'GM', 'G Maxwell',
    'Ms Maxwell', 'Ms. Maxwell', 'Miss Maxwell',
    'Defendant Maxwell', 'Ghislaine M',
  ],
  
  // Alan Dershowitz
  'Alan Dershowitz': [
    'Dershowitz', 'Alan', 'Alan M Dershowitz', 'Alan M. Dershowitz',
    'Prof Dershowitz', 'Prof. Dershowitz', 'Professor Dershowitz',
    'Attorney Dershowitz', 'Mr Dershowitz', 'Mr. Dershowitz',
    'Alan D', 'A Dershowitz',
  ],
  
  // Les Wexner - use Leslie Wexner as canonical since that's what's in DB
  'Leslie Wexner': [
    'Wexner', 'Les', 'Les Wexner', 'Leslie H Wexner',
    'Leslie H. Wexner', 'L Wexner', 'Mr Wexner', 'Mr. Wexner',
    'Limited Founder Les Wexner',
  ],
  
  // Virginia Giuffre - already in DB as Virginia Giuffre
  'Virginia Giuffre': [
    'Virginia', 'Giuffre', 'Virginia Roberts', 'Virginia Roberts Giuffre',
    'V Giuffre', 'VG', 'Ms Giuffre', 'Ms. Giuffre',
  ],
  
  // Alex Acosta
  'Alex Acosta': [
    'Acosta', 'Alexander Acosta', 'R Alexander Acosta',
    'Secretary Acosta', 'Mr Acosta', 'Mr. Acosta',
    'A Acosta', 'Labor Secretary Acosta',
  ],
  
  // Steve Bannon
  'Steve Bannon': [
    'Bannon', 'Stephen Bannon', 'Stephen K Bannon', 'Stephen K. Bannon',
    'Mr Bannon', 'Mr. Bannon', 'S Bannon',
  ],
  
  // Barack Obama - use President Obama as canonical since that has most mentions
  'President Obama': [
    'Obama', 'Barack Obama', 'Barack', 'Barack H Obama', 'Barack Hussein Obama',
    'Pres Obama', 'BHO', 'BO',
    'Mr Obama', 'Mr. Obama', 'Senator Obama',
    'President Barack Obama', 'Barack H. Obama',
    'Senator Barack Obama',
  ],
  
  // Ivanka Trump  
  'Ivanka Trump': [
    'Ivanka', 'I Trump', 'Ms Trump', 'Ms. Trump',
    'Ivanka Marie Trump',
  ],
  
  // Melania Trump
  'Melania Trump': [
    'Melania', 'First Lady Trump', 'First Lady Melania',
    'Melania Knauss',
  ],
  
  // Bill Gates
  'Bill Gates': [
    'Gates', 'William Gates', 'William H Gates', 'William Henry Gates',
    'Mr Gates', 'Mr. Gates', 'BG',
  ],
  
  // Elon Musk
  'Elon Musk': [
    'Musk', 'Elon', 'Mr Musk', 'Mr. Musk', 'EM',
  ],
  
  // Larry Summers
  'Larry Summers': [
    'Summers', 'Lawrence Summers', 'Lawrence H Summers',
    'Mr Summers', 'Mr. Summers', 'Secretary Summers',
  ],
  
  // Ehud Barak
  'Ehud Barak': [
    'Barak', 'Ehud', 'PM Barak', 'Prime Minister Barak',
    'Mr Barak', 'Mr. Barak',
  ],
  
  // Kevin Spacey
  'Kevin Spacey': [
    'Spacey', 'Kevin', 'K Spacey', 'Mr Spacey', 'Mr. Spacey',
  ],
  
  // Naomi Campbell
  'Naomi Campbell': [
    'Naomi', 'Campbell', 'Ms Campbell', 'Ms. Campbell',
    'Miss Campbell', 'Supermodel Naomi',
  ],
  
  // Sarah Kellen - use Sarah Kellen Vickers as that's in DB
  'Sarah Kellen Vickers': [
    'Sarah Kellen', 'Kellen', 'Sarah', 'S Kellen', 'Ms Kellen', 'Ms. Kellen',
    'Miss Kellen', 'Kellen Depo',
  ],
  
  // Nadia Marcinkova
  'Nadia Marcinkova': [
    'Nadia', 'Marcinkova', 'Ms Marcinkova', 'Ms. Marcinkova',
    'Nadia Marcinko',
  ],
  
  // Jean Luc Brunel
  'Jean Luc Brunel': [
    'Brunel', 'Jean Luc', 'JL Brunel', 'Mr Brunel', 'Mr. Brunel',
    'Jean-Luc Brunel',
  ],
  
  // Robert Maxwell (Ghislaine's father)
  'Robert Maxwell': [
    'Maxwell Sr', 'Captain Maxwell', 'Publisher Maxwell',
    'Ian Robert Maxwell',
  ],
  
  // Michael Wolff
  'Michael Wolff': [
    'Wolff', 'Michael', 'Mike Wolff', 'M Wolff',
  ],
  
  // Kathy Ruemmler / Kathryn Ruemmler - use what's in DB (Kathy Ruemmler)
  'Kathy Ruemmler': [
    'Ruemmler', 'Kathryn Ruemmler', 'Kathryn', 'Kathy',
    'K Ruemmler', 'Ms Ruemmler', 'Ms. Ruemmler',
  ],
};

interface AuditEntry {
  timestamp: string;
  sourceId: number;
  sourceName: string;
  targetId: number;
  targetName: string;
  mentionsTransferred: number;
}

const auditLog: AuditEntry[] = [];
let stats = {
  merged: 0,
  mentionsTransferred: 0,
  skipped: 0,
};

function log(message: string) {
  if (VERBOSE) {
    console.log(message);
  }
}

function normalizeForMatch(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,;:!?'"]/g, '');
}

/**
 * Merge variant entity into canonical entity
 */
function mergeEntity(db: Database.Database, variantId: number, canonicalId: number, variantName: string, canonicalName: string, variantMentions: number): boolean {
  try {
    // Update entity_mentions
    db.prepare(`UPDATE entity_mentions SET entity_id = ? WHERE entity_id = ?`).run(canonicalId, variantId);
    
    // Update media_items
    db.prepare(`UPDATE media_items SET entity_id = ? WHERE entity_id = ?`).run(canonicalId, variantId);
    
    // Update evidence types (handle duplicates)
    db.prepare(`
      INSERT OR IGNORE INTO entity_evidence_types (entity_id, evidence_type_id)
      SELECT ?, evidence_type_id FROM entity_evidence_types WHERE entity_id = ?
    `).run(canonicalId, variantId);
    db.prepare(`DELETE FROM entity_evidence_types WHERE entity_id = ?`).run(variantId);
    
    // Delete from people table
    db.prepare(`DELETE FROM people WHERE entity_id = ?`).run(variantId);
    
    // Delete from organizations table
    db.prepare(`DELETE FROM organizations WHERE entity_id = ?`).run(variantId);
    
    // Delete entity relationships
    try {
      db.prepare(`DELETE FROM entity_relationships WHERE source_id = ? OR target_id = ?`).run(variantId, variantId);
    } catch (e) { /* table might not exist */ }
    
    // Update mention count on canonical
    db.prepare(`UPDATE entities SET mentions = mentions + ? WHERE id = ?`).run(variantMentions, canonicalId);
    
    // Delete the variant entity
    db.prepare(`DELETE FROM entities WHERE id = ?`).run(variantId);
    
    return true;
  } catch (error: any) {
    console.error(`   ✗ Error merging ${variantName} → ${canonicalName}: ${error.message}`);
    return false;
  }
}

/**
 * Main consolidation function
 */
function consolidateEntities(db: Database.Database): void {
  console.log('\n🔗 Aggressive Entity Consolidation\n');
  console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN' : '✏️  LIVE MODE'}\n`);
  
  for (const [canonical, variations] of Object.entries(AGGRESSIVE_CONSOLIDATION_MAP)) {
    // Find the canonical entity
    const canonicalEntity = db.prepare(`
      SELECT id, full_name, mentions FROM entities 
      WHERE full_name = ? AND entity_type = 'Person'
    `).get(canonical) as { id: number; full_name: string; mentions: number } | undefined;
    
    if (!canonicalEntity) {
      console.log(`⚠️  Canonical entity not found: ${canonical}`);
      continue;
    }
    
    console.log(`\n📌 ${canonical} (ID: ${canonicalEntity.id}, ${canonicalEntity.mentions} mentions)`);
    
    for (const variation of variations) {
      // Find exact match first
      let variantEntity = db.prepare(`
        SELECT id, full_name, mentions FROM entities 
        WHERE full_name = ? AND entity_type = 'Person' AND id != ?
      `).get(variation, canonicalEntity.id) as { id: number; full_name: string; mentions: number } | undefined;
      
      // Also try case-insensitive match
      if (!variantEntity) {
        variantEntity = db.prepare(`
          SELECT id, full_name, mentions FROM entities 
          WHERE LOWER(full_name) = LOWER(?) AND entity_type = 'Person' AND id != ?
        `).get(variation, canonicalEntity.id) as { id: number; full_name: string; mentions: number } | undefined;
      }
      
      if (variantEntity) {
        console.log(`   → Merging: "${variantEntity.full_name}" (${variantEntity.mentions}) → "${canonical}"`);
        
        if (!DRY_RUN) {
          const success = mergeEntity(
            db, 
            variantEntity.id, 
            canonicalEntity.id, 
            variantEntity.full_name, 
            canonical,
            variantEntity.mentions
          );
          
          if (success) {
            auditLog.push({
              timestamp: new Date().toISOString(),
              sourceId: variantEntity.id,
              sourceName: variantEntity.full_name,
              targetId: canonicalEntity.id,
              targetName: canonical,
              mentionsTransferred: variantEntity.mentions,
            });
            stats.merged++;
            stats.mentionsTransferred += variantEntity.mentions;
          }
        } else {
          stats.merged++;
          stats.mentionsTransferred += variantEntity.mentions;
        }
      }
    }
  }
}

/**
 * Update mention counts
 */
function updateMentionCounts(db: Database.Database): void {
  if (DRY_RUN) return;
  
  console.log('\n📊 Updating mention counts...');
  db.prepare(`
    UPDATE entities SET mentions = (
      SELECT COUNT(*) FROM entity_mentions WHERE entity_id = entities.id
    )
  `).run();
  console.log('   ✓ Done');
}

/**
 * Generate report
 */
function generateReport(db: Database.Database): void {
  console.log('\n' + '═'.repeat(50));
  console.log(`\n📋 Consolidation Summary${DRY_RUN ? ' (DRY RUN)' : ''}`);
  console.log(`   Entities merged:       ${stats.merged}`);
  console.log(`   Mentions transferred:  ${stats.mentionsTransferred}`);
  
  // Show top entities after consolidation
  console.log('\n📊 Top 10 Entities After Consolidation:');
  const topEntities = db.prepare(`
    SELECT full_name, mentions FROM entities 
    WHERE entity_type = 'Person' 
    ORDER BY mentions DESC LIMIT 10
  `).all() as { full_name: string; mentions: number }[];
  
  topEntities.forEach((e, i) => {
    console.log(`   ${i + 1}. ${e.full_name}: ${e.mentions}`);
  });
  
  console.log('\n' + '═'.repeat(50));
}

async function main() {
  console.log('\n🧹 Aggressive Entity Consolidation Script\n');
  console.log(`Database: ${DB_PATH}\n`);
  
  const db = new Database(DB_PATH);
  
  try {
    db.exec('BEGIN TRANSACTION');
    
    consolidateEntities(db);
    updateMentionCounts(db);
    
    if (!DRY_RUN) {
      db.exec('COMMIT');
      
      // Save audit log
      fs.writeFileSync(AUDIT_LOG_PATH, JSON.stringify(auditLog, null, 2));
      console.log(`\n📝 Audit log saved: ${AUDIT_LOG_PATH}`);
    } else {
      db.exec('ROLLBACK');
      console.log('\n🔍 DRY RUN - No changes committed');
    }
    
    generateReport(db);
    
  } catch (error) {
    db.exec('ROLLBACK');
    console.error('\n❌ Error:', error);
    throw error;
  } finally {
    db.close();
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
