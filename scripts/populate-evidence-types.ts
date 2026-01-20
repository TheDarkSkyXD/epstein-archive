#!/usr/bin/env npx tsx
/**
 * Migration script to populate evidence_types and entity_evidence_types tables
 * from existing entity_mentions + documents data.
 *
 * This enables the evidence_types field to display in PersonCards.
 *
 * Run with: npx tsx scripts/populate-evidence-types.ts
 */

import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'epstein-archive.db');

console.log(`📂 Using database: ${DB_PATH}`);

const db = new Database(DB_PATH, { timeout: 30000 });
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Step 1: Check current state
console.log('\n📊 Current state:');
const evidenceTypesCount = (db.prepare('SELECT COUNT(*) as count FROM evidence_types').get() as any)
  .count;
const entityEvidenceTypesCount = (
  db.prepare('SELECT COUNT(*) as count FROM entity_evidence_types').get() as any
).count;
const entityMentionsCount = (
  db.prepare('SELECT COUNT(*) as count FROM entity_mentions').get() as any
).count;

console.log(`  evidence_types: ${evidenceTypesCount} rows`);
console.log(`  entity_evidence_types: ${entityEvidenceTypesCount} rows`);
console.log(`  entity_mentions: ${entityMentionsCount} rows`);

// Step 2: Get distinct evidence types from documents
console.log('\n🔍 Finding distinct evidence types in documents...');
const distinctTypes = db
  .prepare(
    `
  SELECT DISTINCT evidence_type 
  FROM documents 
  WHERE evidence_type IS NOT NULL AND evidence_type != ''
  ORDER BY evidence_type
`,
  )
  .all() as { evidence_type: string }[];

console.log(
  `  Found ${distinctTypes.length} types: ${distinctTypes.map((t) => t.evidence_type).join(', ')}`,
);

// Step 3: Populate evidence_types lookup table
console.log('\n📝 Populating evidence_types lookup table...');
const insertType = db.prepare(`
  INSERT OR IGNORE INTO evidence_types (type_name, description) 
  VALUES (?, ?)
`);

const typeDescriptions: Record<string, string> = {
  document: 'Legal documents, court filings, and official records',
  email: 'Email correspondence and communications',
  photo: 'Photographs and images',
  testimony: 'Witness testimonies and depositions',
  flight_record: 'Flight logs and travel records',
  video: 'Video recordings and footage',
  audio: 'Audio recordings',
  financial: 'Financial records and transactions',
};

const insertTypesTx = db.transaction(() => {
  for (const { evidence_type } of distinctTypes) {
    const description = typeDescriptions[evidence_type] || `${evidence_type} evidence`;
    insertType.run(evidence_type, description);
  }
});
insertTypesTx();

const newTypesCount = (db.prepare('SELECT COUNT(*) as count FROM evidence_types').get() as any)
  .count;
console.log(`  Inserted ${newTypesCount - evidenceTypesCount} new evidence types`);

// Step 4: Create index for performance if not exists
console.log('\n🔧 Ensuring indexes exist...');
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_entity_mentions_entity_doc ON entity_mentions(entity_id, document_id);
  CREATE INDEX IF NOT EXISTS idx_documents_evidence_type ON documents(evidence_type);
`);

// Step 5: Populate entity_evidence_types from entity_mentions + documents
console.log('\n📝 Populating entity_evidence_types (this may take a moment)...');

// Get the type ID mapping
const typeIdMap = new Map<string, number>();
const types = db.prepare('SELECT id, type_name FROM evidence_types').all() as {
  id: number;
  type_name: string;
}[];
for (const t of types) {
  typeIdMap.set(t.type_name, t.id);
}

// Aggregate distinct entity + evidence_type combinations
// Collect all results first (can't use iterator with transactions)
// Filter to only entities that exist (some mentions may reference deleted entities)
console.log('  Querying aggregated data...');
const aggregatedData = db
  .prepare(
    `
  SELECT DISTINCT 
    em.entity_id,
    d.evidence_type
  FROM entity_mentions em
  JOIN documents d ON em.document_id = d.id
  JOIN entities e ON em.entity_id = e.id
  WHERE d.evidence_type IS NOT NULL AND d.evidence_type != ''
`,
  )
  .all() as { entity_id: number; evidence_type: string }[];

console.log(`  Found ${aggregatedData.length} entity-evidence_type combinations`);

const insertEntityEvidence = db.prepare(`
  INSERT OR IGNORE INTO entity_evidence_types (entity_id, evidence_type_id)
  VALUES (?, ?)
`);

let insertedCount = 0;
let skippedCount = 0;

const insertAll = db.transaction((rows: { entity_id: number; evidence_type: string }[]) => {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const typeId = typeIdMap.get(row.evidence_type);
    if (typeId) {
      const result = insertEntityEvidence.run(row.entity_id, typeId);
      if (result.changes > 0) insertedCount++;
      else skippedCount++;
    }
    if (i % 10000 === 0 && i > 0) {
      process.stdout.write(`  Processed ${i} / ${rows.length} rows...\r`);
    }
  }
});

insertAll(aggregatedData);

console.log(`\n  Inserted ${insertedCount} entity_evidence_types rows`);
console.log(`  Skipped ${skippedCount} duplicates`);

// Step 6: Verify results
console.log('\n✅ Final state:');
const finalTypesCount = (db.prepare('SELECT COUNT(*) as count FROM evidence_types').get() as any)
  .count;
const finalEntityTypesCount = (
  db.prepare('SELECT COUNT(*) as count FROM entity_evidence_types').get() as any
).count;

console.log(`  evidence_types: ${finalTypesCount} rows`);
console.log(`  entity_evidence_types: ${finalEntityTypesCount} rows`);

// Show sample of entities with evidence types
console.log('\n📋 Sample entities with evidence types:');
const sample = db
  .prepare(
    `
  SELECT 
    e.full_name,
    GROUP_CONCAT(DISTINCT et.type_name) as evidence_types
  FROM entities e
  JOIN entity_evidence_types eet ON e.id = eet.entity_id
  JOIN evidence_types et ON eet.evidence_type_id = et.id
  GROUP BY e.id
  ORDER BY e.mentions DESC
  LIMIT 10
`,
  )
  .all() as { full_name: string; evidence_types: string }[];

for (const row of sample) {
  console.log(`  ${row.full_name}: [${row.evidence_types}]`);
}

db.close();
console.log('\n🎉 Migration complete!');
