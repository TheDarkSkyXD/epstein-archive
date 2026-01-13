#!/usr/bin/env tsx
/**
 * Link Documents to Entities
 *
 * Scans documents (especially new emails) and creates entity_mentions links
 * for any entities mentioned in the document content.
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../../epstein-archive-production.db');

console.log('🔗 Document-Entity Linking Script');
console.log('==================================\n');
console.log(`Database: ${DB_PATH}`);

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Get TOP entities with reasonable names (limit for performance)
console.log('\n[Step 1] Loading top entities...');
const entities = db
  .prepare(
    `
  SELECT id, full_name 
  FROM entities 
  WHERE full_name IS NOT NULL 
  AND LENGTH(full_name) > 3
  AND full_name NOT LIKE '%Unknown%'
  ORDER BY 
    COALESCE(red_flag_rating, 0) DESC,
    COALESCE(mentions, 0) DESC,
    LENGTH(full_name) DESC
  LIMIT 1000
`,
  )
  .all() as { id: number; full_name: string }[];

console.log(`  Loaded ${entities.length} top entities`);

// Build search patterns (normalize names for matching)
const entityPatterns = entities
  .map((e) => ({
    id: e.id,
    name: e.full_name,
    pattern: e.full_name.toLowerCase().replace(/[^\w\s]/g, ''),
  }))
  .filter((e) => e.pattern.length > 3);

console.log(`  ${entityPatterns.length} patterns prepared for matching`);

// Get documents that don't have entity mentions yet (prioritize emails)
console.log('\n[Step 2] Finding documents to process...');

const documentsToProcess = db
  .prepare(
    `
  SELECT d.id, d.file_name, d.content, d.evidence_type
  FROM documents d
  WHERE d.content IS NOT NULL 
  AND LENGTH(d.content) > 50
  AND NOT EXISTS (
    SELECT 1 FROM entity_mentions em WHERE em.document_id = d.id
  )
  ORDER BY 
    CASE WHEN d.evidence_type = 'email' THEN 0 ELSE 1 END,
    d.id DESC
  LIMIT 20000
`,
  )
  .all() as { id: number; file_name: string; content: string; evidence_type: string }[];

console.log(`  Found ${documentsToProcess.length} documents without entity mentions`);

// Prepare statements
const insertMention = db.prepare(`
  INSERT OR IGNORE INTO entity_mentions (entity_id, document_id, mention_count, first_seen_at)
  VALUES (?, ?, ?, datetime('now'))
`);

const updateEntityMentionCount = db.prepare(`
  UPDATE entities SET mentions = (
    SELECT COUNT(DISTINCT document_id) FROM entity_mentions WHERE entity_id = ?
  )
  WHERE id = ?
`);

// Process documents
console.log('\n[Step 3] Scanning documents for entity mentions...');

let totalMentions = 0;
let docsWithMentions = 0;
const entityMentionCounts: Map<number, number> = new Map();

const batchSize = 500;
let processed = 0;

db.exec('BEGIN TRANSACTION');

try {
  for (const doc of documentsToProcess) {
    const contentLower = (doc.content || '').toLowerCase().replace(/[^\w\s]/g, ' ');
    const mentionsInDoc: { entityId: number; count: number }[] = [];

    for (const entity of entityPatterns) {
      // Count occurrences
      const regex = new RegExp(`\\b${entity.pattern.replace(/\s+/g, '\\s+')}\\b`, 'gi');
      const matches = contentLower.match(regex);

      if (matches && matches.length > 0) {
        mentionsInDoc.push({ entityId: entity.id, count: matches.length });
        entityMentionCounts.set(entity.id, (entityMentionCounts.get(entity.id) || 0) + 1);
      }
    }

    if (mentionsInDoc.length > 0) {
      docsWithMentions++;
      for (const mention of mentionsInDoc) {
        insertMention.run(mention.entityId, doc.id, mention.count);
        totalMentions++;
      }
    }

    processed++;
    if (processed % batchSize === 0) {
      process.stdout.write(`\r  Processed ${processed}/${documentsToProcess.length} documents...`);
    }
  }

  console.log(`\r  Processed ${processed}/${documentsToProcess.length} documents`);

  // Update entity mention counts
  console.log('\n[Step 4] Updating entity mention counts...');

  let updated = 0;
  for (const [entityId] of entityMentionCounts) {
    updateEntityMentionCount.run(entityId, entityId);
    updated++;
  }

  console.log(`  Updated counts for ${updated} entities`);

  db.exec('COMMIT');
} catch (error) {
  db.exec('ROLLBACK');
  throw error;
}

// Final stats
console.log('\n========================================');
console.log('LINKING COMPLETE');
console.log('========================================');
console.log(`  Documents processed: ${processed}`);
console.log(`  Documents with mentions: ${docsWithMentions}`);
console.log(`  Total mention links created: ${totalMentions}`);
console.log(`  Unique entities mentioned: ${entityMentionCounts.size}`);

// Show top mentioned entities
console.log('\nTop 20 Most Mentioned Entities:');
const topEntities = Array.from(entityMentionCounts.entries())
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20);

for (const [entityId, count] of topEntities) {
  const entity = entities.find((e) => e.id === entityId);
  console.log(`  ${count} docs: ${entity?.full_name || 'Unknown'}`);
}

db.close();
console.log('\n[Done] Database closed.');
