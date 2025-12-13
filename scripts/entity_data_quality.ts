#!/usr/bin/env tsx
/**
 * Entity Data Quality Script
 * 
 * Purpose: Consolidate misspelled entities, delete junk entries,
 * merge fragmented names, and assign meaningful roles.
 * 
 * Phases:
 * 1. Location Consolidation - Fix misspelled locations (Palm Bch → Palm Beach)
 * 2. Junk Entity Deletion - Remove non-entity phrases
 * 3. Fragmented Name Consolidation - Merge partial names
 * 4. Role Assignment - Assign meaningful roles to generic "Person" entities
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../epstein-archive-production.db');
const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

// ============================================
// PHASE 1: Location Consolidation Mappings
// ============================================
const LOCATION_CONSOLIDATIONS: Record<string, { canonical: string; entity_type: string; primary_role: string }> = {
  // Palm Beach variations
  'Palm Bch': { canonical: 'Palm Beach', entity_type: 'Location', primary_role: 'City' },
  'Palm Bead Post': { canonical: 'Palm Beach Post', entity_type: 'Organization', primary_role: 'Media' },
  'Palm Rwrh Post': { canonical: 'Palm Beach Post', entity_type: 'Organization', primary_role: 'Media' },
  'Palm Rearh County': { canonical: 'Palm Beach County', entity_type: 'Location', primary_role: 'County' },
  'Palm Beadier': { canonical: 'Palm Beach', entity_type: 'Location', primary_role: 'City' },
  'Palm Bch Atlantic': { canonical: 'Palm Beach Atlantic', entity_type: 'Organization', primary_role: 'University' },
  'Palm Bead': { canonical: 'Palm Beach', entity_type: 'Location', primary_role: 'City' },
  'Jailed Palm Beecher': { canonical: 'Palm Beach', entity_type: 'Location', primary_role: 'City' },
  
  // New York variations
  'Nrw York': { canonical: 'New York', entity_type: 'Location', primary_role: 'City' },
  'Nev York': { canonical: 'New York', entity_type: 'Location', primary_role: 'City' },
  'NewYork': { canonical: 'New York', entity_type: 'Location', primary_role: 'City' },
  
  // Virgin Islands variations
  'Virgin Is': { canonical: 'Virgin Islands', entity_type: 'Location', primary_role: 'Territory' },
  'U S Virgin Islands': { canonical: 'U.S. Virgin Islands', entity_type: 'Location', primary_role: 'Territory' },
  'Us Virgin Islands': { canonical: 'U.S. Virgin Islands', entity_type: 'Location', primary_role: 'Territory' },
};

// ============================================
// PHASE 2: Junk Entities to Delete
// ============================================
const JUNK_ENTITIES: string[] = [
  // High-mention junk phrases
  'Use Over', 'An Ex', 'Used By', 'Right To Be', 'Never Be', 'Case No',
  'Closer To', 'Better Than', 'Five Years', 'Ten Years', 'Ten Years Ago',
  'Fifteen Years After', 'Injunction Year', 'Forwarded Message',
  'General Intelligence', 'Artificial Intelligence', 'Al Research',
  'Foreign Policy', 'Sexual Abuse', 'Sexual Assault', 'Health Care',
  'Personal Jurisdiction', 'Daily News', 'Turnaround Expert',
  'Turnaround Expert Consider', 'With Jeffrey', 'Earn Your',
  'Start Time', 'End Time', 'Is Read', 'Navigate New Workplace',
  'Control Measure Framework', 'Regional Security Framework',
  'Testing Framework', 'European Yield Screen', 'Turn Your Brain',
  
  // Email/document artifacts
  'Notify Us', 'All Attachments', 'By Email', 'By Mail', 'By Fax',
  
  // Fragmentary text
  'ARTICLES The REMAINING',
];

// Patterns for junk entities (regex-based)
const JUNK_PATTERNS: RegExp[] = [
  /^On (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i,
  /^Dear (Mr|Mrs|Ms|Dr|Professor)/i,
  /^Re:/i,
  /^Fwd:/i,
  /^Subject:/i,
  /^\d{1,2}\/\d{1,2}\/\d{2,4}/,  // Date patterns
  /^(Very|Much|Such|Some|Any|More|Most|Other|Than|Then|Now|Here|There|Yes|No)\s/i,
];

// ============================================
// PHASE 3: Fragmented Name Consolidations
// ============================================
const NAME_CONSOLIDATIONS: Record<string, string> = {
  // Ghislaine Maxwell - nicknames and fragments
  'Ghislaine Max': 'Ghislaine Maxwell',
  'Dear Ghislaine': 'Ghislaine Maxwell',
  'Air Ghislaine': 'Ghislaine Maxwell',
  'Jeffrey Ghislaine': 'Ghislaine Maxwell',
  'Whenever Ghislaine': 'Ghislaine Maxwell',
  'gmax': 'Ghislaine Maxwell',
  'GMax': 'Ghislaine Maxwell',
  'G Max': 'Ghislaine Maxwell',
  'GM': 'Ghislaine Maxwell',
  
  // Jeffrey Epstein - fragments
  'With Jeffrey': 'Jeffrey Epstein',
  'Dear Jeffrey': 'Jeffrey Epstein',
  
  // Donald Trump - nicknames and variations
  'Donald': 'Donald Trump',
  'Donnie': 'Donald Trump',
  'DJT': 'Donald Trump',
  'DT': 'Donald Trump',
  'Don': 'Donald Trump',
  'The President': 'Donald Trump',
  'Pres Trump': 'Donald Trump',
  'President Trump': 'Donald Trump',
  'With Trump': 'Donald Trump',
  'Elect Trump': 'Donald Trump',
  'Defendant Trump': 'Donald Trump',
  
  // Trump Organization - consolidate properties and businesses
  'Trump Revocab': 'Trump Organization',
  'Trump Revocable Trust': 'Trump Organization',
  'Trump Organiza': 'Trump Organization',
  'Trump National': 'Trump Organization',
  'Trump Tower': 'Trump Organization',
  'Trump National Golf': 'Trump Organization',
  'Trump Properties': 'Trump Organization',
  'Trump International Golf': 'Trump Organization',
  'Trump Chicago Retail': 'Trump Organization',
  'Trump Marks Puerto': 'Trump Organization',
  'Trump National Doral': 'Trump Organization',
  'Trump Drinks Israel': 'Trump Organization',
  'Trump Home Marks': 'Trump Organization',
  'Trump Marks Fine': 'Trump Organization',
  'Trump Development Services': 'Trump Organization',
  'Trump Marks Menswear': 'Trump Organization',
  'Trump Marks Panama': 'Trump Organization',
  'Trump Model': 'Trump Organization',
  'Trump Trade': 'Trump Organization',
  'Trump Golf Coco': 'Trump Organization',
  'Trump Ice': 'Trump Organization',
  'Trump Marks Jersey': 'Trump Organization',
  'Trump Chicago Hotel': 'Trump Organization',
  'Trump Canouan Estate': 'Trump Organization',
  'Trump Marks Ft': 'Trump Organization',
  'Trump Marks Philadelphia': 'Trump Organization',
  'Trump Korea': 'Trump Organization',
  'Trump Marks Istanbul': 'Trump Organization',
  'Trump Endeavor': 'Trump Organization',
  'Trump Enterprises': 'Trump Organization',
  'Trump Model Management': 'Trump Organization',
  'Trump Golf Links': 'Trump Organization',
  'Trump Soho': 'Trump Organization',
  'Trump Carousel Member': 'Trump Organization',
  'Trump Chicago Member': 'Trump Organization',
  'Trump Classic Cars': 'Trump Organization',
  'Trump Commercial Chicago': 'Trump Organization',
  'Trump Delmonico': 'Trump Organization',
  'Trump Education': 'Trump Organization',
  'Trump Marks Mortgage': 'Trump Organization',
  'Trump University': 'Trump Organization',
  'Trump Manag': 'Trump Organization',
  'Trump Corporation': 'Trump Organization',
  'Trump International Development': 'Trump Organization',
  'Trump New World': 'Trump Organization',
  'Trump Castle': 'Trump Organization',
  'Trump Shuttle': 'Trump Organization',
  'Trump Marina': 'Trump Organization',
  'Trump Plaza Casino': 'Trump Organization',
  'Trump Hotels': 'Trump Organization',
  'Trump Foundation Inc': 'Trump Organization',
  'Trump Village Construction': 'Trump Organization',
  'Trump Marina Casino': 'Trump Organization',
  'Trump Tower Triplex': 'Trump Organization',
  'Trump Empire State': 'Trump Organization',
  'Trump Castle Casino': 'Trump Organization',
  'Trump Tower Moscow': 'Trump Organization',
  
  // Bill Clinton nickname
  'Bubba': 'Bubba',  // Keep as separate - often used for Clinton but could be others
  
  // Alan Dershowitz
  'Alan Der': 'Alan Dershowitz',
  
  // Other fragments
  'Southern Dis': 'Southern District of New York',
  'Bin Laden': 'Osama bin Laden',
  
  // Organizations (type corrections)
  'Goldman Sachs': 'Goldman Sachs',
  'Morgan Stanley': 'Morgan Stanley',
  'Cable News Network': 'CNN',
  'History News Network': 'History News Network',
};

// Entity type corrections for known entities
const ENTITY_TYPE_CORRECTIONS: Record<string, { entity_type: string; primary_role: string }> = {
  'Goldman Sachs': { entity_type: 'Organization', primary_role: 'Bank' },
  'Morgan Stanley': { entity_type: 'Organization', primary_role: 'Bank' },
  'CNN': { entity_type: 'Organization', primary_role: 'Media' },
  'History News Network': { entity_type: 'Organization', primary_role: 'Media' },
  'Palm Springs': { entity_type: 'Location', primary_role: 'City' },
  'Palm Coast': { entity_type: 'Location', primary_role: 'City' },
  'Royal Palm Drive': { entity_type: 'Location', primary_role: 'Street' },
  'Beacon Press': { entity_type: 'Organization', primary_role: 'Publisher' },
  'Washington Free Beacon': { entity_type: 'Organization', primary_role: 'Media' },
  'Akron Beacon Journal': { entity_type: 'Organization', primary_role: 'Media' },
  'American Yacht Harbor': { entity_type: 'Location', primary_role: 'Marina' },
  'Bubba': { entity_type: 'Person', primary_role: 'Unknown private individual' },
};

// ============================================
// PHASE 4: Role Assignment Patterns
// ============================================
const ROLE_PATTERNS: { pattern: RegExp; primary_role: string; entity_type?: string }[] = [
  // Titles indicating profession
  { pattern: /^Dr\.?\s/i, primary_role: 'Medical Professional' },
  { pattern: /^Prof\.?\s|Professor\s/i, primary_role: 'Academic' },
  { pattern: /^Sen\.?\s|Senator\s/i, primary_role: 'Politician' },
  { pattern: /^Rep\.?\s|Representative\s/i, primary_role: 'Politician' },
  { pattern: /^Gov\.?\s|Governor\s/i, primary_role: 'Politician' },
  { pattern: /^Judge\s/i, primary_role: 'Judge' },
  { pattern: /^Det\.?\s|Detective\s/i, primary_role: 'Law Enforcement' },
  { pattern: /^Chief\s/i, primary_role: 'Law Enforcement' },
  { pattern: /^Officer\s/i, primary_role: 'Law Enforcement' },
  { pattern: /^Agent\s/i, primary_role: 'Law Enforcement' },
  { pattern: /^Ambassador\s/i, primary_role: 'Diplomat' },
  { pattern: /^Prince\s|Princess\s|Duke\s|Duchess\s/i, primary_role: 'Royalty' },
  
  // Organization patterns
  { pattern: /\s(Inc\.?|LLC|Corp\.?|Corporation)$/i, primary_role: 'Corporation', entity_type: 'Organization' },
  { pattern: /\s(Foundation|Trust)$/i, primary_role: 'Foundation', entity_type: 'Organization' },
  { pattern: /\sUniversity$/i, primary_role: 'University', entity_type: 'Organization' },
  { pattern: /\sCollege$/i, primary_role: 'College', entity_type: 'Organization' },
  { pattern: /\sSchool$/i, primary_role: 'School', entity_type: 'Organization' },
  { pattern: /\sHospital$/i, primary_role: 'Hospital', entity_type: 'Organization' },
  { pattern: /\sBank$/i, primary_role: 'Bank', entity_type: 'Organization' },
  { pattern: /\sHotel$/i, primary_role: 'Hotel', entity_type: 'Organization' },
  { pattern: /\sAirlines?$/i, primary_role: 'Airline', entity_type: 'Organization' },
  
  // Location patterns
  { pattern: /\sCounty$/i, primary_role: 'County', entity_type: 'Location' },
  { pattern: /\sCity$/i, primary_role: 'City', entity_type: 'Location' },
  { pattern: /\sState$/i, primary_role: 'State', entity_type: 'Location' },
  { pattern: /\sIsland$/i, primary_role: 'Island', entity_type: 'Location' },
  { pattern: /\sStreet$/i, primary_role: 'Street', entity_type: 'Location' },
  { pattern: /\sAvenue$/i, primary_role: 'Avenue', entity_type: 'Location' },
  { pattern: /\sBoulevard$/i, primary_role: 'Boulevard', entity_type: 'Location' },
  { pattern: /\sDrive$/i, primary_role: 'Street', entity_type: 'Location' },
];

// ============================================
// Statistics & Logging
// ============================================
interface AuditEntry {
  phase: string;
  action: string;
  entity: string;
  details: string;
}

const auditLog: AuditEntry[] = [];
let stats = {
  locationsConsolidated: 0,
  junkDeleted: 0,
  namesConsolidated: 0,
  typesFixed: 0,
  rolesAssigned: 0,
  mentionsTransferred: 0,
};

function log(message: string): void {
  if (VERBOSE) console.log(message);
}

function audit(phase: string, action: string, entity: string, details: string): void {
  auditLog.push({ phase, action, entity, details });
  log(`   [${phase}] ${action}: ${entity} - ${details}`);
}

// ============================================
// PHASE 1: Location Consolidation
// ============================================
function consolidateLocations(db: Database.Database): void {
  console.log('\n📍 Phase 1: Location Consolidation');
  
  for (const [variant, target] of Object.entries(LOCATION_CONSOLIDATIONS)) {
    const variantEntity = db.prepare(`
      SELECT id, full_name, mentions FROM entities WHERE full_name = ?
    `).get(variant) as { id: number; full_name: string; mentions: number } | undefined;
    
    if (!variantEntity) continue;
    
    const canonicalEntity = db.prepare(`
      SELECT id, full_name, mentions FROM entities WHERE full_name = ?
    `).get(target.canonical) as { id: number; full_name: string; mentions: number } | undefined;
    
    if (canonicalEntity) {
      // Merge into existing canonical entity
      const newMentions = (canonicalEntity.mentions || 0) + (variantEntity.mentions || 0);
      
      if (!DRY_RUN) {
        // Update entity_mentions to point to canonical
        db.prepare(`
          UPDATE entity_mentions SET entity_id = ? WHERE entity_id = ?
        `).run(canonicalEntity.id, variantEntity.id);
        
        // Update entity_relationships
        db.prepare(`
          UPDATE entity_relationships SET source_entity_id = ? WHERE source_entity_id = ?
        `).run(canonicalEntity.id, variantEntity.id);
        db.prepare(`
          UPDATE entity_relationships SET target_entity_id = ? WHERE target_entity_id = ?
        `).run(canonicalEntity.id, variantEntity.id);
        
        // Update canonical entity
        db.prepare(`
          UPDATE entities SET mentions = ?, entity_type = ?, primary_role = ? WHERE id = ?
        `).run(newMentions, target.entity_type, target.primary_role, canonicalEntity.id);
        
        // Delete variant
        db.prepare(`DELETE FROM entities WHERE id = ?`).run(variantEntity.id);
      }
      
      audit('Location', 'Merged', variant, `→ ${target.canonical} (+${variantEntity.mentions} mentions)`);
      stats.locationsConsolidated++;
      stats.mentionsTransferred += variantEntity.mentions || 0;
    } else {
      // Rename variant to canonical
      if (!DRY_RUN) {
        db.prepare(`
          UPDATE entities SET full_name = ?, entity_type = ?, primary_role = ? WHERE id = ?
        `).run(target.canonical, target.entity_type, target.primary_role, variantEntity.id);
      }
      
      audit('Location', 'Renamed', variant, `→ ${target.canonical}`);
      stats.locationsConsolidated++;
    }
  }
  
  console.log(`   ✓ Consolidated ${stats.locationsConsolidated} location variants`);
}

// ============================================
// PHASE 2: Junk Entity Deletion
// ============================================
function deleteJunkEntities(db: Database.Database): void {
  console.log('\n🗑️  Phase 2: Junk Entity Deletion');
  
  // Delete by exact name match
  for (const junkName of JUNK_ENTITIES) {
    const entity = db.prepare(`
      SELECT id, full_name, mentions FROM entities WHERE full_name = ?
    `).get(junkName) as { id: number; full_name: string; mentions: number } | undefined;
    
    if (entity) {
      if (!DRY_RUN) {
        db.prepare(`DELETE FROM entity_mentions WHERE entity_id = ?`).run(entity.id);
        db.prepare(`DELETE FROM entity_relationships WHERE source_entity_id = ? OR target_entity_id = ?`).run(entity.id, entity.id);
        db.prepare(`DELETE FROM entities WHERE id = ?`).run(entity.id);
      }
      
      audit('Junk', 'Deleted', junkName, `(${entity.mentions} mentions)`);
      stats.junkDeleted++;
    }
  }
  
  // Delete by pattern match (for high-mention junk)
  const allEntities = db.prepare(`
    SELECT id, full_name, mentions FROM entities 
    WHERE entity_type = 'Person' AND primary_role = 'Person' 
    ORDER BY mentions DESC LIMIT 1000
  `).all() as { id: number; full_name: string; mentions: number }[];
  
  for (const entity of allEntities) {
    const isJunk = JUNK_PATTERNS.some(pattern => pattern.test(entity.full_name));
    
    if (isJunk) {
      if (!DRY_RUN) {
        db.prepare(`DELETE FROM entity_mentions WHERE entity_id = ?`).run(entity.id);
        db.prepare(`DELETE FROM entity_relationships WHERE source_entity_id = ? OR target_entity_id = ?`).run(entity.id, entity.id);
        db.prepare(`DELETE FROM entities WHERE id = ?`).run(entity.id);
      }
      
      audit('Junk', 'Deleted (pattern)', entity.full_name, `(${entity.mentions} mentions)`);
      stats.junkDeleted++;
    }
  }
  
  console.log(`   ✓ Deleted ${stats.junkDeleted} junk entities`);
}

// ============================================
// PHASE 3: Name Consolidation
// ============================================
function consolidateNames(db: Database.Database): void {
  console.log('\n🔗 Phase 3: Fragmented Name Consolidation');
  
  for (const [fragment, canonical] of Object.entries(NAME_CONSOLIDATIONS)) {
    const fragmentEntity = db.prepare(`
      SELECT id, full_name, mentions FROM entities WHERE full_name = ?
    `).get(fragment) as { id: number; full_name: string; mentions: number } | undefined;
    
    if (!fragmentEntity) continue;
    
    const canonicalEntity = db.prepare(`
      SELECT id, full_name, mentions FROM entities WHERE full_name = ?
    `).get(canonical) as { id: number; full_name: string; mentions: number } | undefined;
    
    if (canonicalEntity && canonicalEntity.id !== fragmentEntity.id) {
      // Merge into canonical
      const newMentions = (canonicalEntity.mentions || 0) + (fragmentEntity.mentions || 0);
      
      if (!DRY_RUN) {
        // Update entity_mentions to point to canonical
        db.prepare(`UPDATE entity_mentions SET entity_id = ? WHERE entity_id = ?`).run(canonicalEntity.id, fragmentEntity.id);
        
        // Delete all relationships for the fragment entity (canonical already has its own)
        db.prepare(`DELETE FROM entity_relationships WHERE source_entity_id = ? OR target_entity_id = ?`).run(fragmentEntity.id, fragmentEntity.id);
        
        // Update mentions count and delete fragment entity
        db.prepare(`UPDATE entities SET mentions = ? WHERE id = ?`).run(newMentions, canonicalEntity.id);
        db.prepare(`DELETE FROM entities WHERE id = ?`).run(fragmentEntity.id);
      }
      
      audit('Name', 'Merged', fragment, `→ ${canonical} (+${fragmentEntity.mentions} mentions)`);
      stats.namesConsolidated++;
      stats.mentionsTransferred += fragmentEntity.mentions || 0;
    }
  }
  
  // Fix entity type corrections
  for (const [name, correction] of Object.entries(ENTITY_TYPE_CORRECTIONS)) {
    const entity = db.prepare(`
      SELECT id FROM entities WHERE full_name = ?
    `).get(name) as { id: number } | undefined;
    
    if (entity) {
      if (!DRY_RUN) {
        db.prepare(`
          UPDATE entities SET entity_type = ?, primary_role = ? WHERE id = ?
        `).run(correction.entity_type, correction.primary_role, entity.id);
      }
      
      audit('TypeFix', 'Updated', name, `→ ${correction.entity_type}/${correction.primary_role}`);
      stats.typesFixed++;
    }
  }
  
  console.log(`   ✓ Consolidated ${stats.namesConsolidated} fragmented names`);
  console.log(`   ✓ Fixed ${stats.typesFixed} entity types`);
}

// ============================================
// PHASE 4: Role Assignment
// ============================================
function assignRoles(db: Database.Database): void {
  console.log('\n🏷️  Phase 4: Role Assignment');
  
  // Get all Person/Person entities (generic)
  const genericEntities = db.prepare(`
    SELECT id, full_name FROM entities 
    WHERE entity_type = 'Person' AND primary_role = 'Person'
  `).all() as { id: number; full_name: string }[];
  
  console.log(`   Processing ${genericEntities.length} generic entities...`);
  
  for (const entity of genericEntities) {
    for (const rule of ROLE_PATTERNS) {
      if (rule.pattern.test(entity.full_name)) {
        if (!DRY_RUN) {
          if (rule.entity_type) {
            db.prepare(`
              UPDATE entities SET entity_type = ?, primary_role = ? WHERE id = ?
            `).run(rule.entity_type, rule.primary_role, entity.id);
          } else {
            db.prepare(`
              UPDATE entities SET primary_role = ? WHERE id = ?
            `).run(rule.primary_role, entity.id);
          }
        }
        
        if (VERBOSE) {
          audit('Role', 'Assigned', entity.full_name, `→ ${rule.entity_type || 'Person'}/${rule.primary_role}`);
        }
        stats.rolesAssigned++;
        break;  // Only apply first matching rule
      }
    }
  }
  
  console.log(`   ✓ Assigned roles to ${stats.rolesAssigned} entities`);
}

// ============================================
// Report Generation
// ============================================
function generateReport(db: Database.Database): void {
  console.log('\n' + '═'.repeat(60));
  console.log(`📊 Entity Data Quality Report${DRY_RUN ? ' (DRY RUN)' : ''}`);
  console.log('═'.repeat(60));
  
  console.log(`\n📈 Summary:`);
  console.log(`   Locations consolidated:   ${stats.locationsConsolidated}`);
  console.log(`   Junk entities deleted:    ${stats.junkDeleted}`);
  console.log(`   Names consolidated:       ${stats.namesConsolidated}`);
  console.log(`   Entity types fixed:       ${stats.typesFixed}`);
  console.log(`   Roles assigned:           ${stats.rolesAssigned}`);
  console.log(`   Total mentions transferred: ${stats.mentionsTransferred}`);
  
  // Show entity type distribution
  console.log(`\n📊 Entity Type Distribution:`);
  const typeDistribution = db.prepare(`
    SELECT entity_type, COUNT(*) as count 
    FROM entities 
    GROUP BY entity_type 
    ORDER BY count DESC
  `).all() as { entity_type: string; count: number }[];
  
  typeDistribution.forEach(t => {
    console.log(`   ${t.entity_type || 'NULL'}: ${t.count}`);
  });
  
  // Show top primary roles
  console.log(`\n🏷️  Top Primary Roles:`);
  const roleDistribution = db.prepare(`
    SELECT primary_role, COUNT(*) as count 
    FROM entities 
    GROUP BY primary_role 
    ORDER BY count DESC 
    LIMIT 15
  `).all() as { primary_role: string; count: number }[];
  
  roleDistribution.forEach(r => {
    console.log(`   ${r.primary_role || 'NULL'}: ${r.count}`);
  });
  
  // Show total entity count
  const totalCount = db.prepare(`SELECT COUNT(*) as count FROM entities`).get() as { count: number };
  console.log(`\n📦 Total entities: ${totalCount.count}`);
  
  // Show Palm Beach related entities
  console.log(`\n🌴 Palm Beach entities after cleanup:`);
  const palmBeachEntities = db.prepare(`
    SELECT full_name, entity_type, primary_role, mentions 
    FROM entities 
    WHERE full_name LIKE '%Palm%' 
    ORDER BY mentions DESC 
    LIMIT 10
  `).all() as { full_name: string; entity_type: string; primary_role: string; mentions: number }[];
  
  palmBeachEntities.forEach(e => {
    console.log(`   ${e.full_name} (${e.entity_type}/${e.primary_role}): ${e.mentions} mentions`);
  });
  
  console.log('\n' + '═'.repeat(60));
}

// ============================================
// Main
// ============================================
async function main() {
  console.log('\n🧹 Entity Data Quality Script');
  console.log(`Database: ${DB_PATH}`);
  console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN' : '✏️  LIVE MODE'}`);
  console.log(`Verbose: ${VERBOSE ? 'Yes' : 'No'}`);
  
  const db = new Database(DB_PATH);
  
  try {
    // Get initial counts
    const initialCount = db.prepare(`SELECT COUNT(*) as count FROM entities`).get() as { count: number };
    console.log(`\n📊 Initial entity count: ${initialCount.count}`);
    
    db.exec('BEGIN TRANSACTION');
    
    // Execute phases
    consolidateLocations(db);
    deleteJunkEntities(db);
    consolidateNames(db);
    assignRoles(db);
    
    if (!DRY_RUN) {
      db.exec('COMMIT');
      console.log('\n✅ Changes committed successfully');
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
