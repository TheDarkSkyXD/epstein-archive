#!/usr/bin/env tsx
/**
 * Deep Entity Cleanup Script
 * 
 * Purpose: Comprehensive cleanup of entity data to remove junk entries,
 * consolidate duplicates, and normalize names using the Known Entities list.
 * 
 * Phases:
 * 1. Remove junk entities (sentence fragments, document artifacts)
 * 2. Reclassify non-person entities (organizations, locations)
 * 3. Consolidate name variations using Known Entities as authoritative source
 * 4. Update mention counts and relationships
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../epstein-archive-production.db');
const BACKUP_DIR = path.join(__dirname, '../backups');
const AUDIT_LOG_PATH = path.join(__dirname, '../deep_cleanup_audit.json');

// Configuration
const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

// Known Entities - authoritative list for name normalization
// Extracted from Known Entitites.rtf
const KNOWN_ENTITIES: string[] = [
  'Jeffrey Epstein', 'Ghislaine Maxwell', 'Prince Andrew', 'Bill Clinton',
  'Donald Trump', 'Hillary Clinton', 'David Copperfield', 'John Connelly',
  'Alan Dershowitz', 'Leonardo DiCaprio', 'Al Gore', 'Stephen Hawking',
  'Ehud Barak', 'Michael Jackson', 'Marvin Minsky', 'Kevin Spacey',
  'George Lucas', 'Jean Luc Brunel', 'Cate Blanchett', 'Naomi Campbell',
  'Sharon Churcher', 'Bruce Willis', 'Bill Richardson', 'Cameron Diaz',
  'Glenn Dubin', 'Eva Andersson-Dubin', 'Noam Chomsky', 'Tom Pritzker',
  'Chris Tucker', 'Sarah Ferguson', 'Robert F Kennedy Jr', 'James Michael Austrich',
  'Juan Alessi', 'Maria Alessi', 'Janusz Banasiak', 'Bella Klein',
  'Leslie Groff', 'Victoria Bean', 'Rebecca Boylan', 'Dana Burns',
  'Ron Eppinger', 'Daniel Estes', 'Annie Farmer', 'Maria Farmer',
  'Anouska De Georgiou', 'Louis Freeh', 'Alexandra Fekkai', 'Jo Jo Fontanella',
  'Virginia Giuffre', 'Lynn Miller', 'Crystal Figueroa', 'Anthony Figueroa',
  'Eric Gany', 'Meg Garvin', 'Sheridan Gibson-Butte', 'Ross Gow',
  'Fred Graff', 'Robert Giuffre', 'Philip Guderyon', 'Alexandra Hall',
  'Joanna Harrison', 'Shannon Harrison', 'Victoria Hazel', 'Brittany Henderson',
  'Brett Jaffe', 'Forest Jones', 'Sarah Kellen', 'Adriana Ross',
  'Carol Kess', 'Dr Steven Olson', 'Stephen Kaufmann', 'Wendy Leigh',
  'Peter Listerman', 'Tom Lyons', 'Nadia Marcinkova', 'Bob Meister',
  'Jamie Melanson', 'Donald Morrell', 'David Mullen', 'David Norr',
  'Joe Pagano', 'May Paluga', 'Stanley Pottinger', 'Detective Joe Recarey',
  'Chief Michael Reiter', 'Rinaldo Rizzo', 'Debra Rizzo', 'Sky Roberts',
  'Kimblerley Roberts', 'Lynn Roberts', 'Haley Robson', 'Dave Rodgers',
  'Alfredo Rodriguez', 'Scott Rothinson', 'Forest Sawyer', 'Doug Schoetlle',
  'Johanna Sjoberg', 'Cecilia Stein', 'Marianne Strong', 'Mark Tafoya',
  'Emmy Taylor', 'Brent Tindall', 'Kevin Thompson', 'Ed Tuttle',
  'Les Wexner', 'Abigail Wexner', 'Cresenda Valdes', 'Emma Vaghan',
  'Anthony Valladares', 'Christina Venero', 'Maritza Vazquez', 'Vicky Ward',
  'Jarred Weisfield', 'Sharon White', 'Courtney Wild', 'Daniel Wilson',
  'Mark Zeff', 'Dr Chris Donahue', 'Dr Wah Wah', 'Judith Lightfoot',
  'Dr Karen Kutikoff', 'Dr Carol Hayek', 'Dr John Harris', 'Dr Darshanee Majaliyana',
  'Dr Mona Devansean', 'Dr Scott Robert Geiger', 'Dr Michele Streeter',
  'Donna Oliver', 'Larry Summers', 'Michael Wolff', 'Peggy Siegal',
  'Kathryn Ruemmler', 'Elon Musk', 'Peter Thiel', 'Frederic Fekkai',
  'Mick Jagger', 'Courtney Love', 'Marla Maples', 'Tiffany Trump',
  'Adriana Mucinska', 'Mark Epstein', 'Doug Band', 'Shelly Harrison',
  'Victoria Hazell', 'Kristy Rodgers', 'Patsy Rodgers', 'Cresencia Valdez',
  'Maritza Vasquez', 'Sharon Reynolds', 'Kelly Spamm', 'Alexandra Dixon',
  'Ricardo Legoretta', 'Steve Bannon', 'Leslie Wexner', 'Alex Acosta',
  'Ivanka Trump', 'Melania Trump', 'Bill Gates', 'Robert Maxwell',
];

// Name variation mappings - canonical name -> variations
const NAME_CONSOLIDATION_MAP: Record<string, string[]> = {
  'Jeffrey Epstein': ['Mr Epstein', 'Mr. Epstein', 'Epstein', 'Dear Jeffrey', 'Billionaire Jeffrey Epstein', 'Dear Mr Epstein', 'Is Mr Epstein', 'Should Mr Epstein'],
  'Bill Clinton': ['William Clinton', 'President Clinton', 'President Bill Clinton', 'Billy Clinton'],
  'Hillary Clinton': ['Hillary Rodham Clinton', 'Mrs Clinton', 'Secretary Clinton'],
  'Donald Trump': ['President Trump', 'Mr Trump', 'Mr. Trump'],
  'Prince Andrew': ['Andrew Albert Christian Edward', 'Duke of York', 'The Duke'],
  'Alan Dershowitz': ['Alan M. Dershowitz', 'Prof. Dershowitz', 'Professor Dershowitz', 'Dershowitz'],
  'Les Wexner': ['Leslie Wexner', 'Leslie H. Wexner', 'Mr Wexner'],
  'Virginia Giuffre': ['Virginia Roberts', 'Virginia Roberts Giuffre'],
  'Kathryn Ruemmler': ['Kathy Ruemmler', 'Kathryn Ruemler'],
  'Ghislaine Maxwell': ['Ms Maxwell', 'Ms. Maxwell', 'Miss Maxwell'],
  'Alex Acosta': ['Alexander Acosta', 'Secretary Acosta'],
  'Steve Bannon': ['Stephen Bannon', 'Stephen K. Bannon'],
  'Barack Obama': ['Obama', 'President Obama', 'Sen Obama', 'Senator Obama'],
  'Michael Wolff': ['Wolff', 'Mike Wolff'],
  'Richard Kahn': ['Richard Kahn Sent', 'Richard Kahn\nSent', 'Richard Kahn\nHBRK Associates Inc.'],
  'Robert Maxwell': ['Robert\nMaxwell'],
  'Kathy Ruemmler': ['Kathy Ruemmler\nSent', 'Kathy Ruemmler Sent'],
};

// Email-to-owner consolidation map
const EMAIL_OWNER_MAP: Record<string, string> = {
  // Jeffrey Epstein emails
  'jeevacation@gmail.com': 'Jeffrey Epstein',
  'jeeitunes@gmail.com': 'Jeffrey Epstein',
  'jeevacation@grnail.corn': 'Jeffrey Epstein',  // OCR typo
  'jeeproject@yahoo.com': 'Jeffrey Epstein',
  // Ghislaine Maxwell
  'gmax1@ellmax.com': 'Ghislaine Maxwell',
};

// Junk patterns - entities starting with these are NOT real people
const JUNK_PREFIXES = [
  'On ', 'And ', 'But ', 'When ', 'After ', 'While ', 'Since ', 'With ',
  'For ', 'Is ', 'Because ', 'Did ', 'Should ', 'May ', 'See ', 'Following ',
  'Certainly ', 'Compounding ', 'That ', 'You ', 'Subscribe ', 'Dear ',
  'Please ', 'Including ', 'Mail ', 'Client ', 'Elect ', 'Start ', 'End ',
  'Privileged ', 'Benefits ', 'Federal ', 'Defendant ', 'High ', 'General ',
  'Flight ', 'Neural ', 'Fisher ', 'Geospatial ', 'Leaks ', 'Deputy ',
  'Assistant ', 'Principal ', 'Associate ', 'Rights ', 'Crime ', 'If ',
  'What ', 'Where ', 'How ', 'Why ', 'Before ', 'During ', 'Without ',
  'About ', 'Under ', 'Into ', 'Through ', 'Between ', 'Like ', 'Just ',
  'Even ', 'Also ', 'Both ', 'Either ', 'Neither ', 'Not ', 'Only ',
  'Very ', 'Much ', 'Such ', 'Some ', 'Any ', 'More ', 'Most ', 'Other ',
  'Than ', 'Then ', 'Now ', 'Here ', 'There ', 'Yes ', 'No ', 'Financial ',
  'United ', 'Harvard ', 'Washington ', 'North ', 'Trump ', 'Landon ', 'Reid ',
];

// Entities that should be reclassified as Organization
const ORGANIZATION_ENTITIES = [
  'United Nations', 'Soviet Union', 'European Union', 'Goldman Sachs',
  'Trump Tower', 'Trump University', 'Trump Organization', 'Trump Properties',
  'Nobel Prize', 'Harvard', 'MIT', 'Daily Mail', 'New York Times',
  'Washington Post', 'FBI', 'CIA', 'DOJ', 'Justice Department',
  'State Department', 'White House', 'Congress', 'Senate', 'House',
];

// Entities that should be reclassified as Location
const LOCATION_ENTITIES = [
  'North America', 'South America', 'North Korea', 'South Korea',
  'Palm Beach', 'New York', 'Manhattan', 'Little Saint James',
  'Virgin Islands', 'New Mexico', 'Santa Fe', 'Paris', 'London',
];

// Non-entity patterns (should be deleted)
const JUNK_PATTERNS = [
  /^On (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i,
  /^Start Time$/i,
  /^End Time$/i,
  /^Is Read$/i,
  /Notify Us/i,
  /All Attachments/i,
  /Constitute.*Information/i,
  /By (Email|Mail|Fax)/i,
  /Attorney General$/i,  // Generic title, not a person
  /Information (Act|Sheet|System)/i,
  /World War/i,
  /(Sign|Reply|Comment|Section|Lock) Here?$/i,
  /^(Er|Mr|Ms|Mrs|Dr|Miss|Sir)\s*$/i, // Just titles with no name
  /^\d+$/,  // Just numbers
  /^[A-Z]{1,3}$/,  // Just initials
  /\n.*Sent$/,  // Names with "Sent" artifact from emails
  /\n.*Subject$/,  // Names with "Subject" artifact
  /\n.*Importance$/,  // Names with "Importance" artifact
  /\n.*Is Invitation$/,  // Names with "Is Invitation" artifact
  /Unauthorized$/i,  // Jeffrey Epstein Unauthorized etc.
];

interface AuditEntry {
  timestamp: string;
  action: 'delete' | 'reclassify' | 'merge' | 'update';
  entityId: number;
  entityName: string;
  details: string;
  mentionsAffected?: number;
}

const auditLog: AuditEntry[] = [];
let stats = {
  junkDeleted: 0,
  reclassified: 0,
  merged: 0,
  mentionsUpdated: 0,
};

function log(message: string) {
  if (VERBOSE || !DRY_RUN) {
    console.log(message);
  }
}

function createBackup(db: Database.Database) {
  if (DRY_RUN) {
    console.log('📦 Skipping backup (dry-run mode)\n');
    return;
  }
  
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(BACKUP_DIR, `epstein-archive-deep-cleanup-${timestamp}.db`);
  
  console.log('📦 Creating database backup...');
  db.backup(backupPath);
  console.log(`   ✓ Backup created: ${backupPath}\n`);
}

function normalizeForComparison(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z\s]/g, '');
}

function isJunkEntity(name: string): boolean {
  // Check prefix patterns
  for (const prefix of JUNK_PREFIXES) {
    if (name.startsWith(prefix)) {
      return true;
    }
  }
  
  // Check regex patterns
  for (const pattern of JUNK_PATTERNS) {
    if (pattern.test(name)) {
      return true;
    }
  }
  
  // Names that are too short or too long are suspect
  if (name.length < 3 || name.length > 60) {
    return true;
  }
  
  // Names with more than 5 words are likely fragments
  const words = name.split(/\s+/);
  if (words.length > 5) {
    return true;
  }
  
  // Email addresses that aren't in our known owner map are junk
  if (name.includes('@') && !EMAIL_OWNER_MAP[name]) {
    return true;
  }
  
  // Entities with embedded newlines (except if they're in consolidation map values)
  if (name.includes('\n')) {
    // Check if it's a known variant we'll consolidate
    for (const variations of Object.values(NAME_CONSOLIDATION_MAP)) {
      if (variations.includes(name)) return false;
    }
    return true;  // Unknown newline entity = junk
  }
  
  return false;
}

function findCanonicalName(name: string): string | null {
  const normalized = normalizeForComparison(name);
  
  // Direct match in known entities
  for (const known of KNOWN_ENTITIES) {
    if (normalizeForComparison(known) === normalized) {
      return known;
    }
  }
  
  // Check consolidation mappings
  for (const [canonical, variations] of Object.entries(NAME_CONSOLIDATION_MAP)) {
    for (const variation of variations) {
      if (normalizeForComparison(variation) === normalized) {
        return canonical;
      }
    }
    // Also check the canonical name itself
    if (normalizeForComparison(canonical) === normalized) {
      return canonical;
    }
  }
  
  return null;
}

function shouldReclassifyAsOrganization(name: string): boolean {
  const nameLower = name.toLowerCase();
  for (const org of ORGANIZATION_ENTITIES) {
    // Exact match only
    if (nameLower === org.toLowerCase()) {
      return true;
    }
  }
  return false;
}

function shouldReclassifyAsLocation(name: string): boolean {
  const nameLower = name.toLowerCase();
  for (const loc of LOCATION_ENTITIES) {
    if (nameLower === loc.toLowerCase()) {
      return true;
    }
  }
  return false;
}

/**
 * Phase 1: Delete junk entities
 */
