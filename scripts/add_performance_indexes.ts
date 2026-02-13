/**
 * Add Performance Indexes
 *
 * Creates indexes to eliminate temp B-tree usage in ORDER BY clauses
 * and optimize other hot paths identified by query analysis.
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = process.env.DB_PATH || join(__dirname, '..', 'epstein-archive.db');

interface IndexDefinition {
  name: string;
  table: string;
  columns: string;
  rationale: string;
}

const PERFORMANCE_INDEXES: IndexDefinition[] = [
  {
    name: 'idx_entities_vip_mentions_rating',
    table: 'entities',
    columns: 'is_vip, mentions DESC, red_flag_rating DESC, full_name ASC',
    rationale: 'Covering index for homepage entity query ORDER BY clause',
  },
  {
    name: 'idx_documents_rating_date',
    table: 'documents',
    columns: 'red_flag_rating DESC, date_created DESC',
    rationale: 'Covering index for entity documents tab ORDER BY clause',
  },
  {
    name: 'idx_entity_relationships_strength',
    table: 'entity_relationships',
    columns: 'source_entity_id, strength DESC, confidence DESC',
    rationale: 'Covering index for relationships ORDER BY clause',
  },
  {
    name: 'idx_media_items_rating_desc',
    table: 'media_items',
    columns: 'red_flag_rating DESC',
    rationale: 'Index for media items ORDER BY red_flag_rating',
  },
  {
    name: 'idx_entity_mentions_entity_doc_composite',
    table: 'entity_mentions',
    columns: 'entity_id, document_id, confidence_score DESC',
    rationale: 'Composite index for entity-document joins with confidence ordering',
  },
];

function createIndex(db: Database.Database, index: IndexDefinition): boolean {
  try {
    const sql = `CREATE INDEX IF NOT EXISTS ${index.name} ON ${index.table}(${index.columns})`;
    console.log(`\n📝 Creating index: ${index.name}`);
    console.log(`   Table: ${index.table}`);
    console.log(`   Columns: ${index.columns}`);
    console.log(`   Rationale: ${index.rationale}`);

    db.prepare(sql).run();
    console.log(`   ✅ Created successfully`);
    return true;
  } catch (error: any) {
    console.error(`   ❌ Failed: ${error.message}`);
    return false;
  }
}

function analyzeIndexUsage(db: Database.Database): void {
  console.log('\n' + '='.repeat(80));
  console.log('📊 Index Usage Analysis');
  console.log('='.repeat(80));

  // Get all indexes
  const indexes = db
    .prepare(
      `
    SELECT name, tbl_name, sql 
    FROM sqlite_master 
    WHERE type = 'index' 
      AND name LIKE 'idx_%'
    ORDER BY tbl_name, name
  `,
    )
    .all() as Array<{ name: string; tbl_name: string; sql: string | null }>;

  console.log(`\nTotal indexes: ${indexes.length}`);

  // Group by table
  const byTable: Record<string, typeof indexes> = {};
  for (const idx of indexes) {
    if (!byTable[idx.tbl_name]) byTable[idx.tbl_name] = [];
    byTable[idx.tbl_name].push(idx);
  }

  console.log(`\nIndexes by table:`);
  for (const [table, idxs] of Object.entries(byTable)) {
    console.log(`\n  ${table} (${idxs.length} indexes):`);
    idxs.forEach((idx) => {
      console.log(`    - ${idx.name}`);
    });
  }
}

function main(): void {
  console.log('🚀 Adding Performance Indexes\n');
  console.log(`Database: ${DB_PATH}\n`);

  const db = new Database(DB_PATH);

  let successCount = 0;
  let failCount = 0;

  console.log('='.repeat(80));
  console.log('Creating Indexes');
  console.log('='.repeat(80));

  for (const index of PERFORMANCE_INDEXES) {
    const success = createIndex(db, index);
    if (success) successCount++;
    else failCount++;
  }

  console.log('\n' + '='.repeat(80));
  console.log('Summary');
  console.log('='.repeat(80));
  console.log(`\n✅ Successfully created: ${successCount}/${PERFORMANCE_INDEXES.length}`);
  if (failCount > 0) {
    console.log(`❌ Failed: ${failCount}/${PERFORMANCE_INDEXES.length}`);
  }

  // Analyze index usage
  analyzeIndexUsage(db);

  // Optimize database
  console.log('\n' + '='.repeat(80));
  console.log('Optimizing Database');
  console.log('='.repeat(80));
  console.log('\n📊 Running ANALYZE...');
  db.prepare('ANALYZE').run();
  console.log('✅ ANALYZE complete');

  db.close();

  console.log('\n✅ Performance indexes added successfully!');
  console.log(
    '\n💡 Tip: Run `npx tsx scripts/analyze_query_performance.ts` again to verify improvements.',
  );
}

main();
