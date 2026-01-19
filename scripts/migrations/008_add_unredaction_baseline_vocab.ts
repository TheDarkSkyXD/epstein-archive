import { Database } from 'better-sqlite3';

export function up(db: Database): void {
  console.log('Running migration 008: Add unredaction baseline vocabulary');
  
  db.exec(`
    ALTER TABLE documents 
    ADD COLUMN unredaction_baseline_vocab TEXT;
  `);
  
  console.log('Migration 008 completed: Added unredaction_baseline_vocab column');
}

export function down(db: Database): void {
  console.log('Rolling back migration 008');
  
  // SQLite doesn't support DROP COLUMN directly in older versions
  // For a proper rollback, we'd need to recreate the table
  // For now, we'll just note that this column can be ignored
  db.exec(`
    UPDATE documents SET unredaction_baseline_vocab = NULL;
  `);
  
  console.log('Migration 008 rolled back');
}
