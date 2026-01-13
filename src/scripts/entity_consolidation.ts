/**
 * Comprehensive Entity Consolidation and Data Quality Script
 *
 * Goals:
 * 1. Merge entity variations (Jeffrey Epstein, Jeffrey E. Epstein, etc.)
 * 2. Assign proper risk scores based on document mentions and known associations
 * 3. Eliminate Unknown entities by reclassifying or deleting
 * 4. Create a useful, readable, relational, high-quality dataset
 */

import Database from 'better-sqlite3';
import { resolve } from 'path';

const DB_PATH = resolve(process.cwd(), 'epstein-archive.db');

console.log('[Consolidation] Starting Comprehensive Entity Consolidation...');
console.log(`[DB] Path: ${DB_PATH}`);

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// ============================================================================
// KNOWN ENTITY ALIASES - Map variations to canonical names
// ============================================================================

interface EntityProfile {
  canonicalName: string;
  aliases: string[];
  type: 'Person' | 'Organization' | 'Location';
  role: string;
  redFlagRating: number; // 0-5
  riskFactor: number; // 0-5 (perpetrator likelihood)
}

const KNOWN_ENTITIES: EntityProfile[] = [
  // KEY PERPETRATORS (RFI=5, Risk=5)
  {
    canonicalName: 'Jeffrey Epstein',
    aliases: [
      'Jeffrey E. Epstein',
      'Jeffrey E Epstein',
      'J. Epstein',
      'J Epstein',
      'Jeff Epstein',
      'Epstein Jeffrey',
      'Epstein, Jeffrey',
      'Jeffrey Edward Epstein',
      'JE',
    ],
    type: 'Person',
    role: 'Primary Subject',
    redFlagRating: 5,
    riskFactor: 5,
  },
  {
    canonicalName: 'Ghislaine Maxwell',
    aliases: [
      'G. Maxwell',
      'G Maxwell',
      'Maxwell Ghislaine',
      'Maxwell, Ghislaine',
      'Ms. Maxwell',
      'Ghislaine Noelle Marion Maxwell',
      'BM',
    ],
    type: 'Person',
    role: 'Key Figure',
    redFlagRating: 5,
    riskFactor: 5,
  },

  // HIGH RISK ASSOCIATES (RFI=4, Risk=4)
  {
    canonicalName: 'Jean-Luc Brunel',
    aliases: ['Jean Luc Brunel', 'JL Brunel', 'Brunel Jean-Luc', 'Brunel, Jean-Luc', 'Brunel Ms'],
    type: 'Person',
    role: 'Associate',
    redFlagRating: 4,
    riskFactor: 4,
  },
  {
    canonicalName: 'Sarah Kellen',
    aliases: ['Sarah Kellen Vickers', 'S. Kellen', 'Kellen Sarah', 'Sarah K.', 'Kellen Depo'],
    type: 'Person',
    role: 'Assistant',
    redFlagRating: 4,
    riskFactor: 4,
  },
  {
    canonicalName: 'Nadia Marcinkova',
    aliases: ['Nadia Marcinko', 'N. Marcinkova', 'Marcinkova Nadia', 'N. Marcinko'],
    type: 'Person',
    role: 'Associate',
    redFlagRating: 4,
    riskFactor: 4,
  },
  {
    canonicalName: 'Lesley Groff',
    aliases: ['Leslie Groff', 'L. Groff', 'Groff Lesley', 'Leslie G.'],
    type: 'Person',
    role: 'Assistant',
    redFlagRating: 4,
    riskFactor: 4,
  },

  // NOTABLE FIGURES (RFI=3-4, Risk=2-3)
  {
    canonicalName: 'Prince Andrew',
    aliases: [
      'Prince Andrew of York',
      'Andrew Windsor',
      'Duke of York',
      'HRH Prince Andrew',
      'Andrew, Duke of York',
      'P. Andrew',
      'PA',
    ],
    type: 'Person',
    role: 'Associate',
    redFlagRating: 4,
    riskFactor: 3,
  },
  {
    canonicalName: 'Donald Trump',
    aliases: [
      'Donald J. Trump',
      'Donald J Trump',
      'DJT',
      'Trump Donald',
      'Trump, Donald',
      'President Trump',
      'Mr. Trump',
      'Trump',
    ],
    type: 'Person',
    role: 'Associate',
    redFlagRating: 3,
    riskFactor: 2,
  },
  {
    canonicalName: 'Bill Clinton',
    aliases: [
      'William Clinton',
      'William J. Clinton',
      'President Clinton',
      'Clinton Bill',
      'Clinton, Bill',
      'Wm. Clinton',
      'WJC',
    ],
    type: 'Person',
    role: 'Associate',
    redFlagRating: 3,
    riskFactor: 2,
  },
  {
    canonicalName: 'Alan Dershowitz',
    aliases: [
      'Alan M. Dershowitz',
      'Alan M Dershowitz',
      'Prof. Dershowitz',
      'Dershowitz Alan',
      'Dershowitz, Alan',
      'A. Dershowitz',
    ],
    type: 'Person',
    role: 'Attorney',
    redFlagRating: 3,
    riskFactor: 2,
  },
  {
    canonicalName: 'Leslie Wexner',
    aliases: ['Les Wexner', 'L. Wexner', 'Wexner Les', 'Wexner, Leslie', 'Leslie H. Wexner'],
    type: 'Person',
    role: 'Financier',
    redFlagRating: 3,
    riskFactor: 2,
  },

  // VICTIMS (RFI=4, Risk=0)
  {
    canonicalName: 'Virginia Giuffre',
    aliases: [
      'Virginia Roberts',
      'Virginia Roberts Giuffre',
      'Virginia L. Giuffre',
      'V. Giuffre',
      'Giuffre Virginia',
      'Plaintiff Giuffre',
      'Roberts Giuffre',
    ],
    type: 'Person',
    role: 'Victim/Witness',
    redFlagRating: 4,
    riskFactor: 0,
  },

  // LEGAL/GOVERNMENT (RFI=2, Risk=0)
  {
    canonicalName: 'Alexander Acosta',
    aliases: [
      'Alex Acosta',
      'R. Alexander Acosta',
      'Acosta Alexander',
      'Attorney Acosta',
      'Attorney Alex Acosta',
      'Attorney Alexander Acosta',
      'Attorney R. Alexander Acosta',
      'Atty Acosta',
    ],
    type: 'Person',
    role: 'Official',
    redFlagRating: 2,
    riskFactor: 1,
  },

  // OTHER NOTABLE ASSOCIATES (RFI=2)
  {
    canonicalName: 'Bill Richardson',
    aliases: ['William Richardson', 'Gov. Richardson', 'Richardson Bill', 'B. Richardson'],
    type: 'Person',
    role: 'Politician',
    redFlagRating: 2,
    riskFactor: 2,
  },
  {
    canonicalName: 'George Mitchell',
    aliases: ['Sen. Mitchell', 'Senator Mitchell', 'Mitchell George', 'G. Mitchell'],
    type: 'Person',
    role: 'Politician',
    redFlagRating: 2,
    riskFactor: 2,
  },
  {
    canonicalName: 'Ehud Barak',
    aliases: ['E. Barak', 'Barak Ehud', 'PM Barak', 'General Barak'],
    type: 'Person',
    role: 'Politician',
    redFlagRating: 2,
    riskFactor: 2,
  },

  // KEY ORGANIZATIONS
  {
    canonicalName: 'Jeffrey Epstein VI Foundation',
    aliases: [
      'Jeffrey Epstein Foundation',
      'The Jeffrey Epstein Vi Foundation',
      'Epstein Foundation',
      'J. Epstein Foundation',
      'The Jeffrey Epstein Foundation',
    ],
    type: 'Organization',
    role: 'Foundation',
    redFlagRating: 4,
    riskFactor: 0,
  },
  {
    canonicalName: 'Clinton Foundation',
    aliases: [
      'Clinton Usa Foundation',
      'Bill Clinton Foundation',
      'The Clinton Foundation',
      'Clinton Global Initiative',
    ],
    type: 'Organization',
    role: 'Foundation',
    redFlagRating: 2,
    riskFactor: 0,
  },
  {
    canonicalName: 'Trump Organization',
    aliases: [
      'Trump Enterprises',
      'Donald J. Trump Enterprises',
      'Trump Properties',
      'Trump Holdings',
    ],
    type: 'Organization',
    role: 'Business',
    redFlagRating: 2,
    riskFactor: 0,
  },

  // LOCATIONS
  {
    canonicalName: 'Little St. James Island',
    aliases: [
      'Little St James',
      'Little Saint James',
      'LSJ',
      'Epstein Island',
      'Pedophile Island',
      'St. James Island',
      'LSJ Island',
    ],
    type: 'Location',
    role: 'Property',
    redFlagRating: 5,
    riskFactor: 0,
  },
  {
    canonicalName: 'Palm Beach Mansion',
    aliases: [
      'Palm Beach Estate',
      'Epstein Palm Beach',
      'Palm Beach Property',
      '358 El Brillo Way',
      'Palm Beach Residence',
    ],
    type: 'Location',
    role: 'Property',
    redFlagRating: 4,
    riskFactor: 0,
  },
  {
    canonicalName: 'New York Mansion',
    aliases: [
      'East 71st Street',
      '9 East 71st Street',
      'Epstein Manhattan',
      'Manhattan Mansion',
      'NYC Mansion',
      '71st Street Mansion',
    ],
    type: 'Location',
    role: 'Property',
    redFlagRating: 4,
    riskFactor: 0,
  },
];

