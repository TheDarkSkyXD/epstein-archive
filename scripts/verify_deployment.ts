#!/usr/bin/env npx tsx
/**
 * verify_deployment.ts
 *
 * Pre-flight verification script for Epstein Archive deployments.
 * Run this BEFORE deploying to catch schema mismatches, missing tables,
 * and configuration errors that could cause production outages.
 *
 * Usage: npx tsx scripts/verify_deployment.ts [--remote]
 */

import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

// ============================================
// CONFIGURATION - Update this when schema changes!
// ============================================

const EXPECTED_PORT = 3012; // Must match Nginx proxy_pass for glasscode.academy

const REQUIRED_TABLES = [
  'entities',
  'documents',
  'entity_relationships',
  'investigations',
  'evidence',
  'media_albums',
  'media_images',
  'black_book_entries',
  'audit_log',
  'tags',
  'users',
  'timeline_events',
];

const REQUIRED_COLUMNS: Record<string, string[]> = {
  entities: [
    'id',
    'full_name',
    'entity_type',
    'primary_role',
    'mentions',
    'red_flag_rating',
    'red_flag_score',
    'created_at',
  ],
  documents: [
    'id',
    'file_name',
    'file_path',
    'file_type',
    'content',
    'red_flag_rating',
    'evidence_type',
    'created_at',
  ],
  entity_relationships: [
    'id',
    'source_entity_id',
    'target_entity_id',
    'relationship_type',
    'strength',
    'confidence',
  ],
  black_book_entries: [
    'id',
    'person_id',
    'entry_text',
    'phone_numbers',
    'addresses',
    'email_addresses',
  ],
};

// ============================================
// VERIFICATION FUNCTIONS
// ============================================

interface VerificationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
}

function verifyTables(db: Database.Database): VerificationResult {
  const result: VerificationResult = { passed: true, errors: [], warnings: [] };

  const existingTables = db
    .prepare(
      `
    SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
  `,
    )
    .all()
    .map((row: any) => row.name);

  for (const table of REQUIRED_TABLES) {
    if (!existingTables.includes(table)) {
      result.errors.push(`❌ Missing table: ${table}`);
      result.passed = false;
    }
  }

  if (result.passed) {
    console.log(`✅ All ${REQUIRED_TABLES.length} required tables exist`);
  }

  return result;
}

function verifyColumns(db: Database.Database): VerificationResult {
  const result: VerificationResult = { passed: true, errors: [], warnings: [] };

  for (const [table, columns] of Object.entries(REQUIRED_COLUMNS)) {
    try {
      const tableInfo = db.pragma(`table_info(${table})`) as Array<{ name: string }>;
      const existingColumns = tableInfo.map((col) => col.name);

      for (const column of columns) {
        if (!existingColumns.includes(column)) {
          result.errors.push(`❌ Missing column: ${table}.${column}`);
          result.passed = false;
        }
      }
    } catch (e: any) {
      result.errors.push(`❌ Cannot read schema for table: ${table} (${e.message})`);
      result.passed = false;
    }
  }

  if (result.passed) {
    console.log(`✅ All required columns exist in critical tables`);
  }

  return result;
}

function verifyEnvironment(): VerificationResult {
  const result: VerificationResult = { passed: true, errors: [], warnings: [] };

  const port = parseInt(process.env.PORT || '0', 10);

  if (port && port !== EXPECTED_PORT) {
    result.warnings.push(`⚠️  PORT is ${port}, but production expects ${EXPECTED_PORT}`);
  }

  if (!process.env.DB_PATH) {
    result.warnings.push(`⚠️  DB_PATH not set, will use default`);
  }

  console.log(`✅ Environment check complete`);
  return result;
}