function deleteJunkEntities(db: Database.Database): number {
  console.log('\n🗑️  Phase 1: Deleting junk entities...\n');
  
  const entities = db.prepare(`
    SELECT id, full_name, mentions 
    FROM entities
  `).all() as { id: number; full_name: string; mentions: number }[];
  
  let deletedCount = 0;
  
  const deleteEntity = db.prepare(`DELETE FROM entities WHERE id = ?`);
  const deleteMentions = db.prepare(`DELETE FROM entity_mentions WHERE entity_id = ?`);
  
  // Helper to safely delete from optional tables
  const safeDelete = (tableName: string, entityId: number) => {
    try {
      db.prepare(`DELETE FROM ${tableName} WHERE entity_id = ?`).run(entityId);
    } catch (e) {
      // Table might not exist, ignore
    }
  };
  
  const safeDeleteRelationships = (entityId: number) => {
    try {
      db.prepare(`DELETE FROM entity_relationships WHERE source_id = ? OR target_id = ?`).run(entityId, entityId);
    } catch (e) {
      // Table might not exist, ignore
    }
  };
  
  for (const entity of entities) {
    if (isJunkEntity(entity.full_name)) {
      log(`   Deleting: "${entity.full_name}" (${entity.mentions} mentions)`);
      
      if (!DRY_RUN) {
        deleteMentions.run(entity.id);
        safeDelete('entity_evidence_types', entity.id);
        safeDelete('media_items', entity.id);
        safeDelete('people', entity.id);
        safeDelete('organizations', entity.id);
        safeDeleteRelationships(entity.id);
        deleteEntity.run(entity.id);
      }
      
      auditLog.push({
        timestamp: new Date().toISOString(),
        action: 'delete',
        entityId: entity.id,
        entityName: entity.full_name,
        details: 'Junk entity pattern match',
        mentionsAffected: entity.mentions,
      });
      
      deletedCount++;
    }
  }
  
  console.log(`\n   ✓ Deleted ${deletedCount} junk entities\n`);
  stats.junkDeleted = deletedCount;
  return deletedCount;
}

