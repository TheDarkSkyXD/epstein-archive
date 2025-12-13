#!/usr/bin/env tsx
/**
 * Comprehensive Entity Normalization Script
 * 
 * Sources: Known Entities for Data Normalisation.rtf
 * Purpose: Assign proper roles, titles, and normalize names for all known entities
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../epstein-archive-production.db');
const DRY_RUN = process.argv.includes('--dry-run');

interface EntityMapping {
  canonical_name: string;
  title: string;
  role: string;
  primary_role: string;
  aliases?: string[];  // Alternative spellings/names to merge
}

// Comprehensive mappings from Known Entities RTF + updates for 2025
const ENTITY_MAPPINGS: EntityMapping[] = [
  // ============ CORE FIGURES ============
  { canonical_name: 'Jeffrey Epstein', title: 'Financier', role: 'Primary Subject', primary_role: 'Key Figure', aliases: ['Epstein Jeffrey', 'J. Epstein', 'Jeff Epstein'] },
  { canonical_name: 'Ghislaine Maxwell', title: 'Socialite', role: 'Co-Conspirator', primary_role: 'Key Figure', aliases: ['G. Maxwell', 'Maxwell Ghislaine'] },
  
  // ============ U.S. POLITICIANS ============
  { canonical_name: 'Donald Trump', title: 'U.S. President', role: 'Associate', primary_role: 'Politician', aliases: ['Trump Donald', 'D. Trump', 'President Trump'] },
  { canonical_name: 'Bill Clinton', title: 'Former U.S. President', role: 'Associate', primary_role: 'Politician', aliases: ['Clinton Bill', 'William Clinton', 'President Clinton'] },
  { canonical_name: 'Hillary Clinton', title: 'Former U.S. Secretary of State', role: 'Political Figure', primary_role: 'Politician', aliases: ['Clinton Hillary', 'H. Clinton'] },
  { canonical_name: 'Al Gore', title: 'Former U.S. Vice President', role: 'Political Figure', primary_role: 'Politician' },
  { canonical_name: 'Bill Richardson', title: 'Former Governor of New Mexico', role: 'Associate', primary_role: 'Politician' },
  { canonical_name: 'Larry Summers', title: 'Former U.S. Treasury Secretary', role: 'Associate', primary_role: 'Economist' },
  { canonical_name: 'Robert F. Kennedy Jr.', title: 'Environmental Lawyer', role: 'Political Figure', primary_role: 'Politician', aliases: ['RFK Jr.', 'Robert Kennedy Jr.'] },
  
  // ============ FOREIGN LEADERS ============
  { canonical_name: 'Prince Andrew', title: 'Duke of York', role: 'Royal', primary_role: 'Royalty', aliases: ['Andrew Prince', 'Duke of York'] },
  { canonical_name: 'Sarah Ferguson', title: 'Duchess of York', role: 'Royal', primary_role: 'Royalty' },
  { canonical_name: 'Ehud Barak', title: 'Former Prime Minister of Israel', role: 'Foreign Leader', primary_role: 'Politician' },
  
  // ============ BUSINESS LEADERS ============
  { canonical_name: 'Les Wexner', title: 'L Brands Founder', role: 'Business Partner', primary_role: 'Businessman', aliases: ['Leslie Wexner', 'Wexner Les'] },
  { canonical_name: 'Abigail Wexner', title: 'Philanthropist', role: 'Associate', primary_role: 'Philanthropist' },
  { canonical_name: 'Glenn Dubin', title: 'Hedge Fund Manager', role: 'Associate', primary_role: 'Financier' },
  { canonical_name: 'Eva Andersson-Dubin', title: 'Physician', role: 'Associate', primary_role: 'Doctor' },
  { canonical_name: 'Tom Pritzker', title: 'Executive Chairman, Hyatt Hotels', role: 'Associate', primary_role: 'Businessman' },
  { canonical_name: 'Elon Musk', title: 'Technology Executive (Tesla, SpaceX)', role: 'Associate', primary_role: 'Businessman' },
  { canonical_name: 'Peter Thiel', title: 'Technology Investor', role: 'Associate', primary_role: 'Businessman' },
  { canonical_name: 'Frederic Fekkai', title: 'Hairstylist / Entrepreneur', role: 'Associate', primary_role: 'Businessman' },
  
  // ============ LAWYERS & LEGAL ============
  { canonical_name: 'Alan Dershowitz', title: 'Lawyer / Legal Scholar', role: 'Legal Counsel', primary_role: 'Lawyer' },
  { canonical_name: 'Kathryn Ruemmler', title: 'Lawyer / Former White House Counsel', role: 'Legal Counsel', primary_role: 'Lawyer', aliases: ['Kathy Ruemmler'] },
  { canonical_name: 'Louis Freeh', title: 'Former FBI Director', role: 'Legal Counsel', primary_role: 'Law Enforcement' },
  { canonical_name: 'Stanley Pottinger', title: 'Lawyer / Former Nixon Official', role: 'Legal Counsel', primary_role: 'Lawyer' },
  { canonical_name: 'Eric Gany', title: 'Epstein Attorney', role: 'Legal', primary_role: 'Lawyer' },
  
  // ============ CELEBRITIES - ACTORS ============
  { canonical_name: 'Leonardo DiCaprio', title: 'Actor', role: 'Celebrity Associate', primary_role: 'Actor' },
  { canonical_name: 'Kevin Spacey', title: 'Actor', role: 'Celebrity Associate', primary_role: 'Actor' },
  { canonical_name: 'Cate Blanchett', title: 'Actor', role: 'Celebrity Associate', primary_role: 'Actor' },
  { canonical_name: 'Bruce Willis', title: 'Actor', role: 'Celebrity Associate', primary_role: 'Actor' },
  { canonical_name: 'Cameron Diaz', title: 'Actor', role: 'Celebrity Associate', primary_role: 'Actor' },
  { canonical_name: 'Chris Tucker', title: 'Comedian / Actor', role: 'Celebrity Associate', primary_role: 'Actor' },
  { canonical_name: 'Marla Maples', title: 'Actor / Trump Family', role: 'Family Member', primary_role: 'Actress' },
  
  // ============ CELEBRITIES - MUSICIANS ============
  { canonical_name: 'Michael Jackson', title: 'Musician', role: 'Celebrity Associate', primary_role: 'Musician' },
  { canonical_name: 'Mick Jagger', title: 'Musician (The Rolling Stones)', role: 'Celebrity Associate', primary_role: 'Musician' },
  { canonical_name: 'Courtney Love', title: 'Musician', role: 'Celebrity Associate', primary_role: 'Musician' },
  
  // ============ CELEBRITIES - MODELS ============
  { canonical_name: 'Naomi Campbell', title: 'Model', role: 'Celebrity Associate', primary_role: 'Model' },
  
  // ============ CELEBRITIES - OTHER ============
  { canonical_name: 'David Copperfield', title: 'Magician / Entertainer', role: 'Celebrity Associate', primary_role: 'Entertainer' },
  { canonical_name: 'George Lucas', title: 'Film Director / Producer', role: 'Celebrity Associate', primary_role: 'Director' },
  
  // ============ ACADEMICS / SCIENTISTS ============
  { canonical_name: 'Stephen Hawking', title: 'Theoretical Physicist', role: 'Academic', primary_role: 'Scientist' },
  { canonical_name: 'Marvin Minsky', title: 'MIT Professor / AI Researcher', role: 'Academic', primary_role: 'Scientist' },
  { canonical_name: 'Noam Chomsky', title: 'Linguist / Political Theorist', role: 'Academic', primary_role: 'Academic' },
  
  // ============ JOURNALISTS / MEDIA ============
  { canonical_name: 'Michael Wolff', title: 'Journalist / Author', role: 'Media', primary_role: 'Journalist' },
  { canonical_name: 'Sharon Churcher', title: 'Journalist (UK)', role: 'Media', primary_role: 'Journalist' },
  { canonical_name: 'Vicky Ward', title: 'Journalist', role: 'Media', primary_role: 'Journalist' },
  { canonical_name: 'Wendy Leigh', title: 'Journalist / Author', role: 'Media', primary_role: 'Journalist' },
  { canonical_name: 'Forest Sawyer', title: 'Journalist', role: 'Media', primary_role: 'Journalist' },
  { canonical_name: 'Peggy Siegal', title: 'Publicist', role: 'Associate', primary_role: 'PR Professional' },
  
  // ============ VICTIMS / SURVIVORS ============
  { canonical_name: 'Virginia Giuffre', title: 'Survivor / Plaintiff', role: 'Victim', primary_role: 'Victim', aliases: ['Virginia Roberts', 'Virginia Roberts Giuffre'] },
  { canonical_name: 'Annie Farmer', title: 'Survivor', role: 'Victim', primary_role: 'Victim' },
  { canonical_name: 'Maria Farmer', title: 'Survivor / Whistleblower', role: 'Victim', primary_role: 'Victim' },
  { canonical_name: 'Anouska De Georgiou', title: 'Survivor', role: 'Victim', primary_role: 'Victim' },
  { canonical_name: 'Johanna Sjoberg', title: 'Victim / Key Witness', role: 'Victim', primary_role: 'Victim' },
  { canonical_name: 'Courtney Wild', title: 'Survivor', role: 'Victim', primary_role: 'Victim' },
  { canonical_name: 'Nadia Marcinkova', title: 'Epstein Associate / Victim', role: 'Employee', primary_role: 'Staff' },
  
  // ============ EPSTEIN STAFF - PILOTS ============
  { canonical_name: 'John Connolly', title: 'Epstein Pilot', role: 'Employee', primary_role: 'Pilot' },
  { canonical_name: 'Dave Rodgers', title: 'Epstein Pilot', role: 'Employee', primary_role: 'Pilot' },
  { canonical_name: 'Janusz Banasiak', title: 'Epstein Pilot', role: 'Employee', primary_role: 'Pilot' },
  { canonical_name: 'Philip Guderyon', title: 'Epstein Pilot', role: 'Employee', primary_role: 'Pilot' },
  
  // ============ EPSTEIN STAFF - HOUSEHOLD ============
  { canonical_name: 'Juan Alessi', title: 'Epstein Property Manager', role: 'Employee', primary_role: 'Staff' },
  { canonical_name: 'Maria Alessi', title: 'Epstein Household Staff', role: 'Employee', primary_role: 'Staff' },
  { canonical_name: 'Alfredo Rodriguez', title: 'Epstein Property Manager', role: 'Employee', primary_role: 'Staff' },
  { canonical_name: 'Sarah Kellen', title: 'Epstein Assistant', role: 'Employee', primary_role: 'Staff', aliases: ['Sarah Kellen Vickers'] },
  { canonical_name: 'Adriana Ross', title: 'Epstein Contact', role: 'Employee', primary_role: 'Staff' },
  { canonical_name: 'Leslie Groff', title: 'Epstein Household Employee', role: 'Employee', primary_role: 'Staff', aliases: ['Lesley Groff'] },
  { canonical_name: 'Rebecca Boylan', title: 'Epstein Household Employee', role: 'Employee', primary_role: 'Staff' },
  { canonical_name: 'Crystal Figueroa', title: 'Epstein Household Employee', role: 'Employee', primary_role: 'Staff' },
  { canonical_name: 'Anthony Figueroa', title: 'Epstein Household Employee', role: 'Employee', primary_role: 'Staff' },
  { canonical_name: 'Shannon Harrison', title: 'Epstein Household Staff', role: 'Employee', primary_role: 'Staff' },
  { canonical_name: 'Shelly Harrison', title: 'Epstein Household Staff', role: 'Employee', primary_role: 'Staff' },
  { canonical_name: 'Cresencia Valdez', title: 'Epstein Household Staff', role: 'Employee', primary_role: 'Staff', aliases: ['Cresenda Valdes'] },
  { canonical_name: 'Maritza Vasquez', title: 'Epstein Household Staff', role: 'Employee', primary_role: 'Staff', aliases: ['Maritza Vazquez'] },
  
  // ============ EPSTEIN ASSOCIATES ============
  { canonical_name: 'Jean-Luc Brunel', title: 'Model Scout / Epstein Associate', role: 'Associate', primary_role: 'Associate', aliases: ['Jean Luc Brunel'] },
  { canonical_name: 'Doug Band', title: 'Clinton Foundation Executive', role: 'Political Advisor', primary_role: 'Political Advisor' },
  { canonical_name: 'James Michael Austrich', title: 'Epstein Associate', role: 'Associate', primary_role: 'Associate' },
  { canonical_name: 'Ron Eppinger', title: 'Epstein Associate', role: 'Associate', primary_role: 'Associate' },
  { canonical_name: 'Ross Gow', title: 'Epstein Associate', role: 'Associate', primary_role: 'Associate' },
  { canonical_name: 'Fred Graff', title: 'Epstein Associate', role: 'Associate', primary_role: 'Associate' },
  { canonical_name: 'Brett Jaffe', title: 'Epstein Associate', role: 'Associate', primary_role: 'Associate' },
  { canonical_name: 'Carol Kess', title: 'Epstein Associate', role: 'Associate', primary_role: 'Associate' },
  { canonical_name: 'Stephen Kaufmann', title: 'Epstein Associate', role: 'Associate', primary_role: 'Associate' },
  { canonical_name: 'Bob Meister', title: 'Epstein Associate', role: 'Associate', primary_role: 'Associate' },
  { canonical_name: 'Kevin Thompson', title: 'Epstein Associate', role: 'Associate', primary_role: 'Associate' },
  
  // ============ LAW ENFORCEMENT / INVESTIGATORS ============
  { canonical_name: 'Detective Joe Recarey', title: 'Palm Beach Police Detective', role: 'Investigator', primary_role: 'Law Enforcement' },
  { canonical_name: 'Chief Michael Reiter', title: 'Palm Beach Police Chief', role: 'Investigator', primary_role: 'Law Enforcement' },
  
  // ============ DOCTORS / MEDICAL ============
  { canonical_name: 'Dr Chris Donahue', title: 'Physician', role: 'Medical', primary_role: 'Doctor' },
  { canonical_name: 'Dr Karen Kutikoff', title: 'Psychiatrist', role: 'Medical', primary_role: 'Doctor' },
  { canonical_name: 'Dr Carol Hayek', title: 'Physician', role: 'Medical', primary_role: 'Doctor' },
  { canonical_name: 'Dr John Harris', title: 'Physician', role: 'Medical', primary_role: 'Doctor' },
  { canonical_name: 'Dr Steven Olson', title: 'Physician', role: 'Medical', primary_role: 'Doctor' },
  { canonical_name: 'Dr Darshanee Majaliyana', title: 'Physician', role: 'Medical', primary_role: 'Doctor' },
  { canonical_name: 'Dr Mona Devansean', title: 'Physician', role: 'Medical', primary_role: 'Doctor' },
  { canonical_name: 'Dr Scott Robert Geiger', title: 'Physician', role: 'Medical', primary_role: 'Doctor' },
  { canonical_name: 'Dr Michele Streeter', title: 'Physician', role: 'Medical', primary_role: 'Doctor' },
  
  // ============ ARCHITECTS ============
  { canonical_name: 'Ed Tuttle', title: 'Architect (Epstein Residences)', role: 'Professional', primary_role: 'Architect' },
  { canonical_name: 'Mark Zeff', title: 'Architect', role: 'Professional', primary_role: 'Architect' },
  { canonical_name: 'Ricardo Legoretta', title: 'Architect', role: 'Professional', primary_role: 'Architect' },
  
  // ============ FAMILY MEMBERS ============
  { canonical_name: 'Mark Epstein', title: 'Jeffrey Epstein\'s Brother', role: 'Family', primary_role: 'Family' },
  { canonical_name: 'Robert Giuffre', title: 'Virginia Giuffre\'s Father', role: 'Family', primary_role: 'Family' },
  { canonical_name: 'Tiffany Trump', title: 'Trump Family Member', role: 'Family Member', primary_role: 'Public Figure' },
  { canonical_name: 'Ivanka Trump', title: 'Businesswoman / Trump Family', role: 'Family Member', primary_role: 'Businesswoman' },
  { canonical_name: 'Melania Trump', title: 'U.S. First Lady', role: 'Family Member', primary_role: 'Public Figure' },
  
  // ============ ADVOCATES ============
  { canonical_name: 'Meg Garvin', title: 'Victims Rights Advocate (RAINN)', role: 'Advocate', primary_role: 'Advocate' },
];

let stats = {
  updated: 0,
  aliasesMerged: 0,
  notFound: 0,
};

function normalizeEntities(db: Database.Database): void {
  console.log('\n🏷️  Comprehensive Entity Normalization\n');
  console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN' : '✏️  LIVE MODE'}\n`);
  
  const updateStmt = db.prepare(`
    UPDATE entities 
    SET title = ?, role = ?, primary_role = ?
    WHERE full_name = ?
  `);
  
  const findEntity = db.prepare(`SELECT id, full_name, mentions FROM entities WHERE full_name = ?`);
  
  // Prepare statements for alias merging
  const updateMentions = db.prepare(`UPDATE entity_mentions SET entity_id = ? WHERE entity_id = ?`);
  const updateEntityMentionCount = db.prepare(`UPDATE entities SET mentions = mentions + ? WHERE id = ?`);
  const deleteEntity = db.prepare(`DELETE FROM entities WHERE id = ?`);
  
  for (const mapping of ENTITY_MAPPINGS) {
    // Update the canonical entity
    const entity = findEntity.get(mapping.canonical_name) as any;
    
    if (entity) {
      console.log(`   ✓ ${mapping.canonical_name}: ${mapping.title} | ${mapping.role} | ${mapping.primary_role}`);
      
      if (!DRY_RUN) {
        updateStmt.run(mapping.title, mapping.role, mapping.primary_role, mapping.canonical_name);
      }
      stats.updated++;
      
      // Merge aliases into canonical
      if (mapping.aliases) {
        for (const alias of mapping.aliases) {
          const aliasEntity = findEntity.get(alias) as any;
          if (aliasEntity && aliasEntity.id !== entity.id) {
            console.log(`       ↳ Merging alias: "${alias}" (${aliasEntity.mentions} mentions) → "${mapping.canonical_name}"`);
            
            if (!DRY_RUN) {
              // Transfer mentions
              updateMentions.run(entity.id, aliasEntity.id);
              // Update mention count
              updateEntityMentionCount.run(aliasEntity.mentions, entity.id);
              // Delete alias entity (with safe cleanup)
              try { db.prepare(`DELETE FROM entity_evidence_types WHERE entity_id = ?`).run(aliasEntity.id); } catch (e) {}
              try { db.prepare(`DELETE FROM entity_relationships WHERE source_id = ? OR target_id = ?`).run(aliasEntity.id, aliasEntity.id); } catch (e) {}
              deleteEntity.run(aliasEntity.id);
            }
            stats.aliasesMerged++;
          }
        }
      }
    } else {
      console.log(`   ⚠️ Not found: ${mapping.canonical_name}`);
      stats.notFound++;
    }
  }
}

function generateReport(db: Database.Database): void {
  console.log('\n' + '═'.repeat(50));
  console.log(`\n📋 Normalization Summary${DRY_RUN ? ' (DRY RUN)' : ''}`);
  console.log(`   Entities updated:   ${stats.updated}`);
  console.log(`   Aliases merged:     ${stats.aliasesMerged}`);
  console.log(`   Entities not found: ${stats.notFound}`);
  
  // Show role distribution after
  console.log('\n📊 Primary Role Distribution (Top 20):');
  const roles = db.prepare(`
    SELECT primary_role, COUNT(*) as count 
    FROM entities 
    WHERE primary_role IS NOT NULL AND primary_role != '' AND primary_role != 'Unknown'
    GROUP BY primary_role 
    ORDER BY count DESC 
    LIMIT 20
  `).all() as { primary_role: string; count: number }[];
  
  roles.forEach(r => {
    console.log(`   ${r.primary_role}: ${r.count}`);
  });
  
  // Show sample enriched entities
  console.log('\n👥 Sample Enriched Entities:');
  const samples = db.prepare(`
    SELECT full_name, title, primary_role 
    FROM entities 
    WHERE title IS NOT NULL AND title != ''
    ORDER BY mentions DESC 
    LIMIT 15
  `).all() as { full_name: string; title: string; primary_role: string }[];
  
  samples.forEach(s => {
    console.log(`   ${s.full_name} → ${s.title} (${s.primary_role})`);
  });
  
  console.log('\n' + '═'.repeat(50));
}

async function main() {
  console.log('\n🧹 Comprehensive Entity Normalization Script\n');
  console.log(`Database: ${DB_PATH}\n`);
  console.log(`Total mappings: ${ENTITY_MAPPINGS.length} entities with ${ENTITY_MAPPINGS.reduce((sum, m) => sum + (m.aliases?.length || 0), 0)} aliases\n`);
  
  const db = new Database(DB_PATH);
  
  try {
    // Disable foreign key checks during normalization
    db.pragma('foreign_keys = OFF');
    db.exec('BEGIN TRANSACTION');
    
    normalizeEntities(db);
    
    if (!DRY_RUN) {
      db.exec('COMMIT');
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
