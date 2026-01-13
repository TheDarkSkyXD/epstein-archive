import Database from 'better-sqlite3';
import * as path from 'path';

const dbPath = path.join(process.cwd(), 'epstein-archive.db');
const db = new Database(dbPath);

console.log('Starting foreign key fix migration...');

try {
  // Disable foreign keys
  db.pragma('foreign_keys = OFF');

  db.transaction(() => {
    // 0. Drop views FIRST (dependencies)
    console.log('Dropping views...');
    db.prepare('DROP VIEW IF EXISTS document_summary').run();
    db.prepare('DROP VIEW IF EXISTS entity_summary').run();

    // 1. Fix entity_mentions
    console.log('Fixing entity_mentions...');
    db.prepare(
      `
      CREATE TABLE IF NOT EXISTS entity_mentions_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_id INTEGER NOT NULL,
        document_id INTEGER NOT NULL,
        mention_context TEXT NOT NULL,
        mention_type TEXT DEFAULT 'mention',
        page_number INTEGER,
        position_in_text INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        context_type TEXT DEFAULT 'mention',
        context_text TEXT DEFAULT '',
        keyword TEXT,
        position_start INTEGER,
        position_end INTEGER,
        significance_score INTEGER DEFAULT 1,
        FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE,
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
      )
    `,
    ).run();

    db.prepare(
      `
      INSERT INTO entity_mentions_new (
        id, entity_id, document_id, mention_context, context_type, 
        keyword, position_start, position_end, significance_score, created_at,
        mention_type, page_number, position_in_text, context_text
      )
      SELECT 
        id, entity_id, document_id, context_text, context_type,
        keyword, position_start, position_end, significance_score, created_at,
        'mention', NULL, NULL, context_text
      FROM entity_mentions
    `,
    ).run();

    db.prepare('DROP TABLE entity_mentions').run();
    db.prepare('ALTER TABLE entity_mentions_new RENAME TO entity_mentions').run();

    // Recreate indices for entity_mentions
    db.prepare(
      'CREATE INDEX IF NOT EXISTS idx_entity_mentions_entity ON entity_mentions(entity_id)',
    ).run();
    db.prepare(
      'CREATE INDEX IF NOT EXISTS idx_entity_mentions_document ON entity_mentions(document_id)',
    ).run();
    db.prepare(
      'CREATE INDEX IF NOT EXISTS idx_entity_mentions_context ON entity_mentions(context_type)',
    ).run();

    // 2. Fix timeline_events
    console.log('Fixing timeline_events...');
    db.prepare(
      `
      CREATE TABLE IF NOT EXISTS timeline_events_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_id INTEGER NOT NULL,
        event_date TEXT,
        event_description TEXT,
        event_type TEXT,
        document_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        title TEXT,
        description TEXT,
        significance_level TEXT,
        entities_json TEXT,
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL
      )
    `,
    ).run();

    // Note: timeline_events schema in live DB has extra columns compared to schema.sql
    // Live DB: id, event_date, title, description, event_type, document_id, significance_level, entities_json, created_at
    // schema.sql: id, entity_id, event_date, event_description, event_type, document_id, created_at
    // Wait, the live DB schema showed:
    // CREATE TABLE timeline_events (
    //     id INTEGER PRIMARY KEY AUTOINCREMENT,
    //     event_date DATE NOT NULL,
    //     title TEXT NOT NULL,
    //     description TEXT,
    //     event_type TEXT CHECK(event_type IN ('email', 'document', 'flight', 'legal', 'financial', 'testimony', 'arrest', 'death', 'court')),
    //     document_id INTEGER,
    //     significance_level TEXT CHECK(significance_level IN ('high', 'medium', 'low')) DEFAULT 'medium',
    //     entities_json TEXT,
    //     created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    //     FOREIGN KEY (document_id) REFERENCES "documents_old"(id) ON DELETE SET NULL
    //   );
    // It seems schema.sql is OUTDATED regarding timeline_events!
    // I should preserve the LIVE DB schema structure but point FK to documents.

    db.prepare(
      `
      CREATE TABLE IF NOT EXISTS timeline_events_new_v2 (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_date DATE NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        event_type TEXT CHECK(event_type IN ('email', 'document', 'flight', 'legal', 'financial', 'testimony', 'arrest', 'death', 'court')),
        document_id INTEGER,
        significance_level TEXT CHECK(significance_level IN ('high', 'medium', 'low')) DEFAULT 'medium',
        entities_json TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL
      )
    `,
    ).run();

    db.prepare(
      `
      INSERT INTO timeline_events_new_v2 
      SELECT * FROM timeline_events
    `,
    ).run();

    db.prepare('DROP TABLE timeline_events').run();
    db.prepare('ALTER TABLE timeline_events_new_v2 RENAME TO timeline_events').run();

    // Recreate indices for timeline_events
    db.prepare(
      'CREATE INDEX IF NOT EXISTS idx_timeline_events_date ON timeline_events(event_date DESC)',
    ).run();
    db.prepare(
      'CREATE INDEX IF NOT EXISTS idx_timeline_events_type ON timeline_events(event_type)',
    ).run();

    // 3. Recreate document_summary view
    console.log('Recreating document_summary view...');
    db.prepare(
      `
      CREATE VIEW document_summary AS
      SELECT 
        d.id,
        d.file_name as filename,
        d.file_type,
        d.word_count,
        d.spice_rating,
        COUNT(DISTINCT em.entity_id) as entity_count,
        COUNT(DISTINCT em.id) as mention_count,
        MIN(em.created_at) as first_mention_date,
        MAX(em.created_at) as last_mention_date
      FROM documents d
      LEFT JOIN entity_mentions em ON d.id = em.document_id
      GROUP BY d.id
    `,
    ).run();

    // 4. Recreate entity_summary view
    console.log('Recreating entity_summary view...');
    db.prepare(
      `
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
      GROUP BY e.id
    `,
    ).run();

    // 5. Drop documents_old
    console.log('Dropping documents_old...');
    db.prepare('DROP TABLE IF EXISTS documents_old').run();
  })();

  // Re-enable foreign keys
  db.pragma('foreign_keys = ON');

  console.log('Migration completed successfully.');
} catch (error) {
  console.error('Migration failed:', error);
  process.exit(1);
}
