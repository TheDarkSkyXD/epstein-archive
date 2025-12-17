#!/usr/bin/env tsx
/**
 * Enhanced Entity Consolidation with Misspelling Detection
 * 
 * Improvements over original:
 * 1. Levenshtein distance matching for misspellings
 * 2. Better junk pattern detection (OCR artifacts, single chars, numbers)
 * 3. Phonetic similarity matching (Soundex-like)
 * 4. Common OCR error corrections
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../../epstein-archive-production.db');

console.log('[Enhanced Consolidation] Starting...');
console.log(`[DB] Path: ${DB_PATH}`);

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// ============================================================================
// LEVENSHTEIN DISTANCE IMPLEMENTATION
// ============================================================================

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function normalizedSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(a, b) / maxLen;
}

// ============================================================================
// PHONETIC SIMILARITY (Simplified Soundex-like)
// ============================================================================

function phoneticKey(name: string): string {
  return name
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .replace(/[AEIOUYHW]/g, '')
    .replace(/([BFPV])+/g, '1')
    .replace(/([CGJKQSXZ])+/g, '2')
    .replace(/([DT])+/g, '3')
    .replace(/([L])+/g, '4')
    .replace(/([MN])+/g, '5')
    .replace(/([R])+/g, '6')
    .substring(0, 8);
}

// ============================================================================
// ENHANCED JUNK PATTERNS
// ============================================================================

const JUNK_PATTERNS: RegExp[] = [
  // Single characters or too short
  /^.{0,2}$/,
  
  // Only numbers
  /^\d+$/,
  
  // Common OCR artifacts
  /^[IilO0]+$/,
  /^[_\-\.]+$/,
  
  // File extensions or paths
  /\.(pdf|doc|txt|jpg|png|msg|eml|html)$/i,
  /^\/|\\|[A-Z]:\\/,
  
  // URLs and emails
  /https?:|www\.|\.com|\.org|\.net/i,
  /@/,
  
  // Code/technical artifacts
  /^[a-z]+[A-Z]+[a-z]+/,  // camelCase
  /\{|\}|\[|\]|;|<|>/,
  
  // Repeated characters
  /(.)\1{3,}/,
  
  // All caps single word under 4 chars (likely abbreviation noise)
  /^[A-Z]{1,3}$/,
  
  // Common noise words
  /^(the|and|or|in|on|at|to|for|of|by|with|from|this|that|which|what|when|where|who|how|why)$/i,
  
  // Page/document markers
  /^(page|document|file|item|record|entry|row|line)\s*\d*$/i,
  
  // Date-like strings that aren't names
  /^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/,
  
  // Phone numbers
  /^\d{3}[\-\.]\d{3}[\-\.]\d{4}$/,
  /^\(\d{3}\)\s*\d{3}[\-\.]\d{4}$/,
  
  // Generic labels
  /^(unknown|unnamed|unspecified|none|null|undefined|n\/a|na|tbd|tba)$/i,
  
  // OCR garbage with mixed special chars
  /[^\w\s]{3,}/,
  
  // Words ending with common OCR errors
  /\s+(Part|Page|Has|Owned|Pm|Pnl|Pnrt|Reference|Defendant|Date|Head|Campany|Companv)\s*$/i,
];

function isJunkEntity(name: string): boolean {
  if (!name) return true;
  
  const trimmed = name.trim();
  
  // Check all junk patterns
  for (const pattern of JUNK_PATTERNS) {
    if (pattern.test(trimmed)) return true;
  }
  
  // Must have at least one vowel (for names)
  if (!/[aeiouAEIOU]/.test(trimmed)) return true;
  
  // Must have at least 3 characters
  if (trimmed.length < 3) return true;
  
  // Ratio of letters to non-letters should be reasonable
  const letters = (trimmed.match(/[a-zA-Z]/g) || []).length;
  if (letters / trimmed.length < 0.5) return true;
  
  return false;
}

// ============================================================================
// COMMON OCR CORRECTIONS
// ============================================================================

const OCR_CORRECTIONS: [RegExp, string][] = [
  [/rn/g, 'm'],       // "rn" → "m"
  [/l([ij])/gi, 'li'], // "lj" or "li" confusion
  [/0/g, 'O'],         // zero → O in names
  [/1(?=[a-zA-Z])/g, 'l'], // 1 before letter → l
  [/\bVV/g, 'W'],      // "VV" → "W"
  [/([A-Z])\.(?=[a-zA-Z])/g, '$1'], // Remove period in initials
];

function correctOcrErrors(name: string): string {
  let corrected = name;
  for (const [pattern, replacement] of OCR_CORRECTIONS) {
    corrected = corrected.replace(pattern, replacement);
  }
  return corrected.trim();
}

// ============================================================================
// MAIN CONSOLIDATION LOGIC
// ============================================================================

console.log('\n[Step 1] Cleaning junk entities...');

const allEntities = db.prepare(`
  SELECT id, full_name as name, entity_type as type, primary_role as role FROM entities ORDER BY id
`).all() as any[];

console.log(`  Total entities: ${allEntities.length}`);

const deleteEntity = db.prepare('DELETE FROM entities WHERE id = ?');
const deleteRelationships = db.prepare('DELETE FROM entity_relationships WHERE source_entity_id = ? OR target_entity_id = ?');

let deletedJunk = 0;
const validEntities: any[] = [];

for (const entity of allEntities) {
  if (isJunkEntity(entity.name)) {
    deleteRelationships.run(entity.id, entity.id);
    deleteEntity.run(entity.id);
    deletedJunk++;
  } else {
    validEntities.push(entity);
  }
}

console.log(`  Deleted junk entities: ${deletedJunk}`);

// ============================================================================
// STEP 2: FIND AND MERGE MISSPELLINGS
// ============================================================================

console.log('\n[Step 2] Finding misspelling duplicates...');

const mergeRelationships = db.prepare('UPDATE entity_relationships SET source_entity_id = ? WHERE source_entity_id = ?');
const mergeRelationshipsTarget = db.prepare('UPDATE entity_relationships SET target_entity_id = ? WHERE target_entity_id = ?');

// Group entities by phonetic key for faster comparison
const phoneticGroups: Map<string, any[]> = new Map();

for (const entity of validEntities) {
  const pKey = phoneticKey(entity.name);
  if (!phoneticGroups.has(pKey)) {
    phoneticGroups.set(pKey, []);
  }
  phoneticGroups.get(pKey)!.push(entity);
}

let mergedMisspellings = 0;
const mergedIds = new Set<number>();

// For each phonetic group, check Levenshtein distance
const groupEntries = Array.from(phoneticGroups.entries());
for (const [, group] of groupEntries) {
  if (group.length < 2) continue;
  
  // Sort by ID (keep earliest as canonical)
  group.sort((a, b) => a.id - b.id);
  
  for (let i = 0; i < group.length; i++) {
    if (mergedIds.has(group[i].id)) continue;
    
    const canonical = group[i];
    const canonicalNormalized = canonical.name.toLowerCase().replace(/[^a-z]/g, '');
    
    for (let j = i + 1; j < group.length; j++) {
      if (mergedIds.has(group[j].id)) continue;
      
      const candidate = group[j];
      const candidateNormalized = candidate.name.toLowerCase().replace(/[^a-z]/g, '');
      
      // Must be same type or one is Unknown
      if (canonical.type !== candidate.type && 
          canonical.type !== 'Unknown' && 
          candidate.type !== 'Unknown') {
        continue;
      }
      
      // Calculate similarity
      const similarity = normalizedSimilarity(canonicalNormalized, candidateNormalized);
      
      // Threshold: 85% similar for short names, 90% for longer names
      const threshold = canonicalNormalized.length > 10 ? 0.90 : 0.85;
      
      if (similarity >= threshold) {
        // Merge candidate into canonical
        mergeRelationships.run(canonical.id, candidate.id);
        mergeRelationshipsTarget.run(canonical.id, candidate.id);
        deleteEntity.run(candidate.id);
        mergedIds.add(candidate.id);
        mergedMisspellings++;
        
        if (mergedMisspellings <= 20) {
          console.log(`  Merged: "${candidate.name}" → "${canonical.name}" (${(similarity * 100).toFixed(1)}%)`);
        }
      }
    }
  }
}

console.log(`  Total merged misspellings: ${mergedMisspellings}`);

// ============================================================================
// STEP 3: CORRECT OCR ERRORS IN REMAINING ENTITIES
// ============================================================================

console.log('\n[Step 3] Correcting OCR errors...');

const updateName = db.prepare('UPDATE entities SET full_name = ? WHERE id = ?');
let correctedCount = 0;

const remainingEntities = db.prepare(`SELECT id, full_name as name FROM entities`).all() as any[];

for (const entity of remainingEntities) {
  const corrected = correctOcrErrors(entity.name);
  if (corrected !== entity.name && corrected.length > 0) {
    // Check if corrected name already exists
    const existing = db.prepare('SELECT id FROM entities WHERE LOWER(full_name) = LOWER(?) AND id != ?')
      .get(corrected, entity.id) as { id: number } | undefined;
    
    if (existing) {
      // Merge into existing
      mergeRelationships.run(existing.id, entity.id);
      mergeRelationshipsTarget.run(existing.id, entity.id);
      deleteEntity.run(entity.id);
    } else {
      updateName.run(corrected, entity.id);
    }
    correctedCount++;
  }
}

console.log(`  OCR corrections applied: ${correctedCount}`);

// ============================================================================
// STEP 4: FIX UNKNOWN TYPES
// ============================================================================

console.log('\n[Step 4] Reclassifying Unknown entities...');

const unknowns = db.prepare(`SELECT id, full_name as name FROM entities WHERE entity_type = 'Unknown' OR entity_type IS NULL`).all() as any[];

let reclassified = 0;

for (const entity of unknowns) {
  const name = entity.name?.trim() || '';
  
  // Person pattern: Two+ capitalized words
  if (/^[A-Z][a-z]+(\s+[A-Z]\.?\s*|\s+)[A-Z][a-z]+/.test(name)) {
    db.prepare('UPDATE entities SET entity_type = ? WHERE id = ?').run('Person', entity.id);
    reclassified++;
  }
  // Organization pattern
  else if (/(Inc|LLC|Ltd|Corp|Foundation|Trust|Company|Group|Partners|Holdings|Capital|Bank|University|Institute)/i.test(name)) {
    db.prepare('UPDATE entities SET entity_type = ? WHERE id = ?').run('Organization', entity.id);
    reclassified++;
  }
  // Location pattern
  else if (/(Island|Beach|City|Street|Avenue|Road|Boulevard|County|State|Country|Hotel|Resort|Airport)/i.test(name)) {
    db.prepare('UPDATE entities SET entity_type = ? WHERE id = ?').run('Location', entity.id);
    reclassified++;
  }
}

console.log(`  Reclassified: ${reclassified}`);

// ============================================================================
// STEP 5: REBUILD FTS INDEX
// ============================================================================

console.log('\n[Step 5] Rebuilding FTS index...');

try {
  db.exec(`
    DELETE FROM entities_fts;
    INSERT INTO entities_fts(rowid, name, role, description)
    SELECT id, full_name, primary_role, connections_summary FROM entities;
  `);
  console.log('  FTS index rebuilt');
} catch (e) {
  console.log('  FTS rebuild skipped (table may not exist)');
}

// ============================================================================
// FINAL STATS
// ============================================================================

console.log('\n========================================');
console.log('[RESULTS] Enhanced Consolidation Complete!');
console.log('========================================');

const finalStats = db.prepare(`
  SELECT 
    (SELECT COUNT(*) FROM entities) as total,
    (SELECT COUNT(*) FROM entities WHERE entity_type = 'Person') as persons,
    (SELECT COUNT(*) FROM entities WHERE entity_type = 'Organization') as orgs,
    (SELECT COUNT(*) FROM entities WHERE entity_type = 'Location') as locations,
    (SELECT COUNT(*) FROM entities WHERE entity_type = 'Unknown' OR entity_type IS NULL) as unknowns
`).get() as any;

console.log(`\nEntity Distribution:`);
console.log(`  Total:         ${finalStats.total}`);
console.log(`  Persons:       ${finalStats.persons}`);
console.log(`  Organizations: ${finalStats.orgs}`);
console.log(`  Locations:     ${finalStats.locations}`);
console.log(`  Unknowns:      ${finalStats.unknowns}`);

console.log(`\nCleanup Summary:`);
console.log(`  Junk deleted:        ${deletedJunk}`);
console.log(`  Misspellings merged: ${mergedMisspellings}`);
console.log(`  OCR corrected:       ${correctedCount}`);
console.log(`  Reclassified:        ${reclassified}`);

db.close();
console.log('\n[Done] Database closed.');
