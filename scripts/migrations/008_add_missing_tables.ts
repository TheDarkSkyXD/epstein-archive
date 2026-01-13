import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'epstein-archive.db');
const db = new Database(dbPath);

console.log('Adding missing tables and columns for deployment verification...');

try {
  db.transaction(() => {
    // 1. Create black_book_entries
    db.prepare(
      `
      CREATE TABLE IF NOT EXISTS black_book_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        person_id INTEGER,
        entry_text TEXT,
        phone_numbers TEXT,
        addresses TEXT,
        email_addresses TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (person_id) REFERENCES entities(id) ON DELETE CASCADE
      )
    `,
    ).run();
    console.log('Created table: black_book_entries');

    // 2. Create tags
    db.prepare(
      `
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        color TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
    ).run();
    console.log('Created table: tags');

    // 3. Create document_tags
    db.prepare(
      `
      CREATE TABLE IF NOT EXISTS document_tags (
        document_id INTEGER,
        tag_id INTEGER,
        PRIMARY KEY (document_id, tag_id),
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      )
    `,
    ).run();
    console.log('Created table: document_tags');

    // 3b. Create image_tags (also needed by MediaService but maybe verified separately? tags API uses it)
    db.prepare(
      `
      CREATE TABLE IF NOT EXISTS image_tags (
        image_id INTEGER,
        tag_id INTEGER,
        PRIMARY KEY (image_id, tag_id),
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      )
    `,
    ).run();
    console.log('Created table: image_tags');

    // 4. Create sessions
    db.prepare(
      `
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        expires_at DATETIME,
        data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
    ).run();
    console.log('Created table: sessions');

    // 5. Add is_hidden to documents
    try {
      db.prepare('ALTER TABLE documents ADD COLUMN is_hidden INTEGER DEFAULT 0').run();
      console.log('Added column: documents.is_hidden');
    } catch (e: any) {
      if (!e.message.includes('duplicate column')) console.error(e);
    }

    // 6. Add strength to entity_relationships
    try {
      // First check if entity_relationships exists
      const exists = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='entity_relationships'",
        )
        .get();
      if (exists) {
        db.prepare('ALTER TABLE entity_relationships ADD COLUMN strength REAL DEFAULT 1.0').run();
        console.log('Added column: entity_relationships.strength');
      } else {
        // Create it if missing
        db.prepare(
          `
                CREATE TABLE IF NOT EXISTS entity_relationships (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    source_entity_id INTEGER,
                    target_entity_id INTEGER,
                    relationship_type TEXT,
                    strength REAL DEFAULT 1.0,
                    confidence REAL DEFAULT 1.0,
                    description TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (source_entity_id) REFERENCES entities(id),
                    FOREIGN KEY (target_entity_id) REFERENCES entities(id)
                )
            `,
        ).run();
        console.log('Created table: entity_relationships');
      }
    } catch (e: any) {
      if (!e.message.includes('duplicate column')) console.error(e);
    }
  })();

  console.log('Migration completed successfully.');
} catch (error) {
  console.error('Migration failed:', error);
} finally {
  db.close();
}
