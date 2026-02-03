import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'epstein-archive.db');
const db = new Database(dbPath);

console.log('Running migration 009: Add unredacted markup column');

try {
  db.prepare('ALTER TABLE documents ADD COLUMN unredacted_span_json TEXT').run();
  console.log('Added column: unredacted_span_json');
} catch (e: any) {
  if (typeof e.message === 'string' && e.message.includes('duplicate column')) {
    console.log('Column unredacted_span_json already exists');
  } else {
    console.error('Error adding unredacted_span_json:', e);
  }
}