// ============================================================================
// STEP 1: CONSOLIDATE KNOWN ENTITIES
// ============================================================================

console.log('\n[Step 1] Consolidating known entities...');

const updateEntity = db.prepare(`
    UPDATE entities 
    SET full_name = ?, entity_type = ?, role = ?, red_flag_rating = ?, risk_factor = ?
    WHERE id = ?
`);

const deleteEntity = db.prepare('DELETE FROM entities WHERE id = ?');
const mergeRelationships = db.prepare(
  'UPDATE OR IGNORE entity_relationships SET source_entity_id = ? WHERE source_entity_id = ?',
);
const mergeRelationshipsTarget = db.prepare(
  'UPDATE OR IGNORE entity_relationships SET target_entity_id = ? WHERE target_entity_id = ?',
);

let consolidated = 0;

for (const profile of KNOWN_ENTITIES) {
  // Find all entities matching this profile
  const allNames = [profile.canonicalName, ...profile.aliases];
  const placeholders = allNames.map(() => 'LOWER(full_name) = LOWER(?)').join(' OR ');

  const matchingEntities = db
    .prepare(
      `
        SELECT id, full_name FROM entities WHERE ${placeholders} ORDER BY id ASC
    `,
    )
    .all(...allNames) as any[];

  if (matchingEntities.length === 0) {
    // Create the canonical entity if it doesn't exist
    const insertEntity = db.prepare(`
            INSERT INTO entities (full_name, entity_type, role, red_flag_rating, risk_factor)
            VALUES (?, ?, ?, ?, ?)
        `);
    insertEntity.run(
      profile.canonicalName,
      profile.type,
      profile.role,
      profile.redFlagRating,
      profile.riskFactor,
    );
    console.log(`  Created: ${profile.canonicalName}`);
    continue;
  }

  // Keep the first one as canonical, merge others into it
  const primaryEntity = matchingEntities[0];

  // Update primary entity with canonical data
  updateEntity.run(
    profile.canonicalName,
    profile.type,
    profile.role,
    profile.redFlagRating,
    profile.riskFactor,
    primaryEntity.id,
  );

  // Merge and delete duplicates
  for (let i = 1; i < matchingEntities.length; i++) {
    const duplicate = matchingEntities[i];

    // Move relationships to primary
    mergeRelationships.run(primaryEntity.id, duplicate.id);
    mergeRelationshipsTarget.run(primaryEntity.id, duplicate.id);

    // Clean up any orphans left by the IGNORE (they'll be deleted anyway)
    db.prepare(
      'DELETE FROM entity_relationships WHERE source_entity_id = ? OR target_entity_id = ?',
    ).run(duplicate.id, duplicate.id);

    // Delete duplicate
    deleteEntity.run(duplicate.id);
    consolidated++;
  }

  if (matchingEntities.length > 1) {
    console.log(`  Consolidated ${matchingEntities.length} → ${profile.canonicalName}`);
  }
}