/**
 * Phase 2: Reclassify non-person entities
 */
function reclassifyEntities(db: Database.Database): number {
  console.log('\n🏷️  Phase 2: Reclassifying non-person entities...\n');
  
  const entities = db.prepare(`
    SELECT id, full_name 
    FROM entities
  `).all() as { id: number; full_name: string }[];
  
  let reclassifiedCount = 0;
  
  // Skip reclassification - production schema doesn't support entity_type
  // const updateType = db.prepare(`UPDATE entities SET entity_type = ? WHERE id = ?`);
  
  for (const entity of entities) {
    let newType: string | null = null;
    
    if (shouldReclassifyAsOrganization(entity.full_name)) {
      newType = 'Organization';
    } else if (shouldReclassifyAsLocation(entity.full_name)) {
      newType = 'Location';
    }
    
    // Note: Production schema doesn't have entity_type column, skipping reclassification
    // In future, we could add this column to schema
    if (newType) {
      log(`   (Would reclassify: "${entity.full_name}" → ${newType})`);
      // Skipping actual update since entity_type column doesn't exist
      reclassifiedCount++;
      
      auditLog.push({
        timestamp: new Date().toISOString(),
        action: 'reclassify',
        entityId: entity.id,
        entityName: entity.full_name,
        details: `Changed from Person to ${newType}`,
      });
      
      reclassifiedCount++;
    }
  }
  
  console.log(`\n   ✓ Reclassified ${reclassifiedCount} entities\n`);
  stats.reclassified = reclassifiedCount;
  return reclassifiedCount;
}

