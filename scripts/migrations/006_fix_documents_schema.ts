import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'epstein-archive.db');
const db = new Database(dbPath);

console.log('Migrating documents table schema...');

try {
  // Add file_name if missing
  try {
    db.prepare('ALTER TABLE documents ADD COLUMN file_name TEXT').run();
    console.log('Added column: file_name');
  } catch (e: any) {
    if (e.message.includes('duplicate column')) {
      console.log('Column file_name already exists');
    } else {
      console.error('Error adding file_name:', e);
    }
  }

  // Add original_file_path if missing
  try {
    db.prepare('ALTER TABLE documents ADD COLUMN original_file_path TEXT').run();
    console.log('Added column: original_file_path');
  } catch (e: any) {
    if (e.message.includes('duplicate column')) {
      console.log('Column original_file_path already exists');
    } else {
      console.error('Error adding original_file_path:', e);
    }
  }

  // Add content_hash if missing (it was md5_hash?)
  try {
    db.prepare('ALTER TABLE documents ADD COLUMN content_hash TEXT').run();
    console.log('Added column: content_hash');
  } catch (e: any) {
    if (e.message.includes('duplicate column')) {
      console.log('Column content_hash already exists');
    }
  }
} catch (error) {
  console.error('Migration failed:', error);
} finally {
  db.close();
}