console.log(`  Total consolidated: ${consolidated} duplicates merged`);

// ============================================================================
// STEP 2: MERGE REMAINING DUPLICATES (fuzzy matching)
// ============================================================================

console.log('\n[Step 2] Merging remaining duplicates...');

// Find entities with very similar names (likely duplicates)
const duplicatePatterns = [
  // Remove common suffixes that create duplicates
  {
    pattern:
      /\s+(Part|Page|Has|Owned|Pm|Pnl|Pnrt|Reference|Defendant|Date|Head|Campany|Companv)\s*$/i,
    replacement: '',
  },
  // Normalize common variations
  { pattern: /\s+I\s+/g, replacement: ' ' },
  { pattern: /\s+Llc\s*$/i, replacement: '' },
  { pattern: /\s+Inc\.?\s*$/i, replacement: '' },
  { pattern: /\s+Corp\.?\s*$/i, replacement: '' },
];

// Get all entities with suspicious suffixes
const suspiciousEntities = db
  .prepare(
    `
    SELECT id, full_name, entity_type FROM entities 
    WHERE full_name LIKE '% Part' OR full_name LIKE '% Page' OR full_name LIKE '% Has' 
    OR full_name LIKE '% Owned' OR full_name LIKE '% Pm' OR full_name LIKE '% Pnl'
    OR full_name LIKE '% Date' OR full_name LIKE '% Head' OR full_name LIKE '% Defendant'
    OR full_name LIKE '% Reference' OR full_name LIKE '% Companv' OR full_name LIKE '% Campany'
`,
  )
  .all() as any[];