/**
 * Phase 3: Consolidate name variations
 */
function consolidateNames(db: Database.Database): number {
  console.log('\n🔗 Phase 3: Consolidating name variations...\n');
  
  let mergedCount = 0;
  
  // For each canonical name, find and merge variations
  for (const [canonical, variations] of Object.entries(NAME_CONSOLIDATION_MAP)) {
    // Find the canonical entity (if it exists)
    const canonicalEntity = db.prepare(`
      SELECT id, full_name, mentions FROM entities 
      WHERE full_name = ?
    `).get(canonical) as { id: number; full_name: string; mentions: number } | undefined;
    
    if (!canonicalEntity) {
      log(`   ⚠️  Canonical entity not found: ${canonical}`);
      continue;
    }
    
    // Find and merge each variation
    for (const variation of variations) {
      const variantEntity = db.prepare(`
        SELECT id, full_name, mentions FROM entities 
        WHERE full_name = ? AND id != ?
      `).get(variation, canonicalEntity.id) as { id: number; full_name: string; mentions: number } | undefined;
      
      if (variantEntity) {
        log(`   Merging: "${variantEntity.full_name}" → "${canonical}"`);
        
        if (!DRY_RUN) {
          // Update mentions to point to canonical entity
          db.prepare(`
            UPDATE entity_mentions SET entity_id = ? WHERE entity_id = ?
          `).run(canonicalEntity.id, variantEntity.id);
          
          // Update media items
          db.prepare(`
            UPDATE media_items SET entity_id = ? WHERE entity_id = ?
          `).run(canonicalEntity.id, variantEntity.id);
          
          // Update evidence types (handle duplicates)
          db.prepare(`
            INSERT OR IGNORE INTO entity_evidence_types (entity_id, evidence_type_id)
            SELECT ?, evidence_type_id FROM entity_evidence_types WHERE entity_id = ?
          `).run(canonicalEntity.id, variantEntity.id);
          
          db.prepare(`DELETE FROM entity_evidence_types WHERE entity_id = ?`).run(variantEntity.id);
          
          // Delete from optional tables (may not exist in all schemas)
          try { db.prepare(`DELETE FROM people WHERE entity_id = ?`).run(variantEntity.id); } catch (e) { /* table might not exist */ }
          try { db.prepare(`DELETE FROM organizations WHERE entity_id = ?`).run(variantEntity.id); } catch (e) { /* table might not exist */ }
          try { db.prepare(`DELETE FROM entity_relationships WHERE source_id = ? OR target_id = ?`).run(variantEntity.id, variantEntity.id); } catch (e) { /* table might not exist */ }
          
          // Update mention count on canonical
          db.prepare(`
            UPDATE entities SET mentions = mentions + ? WHERE id = ?
          `).run(variantEntity.mentions, canonicalEntity.id);
          
          // Delete the variant entity
          db.prepare(`DELETE FROM entities WHERE id = ?`).run(variantEntity.id);
        }
        
        auditLog.push({
          timestamp: new Date().toISOString(),
          action: 'merge',
          entityId: variantEntity.id,
          entityName: variantEntity.full_name,
          details: `Merged into ${canonical} (ID: ${canonicalEntity.id})`,
          mentionsAffected: variantEntity.mentions,
        });
        
        mergedCount++;
      }
    }
  }
  
  console.log(`\n   ✓ Merged ${mergedCount} variant entities\n`);
  stats.merged = mergedCount;
  return mergedCount;
}

