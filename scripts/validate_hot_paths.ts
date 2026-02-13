/**
 * PRODUCTION PERFORMANCE HARDENING
 *
 * Comprehensive query validation and index verification
 * Ensures zero temp B-trees on hot paths
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = process.env.DB_PATH || join(__dirname, '..', 'epstein-archive.db');

interface QueryPlan {
  id: number;
  parent: number;
  notused: number;
  detail: string;
}

interface HotQuery {
  name: string;
  query: string;
  maxTempBtrees: number; // 0 for hot paths
  requiredIndexes: string[];
}

// CRITICAL HOT PATHS - ZERO TEMP B-TREES ALLOWED
const HOT_QUERIES: HotQuery[] = [
  {
    name: 'Homepage Top 250 Entities',
    query: `
      SELECT id, full_name, primary_role, mentions, red_flag_rating, is_vip
      FROM entities
      WHERE is_vip = 1
      ORDER BY mentions DESC, red_flag_rating DESC, full_name ASC
      LIMIT 250
    `,
    maxTempBtrees: 0,
    requiredIndexes: ['idx_entities_vip_mentions_rating'],
  },
  {
    name: 'People List (Paginated)',
    query: `
      SELECT id, full_name, primary_role, mentions, red_flag_rating
      FROM entities
      ORDER BY red_flag_rating DESC, mentions DESC
      LIMIT 24 OFFSET 0
    `,
    maxTempBtrees: 0,
    requiredIndexes: ['idx_entities_rating_mentions'],
  },
  {
    name: 'Entity Documents Tab',
    query: `
      SELECT d.id, d.file_name, d.red_flag_rating, d.date_created
      FROM documents d
      JOIN entity_mentions em ON d.id = em.document_id
      WHERE em.entity_id = 1
      ORDER BY em.doc_red_flag_rating DESC, em.doc_date_created DESC
      LIMIT 50
    `,
    maxTempBtrees: 0,
    requiredIndexes: ['idx_entity_mentions_entity_sorted'],
  },
  {
    name: 'Email Thread List',
    query: `
      SELECT id, file_name, metadata_json, date_created
      FROM documents
      WHERE type = 'email'
      ORDER BY date_created DESC
      LIMIT 500
    `,
    maxTempBtrees: 0,
    requiredIndexes: ['idx_documents_type_date'],
  },
  {
    name: 'Entity Relationships',
    query: `
      SELECT target_entity_id, relationship_type, strength, confidence
      FROM entity_relationships
      WHERE source_entity_id = 1
      ORDER BY strength DESC, confidence DESC
      LIMIT 20
    `,
    maxTempBtrees: 0,
    requiredIndexes: ['idx_entity_relationships_strength'],
  },
];

// REQUIRED INDEXES FOR HOT PATHS
const REQUIRED_INDEXES = [
  {
    name: 'idx_entities_vip_mentions_rating',
    table: 'entities',
    columns: 'is_vip, mentions DESC, red_flag_rating DESC, full_name ASC',
  },
  {
    name: 'idx_entities_rating_mentions',
    table: 'entities',
    columns: 'red_flag_rating DESC, mentions DESC',
  },
  {
    name: 'idx_documents_rating_date',
    table: 'documents',
    columns: 'red_flag_rating DESC, date_created DESC',
  },
  {
    name: 'idx_documents_type_date',
    table: 'documents',
    columns: 'type, date_created DESC',
  },
  {
    name: 'idx_entity_mentions_entity',
    table: 'entity_mentions',
    columns: 'entity_id, document_id',
  },
  {
    name: 'idx_entity_mentions_entity_sorted',
    table: 'entity_mentions',
    columns: 'entity_id, doc_red_flag_rating DESC, doc_date_created DESC, document_id',
  },
  {
    name: 'idx_entity_relationships_strength',
    table: 'entity_relationships',
    columns: 'source_entity_id, strength DESC, confidence DESC',
  },
];

function analyzeQuery(
  db: Database.Database,
  hotQuery: HotQuery,
): {
  passed: boolean;
  tempBtrees: number;
  warnings: string[];
} {
  const plan = db.prepare(`EXPLAIN QUERY PLAN ${hotQuery.query}`).all() as QueryPlan[];

  let tempBtrees = 0;
  const warnings: string[] = [];

  for (const step of plan) {
    const detail = step.detail.toUpperCase();

    // Check for temp B-tree
    if (detail.includes('USE TEMP B-TREE')) {
      tempBtrees++;
      warnings.push(`⚠️  TEMP B-TREE detected: ${step.detail}`);
    }

    // Check for table scan
    if (detail.includes('SCAN TABLE') && !detail.includes('USING INDEX')) {
      warnings.push(`⚠️  TABLE SCAN detected: ${step.detail}`);
    }
  }

  // Check required indexes exist
  for (const idxName of hotQuery.requiredIndexes) {
    const exists = db
      .prepare(`SELECT 1 FROM sqlite_master WHERE type='index' AND name=?`)
      .get(idxName);

    if (!exists) {
      warnings.push(`❌ MISSING INDEX: ${idxName}`);
    }
  }

  const passed =
    tempBtrees <= hotQuery.maxTempBtrees &&
    warnings.filter((w) => w.includes('MISSING')).length === 0;

  return { passed, tempBtrees, warnings };
}

function createMissingIndexes(db: Database.Database): void {
  console.log('\n' + '='.repeat(80));
  console.log('📝 Creating Required Indexes');
  console.log('='.repeat(80));

  for (const idx of REQUIRED_INDEXES) {
    const exists = db
      .prepare(`SELECT 1 FROM sqlite_master WHERE type='index' AND name=?`)
      .get(idx.name);

    if (exists) {
      console.log(`✅ ${idx.name} already exists`);
      continue;
    }

    try {
      const sql = `CREATE INDEX ${idx.name} ON ${idx.table}(${idx.columns})`;
      db.prepare(sql).run();
      console.log(`✅ Created ${idx.name}`);
    } catch (error: any) {
      console.error(`❌ Failed to create ${idx.name}: ${error.message}`);
    }
  }

  // Run ANALYZE
  console.log('\n📊 Running ANALYZE...');
  db.prepare('ANALYZE').run();
  console.log('✅ ANALYZE complete');
}

function main(): void {
  console.log('🔥 PRODUCTION PERFORMANCE VALIDATION\n');
  console.log(`Database: ${DB_PATH}\n`);

  const db = new Database(DB_PATH);

  // Create missing indexes first
  createMissingIndexes(db);

  console.log('\n' + '='.repeat(80));
  console.log('🔍 Validating Hot Path Queries');
  console.log('='.repeat(80));

  let allPassed = true;
  const results: Array<{ name: string; passed: boolean; tempBtrees: number }> = [];

  for (const hotQuery of HOT_QUERIES) {
    console.log(`\n📊 ${hotQuery.name}`);
    console.log(`   Max allowed temp B-trees: ${hotQuery.maxTempBtrees}`);

    const result = analyzeQuery(db, hotQuery);
    results.push({ name: hotQuery.name, passed: result.passed, tempBtrees: result.tempBtrees });

    if (result.tempBtrees > 0) {
      console.log(`   ⚠️  Temp B-trees: ${result.tempBtrees}`);
    } else {
      console.log(`   ✅ Temp B-trees: 0`);
    }

    if (result.warnings.length > 0) {
      result.warnings.forEach((w) => console.log(`   ${w}`));
    }

    if (result.passed) {
      console.log(`   ✅ PASSED`);
    } else {
      console.log(`   ❌ FAILED`);
      allPassed = false;
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 Summary');
  console.log('='.repeat(80));

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const totalTempBtrees = results.reduce((sum, r) => sum + r.tempBtrees, 0);

  console.log(`\n✅ Passed: ${passed}/${HOT_QUERIES.length}`);
  console.log(`❌ Failed: ${failed}/${HOT_QUERIES.length}`);
  console.log(`📊 Total temp B-trees: ${totalTempBtrees}`);

  if (allPassed) {
    console.log('\n🎉 ALL HOT PATHS OPTIMIZED - PRODUCTION READY!');
  } else {
    console.log('\n⚠️  PERFORMANCE ISSUES DETECTED - FIX BEFORE DEPLOY');
    process.exit(1);
  }

  db.close();
}

main();