let fuzzyMerged = 0;
for (const entity of suspiciousEntities) {
  // Find the base name by removing suffix
  let baseName = entity.full_name;
  for (const { pattern, replacement } of duplicatePatterns) {
    baseName = baseName.replace(pattern, replacement).trim();
  }

  if (baseName === entity.full_name) continue;

  // Find the canonical version
  const canonical = db
    .prepare('SELECT id FROM entities WHERE LOWER(full_name) = LOWER(?) AND id != ?')
    .get(baseName, entity.id) as { id: number } | undefined;

  if (canonical) {
    // Merge into canonical
    mergeRelationships.run(canonical.id, entity.id);
    mergeRelationshipsTarget.run(canonical.id, entity.id);

    // Clean up orphans
    db.prepare(
      'DELETE FROM entity_relationships WHERE source_entity_id = ? OR target_entity_id = ?',
    ).run(entity.id, entity.id);

    deleteEntity.run(entity.id);
    fuzzyMerged++;
  }
}

console.log(`  Fuzzy merged: ${fuzzyMerged} entities`);

// ============================================================================
// STEP 3: INTELLIGENT RISK SCORING
// ============================================================================

console.log('\n[Step 3] Computing risk scores based on mentions...');

// Get precomputed mention counts from a single efficient query
const personEntitiesWithMentions = db
  .prepare(
    `
    SELECT e.id, e.full_name, e.entity_type, e.role, e.red_flag_rating,
           (SELECT COUNT(*) FROM documents d WHERE d.content LIKE '%' || e.full_name || '%' LIMIT 1000) as mention_count
    FROM entities e
    WHERE e.entity_type = 'Person' AND e.red_flag_rating < 3
    ORDER BY e.id
`,
  )
  .all() as any[];