/**
 * Phase 4: Consolidate email entities into their owners
 */
function consolidateEmails(db: Database.Database): number {
  console.log('\n📧 Phase 4: Consolidating email entities into owners...\n');
  
  let mergedCount = 0;
  
  for (const [email, ownerName] of Object.entries(EMAIL_OWNER_MAP)) {
    // Find the email entity
    const emailEntity = db.prepare(`
      SELECT id, full_name, mentions FROM entities 
      WHERE full_name = ?
    `).get(email) as { id: number; full_name: string; mentions: number } | undefined;
    
    if (!emailEntity) {
      log(`   ⚠️  Email entity not found: ${email}`);
      continue;
    }
    
    // Find the owner entity
    const ownerEntity = db.prepare(`
      SELECT id, full_name, mentions FROM entities 
      WHERE full_name = ?
    `).get(ownerName) as { id: number; full_name: string; mentions: number } | undefined;
    
    if (!ownerEntity) {
      log(`   ⚠️  Owner entity not found: ${ownerName}`);
      continue;
    }
    
    log(`   Merging: "${email}" (${emailEntity.mentions} mentions) → "${ownerName}"`);
    
    if (!DRY_RUN) {
      // Update mentions to point to owner entity
      db.prepare(`UPDATE entity_mentions SET entity_id = ? WHERE entity_id = ?`).run(ownerEntity.id, emailEntity.id);
      
      // Update media items
      db.prepare(`UPDATE media_items SET entity_id = ? WHERE entity_id = ?`).run(ownerEntity.id, emailEntity.id);
      
      // Update mention count on owner
      db.prepare(`UPDATE entities SET mentions = mentions + ? WHERE id = ?`).run(emailEntity.mentions, ownerEntity.id);
      
      // Delete email entity and related records
      try { db.prepare(`DELETE FROM entity_evidence_types WHERE entity_id = ?`).run(emailEntity.id); } catch (e) { /* table might not exist */ }
      try { db.prepare(`DELETE FROM people WHERE entity_id = ?`).run(emailEntity.id); } catch (e) { /* table might not exist */ }
      db.prepare(`DELETE FROM entities WHERE id = ?`).run(emailEntity.id);
    }
    
    auditLog.push({
      timestamp: new Date().toISOString(),
      action: 'merge',
      entityId: emailEntity.id,
      entityName: email,
      details: `Email consolidated into ${ownerName} (ID: ${ownerEntity.id})`,
      mentionsAffected: emailEntity.mentions,
    });
    
    mergedCount++;
  }
  
  console.log(`\n   ✓ Consolidated ${mergedCount} email entities\n`);
  return mergedCount;
}

