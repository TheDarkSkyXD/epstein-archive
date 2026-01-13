import { databaseService } from '../services/DatabaseService';

async function migrate() {
  console.log('Starting Schema Migration v4...');

  try {
    // 1. Drop existing FTS tables and triggers to prevent interference
    console.log('Dropping existing FTS tables and triggers...');
    databaseService.exec(`
      DROP TABLE IF EXISTS entities_fts;
      DROP TABLE IF EXISTS documents_fts;
      
      DROP TRIGGER IF EXISTS entities_fts_insert;
      DROP TRIGGER IF EXISTS entities_fts_update;
      DROP TRIGGER IF EXISTS entities_fts_delete;
      DROP TRIGGER IF EXISTS documents_fts_insert;
      DROP TRIGGER IF EXISTS documents_fts_update;
      DROP TRIGGER IF EXISTS documents_fts_delete;
    `);

    // 2. Create new tables if they don't exist
    console.log('Creating evidence_types table...');
    databaseService.exec(`
      CREATE TABLE IF NOT EXISTS evidence_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type_name TEXT UNIQUE NOT NULL,
        description TEXT
      );
    `);

    console.log('Creating entity_evidence_types table...');
    databaseService.exec(`
      CREATE TABLE IF NOT EXISTS entity_evidence_types (
        entity_id INTEGER,
        evidence_type_id INTEGER,
        PRIMARY KEY (entity_id, evidence_type_id),
        FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE,
        FOREIGN KEY (evidence_type_id) REFERENCES evidence_types(id) ON DELETE CASCADE
      );
    `);

    // 3. Update documents table
    console.log('Updating documents table structure...');

    // Check if columns exist and if we need to rename filename -> file_name
    const columns = databaseService.prepare('PRAGMA table_info(documents)').all() as any[];
    const columnNames = columns.map((c) => c.name);

    const missingColumns = [
      'content',
      'metadata_json',
      'word_count',
      'spice_rating',
      'content_hash',
    ];
    const hasFilename = columnNames.includes('filename');
    const needsUpdate = missingColumns.some((col) => !columnNames.includes(col)) || hasFilename;

    // Also check for UNIQUE constraint on file_path (hard to check via PRAGMA, but we can assume we want to enforce it)
    // Since we want to add multiple columns and constraints, it's safer to recreate the table.

    if (needsUpdate) {
      console.log('Recreating documents table (adding columns or renaming filename)...');

      databaseService.exec('BEGIN TRANSACTION');

      try {
        // Rename existing table
        databaseService.exec('ALTER TABLE documents RENAME TO documents_old');

        // Create new table
        databaseService.exec(`
              CREATE TABLE documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_name TEXT NOT NULL,
                file_path TEXT NOT NULL UNIQUE,
                file_type TEXT,
                file_size INTEGER,
                date_created TEXT,
                date_modified TEXT,
                content_preview TEXT,
                evidence_type TEXT,
                mentions_count INTEGER DEFAULT 0,
                content TEXT,
                metadata_json TEXT,
                word_count INTEGER,
                spice_rating INTEGER,
                content_hash TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
              )
            `);

        // Copy data
        // Handle filename -> file_name mapping
        const sourceFileName = hasFilename ? 'filename' : 'file_name';

        databaseService.exec(`
              INSERT INTO documents (
                id, file_name, file_path, file_type, file_size, date_created, date_modified, 
                content_preview, evidence_type, mentions_count, created_at,
                content, metadata_json, word_count, spice_rating, content_hash
              )
              SELECT 
                id, ${sourceFileName}, file_path, file_type, file_size, date_created, date_modified, 
                CASE WHEN content IS NOT NULL THEN substr(content, 1, 200) ELSE '' END, 'document', 0, created_at,
                content, metadata_json, word_count, spice_rating, content_hash
              FROM documents_old
            `);

        // Drop old table
        databaseService.exec('DROP TABLE documents_old');

        databaseService.exec('COMMIT');
        console.log('Documents table updated successfully.');
      } catch (error) {
        databaseService.exec('ROLLBACK');
        console.error('Error updating documents table:', error);
        throw error;
      }
    } else {
      console.log('Documents table already has required columns and correct schema.');
    }

    // 4. Recreate FTS tables and triggers (Tables dropped in step 1)
    console.log('Recreating FTS tables and triggers...');

    // Re-run initialization logic from DatabaseService (which creates FTS and triggers)
    // We can just run the SQL directly here to be sure.

    databaseService.exec(`
      -- Full-text search virtual table for entities
      CREATE VIRTUAL TABLE IF NOT EXISTS entities_fts USING fts5(
        full_name,
        primary_role,
        secondary_roles,
        connections_summary,
        content='entities',
        content_rowid='id'
      );

      -- Full-text search virtual table for documents
      CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
        file_name,
        content_preview,
        evidence_type,
        content,
        content='documents',
        content_rowid='id'
      );

      CREATE TRIGGER IF NOT EXISTS entities_fts_insert AFTER INSERT ON entities BEGIN
        INSERT INTO entities_fts(rowid, full_name, primary_role, secondary_roles, connections_summary)
        VALUES (NEW.id, NEW.full_name, NEW.primary_role, NEW.secondary_roles, NEW.connections_summary);
      END;

      CREATE TRIGGER IF NOT EXISTS entities_fts_update AFTER UPDATE ON entities BEGIN
        UPDATE entities_fts SET 
          full_name = NEW.full_name,
          primary_role = NEW.primary_role,
          secondary_roles = NEW.secondary_roles,
          connections_summary = NEW.connections_summary
        WHERE rowid = OLD.id;
      END;

      CREATE TRIGGER IF NOT EXISTS entities_fts_delete AFTER DELETE ON entities BEGIN
        DELETE FROM entities_fts WHERE rowid = OLD.id;
      END;

      CREATE TRIGGER IF NOT EXISTS documents_fts_insert AFTER INSERT ON documents BEGIN
        INSERT INTO documents_fts(rowid, file_name, content_preview, evidence_type, content)
        VALUES (NEW.id, NEW.file_name, NEW.content_preview, NEW.evidence_type, NEW.content);
      END;

      CREATE TRIGGER IF NOT EXISTS documents_fts_update AFTER UPDATE ON documents BEGIN
        UPDATE documents_fts SET 
          file_name = NEW.file_name,
          content_preview = NEW.content_preview,
          evidence_type = NEW.evidence_type,
          content = NEW.content
        WHERE rowid = OLD.id;
      END;
      CREATE TRIGGER IF NOT EXISTS documents_fts_delete AFTER DELETE ON documents BEGIN
        DELETE FROM documents_fts WHERE rowid = OLD.id;
      END;
    `);

    // Rebuild FTS index
    console.log('Rebuilding FTS indexes...');
    databaseService.exec("INSERT INTO entities_fts(entities_fts) VALUES('rebuild')");
    databaseService.exec("INSERT INTO documents_fts(documents_fts) VALUES('rebuild')");

    // 4. Update Entity Summary View
    console.log('Updating entity_summary view...');
    databaseService.exec(`
      DROP VIEW IF EXISTS entity_summary;
      
      CREATE VIEW entity_summary AS
      SELECT 
          e.id,
          e.full_name,
          e.primary_role,
          e.likelihood_level,
          e.mentions,
          e.spice_rating,
          e.spice_score,
          e.title,
          e.role,
          e.title_variants,
          (
            SELECT GROUP_CONCAT(type_name)
            FROM (
              SELECT DISTINCT et.type_name AS type_name
              FROM entity_evidence_types eet2
              JOIN evidence_types et ON eet2.evidence_type_id = et.id
              WHERE eet2.entity_id = e.id
            ) AS distinct_types
          ) AS evidence_types,
          COUNT(DISTINCT em.document_id) as document_count,
          COUNT(DISTINCT em.id) as mention_count
      FROM entities e
      LEFT JOIN entity_mentions em ON e.id = em.entity_id
      GROUP BY e.id;
    `);

    console.log('Migration v4 completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