const updateRiskScore = db.prepare(`
    UPDATE entities SET red_flag_rating = ?, risk_factor = ? WHERE id = ?
`);

let scored = 0;
for (const entity of personEntitiesWithMentions) {
  const mentions = entity.mention_count || 0;

  // Calculate RFI based on mention count
  let newRFI = 0;
  if (mentions >= 100) newRFI = 4;
  else if (mentions >= 50) newRFI = 3;
  else if (mentions >= 20) newRFI = 2;
  else if (mentions >= 5) newRFI = 1;

  // Risk factor based on mentions too (simplified)
  const riskFactor = Math.max(0, Math.min(2, Math.floor(mentions / 50)));

  if (newRFI > entity.red_flag_rating) {
    updateRiskScore.run(newRFI, riskFactor, entity.id);
    scored++;
  }
}

console.log(`  Updated scores for ${scored} entities`);

// ============================================================================
// STEP 4: CLEAN UP UNKNOWNS
// ============================================================================

console.log('\n[Step 4] Cleaning up Unknown entities...');

// Aggressive patterns for junk detection
const junkPatterns = [
  /^[a-z]{2,}$/, // All lowercase single words
  /[A-Z][a-z]+[A-Z]/, // CamelCase (likely code)
  /^\d+$/, // Pure numbers
  /^[^a-zA-Z]*$/, // No letters
  /\.com|\.org|\.net|https?:|www\./i, // URLs
  /@/, // Emails
  /\.(pdf|doc|txt|jpg|png|msg)$/i, // File extensions
];

const unknowns = db
  .prepare(`SELECT id, full_name FROM entities WHERE entity_type = 'Unknown'`)
  .all() as any[];

let deleted = 0;
let reclassified = 0;

for (const entity of unknowns) {
  const name = entity.full_name?.trim() || '';

  // Check for junk
  let isJunk = false;
  for (const pattern of junkPatterns) {
    if (pattern.test(name)) {
      isJunk = true;
      break;
    }
  }

  // Also junk if too short or no vowels
  if (name.length < 4 || !/[aeiouAEIOU]/.test(name)) {
    isJunk = true;
  }

  if (isJunk) {
    db.prepare(
      'DELETE FROM entity_relationships WHERE source_entity_id = ? OR target_entity_id = ?',
    ).run(entity.id, entity.id);
    deleteEntity.run(entity.id);
    deleted++;
    continue;
  }

  // Try to reclassify
  // Person pattern: Two+ capitalized words
  if (/^[A-Z][a-z]+(\s+[A-Z]\.?\s*|\s+)[A-Z][a-z]+/.test(name)) {
    db.prepare('UPDATE entities SET entity_type = ? WHERE id = ?').run('Person', entity.id);
    reclassified++;
  }
  // Organization pattern: Contains Inc, LLC, Corp, etc.
  else if (
    /(Inc|LLC|Ltd|Corp|Foundation|Trust|Company|Group|Partners|Holdings|Capital)/i.test(name)
  ) {
    db.prepare('UPDATE entities SET entity_type = ? WHERE id = ?').run('Organization', entity.id);
    reclassified++;
  }
}

console.log(`  Deleted ${deleted} junk entities`);
console.log(`  Reclassified ${reclassified} entities`);

// ============================================================================
// STEP 5: DELETE ORPHAN ORGANIZATIONS (no valuable data)
// ============================================================================

console.log('\n[Step 5] Cleaning up low-value organizations...');