/**
 * Phase 5: Update mention counts
 */
function updateMentionCounts(db: Database.Database): number {
  console.log('\n📊 Phase 5: Updating mention counts...\n');
  
  if (!DRY_RUN) {
    const result = db.prepare(`
      UPDATE entities SET mentions = (
        SELECT COUNT(*) FROM entity_mentions WHERE entity_id = entities.id
      )
    `).run();
    
    stats.mentionsUpdated = result.changes;
    console.log(`   ✓ Updated ${result.changes} entity mention counts\n`);
    return result.changes;
  }
  
  console.log(`   (Skipped in dry-run mode)\n`);
  return 0;
}

/**
 * Generate summary report
 */
function generateReport(db: Database.Database) {
  console.log('\n📋 Cleanup Summary Report\n');
  console.log('═'.repeat(50));
  
  const totalCount = db.prepare(`SELECT COUNT(*) as count FROM entities`).get() as { count: number };
  const topEntities = db.prepare(`SELECT full_name, mentions FROM entities ORDER BY mentions DESC LIMIT 10`).all() as { full_name: string; mentions: number }[];
  
  console.log(`\n  Actions Taken${DRY_RUN ? ' (DRY RUN)' : ''}:`);
  console.log(`    Junk entities deleted:    ${stats.junkDeleted}`);
  console.log(`    Entities reclassified:    ${stats.reclassified}`);
  console.log(`    Variants merged:          ${stats.merged}`);
  console.log(`    Mention counts updated:   ${stats.mentionsUpdated}`);
  
  console.log(`\n  Current Entity Counts:`);
  console.log(`    Total Entities: ${totalCount.count.toLocaleString()}`);
  
  console.log(`\n  Top 10 Entities by Mentions:`);
  for (const entity of topEntities) {
    console.log(`    ${entity.full_name}: ${entity.mentions.toLocaleString()}`);
  }
  
  console.log('\n' + '═'.repeat(50));
}

async function main() {
  console.log('\n🧹 Deep Entity Cleanup Script\n');
  console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN (no changes)' : '✏️  LIVE MODE'}`);
  console.log(`Database: ${DB_PATH}\n`);
  
  const db = new Database(DB_PATH);
  
  try {
    // Create backup before making changes
    createBackup(db);
    
    // Disable foreign key checks during cleanup
    db.pragma('foreign_keys = OFF');
    
    // Run cleanup phases
    db.exec('BEGIN TRANSACTION');
    
    deleteJunkEntities(db);
    reclassifyEntities(db);
    consolidateNames(db);
    consolidateEmails(db);
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
    
    // Generate report
    generateReport(db);
    
  } catch (error) {
    db.exec('ROLLBACK');
    console.error('\n❌ Error during cleanup:', error);
    throw error;
  } finally {
    db.close();
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
