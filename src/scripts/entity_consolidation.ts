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
    redFlagRating: number;  // 0-5
    riskFactor: number;     // 0-5 (perpetrator likelihood)
}

const KNOWN_ENTITIES: EntityProfile[] = [
    // KEY PERPETRATORS (RFI=5, Risk=5)
    {
        canonicalName: 'Jeffrey Epstein',
        aliases: ['Jeffrey E. Epstein', 'Jeffrey E Epstein', 'J. Epstein', 'J Epstein', 'Jeff Epstein', 'Epstein Jeffrey', 'Epstein, Jeffrey', 'Jeffrey Edward Epstein'],
        type: 'Person',
        role: 'Primary Subject',
        redFlagRating: 5,
        riskFactor: 5
    },
    {
        canonicalName: 'Ghislaine Maxwell',
        aliases: ['G. Maxwell', 'G Maxwell', 'Maxwell Ghislaine', 'Maxwell, Ghislaine', 'Ms. Maxwell', 'Ghislaine Noelle Marion Maxwell'],
        type: 'Person',
        role: 'Key Figure',
        redFlagRating: 5,
        riskFactor: 5
    },
    
    // HIGH RISK ASSOCIATES (RFI=4, Risk=4)
    {
        canonicalName: 'Jean-Luc Brunel',
        aliases: ['Jean Luc Brunel', 'JL Brunel', 'Brunel Jean-Luc', 'Brunel, Jean-Luc'],
        type: 'Person',
        role: 'Associate',
        redFlagRating: 4,
        riskFactor: 4
    },
    {
        canonicalName: 'Sarah Kellen',
        aliases: ['Sarah Kellen Vickers', 'S. Kellen', 'Kellen Sarah', 'Sarah K.'],
        type: 'Person',
        role: 'Assistant',
        redFlagRating: 4,
        riskFactor: 4
    },
    {
        canonicalName: 'Nadia Marcinkova',
        aliases: ['Nadia Marcinko', 'N. Marcinkova', 'Marcinkova Nadia'],
        type: 'Person',
        role: 'Associate',
        redFlagRating: 4,
        riskFactor: 4
    },
    {
        canonicalName: 'Lesley Groff',
        aliases: ['Leslie Groff', 'L. Groff', 'Groff Lesley'],
        type: 'Person',
        role: 'Assistant',
        redFlagRating: 4,
        riskFactor: 4
    },
    
    // NOTABLE FIGURES (RFI=3-4, Risk=2-3)
    {
        canonicalName: 'Prince Andrew',
        aliases: ['Prince Andrew of York', 'Andrew Windsor', 'Duke of York', 'HRH Prince Andrew', 'Andrew, Duke of York'],
        type: 'Person',
        role: 'Associate',
        redFlagRating: 4,
        riskFactor: 3
    },
    {
        canonicalName: 'Donald Trump',
        aliases: ['Donald J. Trump', 'Donald J Trump', 'DJT', 'Trump Donald', 'Trump, Donald', 'President Trump', 'Mr. Trump'],
        type: 'Person',
        role: 'Associate',
        redFlagRating: 3,
        riskFactor: 2
    },
    {
        canonicalName: 'Bill Clinton',
        aliases: ['William Clinton', 'William J. Clinton', 'President Clinton', 'Clinton Bill', 'Clinton, Bill', 'Wm. Clinton'],
        type: 'Person',
        role: 'Associate',
        redFlagRating: 3,
        riskFactor: 2
    },
    {
        canonicalName: 'Alan Dershowitz',
        aliases: ['Alan M. Dershowitz', 'Alan M Dershowitz', 'Prof. Dershowitz', 'Dershowitz Alan', 'Dershowitz, Alan'],
        type: 'Person',
        role: 'Attorney',
        redFlagRating: 3,
        riskFactor: 2
    },
    {
        canonicalName: 'Leslie Wexner',
        aliases: ['Les Wexner', 'L. Wexner', 'Wexner Les', 'Wexner, Leslie', 'Les Wexner'],
        type: 'Person',
        role: 'Financier',
        redFlagRating: 3,
        riskFactor: 2
    },
    
    // VICTIMS (RFI=4, Risk=0)
    {
        canonicalName: 'Virginia Giuffre',
        aliases: ['Virginia Roberts', 'Virginia Roberts Giuffre', 'Virginia L. Giuffre', 'V. Giuffre', 'Giuffre Virginia'],
        type: 'Person',
        role: 'Victim/Witness',
        redFlagRating: 4,
        riskFactor: 0
    },
    
    // LEGAL/GOVERNMENT (RFI=2, Risk=0)
    {
        canonicalName: 'Alexander Acosta',
        aliases: ['Alex Acosta', 'R. Alexander Acosta', 'Acosta Alexander'],
        type: 'Person',
        role: 'Official',
        redFlagRating: 2,
        riskFactor: 1
    },
    
    // OTHER NOTABLE ASSOCIATES (RFI=2)
    {
        canonicalName: 'Bill Richardson',
        aliases: ['William Richardson', 'Gov. Richardson', 'Richardson Bill'],
        type: 'Person',
        role: 'Politician',
        redFlagRating: 2,
        riskFactor: 2
    },
    {
        canonicalName: 'George Mitchell',
        aliases: ['Sen. Mitchell', 'Senator Mitchell', 'Mitchell George'],
        type: 'Person',
        role: 'Politician',
        redFlagRating: 2,
        riskFactor: 2
    },
    {
        canonicalName: 'Ehud Barak',
        aliases: ['E. Barak', 'Barak Ehud', 'PM Barak'],
        type: 'Person',
        role: 'Politician',
        redFlagRating: 2,
        riskFactor: 2
    },
    
    // KEY ORGANIZATIONS
    {
        canonicalName: 'Jeffrey Epstein VI Foundation',
        aliases: ['Jeffrey Epstein Foundation', 'The Jeffrey Epstein Vi Foundation', 'Epstein Foundation', 'J. Epstein Foundation', 'The Jeffrey Epstein Foundation'],
        type: 'Organization',
        role: 'Foundation',
        redFlagRating: 4,
        riskFactor: 0
    },
    {
        canonicalName: 'Clinton Foundation',
        aliases: ['Clinton Usa Foundation', 'Bill Clinton Foundation', 'The Clinton Foundation', 'Clinton Global Initiative'],
        type: 'Organization',
        role: 'Foundation',
        redFlagRating: 2,
        riskFactor: 0
    },
    {
        canonicalName: 'Trump Organization',
        aliases: ['Trump Enterprises', 'Donald J. Trump Enterprises', 'Trump Properties', 'Trump Holdings'],
        type: 'Organization',
        role: 'Business',
        redFlagRating: 2,
        riskFactor: 0
    },
    
    // LOCATIONS
    {
        canonicalName: 'Little St. James Island',
        aliases: ['Little St James', 'Little Saint James', 'LSJ', 'Epstein Island', 'Pedophile Island', 'St. James Island'],
        type: 'Location',
        role: 'Property',
        redFlagRating: 5,
        riskFactor: 0
    },
    {
        canonicalName: 'Palm Beach Mansion',
        aliases: ['Palm Beach Estate', 'Epstein Palm Beach', 'Palm Beach Property', '358 El Brillo Way'],
        type: 'Location',
        role: 'Property',
        redFlagRating: 4,
        riskFactor: 0
    },
    {
        canonicalName: 'New York Mansion',
        aliases: ['East 71st Street', '9 East 71st Street', 'Epstein Manhattan', 'Manhattan Mansion', 'NYC Mansion'],
        type: 'Location',
        role: 'Property',
        redFlagRating: 4,
        riskFactor: 0
    }
];

