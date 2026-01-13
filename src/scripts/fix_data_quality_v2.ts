/**
 * Data Quality Fix Script
 * Fixes RFI scores, mentions, unknown cleanup, and entity consolidation
 */

import Database from 'better-sqlite3';
import { resolve } from 'path';

const DB_PATH = process.env.DB_PATH || resolve(process.cwd(), 'epstein-archive.db');

console.log('[Fix] Starting Data Quality Fix...');
console.log(`[Fix] DB Path: ${DB_PATH}`);

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Detect columns dynamically to handle schema divergence (Local vs Production)
const columns = db.pragma('table_info(entities)') as any[];
const getCol = (possibleNames: string[]) => {
  const found = columns.find((c: any) => possibleNames.includes(c.name));
  return found ? found.name : possibleNames[0]; // Default to first if not found (fallback)
};

const nameCol = getCol(['full_name', 'name']);
const roleCol = getCol(['primary_role', 'role']);
const secondaryRoleCol = getCol(['secondary_roles']); // Might be undefined
const descCol = getCol(['connections_summary', 'description']);
const typeCol = getCol(['entity_type', 'type']);
const mentionsCol = getCol(['mentions', 'mention_count']);
const referencesCol = getCol(['document_count', 'files']);

console.log(`[Fix] Detected Schema:`);
console.log(`  - Name: ${nameCol}`);
console.log(`  - Role: ${roleCol}`);
console.log(`  - Type: ${typeCol}`);
console.log(`  - Mentions: ${mentionsCol}`);
console.log(`  - File Refs: ${referencesCol}`);
console.log(`  - Secondary Role: ${secondaryRoleCol || '(Missing)'}`);
console.log(`  - Description: ${descCol}`);

// Detect relationship columns
const relColumns = db.pragma('table_info(entity_relationships)') as any[];
const getRelCol = (possibleNames: string[]) => {
  const found = relColumns.find((c: any) => possibleNames.includes(c.name));
  return found ? found.name : possibleNames[0];
};

const sourceCol = getRelCol(['source_entity_id', 'source_id']);
const targetCol = getRelCol(['target_entity_id', 'target_id']);
console.log(`  - Source ID: ${sourceCol}, Target ID: ${targetCol}`);

// ============================================================================
// 0. DROP BROKEN TRIGGERS & FTS (Safe Mode)
// ============================================================================
console.log('\n[Fix] Dropping potential broken FTS triggers/tables to verify updates...');
try {
  db.exec(`DROP TRIGGER IF EXISTS entities_fts_insert`);
  db.exec(`DROP TRIGGER IF EXISTS entities_fts_update`);
  db.exec(`DROP TRIGGER IF EXISTS entities_fts_delete`);
  db.exec(`DROP TABLE IF EXISTS entities_fts`);
  console.log('  Dropped FTS artifacts successfully');
} catch (e: any) {
  console.warn('  Warning dropping FTS artifacts:', e.message);
}

// ============================================================================
// 1. FIX RED FLAG INDEX SCORES
// ============================================================================
console.log('\n[Fix] Updating Red Flag Index scores...');

// Key perpetrators should have RFI = 5
const keyPerpetrators = ['Jeffrey Epstein', 'Ghislaine Maxwell'];

// High risk individuals RFI = 4
const highRisk = ['Jean-Luc Brunel', 'Sarah Kellen', 'Nadia Marcinkova', 'Lesley Groff'];

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

const updateRFI = db.prepare(
  `UPDATE entities SET red_flag_rating = ? WHERE LOWER(${nameCol}) = LOWER(?)`,
);

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
    UPDATE entities SET red_flag_rating = 5 WHERE ${nameCol} LIKE 'Jeffrey Epstein%' OR ${nameCol} LIKE 'Jeffrey E. Epstein%';
    UPDATE entities SET red_flag_rating = 5 WHERE ${nameCol} LIKE 'Ghislaine Maxwell%';
`);
console.log('  Updated Epstein/Maxwell variations to RFI=5');

console.log('\n[Fix] Step 2 postponed to end (Mentions Computation)...');

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

const unknownEntities = db
  .prepare(
    `
    SELECT id, ${nameCol} as name FROM entities WHERE ${typeCol} = 'Unknown'
`,
  )
  .all() as any[];

const deleteEntity = db.prepare('DELETE FROM entities WHERE id = ?');
const deleteRelationships = db.prepare(
  `DELETE FROM entity_relationships WHERE ${sourceCol} = ? OR ${targetCol} = ?`,
);

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
// 4. RECLASSIFY & 5. CONSOLIDATE
// ============================================================================
// ... (Keeping existing logic but using nameCol) ...
console.log('\n[Fix] Reclassifying/Consolidating...');
const personNamePattern = /^[A-Z][a-z]+\s+[A-Z][a-z]+/;
const reclassifyPerson = db.prepare(`UPDATE entities SET ${typeCol} = 'Person' WHERE id = ?`);
const remainingUnknowns = db
  .prepare(`SELECT id, ${nameCol} as name FROM entities WHERE ${typeCol} = 'Unknown'`)
  .all() as any[];
let reclassified = 0;
for (const entity of remainingUnknowns) {
  if (personNamePattern.test(entity.name || '')) {
    reclassifyPerson.run(entity.id);
    reclassified++;
  }
}
console.log(`  Reclassified ${reclassified} entities`);

const duplicates = db
  .prepare(
    `
    SELECT ${nameCol} as name, COUNT(*) as count, GROUP_CONCAT(id) as ids
    FROM entities GROUP BY LOWER(${nameCol}) HAVING COUNT(*) > 1
