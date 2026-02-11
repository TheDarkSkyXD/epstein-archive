import Database from 'better-sqlite3';
import { unlinkSync, existsSync } from 'fs';

const SOURCE_DB_PATH = process.env.DB_PATH || 'epstein-archive.db';
const SAMPLE_DB_PATH = 'sample.db';

console.log(`🚀 Creating high-quality sample database from ${SOURCE_DB_PATH}...`);

if (existsSync(SAMPLE_DB_PATH)) {
  unlinkSync(SAMPLE_DB_PATH);
  console.log('🗑️  Removed existing sample.db');
}

const sourceDb = new Database(SOURCE_DB_PATH);
const sampleDb = new Database(SAMPLE_DB_PATH);

// Disable FKs on both connections
sourceDb.pragma('foreign_keys = OFF');
sampleDb.pragma('foreign_keys = OFF');

// 1. Dynamic Schema Cloning
console.log('📐 Cloning schema...');
const tables = sourceDb
  .prepare(
    "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '%_fts%'",
  )
  .all() as any[];

sampleDb.exec('BEGIN;');
sampleDb.exec('PRAGMA foreign_keys = OFF;'); // Disable FKs for the copy
for (const table of tables) {
  sampleDb.exec(table.sql);
}
sampleDb.exec('COMMIT;');

// 2. Intelligent Top Entities Selection
console.log('👥 Identifying top entities...');
const junkPatterns = [
  '%House%',
  '%Office%',
  '%Street%',
  '%Road%',
  '%Avenue%',
  '%Park%',
  '%Beach%',
  '%Islands%',
  '%Times%',
  '%Post%',
  '%News%',
  '%Press%',
  '%Journal%',
  '%Magazine%',
  '%Inc%',
  '%LLC%',
  '%Corp%',
  '%Ltd%',
  '%Group%',
  '%Trust%',
  '%Foundation%',
  '%University%',
  '%College%',
  '%School%',
  '%Academy%',
  '%Judge%',
  '%Court%',
  '%Attorney%',
  '%Justice%',
  '%Department%',
  '%Bureau%',
  '%Agency%',
  '%Police%',
  '%Sheriff%',
  '%FBI%',
  '%CIA%',
  '%Secret Service%',
  '%Tower%',
  '%Desktop%',
  '%Printed%',
  '%Mexico%',
  '%Prior%',
  '%Subtractions%',
  '%Interest%',
  '%Checking%',
  '%Pricing%',
  '%Structure%',
  '%Reserved%',
  '%Management%',
  '%Information%',
  '%Code%',
  '%Contact%',
  '%Client%',
  '%Cruz%',
  '%Cooling%',
  '%Inspection%',
  '%Treatment%',
  '%Water%',
  '%Annual%',
  '%Justin%',
  '%Warner%',
  '%Cable%',
  '%Jed%',
  '%Lines%',
  '%Postage%',
  '%Articles%',
  '%Bills%',
  '%Homeowners%',
];

const junkFilter = junkPatterns.map(() => 'full_name NOT LIKE ?').join(' AND ');

const topEntities = sourceDb
  .prepare(
    `
  SELECT * FROM entities 
  WHERE type = 'Person' 
  AND mentions > 5 
  AND ${junkFilter}
  ORDER BY mentions DESC 
  LIMIT 50
`,
  )
  .all(junkPatterns) as any[];

console.log(`✅ Selected ${topEntities.length} key entities.`);

// 3. Data Collection Logic
const entityIds = new Set(topEntities.map((e) => e.id));
const docIds = new Set<number>();

// Helper to copy data for a table using dynamic columns
function copyTableData(tableName: string, ids: number[] | Set<number>, idColumn: string = 'id') {
  const idArray = Array.from(ids);
  if (idArray.length === 0) return;

  const columns = sourceDb.prepare(`PRAGMA table_info(${tableName})`).all() as any[];
  const colNames = columns.map((c) => c.name).join(', ');
  const placeholders = columns.map((c) => `@${c.name}`).join(', ');

  const insert = sampleDb.prepare(
    `INSERT OR IGNORE INTO ${tableName} (${colNames}) VALUES (${placeholders})`,
  );

  // Split into chunks to avoid SQLITE_LIMIT_VARIABLE_NUMBER
  const chunkSize = 500;
  for (let i = 0; i < idArray.length; i += chunkSize) {
    const chunk = idArray.slice(i, i + chunkSize);
    const selectStmt = `SELECT * FROM ${tableName} WHERE ${idColumn} IN (${chunk.map(() => '?').join(',')})`;
    const rows = sourceDb.prepare(selectStmt).all(chunk) as any[];

    sampleDb.transaction(() => {
      for (const row of rows) {
        insert.run(row);
      }
    })();
  }
  console.log(`📦 Copied data into ${tableName}.`);
}