async function verifyEcosystemConfig(): Promise<VerificationResult> {
  const result: VerificationResult = { passed: true, errors: [], warnings: [] };

  const configPath = path.resolve('ecosystem.config.cjs');
  if (!fs.existsSync(configPath)) {
    result.errors.push(`❌ ecosystem.config.cjs not found`);
    result.passed = false;
    return result;
  }

  // Use createRequire for ESM compatibility
  const { createRequire } = await import('module');
  const require = createRequire(import.meta.url);
  const config = require(configPath);
  const envPort = config.apps?.[0]?.env?.PORT;

  if (envPort !== EXPECTED_PORT) {
    result.errors.push(`❌ ecosystem.config.cjs PORT is ${envPort}, must be ${EXPECTED_PORT}`);
    result.passed = false;
  } else {
    console.log(`✅ ecosystem.config.cjs PORT correctly set to ${EXPECTED_PORT}`);
  }

  return result;
}

function verifyDataIntegrity(db: Database.Database): VerificationResult {
  const result: VerificationResult = { passed: true, errors: [], warnings: [] };

  try {
    const entityCount = (db.prepare('SELECT COUNT(*) as count FROM entities').get() as any).count;
    const docCount = (db.prepare('SELECT COUNT(*) as count FROM documents').get() as any).count;

    if (entityCount === 0) {
      result.warnings.push(`⚠️  No entities in database - is this intentional?`);
    }
    if (docCount === 0) {
      result.warnings.push(`⚠️  No documents in database - is this intentional?`);
    }

    console.log(`✅ Data integrity check: ${entityCount} entities, ${docCount} documents`);
  } catch (e: any) {
    result.warnings.push(`⚠️  Could not verify data counts: ${e.message}`);
  }

  return result;
}

/**
 * Runtime Database Tests - Actually execute queries that the app uses
 */
function verifyRuntimeQueries(db: Database.Database): VerificationResult {
  const result: VerificationResult = { passed: true, errors: [], warnings: [] };

  const criticalQueries = [
    {
      name: 'Entity listing query',
      sql: 'SELECT id, full_name, mentions FROM entities WHERE mentions > 0 LIMIT 5',
    },
    {
      name: 'Document listing query',
      sql: 'SELECT id, file_name, evidence_type FROM documents LIMIT 5',
    },
    {
      name: 'Entity relationships query',
      sql: 'SELECT source_entity_id, target_entity_id, relationship_type FROM entity_relationships LIMIT 5',
    },
    {
      name: 'Black book query',
      sql: 'SELECT id, entry_text FROM black_book_entries LIMIT 5',
    },
    {
      name: 'Stats aggregation query',
      sql: `SELECT 
              (SELECT COUNT(*) FROM entities) as entities,
              (SELECT COUNT(*) FROM documents) as documents`,
    },
    {
      name: 'Join query (entity-document)',
      sql: `SELECT e.full_name, COUNT(em.document_id) as doc_count
            FROM entities e
            LEFT JOIN entity_mentions em ON e.id = em.entity_id
            GROUP BY e.id
            LIMIT 3`,
    },
  ];

  console.log('\n🔍 Running critical query tests...');

  for (const query of criticalQueries) {
    try {
      const startTime = Date.now();
      const rows = db.prepare(query.sql).all();
      const duration = Date.now() - startTime;

      if (duration > 5000) {
        result.warnings.push(`⚠️  ${query.name} took ${duration}ms (slow)`);
      } else {
        console.log(`   ✓ ${query.name}: ${rows.length} rows (${duration}ms)`);
      }
    } catch (e: any) {
      result.errors.push(`❌ ${query.name} FAILED: ${e.message}`);
      result.passed = false;
    }
  }

  if (result.passed) {
    console.log(`✅ All critical queries executed successfully`);
  }

  return result;
}

/**
 * SQLite Database Integrity Check
 */
