import Database from 'better-sqlite3';
import { join } from 'path';

const DB_PATH = join(process.cwd(), 'epstein-archive.db');

function columnExists(db: Database.Database, table: string, column: string): boolean {
  const result = db.prepare(`PRAGMA table_info(${table})`).all() as any[];
  return result.some((col) => col.name === column);
}

function addColumnIfNotExists(
  db: Database.Database,
  table: string,
  column: string,
  type: string,
  defaultValue?: string,
) {
  if (!columnExists(db, table, column)) {
    const defaultClause = defaultValue ? ` DEFAULT ${defaultValue}` : '';
    try {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}${defaultClause}`);
      console.log(`  ✅ Added ${table}.${column}`);
      return true;
    } catch (e: any) {
      if (e.message.includes('duplicate column')) {
        console.log(`  ⏭️  ${table}.${column} already exists (caught error)`);
        return false;
      }
      throw e;
    }
  } else {
    console.log(`  ⏭️  ${table}.${column} already exists`);
    return false;
  }
}

function runMigration() {
  console.log('🚀 Starting Migration 013: Add JobManager Columns to Documents Table');

  const db = new Database(DB_PATH);

  try {
    let addedCount = 0;

    console.log('\n📄 Extending documents table...');

    // processing_status
    addedCount += addColumnIfNotExists(db, 'documents', 'processing_status', 'TEXT', "'queued'")
      ? 1
      : 0;

    // processing_attempts
    addedCount += addColumnIfNotExists(db, 'documents', 'processing_attempts', 'INTEGER', '0')
      ? 1
      : 0;

    // worker_id
    addedCount += addColumnIfNotExists(db, 'documents', 'worker_id', 'TEXT') ? 1 : 0;

    // lease_expires_at
    addedCount += addColumnIfNotExists(db, 'documents', 'lease_expires_at', 'DATETIME') ? 1 : 0;

    // last_processed_at
    addedCount += addColumnIfNotExists(db, 'documents', 'last_processed_at', 'DATETIME') ? 1 : 0;

    // processing_error
    addedCount += addColumnIfNotExists(db, 'documents', 'processing_error', 'TEXT') ? 1 : 0;

    // Create indexes for performance
    console.log('\n🔍 Creating indexes...');
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_documents_processing_status ON documents(processing_status);
      CREATE INDEX IF NOT EXISTS idx_documents_worker_lease ON documents(worker_id, lease_expires_at);
    `);

    console.log(`\n✅ Migration 013 completed successfully`);
    console.log(`   Added ${addedCount} new columns`);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

runMigration();
