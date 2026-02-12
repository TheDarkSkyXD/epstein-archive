import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'epstein-archive.db');
const db = new Database(DB_PATH);

console.log(`[MIGRATION] Checking schema for documents table in ${DB_PATH}...`);

try {
  // Check if 'content' column exists
  const tableInfo = db.prepare('PRAGMA table_info(documents)').all();
  const hasContent = tableInfo.some((col: any) => col.name === 'content');

  if (!hasContent) {
    console.log('[MIGRATION] "content" column missing. Adding it...');
    db.prepare('ALTER TABLE documents ADD COLUMN content TEXT').run();
    console.log('[MIGRATION] Added "content" column successfully.');
  } else {
    console.log('[MIGRATION] "content" column already exists.');
  }

  // Also check for metadata_json if missing (it's used for thread_id etc)
  const hasMetadata = tableInfo.some((col: any) => col.name === 'metadata_json');
  if (!hasMetadata) {
    console.log('[MIGRATION] "metadata_json" column missing. Adding it...');
    db.prepare('ALTER TABLE documents ADD COLUMN metadata_json TEXT').run();
    console.log('[MIGRATION] Added "metadata_json" column successfully.');
  }

  console.log('[MIGRATION] Schema check complete.');
} catch (error) {
  console.error('[MIGRATION] Error updating schema:', error);
  process.exit(1);
} finally {
  db.close();
}
