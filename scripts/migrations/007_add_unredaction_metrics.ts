import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'epstein-archive.db');
const db = new Database(dbPath);

console.log('Adding unredaction metrics columns to documents table (if missing)...');

try {
  const addColumnIfMissing = (name: string, type: string) => {
    try {
      db.prepare(`ALTER TABLE documents ADD COLUMN ${name} ${type}`).run();
      console.log(`Added column: ${name}`);
    } catch (e: any) {
      if (typeof e.message === 'string' && e.message.includes('duplicate column')) {
        console.log(`Column ${name} already exists`);
      } else {
        console.error(`Error adding ${name}:`, e);
      }
    }
  };

  addColumnIfMissing('unredaction_attempted', 'INTEGER DEFAULT 0');
  addColumnIfMissing('unredaction_succeeded', 'INTEGER DEFAULT 0');
  addColumnIfMissing('redaction_coverage_before', 'REAL');
  addColumnIfMissing('redaction_coverage_after', 'REAL');
  addColumnIfMissing('unredacted_text_gain', 'REAL');
} catch (error) {
  console.error('Migration 007 failed:', error);
} finally {
  db.close();
}