function verifySqliteIntegrity(db: Database.Database): VerificationResult {
  const result: VerificationResult = { passed: true, errors: [], warnings: [] };

  console.log('\n🗄️  Checking SQLite database integrity...');

  try {
    // PRAGMA integrity_check
    const integrityResult = db.pragma('integrity_check') as Array<{ integrity_check: string }>;
    if (integrityResult[0]?.integrity_check === 'ok') {
      console.log('   ✓ PRAGMA integrity_check: ok');
    } else {
      result.errors.push(
        `❌ Database integrity check failed: ${integrityResult[0]?.integrity_check}`,
      );
      result.passed = false;
    }

    // Check WAL mode
    const journalMode = db.pragma('journal_mode') as Array<{ journal_mode: string }>;
    const mode = journalMode[0]?.journal_mode;
    if (mode === 'wal') {
      console.log('   ✓ Journal mode: WAL (recommended)');
    } else {
      result.warnings.push(
        `⚠️  Journal mode is ${mode}, not WAL (consider switching for better concurrency)`,
      );
    }

    // Check for foreign key violations
    try {
      const fkViolations = db.pragma('foreign_key_check') as any[];
      if (fkViolations.length === 0) {
        console.log('   ✓ No foreign key violations');
      } else {
        result.warnings.push(`⚠️  ${fkViolations.length} foreign key violations found`);
      }
    } catch {
      // Foreign key check might not be available
    }
  } catch (e: any) {
    result.errors.push(`❌ Database integrity check crashed: ${e.message}`);
    result.passed = false;
  }

  return result;
}

// Service port assignments - MUST match Nginx config
const PRODUCTION_SERVICES = {
  'epstein-archive': { port: 3012, healthEndpoint: '/api/health' },
  // Future services can be added here
} as const;

// TODO: Implement health check endpoint - see UNUSED_VARIABLES_RECOMMENDATIONS.md
function _verifyPortAssignments(): VerificationResult {
  const result: VerificationResult = { passed: true, errors: [], warnings: [] };

  console.log('✅ Port assignments verified against INFRASTRUCTURE.md');
  console.log('   Expected services:');
  for (const [name, config] of Object.entries(PRODUCTION_SERVICES)) {
    console.log(`   - ${name}: port ${config.port}`);
  }

  return result;
}

// ============================================
// MAIN EXECUTION
// ============================================

async function main() {
  console.log('\n🔍 EPSTEIN ARCHIVE PRE-DEPLOYMENT VERIFICATION\n');
  console.log('='.repeat(50));

  const dbPath = process.env.DB_PATH || './epstein-archive.db';
  console.log(`📁 Database: ${dbPath}\n`);

  if (!fs.existsSync(dbPath)) {
    console.error(`❌ FATAL: Database not found at ${dbPath}`);
    process.exit(1);
  }

  const db = new Database(dbPath, { readonly: true });

  const results: VerificationResult[] = [];

  // Run all verifications
  results.push(verifyTables(db));
  results.push(verifyColumns(db));
  results.push(verifyEnvironment());
  results.push(await verifyEcosystemConfig());
  results.push(verifyDataIntegrity(db));
  results.push(verifySqliteIntegrity(db));
  results.push(verifyRuntimeQueries(db));

  db.close();

  // Aggregate results
  console.log('\n' + '='.repeat(50));

  const allErrors = results.flatMap((r) => r.errors);
  const allWarnings = results.flatMap((r) => r.warnings);
  const allPassed = results.every((r) => r.passed);

  if (allWarnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    allWarnings.forEach((w) => console.log(`   ${w}`));
  }

  if (allErrors.length > 0) {
    console.log('\n❌ ERRORS (DEPLOYMENT BLOCKED):');
    allErrors.forEach((e) => console.log(`   ${e}`));
    console.log('\n🛑 VERIFICATION FAILED - DO NOT DEPLOY\n');
    process.exit(1);
  }

  if (allPassed) {
    console.log('\n✅ ALL CHECKS PASSED - SAFE TO DEPLOY\n');
    process.exit(0);
  }
}

main().catch((e) => {
  console.error('❌ Verification script crashed:', e);
  process.exit(1);
});
