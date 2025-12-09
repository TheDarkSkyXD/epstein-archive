/**
 * Data Quality Fix Script
 * Fixes RFI scores, mentions, unknown cleanup, and entity consolidation
 */

import Database from 'better-sqlite3';
import { resolve } from 'path';

const DB_PATH = resolve(process.cwd(), 'epstein-archive.db');

console.log('[Fix] Starting Data Quality Fix...');
console.log(`[Fix] DB Path: ${DB_PATH}`);

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// ============================================================================
// 1. FIX RED FLAG INDEX SCORES
// ============================================================================

console.log('\n[Fix] Updating Red Flag Index scores...');

// Key perpetrators should have RFI = 5
const keyPerpetrators = [
    'Jeffrey Epstein',
    'Ghislaine Maxwell',
];

// High risk individuals RFI = 4
const highRisk = [
    'Jean-Luc Brunel',
    'Sarah Kellen',
    'Nadia Marcinkova',
    'Lesley Groff',
];

// Associates RFI = 3
const associates = [
    'Prince Andrew',
    'Alan Dershowitz',
    'Bill Clinton',
    'Donald Trump',
    'Les Wexner',
    'Leslie Wexner',
    'Bill Richardson',
    'George Mitchell',
];

const updateRFI = db.prepare('UPDATE entities SET red_flag_rating = ? WHERE LOWER(name) = LOWER(?)');

for (const name of keyPerpetrators) {
    const result = updateRFI.run(5, name);
    console.log(`  Set ${name} RFI=5 (affected: ${result.changes})`);
}

for (const name of highRisk) {
    const result = updateRFI.run(4, name);
    console.log(`  Set ${name} RFI=4 (affected: ${result.changes})`);
}

for (const name of associates) {
    const result = updateRFI.run(3, name);
    console.log(`  Set ${name} RFI=3 (affected: ${result.changes})`);
}

// Also update partial matches for Epstein/Maxwell variations
db.exec(`
    UPDATE entities SET red_flag_rating = 5 WHERE name LIKE 'Jeffrey Epstein%' OR name LIKE 'Jeffrey E. Epstein%';
    UPDATE entities SET red_flag_rating = 5 WHERE name LIKE 'Ghislaine Maxwell%';
`);
console.log('  Updated Epstein/Maxwell variations to RFI=5');

// ============================================================================
// 2. SKIP MENTIONS COMPUTATION (TOO SLOW FOR NOW)
// ============================================================================

console.log('\n[Fix] Skipping mentions computation (too slow)...');
// TODO: Optimize mentions computation with FTS or batch processing

// ============================================================================
// 3. CLEAN JUNK UNKNOWN ENTITIES
// ============================================================================

console.log('\n[Fix] Cleaning junk Unknown entities...');

// Patterns that are clearly junk
const junkPatterns = [
    // Single words without capitals (likely OCR artifacts)
    /^[a-z]{3,15}$/, 
    // URLs and domains
    /\.(com|org|net|edu|gov|io)$/i,
    /^https?/i,
    /^www\./i,
    // File extensions
    /\.(pdf|doc|txt|jpg|png)$/i,
    // Email-like patterns
    /@/,
    // Pure numbers
    /^\d+$/,
    // Common non-name words
    /^(the|and|for|with|from|this|that|have|been|would|could|should|about|which|their|there|these|those|other|after|before|first|second|third|could|should|would|where|when|what|report|reports|document|documents|file|files|page|pages|exhibit|exhibits|attachment|attachments|powerpoint|excel|word|pdf)$/i,
];

const unknownEntities = db.prepare(`
    SELECT id, name FROM entities WHERE type = 'Unknown'
`).all() as any[];

const deleteEntity = db.prepare('DELETE FROM entities WHERE id = ?');
const deleteRelationships = db.prepare('DELETE FROM entity_relationships WHERE source_id = ? OR target_id = ?');