// Delete organizations with no document mentions and RFI=0
const orphanOrgs = db
  .prepare(
    `
    SELECT e.id, e.full_name FROM entities e
    WHERE e.entity_type = 'Organization' 
    AND e.red_flag_rating = 0
    AND NOT EXISTS (
        SELECT 1 FROM documents d 
        WHERE d.content LIKE '%' || e.full_name || '%' 
        OR d.title LIKE '%' || e.full_name || '%'
        LIMIT 1
    )
    AND LENGTH(e.full_name) < 50
`,
  )
  .all() as any[];

let orgsCleaned = 0;
for (const org of orphanOrgs) {
  // Check if it looks like junk
  if (/[A-Z][a-z]+[A-Z]/.test(org.full_name) || !/ /.test(org.full_name)) {
    db.prepare(
      'DELETE FROM entity_relationships WHERE source_entity_id = ? OR target_entity_id = ?',
    ).run(org.id, org.id);
    deleteEntity.run(org.id);
    orgsCleaned++;
  }
}

console.log(`  Deleted ${orgsCleaned} orphan organizations`);

// ============================================================================
// STEP 6: REBUILD FTS INDEX
// ============================================================================

console.log('\n[Step 6] Rebuilding FTS index...');

try {
  db.exec(`
        DELETE FROM entities_fts;
        INSERT INTO entities_fts(rowid, full_name, primary_role, aliases)
        SELECT id, full_name, primary_role, aliases FROM entities;
    `);
  console.log('  FTS index rebuilt');
} catch (e) {
  console.log('  FTS rebuild skipped');
}

// ============================================================================
// FINAL STATS
// ============================================================================

console.log('\n========================================');
console.log('[RESULTS] Entity Consolidation Complete!');
console.log('========================================');

const finalStats = db
  .prepare(
    `
    SELECT 
        (SELECT COUNT(*) FROM entities) as total,
        (SELECT COUNT(*) FROM entities WHERE entity_type = 'Person') as persons,
        (SELECT COUNT(*) FROM entities WHERE entity_type = 'Organization') as orgs,
        (SELECT COUNT(*) FROM entities WHERE entity_type = 'Location') as locations,
        (SELECT COUNT(*) FROM entities WHERE entity_type = 'Unknown') as unknowns,
        (SELECT COUNT(*) FROM entities WHERE red_flag_rating >= 4) as high_rfi,
        (SELECT COUNT(*) FROM entities WHERE red_flag_rating >= 2) as medium_plus_rfi,
        (SELECT COUNT(*) FROM entities WHERE risk_factor >= 3) as high_risk
`,
  )
  .get() as any;

console.log(`\nEntity Distribution:`);
console.log(`  Total:        ${finalStats.total}`);
console.log(`  Persons:      ${finalStats.persons}`);
console.log(`  Organizations: ${finalStats.orgs}`);
console.log(`  Locations:    ${finalStats.locations}`);
console.log(`  Unknowns:     ${finalStats.unknowns}`);

console.log(`\nRisk Distribution:`);
console.log(`  High RFI (4+):    ${finalStats.high_rfi}`);
console.log(`  Medium+ RFI (2+): ${finalStats.medium_plus_rfi}`);
console.log(`  High Risk (3+):   ${finalStats.high_risk}`);

// Show top 20 by RFI
console.log('\nTop 20 by Red Flag Index:');
const top20 = db
  .prepare(
    `
    SELECT full_name, red_flag_rating, risk_factor, role, entity_type,
           (SELECT COUNT(*) FROM documents d WHERE d.content LIKE '%' || e.full_name || '%') as mentions
    FROM entities e
    ORDER BY red_flag_rating DESC, mentions DESC
    LIMIT 20
`,
  )
  .all() as any[];

for (const e of top20) {
  console.log(
    `  🚩${e.red_flag_rating} [Risk:${e.risk_factor}] ${e.full_name} (${e.role || e.entity_type}) - ${e.mentions} mentions`,
  );
}

db.close();
console.log('\n[Done] Database closed.');
