
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'epstein-archive.db');
const db = new Database(dbPath);

console.log('Migrating evidence table schema...');

try {
  // Add missing columns
  const columnsToAdd = [
    'cleaned_path TEXT',
    'original_filename TEXT',
    'mime_type TEXT',
    'extracted_text TEXT',
    'modified_at DATETIME',
    'red_flag_rating INTEGER DEFAULT 0',
    'evidence_tags TEXT',
    'word_count INTEGER DEFAULT 0',
    'file_size INTEGER DEFAULT 0',
    'content_hash TEXT' // We will migrate file_hash to content_hash
  ];

  for (const col of columnsToAdd) {
    try {
      db.prepare(`ALTER TABLE evidence ADD COLUMN ${col}`).run();
      console.log(`Added column: ${col.split(' ')[0]}`);
    } catch (error: any) {
      if (error.message.includes('duplicate column name')) {
        console.log(`Column already exists: ${col.split(' ')[0]}`);
      } else {
        console.error(`Error adding column ${col}:`, error);
      }
    }
  }

  // Migrate file_hash to content_hash if content_hash is empty
  db.prepare('UPDATE evidence SET content_hash = file_hash WHERE content_hash IS NULL').run();
  console.log('Migrated file_hash to content_hash');

} catch (error) {
  console.error('Migration failed:', error);
} finally {
  db.close();
}
