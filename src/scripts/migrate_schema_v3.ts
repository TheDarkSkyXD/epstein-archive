import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'epstein-archive.db');

function migrate() {
  console.log('Starting Schema Migration v3...');

  if (!fs.existsSync(DB_PATH)) {
    console.error('Database file not found!');
    process.exit(1);
  }

  const db = new Database(DB_PATH);

  try {
    // 1. Add content column to documents table if it doesn't exist
    try {
      const tableInfo = db.prepare("PRAGMA table_info(documents)").all() as any[];
      const hasContent = tableInfo.some(col => col.name === 'content');
      
      if (!hasContent) {
        console.log('Adding content column to documents table...');
        db.prepare("ALTER TABLE documents ADD COLUMN content TEXT").run();
      } else {
        console.log('content column already exists.');
      }
    } catch (error) {
      console.error('Error adding content column:', error);
    }

    // 2. Add UNIQUE index on file_path
    try {
        console.log('Creating UNIQUE index on documents(file_path)...');
        // First, we might have duplicates. We should delete them or ignore the error?
        // If we have duplicates, creating unique index will fail.
        // Let's check for duplicates first.
        
        const duplicates = db.prepare(`
            SELECT file_path, COUNT(*) as count 
            FROM documents 
            GROUP BY file_path 
            HAVING count > 1
        `).all() as any[];
        
        if (duplicates.length > 0) {
            console.log(`Found ${duplicates.length} duplicate file paths. Cleaning up...`);
            // Keep the one with the lowest ID (oldest)
            db.prepare(`
                DELETE FROM documents 
                WHERE id NOT IN (
                    SELECT MIN(id) 
                    FROM documents 
                    GROUP BY file_path
                )
            `).run();
            console.log('Duplicates removed.');
        }
        
        db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_filepath ON documents(file_path)").run();
        console.log('Unique index created.');
    } catch (error) {
        console.error('Error creating unique index:', error);
    }

    console.log('Migration v3 completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

migrate();