// ============================================================================
// STEP 1: CONSOLIDATE KNOWN ENTITIES
// ============================================================================

console.log('\n[Step 1] Consolidating known entities...');

const updateEntity = db.prepare(`
    UPDATE entities 
    SET name = ?, type = ?, role = ?, red_flag_rating = ?, risk_factor = ?
    WHERE id = ?
`);

const deleteEntity = db.prepare('DELETE FROM entities WHERE id = ?');
const mergeRelationships = db.prepare('UPDATE entity_relationships SET source_id = ? WHERE source_id = ?');
const mergeRelationshipsTarget = db.prepare('UPDATE entity_relationships SET target_id = ? WHERE target_id = ?');

let consolidated = 0;

for (const profile of KNOWN_ENTITIES) {
    // Find all entities matching this profile
    const allNames = [profile.canonicalName, ...profile.aliases];
    const placeholders = allNames.map(() => 'LOWER(name) = LOWER(?)').join(' OR ');
    
    const matchingEntities = db.prepare(`
        SELECT id, name FROM entities WHERE ${placeholders} ORDER BY id ASC
    `).all(...allNames) as any[];
    
    if (matchingEntities.length === 0) {
        // Create the canonical entity if it doesn't exist
        const insertEntity = db.prepare(`
            INSERT INTO entities (name, type, role, red_flag_rating, risk_factor)
            VALUES (?, ?, ?, ?, ?)
        `);
        insertEntity.run(profile.canonicalName, profile.type, profile.role, profile.redFlagRating, profile.riskFactor);
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
        primaryEntity.id
    );
    
    // Merge and delete duplicates
    for (let i = 1; i < matchingEntities.length; i++) {
        const duplicate = matchingEntities[i];
        
        // Move relationships to primary
        mergeRelationships.run(primaryEntity.id, duplicate.id);
        mergeRelationshipsTarget.run(primaryEntity.id, duplicate.id);
        
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
    { pattern: /\s+(Part|Page|Has|Owned|Pm|Pnl|Pnrt|Reference|Defendant|Date|Head|Campany|Companv)\s*$/i, replacement: '' },
    // Normalize common variations
    { pattern: /\s+I\s+/g, replacement: ' ' },
    { pattern: /\s+Llc\s*$/i, replacement: '' },
    { pattern: /\s+Inc\.?\s*$/i, replacement: '' },
    { pattern: /\s+Corp\.?\s*$/i, replacement: '' },
];

// Get all entities with suspicious suffixes
const suspiciousEntities = db.prepare(`
    SELECT id, name, type FROM entities 
    WHERE name LIKE '% Part' OR name LIKE '% Page' OR name LIKE '% Has' 
    OR name LIKE '% Owned' OR name LIKE '% Pm' OR name LIKE '% Pnl'
    OR name LIKE '% Date' OR name LIKE '% Head' OR name LIKE '% Defendant'
    OR name LIKE '% Reference' OR name LIKE '% Companv' OR name LIKE '% Campany'
`).all() as any[];

let fuzzyMerged = 0;
for (const entity of suspiciousEntities) {
    // Find the base name by removing suffix
    let baseName = entity.name;
    for (const { pattern, replacement } of duplicatePatterns) {
        baseName = baseName.replace(pattern, replacement).trim();
    }
    
    if (baseName === entity.name) continue;
    
    // Find the canonical version
    const canonical = db.prepare('SELECT id FROM entities WHERE LOWER(name) = LOWER(?) AND id != ?')
        .get(baseName, entity.id) as { id: number } | undefined;
    
    if (canonical) {
        // Merge into canonical
        mergeRelationships.run(canonical.id, entity.id);
        mergeRelationshipsTarget.run(canonical.id, entity.id);
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
const personEntitiesWithMentions = db.prepare(`
    SELECT e.id, e.name, e.type, e.role, e.red_flag_rating,
           (SELECT COUNT(*) FROM documents d WHERE d.content LIKE '%' || e.name || '%' LIMIT 1000) as mention_count
    FROM entities e
    WHERE e.type = 'Person' AND e.red_flag_rating < 3
    ORDER BY e.id
`).all() as any[];

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
    let riskFactor = Math.max(0, Math.min(2, Math.floor(mentions / 50)));
    
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
    /^[a-z]{2,}$/,  // All lowercase single words
    /[A-Z][a-z]+[A-Z]/,  // CamelCase (likely code)
    /^\d+$/,  // Pure numbers
    /^[^a-zA-Z]*$/,  // No letters
    /\.com|\.org|\.net|https?:|www\./i,  // URLs
    /@/,  // Emails
    /\.(pdf|doc|txt|jpg|png|msg)$/i,  // File extensions
];

const unknowns = db.prepare(`SELECT id, name FROM entities WHERE type = 'Unknown'`).all() as any[];

let deleted = 0;
let reclassified = 0;

for (const entity of unknowns) {
    const name = entity.name?.trim() || '';
    
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
        db.prepare('DELETE FROM entity_relationships WHERE source_id = ? OR target_id = ?').run(entity.id, entity.id);
        deleteEntity.run(entity.id);
        deleted++;
        continue;
    }
    
    // Try to reclassify
    // Person pattern: Two+ capitalized words
    if (/^[A-Z][a-z]+(\s+[A-Z]\.?\s*|\s+)[A-Z][a-z]+/.test(name)) {
        db.prepare('UPDATE entities SET type = ? WHERE id = ?').run('Person', entity.id);
        reclassified++;
    }
    // Organization pattern: Contains Inc, LLC, Corp, etc.
    else if (/(Inc|LLC|Ltd|Corp|Foundation|Trust|Company|Group|Partners|Holdings|Capital)/i.test(name)) {
        db.prepare('UPDATE entities SET type = ? WHERE id = ?').run('Organization', entity.id);
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
const orphanOrgs = db.prepare(`
    SELECT e.id, e.name FROM entities e
    WHERE e.type = 'Organization' 
    AND e.red_flag_rating = 0
    AND NOT EXISTS (
        SELECT 1 FROM documents d 
        WHERE d.content LIKE '%' || e.name || '%' 
        OR d.title LIKE '%' || e.name || '%'
        LIMIT 1
    )
    AND LENGTH(e.name) < 50
`).all() as any[];

let orgsCleaned = 0;
for (const org of orphanOrgs) {
    // Check if it looks like junk
    if (/[A-Z][a-z]+[A-Z]/.test(org.name) || !/ /.test(org.name)) {
        db.prepare('DELETE FROM entity_relationships WHERE source_id = ? OR target_id = ?').run(org.id, org.id);
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
        INSERT INTO entities_fts(rowid, name, role, description)
        SELECT id, name, role, description FROM entities;
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

const finalStats = db.prepare(`
    SELECT 
        (SELECT COUNT(*) FROM entities) as total,
        (SELECT COUNT(*) FROM entities WHERE type = 'Person') as persons,
        (SELECT COUNT(*) FROM entities WHERE type = 'Organization') as orgs,
        (SELECT COUNT(*) FROM entities WHERE type = 'Location') as locations,
        (SELECT COUNT(*) FROM entities WHERE type = 'Unknown') as unknowns,
        (SELECT COUNT(*) FROM entities WHERE red_flag_rating >= 4) as high_rfi,
        (SELECT COUNT(*) FROM entities WHERE red_flag_rating >= 2) as medium_plus_rfi,
        (SELECT COUNT(*) FROM entities WHERE risk_factor >= 3) as high_risk
`).get() as any;

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
const top20 = db.prepare(`
    SELECT name, red_flag_rating, risk_factor, role, type,
           (SELECT COUNT(*) FROM documents d WHERE d.content LIKE '%' || e.name || '%') as mentions
    FROM entities e
    ORDER BY red_flag_rating DESC, mentions DESC
    LIMIT 20
`).all() as any[];

for (const e of top20) {
    console.log(`  🚩${e.red_flag_rating} [Risk:${e.risk_factor}] ${e.name} (${e.role || e.type}) - ${e.mentions} mentions`);
}

db.close();
console.log('\n[Done] Database closed.');
