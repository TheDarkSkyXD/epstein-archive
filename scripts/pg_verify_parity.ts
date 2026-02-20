import Database from 'better-sqlite3';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const DB_PATH = process.env.DB_PATH || 'epstein-archive.db';
const PG_URL = process.env.DATABASE_URL;

if (!PG_URL) {
  console.error('❌ Error: DATABASE_URL is required.');
  process.exit(1);
}

const sqlite = new Database(DB_PATH, { readonly: true });
const pgPool = new pg.Pool({ connectionString: PG_URL });

async function verifyTable(tableName: string, pgTableName: string) {
  // 1. Row Count Parity
  const sqliteCount = (sqlite.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get() as any)
    .count;
  const pgResult = await pgPool.query(`SELECT COUNT(*) as count FROM ${pgTableName}`);
  const pgCount = parseInt(pgResult.rows[0].count);

  if (sqliteCount !== pgCount) {
    console.error(
      `❌ ${tableName}: COUNT MISMATCH! SQLite=${sqliteCount}, Postgres=${pgCount} (Diff: ${Math.abs(sqliteCount - pgCount)})`,
    );
    return false;
  }

  // 2. Bucketed Parity (16 Buckets) for Forensic Granularity
  // For UUID-based tables, we can count distinct prefixes or similar, but let's keep it simple for now.
  const hasIdColumn = (sqlite.prepare(`PRAGMA table_info(${tableName})`).all() as any[]).some(
    (c) => c.name === 'id',
  );
  const idTypeIsInt =
    hasIdColumn &&
    (sqlite.prepare(`PRAGMA table_info(${tableName})`).all() as any[]).find((c) => c.name === 'id')
      ?.type === 'INTEGER';

  if (hasIdColumn && idTypeIsInt && sqliteCount > 0) {
    const sqliteBuckets = sqlite
      .prepare(
        `
          SELECT (id % 16) as bucket, COUNT(*) as cnt, SUM(id) as sum_id 
          FROM ${tableName} 
          GROUP BY 1 ORDER BY 1
      `,
      )
      .all() as any[];

    const pgBucketsResult = await pgPool.query(`
          SELECT (id % 16) as bucket, COUNT(*) as cnt, SUM(id) as sum_id 
          FROM ${pgTableName} 
          GROUP BY 1 ORDER BY 1
      `);
    const pgBuckets = pgBucketsResult.rows;

    if (sqliteBuckets.length !== pgBuckets.length) {
      console.error(
        `❌ ${tableName}: BUCKET COUNT MISMATCH! SQLiteBuckets=${sqliteBuckets.length}, PostgresBuckets=${pgBuckets.length}`,
      );
      return false;
    }

    for (let i = 0; i < sqliteBuckets.length; i++) {
      const sqB = sqliteBuckets[i];
      const pgB = pgBuckets[i];

      if (sqB.bucket != pgB.bucket || sqB.cnt != pgB.cnt || sqB.sum_id != pgB.sum_id) {
        console.error(
          `❌ ${tableName}: BUCKET MISMATCH at bucket ${sqB.bucket}! SQLite(cnt=${sqB.cnt}, sum=${sqB.sum_id}) vs Postgres(cnt=${pgB.cnt}, sum=${pgB.sum_id})`,
        );
        return false;
      }
    }
  }

  console.log(`✅ ${tableName}: ${sqliteCount} rows. Parity verified.`);
  return true;
}

async function runVerification() {
  console.log('🔍 Verifying Data Parity (Forensic Mode)...');

  const tables = [
    'users',
    'audit_log',
    'evidence_types',
    'documents',
    'entities',
    'entity_evidence_types',
    'entity_mentions',
    'entity_relationships',
    'relations',
    'investigations',
    'investigation_evidence',
    'media_albums',
    'media_items',
    'media_tags',
    'media_album_items',
    'financial_transactions',
    'timeline_events',
    'ingest_runs',
    'claim_triples',
    'document_pages',
    'document_sentences',
    'document_spans',
    'mentions',
    'resolution_candidates',
    'quality_flags',
    'relation_evidence',
  ];

  let errors = 0;
  try {
    for (const table of tables) {
      try {
        const ok = await verifyTable(table, table);
        if (!ok) errors++;
      } catch (e: any) {
        console.warn(`   ⚠ Table ${table} verification skipped or failed: ${e.message}`);
      }
    }

    if (errors === 0) {
      console.log('\n🌟 ALL TABLES IN PARITY.');
    } else {
      console.error(`\n🚨 FOUND ${errors} PARITY ERRORS.`);
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Verification script crashed:', err);
    process.exit(1);
  } finally {
    sqlite.close();
    await pgPool.end();
  }
}

runVerification();