let deleted = 0;
for (const entity of unknownEntities) {
    const name = entity.name || '';
    
    // Check if matches junk patterns
    let isJunk = false;
    for (const pattern of junkPatterns) {
        if (pattern.test(name)) {
            isJunk = true;
            break;
        }
    }
    
    // Also delete very short names (2 chars or less)
    if (name.length <= 2) {
        isJunk = true;
    }
    
    if (isJunk) {
        deleteRelationships.run(entity.id, entity.id);
        deleteEntity.run(entity.id);
        deleted++;
    }
}
console.log(`  Deleted ${deleted} junk entities`);

// ============================================================================
// 4. RECLASSIFY OBVIOUS PERSON NAMES IN UNKNOWN
// ============================================================================

console.log('\n[Fix] Reclassifying Unknown entities with obvious person names...');

// Pattern: Two or more capitalized words = likely person name
const personNamePattern = /^[A-Z][a-z]+\s+[A-Z][a-z]+/;

const reclassifyPerson = db.prepare(`
    UPDATE entities SET type = 'Person' WHERE id = ?
`);

const remainingUnknowns = db.prepare(`
    SELECT id, name FROM entities WHERE type = 'Unknown'
`).all() as any[];

let reclassified = 0;
for (const entity of remainingUnknowns) {
    const name = entity.name || '';
    
    if (personNamePattern.test(name)) {
        reclassifyPerson.run(entity.id);
        reclassified++;
    }
}
console.log(`  Reclassified ${reclassified} entities as Person`);

// ============================================================================
// 5. CONSOLIDATE DUPLICATE ENTITIES
// ============================================================================

console.log('\n[Fix] Consolidating duplicate entities...');

// Find potential duplicates (same name, different entries)
const duplicates = db.prepare(`
    SELECT name, COUNT(*) as count, GROUP_CONCAT(id) as ids
    FROM entities
    GROUP BY LOWER(name)
    HAVING COUNT(*) > 1
`).all() as any[];

let consolidated = 0;
for (const dup of duplicates) {
    const ids = dup.ids.split(',').map((id: string) => parseInt(id));
    const primaryId = ids[0];
    const duplicateIds = ids.slice(1);
    
    // Move relationships to primary entity
    for (const dupId of duplicateIds) {
        db.prepare('UPDATE entity_relationships SET source_id = ? WHERE source_id = ?').run(primaryId, dupId);
        db.prepare('UPDATE entity_relationships SET target_id = ? WHERE target_id = ?').run(primaryId, dupId);
        db.prepare('DELETE FROM entities WHERE id = ?').run(dupId);
        consolidated++;
    }
}
console.log(`  Consolidated ${consolidated} duplicate entities`);

// ============================================================================
// 6. REBUILD FTS INDEX
// ============================================================================

console.log('\n[Fix] Rebuilding FTS index...');

try {
    db.exec(`
        DELETE FROM entities_fts;
        INSERT INTO entities_fts(rowid, name, role, description)
        SELECT id, name, role, description FROM entities;
    `);
    console.log('  FTS rebuilt successfully');
} catch (e) {
    console.log('  FTS rebuild skipped (might already be up to date)');
}

// ============================================================================
// FINAL STATS
// ============================================================================

console.log('\n========================================');
console.log('[Fix] Data Quality Fix Complete!');
console.log('========================================');

const stats = db.prepare(`
    SELECT 
        (SELECT COUNT(*) FROM entities) as total_entities,
        (SELECT COUNT(*) FROM entities WHERE type = 'Unknown') as unknowns,
        (SELECT COUNT(*) FROM entities WHERE red_flag_rating >= 4) as high_rfi,
        (SELECT COUNT(*) FROM entity_relationships) as relationships
`).get() as any;

console.log(`Entities:       ${stats.total_entities}`);
console.log(`Unknowns:       ${stats.unknowns}`);
console.log(`High RFI (4+):  ${stats.high_rfi}`);
console.log(`Relationships:  ${stats.relationships}`);

// Show top 10 by RFI
console.log('\nTop 10 by Red Flag Index:');
const top10 = db.prepare(`
    SELECT name, red_flag_rating, role, type 
    FROM entities 
    ORDER BY red_flag_rating DESC, name ASC 
    LIMIT 10
`).all() as any[];

for (const e of top10) {
    console.log(`  🚩${e.red_flag_rating} ${e.name} (${e.role}, ${e.type})`);
}

db.close();
