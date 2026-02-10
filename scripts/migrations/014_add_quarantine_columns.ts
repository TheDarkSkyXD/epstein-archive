import Database from 'better-sqlite3';

/**
 * Migration 014: Add Quarantine Columns
 *
 * Adds missing columns for content classification and quarantine tracking
 * as used in ingest_intelligence.ts
 */
export async function up(dbPath: string) {
  const db = new Database(dbPath);
  console.log('🚀 Starting Migration 014: Add Quarantine Columns');

  try {
    db.transaction(() => {
      // Add quarantine tracking columns
      console.log('   Adding quarantine_status...');
      try {
        db.prepare("ALTER TABLE documents ADD COLUMN quarantine_status TEXT DEFAULT 'none'").run();
      } catch (e: any) {
        if (e.message.includes('duplicate column')) {
          console.log('   quarantine_status already exists');
        } else throw e;
      }

      console.log('   Adding quarantine_reason...');
      try {
        db.prepare('ALTER TABLE documents ADD COLUMN quarantine_reason TEXT').run();
      } catch (e: any) {
        if (e.message.includes('duplicate column')) {
          console.log('   quarantine_reason already exists');
        } else throw e;
      }

      console.log('   Adding quarantine_at...');
      try {
        db.prepare('ALTER TABLE documents ADD COLUMN quarantine_at DATETIME').run();
      } catch (e: any) {
        if (e.message.includes('duplicate column')) {
          console.log('   quarantine_at already exists');
        } else throw e;
      }

      // Indices for performance
      console.log('   Adding indices...');
      db.prepare(
        'CREATE INDEX IF NOT EXISTS idx_documents_quarantine ON documents(quarantine_status)',
      ).run();
    })();

    console.log('✅ Migration 014 complete.');
  } catch (err) {
    console.error('❌ Migration 014 failed:', err);
    throw err;
  } finally {
    db.close();
  }
}

// Support running directly if needed
if (import.meta.url === `file://${process.argv[1]}`) {
  const dbPath = process.env.DB_PATH || 'epstein-archive.db';
  up(dbPath).catch(() => process.exit(1));
}