`,
  )
  .all() as any[];
let consolidated = 0;
for (const dup of duplicates) {
  const ids = dup.ids.split(',').map(Number);
  const primaryId = ids[0];
  const dropIds = ids.slice(1);
  for (const dId of dropIds) {
    db.prepare(`UPDATE entity_relationships SET ${sourceCol} = ? WHERE ${sourceCol} = ?`).run(
      primaryId,
      dId,
    );
    db.prepare(`UPDATE entity_relationships SET ${targetCol} = ? WHERE ${targetCol} = ?`).run(
      primaryId,
      dId,
    );
    db.prepare(`DELETE FROM entities WHERE id = ?`).run(dId);
    consolidated++;
  }
}
console.log(`  Consolidated ${consolidated} duplicates`);

// ============================================================================
// 6. REBUILD FTS & TRIGGERS (THE FIX)
// ============================================================================
console.log('\n[Fix] Rebuilding FTS and Triggers...');

// Construct columns list for FTS
const ftsCols = [nameCol, roleCol, descCol];
if (secondaryRoleCol) ftsCols.push(secondaryRoleCol);

const createFtsSql = `CREATE VIRTUAL TABLE IF NOT EXISTS entities_fts USING fts5(${ftsCols.join(', ')}, content='entities', content_rowid='id')`;
db.exec(createFtsSql);

// Re-populate
const populateSql = `INSERT INTO entities_fts(rowid, ${ftsCols.join(', ')}) SELECT id, ${ftsCols.join(', ')} FROM entities`;
db.exec(populateSql);
console.log('  Re-populated entities_fts');

// Re-create Triggers (Dynamic)
const triggerCols = ftsCols.map((c) => `${c} = NEW.${c}`).join(', ');
const triggerVals = ftsCols.map((c) => `NEW.${c}`).join(', ');
const headerList = ftsCols.join(', ');

db.exec(`
    CREATE TRIGGER IF NOT EXISTS entities_fts_insert AFTER INSERT ON entities BEGIN
        INSERT INTO entities_fts(rowid, ${headerList}) VALUES (NEW.id, ${triggerVals});
    END;
    CREATE TRIGGER IF NOT EXISTS entities_fts_update AFTER UPDATE ON entities BEGIN
        UPDATE entities_fts SET ${triggerCols} WHERE rowid = OLD.id;
    END;
    CREATE TRIGGER IF NOT EXISTS entities_fts_delete AFTER DELETE ON entities BEGIN
        DELETE FROM entities_fts WHERE rowid = OLD.id;
    END;
`);
console.log('  Re-created Triggers successfully');

// ============================================================================
// 7. COMPUTE MENTIONS (Now that we have clean entities)
// ============================================================================
console.log('\n[Fix] Computing Mentions via FTS...');

// Ensure documents_fts exists for querying
try {
  db.exec(
    `CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(content, content='documents', content_rowid='id')`,
  );
  // Populate if empty (simple check)
  const ftsCount = (db.prepare('SELECT COUNT(*) as c FROM documents_fts').get() as any).c;
  if (ftsCount === 0) {
    console.log('  Populating documents_fts...');
    db.exec(
      `INSERT INTO documents_fts(rowid, content) SELECT id, content FROM documents WHERE content IS NOT NULL`,
    );
  }
} catch (e: any) {
  console.warn('  Warning setting up documents_fts:', e.message);
}

// Prepare statements
const updateMentions = db.prepare(`UPDATE entities SET ${mentionsCol} = ? WHERE id = ?`);
// We use simple token match for speed. "Name" -> PHRASE match
const countMentions = db.prepare(
  `SELECT COUNT(*) as count FROM documents_fts WHERE content MATCH ?`,
);

const allEntities = db.prepare(`SELECT id, ${nameCol} as name FROM entities`).all() as any[];
let updatedMentionsCount = 0;

const batchSize = 1000;
db.exec('BEGIN TRANSACTION');

for (let i = 0; i < allEntities.length; i++) {
  const e = allEntities[i];
  if (!e.name || e.name.length < 3) continue;

  try {
    // Escape quotes in name for FTS query
    const safeName = e.name.replace(/"/g, '""');
    // Match exact phrase
    const count = (countMentions.get(`"${safeName}"`) as any).count;

    updateMentions.run(count, e.id);
    updatedMentionsCount++;
  } catch (ignore) {}

  if (i % batchSize === 0 && i > 0) {
    db.exec('COMMIT');
    db.exec('BEGIN TRANSACTION');
    process.stdout.write(`  Processed ${i}/${allEntities.length}\r`);
  }
}
db.exec('COMMIT');
console.log(`  Updated mentions for ${updatedMentionsCount} entities.`);

// ============================================================================
// FINAL STATS
// ============================================================================
console.log('\n[Fix] Complete. Final Stats:');
const stats = db
  .prepare(
    `
    SELECT 
        (SELECT COUNT(*) FROM entities) as total,
        (SELECT COUNT(*) FROM entities WHERE ${typeCol} = 'Unknown') as unknowns,
        (SELECT COUNT(*) FROM entities WHERE red_flag_rating >= 4) as high_risk
`,
  )
  .get() as any;
console.log(
  `  Entities: ${stats.total}, Unknowns: ${stats.unknowns}, High Risk: ${stats.high_risk}`,
);

// Show top 10 by RFI
console.log('\nTop 10 by Red Flag Index:');
const top10 = db
  .prepare(
    `
    SELECT ${nameCol} as name, red_flag_rating, role, type 
    FROM entities 
    ORDER BY red_flag_rating DESC, ${nameCol} ASC 
    LIMIT 10
`,
  )
  .all() as any[];

for (const e of top10) {
  console.log(`  🚩${e.red_flag_rating} ${e.name} (${e.role}, ${e.type})`);
}

db.close();