// 4. Graph Expansion
console.log('🕸️  Expanding graph relationships...');

// Level 1: Entities
copyTableData('entities', entityIds);

// Level 2: Mentions & Documents (Limit documents to top density)
const mentions = sourceDb
  .prepare(
    `
  SELECT document_id, count(*) as c 
  FROM entity_mentions 
  WHERE entity_id IN (${Array.from(entityIds)
    .map(() => '?')
    .join(',')})
  GROUP BY document_id
  ORDER BY c DESC
  LIMIT 100
`,
  )
  .all(Array.from(entityIds)) as any[];

for (const m of mentions) docIds.add(m.document_id);
console.log(`📄 Selected top ${docIds.size} related documents.`);

// Level 3: Documents
copyTableData('documents', docIds);

// Level 4: All mentions in those documents (to get co-occurring entities)
const allMentions = sourceDb
  .prepare(
    `
  SELECT * FROM entity_mentions 
  WHERE document_id IN (${Array.from(docIds)
    .map(() => '?')
    .join(',')})
`,
  )
  .all(Array.from(docIds)) as any[];

const expandedEntityIds = new Set(entityIds);
for (const m of allMentions) expandedEntityIds.add(m.entity_id);

console.log(`🔗 Expanded to ${expandedEntityIds.size} total entities via co-occurrence.`);

// Re-copy entities and mentions to ensure full coverage
copyTableData('entities', expandedEntityIds);
copyTableData('entity_mentions', docIds, 'document_id');

// Level 5: Related Tables
const relatedTables = [
  { name: 'evidence_entity', idCol: 'entity_id', sourceIds: expandedEntityIds },
  { name: 'timeline_events', idCol: 'entity_id', sourceIds: expandedEntityIds },
  { name: 'entity_relationships', idCol: 'source_entity_id', sourceIds: expandedEntityIds },
  { name: 'media_items', idCol: 'entity_id', sourceIds: expandedEntityIds },
  { name: 'media_item_people', idCol: 'entity_id', sourceIds: expandedEntityIds },
  { name: 'financial_transactions', idCol: 'from_entity', idIsName: true }, // Special case for names
];

for (const table of relatedTables) {
  if (table.idIsName) {
    const names = Array.from(expandedEntityIds)
      .map((id) => {
        const e = topEntities.find((te) => te.id === id);
        return e ? e.full_name : null;
      })
      .filter(Boolean);

    if (names.length > 0) {
      const columns = sourceDb.prepare(`PRAGMA table_info(${table.name})`).all() as any[];
      const colNames = columns.map((c) => c.name).join(', ');
      const placeholders = columns.map((c) => `@${c.name}`).join(', ');
      const insert = sampleDb.prepare(
        `INSERT OR IGNORE INTO ${table.name} (${colNames}) VALUES (${placeholders})`,
      );
      const rows = sourceDb
        .prepare(
          `SELECT * FROM ${table.name} WHERE ${table.idCol} IN (${names.map(() => '?').join(',')})`,
        )
        .all(names) as any[];
      sampleDb.transaction(() => {
        for (const r of rows) insert.run(r);
      })();
      console.log(`📦 Copied ${rows.length} rows into ${table.name} (by name).`);
    }
  } else {
    copyTableData(table.name, table.sourceIds, table.idCol);
  }
}

// 5. Finalize
console.log('🧹 Finalizing database...');
sampleDb.exec('VACUUM;');
const integrity = sampleDb.prepare('PRAGMA integrity_check').get() as any;

if (integrity.integrity_check === 'ok') {
  console.log('✨ Sample database created successfully! (Integrity OK)');
} else {
  console.error('❌ Database integrity check failed:', integrity);
}

sourceDb.close();
sampleDb.close();
