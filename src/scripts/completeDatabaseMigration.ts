import { databaseService } from '../services/DatabaseService';

async function completeDatabaseMigration() {
  console.log('Starting complete database migration...');

  try {
    // 1. Add missing columns to entities table
    console.log('1. Adding missing columns to entities table...');
    try {
      databaseService.exec(`
        ALTER TABLE entities ADD COLUMN IF NOT EXISTS connections_summary TEXT;
        ALTER TABLE entities ADD COLUMN IF NOT EXISTS spice_score INTEGER DEFAULT 0;
        ALTER TABLE entities ADD COLUMN IF NOT EXISTS updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;
      `);
      console.log('✓ Added missing columns to entities table');
    } catch (error) {
      console.log('⚠ Warning: Could not add all columns (may already exist)');
    }

    // 2. Create missing tables
    console.log('2. Creating missing tables...');
    databaseService.exec(`
      CREATE TABLE IF NOT EXISTS evidence_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type_name TEXT UNIQUE NOT NULL,
        description TEXT
      );
      
      CREATE TABLE IF NOT EXISTS entity_evidence_types (
        entity_id INTEGER,
        evidence_type_id INTEGER,
        PRIMARY KEY (entity_id, evidence_type_id),
        FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE,
        FOREIGN KEY (evidence_type_id) REFERENCES evidence_types(id) ON DELETE CASCADE
      );
    `);
    console.log('✓ Created missing tables');

    // 3. Populate evidence_types table
    console.log('3. Populating evidence_types table...');
    databaseService.exec(`
      INSERT OR IGNORE INTO evidence_types (type_name, description) VALUES
      ('financial', 'Financial records and transactions'),
      ('document', 'Official documents and reports'),
      ('testimony', 'Witness testimonies and depositions'),
      ('legal', 'Legal documents and court filings'),
      ('flight_log', 'Flight logs and travel records'),
      ('photo', 'Photographic evidence'),
      ('email', 'Email communications'),
      ('contract', 'Contracts and agreements'),
      ('bank_record', 'Banking and financial records'),
      ('property_record', 'Property and real estate records');
    `);
    console.log('✓ Populated evidence_types table');

    // 4. Update entity_mentions table structure
    console.log('4. Updating entity_mentions table structure...');
    try {
      databaseService.exec(`
        ALTER TABLE entity_mentions ADD COLUMN IF NOT EXISTS context_text TEXT;
        ALTER TABLE entity_mentions ADD COLUMN IF NOT EXISTS context_type TEXT DEFAULT 'mention';
        ALTER TABLE entity_mentions ADD COLUMN IF NOT EXISTS keyword TEXT;
        ALTER TABLE entity_mentions ADD COLUMN IF NOT EXISTS position_start INTEGER;
        ALTER TABLE entity_mentions ADD COLUMN IF NOT EXISTS position_end INTEGER;
        ALTER TABLE entity_mentions ADD COLUMN IF NOT EXISTS significance_score INTEGER DEFAULT 1;
      `);
      console.log('✓ Updated entity_mentions table structure');
    } catch (error) {
      console.log('⚠ Warning: Could not update entity_mentions table (columns may already exist)');
    }

    // 5. Update timeline_events table
    console.log('5. Updating timeline_events table...');
    try {
      databaseService.exec(`
        ALTER TABLE timeline_events ADD COLUMN IF NOT EXISTS significance_level TEXT 
          CHECK(significance_level IN ('high', 'medium', 'low')) DEFAULT 'medium';
        ALTER TABLE timeline_events ADD COLUMN IF NOT EXISTS entities_json TEXT;
      `);
      console.log('✓ Updated timeline_events table');
    } catch (error) {
      console.log('⚠ Warning: Could not update timeline_events table (columns may already exist)');
    }

    // 6. Create indexes (safely)
    console.log('6. Creating indexes...');
    try {
      databaseService.exec(`
        CREATE INDEX IF NOT EXISTS idx_entity_mentions_entity ON entity_mentions(entity_id);
        CREATE INDEX IF NOT EXISTS idx_entity_mentions_document ON entity_mentions(document_id);
        CREATE INDEX IF NOT EXISTS idx_documents_filename ON documents(filename);
        CREATE INDEX IF NOT EXISTS idx_documents_date ON documents(date_created);
        CREATE INDEX IF NOT EXISTS idx_timeline_events_date ON timeline_events(event_date DESC);
        CREATE INDEX IF NOT EXISTS idx_timeline_events_type ON timeline_events(event_type);
      `);
      console.log('✓ Created basic indexes');
    } catch (error: any) {
      console.log('⚠ Warning: Could not create all indexes:', error.message);
    }

    // Try to create index on context_type if the column exists
    try {
      databaseService.exec(`
        CREATE INDEX IF NOT EXISTS idx_entity_mentions_context ON entity_mentions(context_type);
      `);
      console.log('✓ Created context_type index');
    } catch (error) {
      console.log('ℹ Note: context_type column not yet available for indexing');
    }

    // 7. Create views
    console.log('7. Creating views...');
    databaseService.exec(`
      CREATE VIEW IF NOT EXISTS entity_summary AS
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
      
      CREATE VIEW IF NOT EXISTS document_summary AS
      SELECT 
        d.id,
        d.filename,
        d.file_type,
        d.word_count,
        d.spice_rating,
        COUNT(DISTINCT em.entity_id) as entity_count,
        COUNT(DISTINCT em.id) as mention_count,
        MIN(em.created_at) as first_mention_date,
        MAX(em.created_at) as last_mention_date
      FROM documents d
      LEFT JOIN entity_mentions em ON d.id = em.document_id
      GROUP BY d.id;
    `);
    console.log('✓ Created views');

    // 8. Update FTS tables
    console.log('8. Updating FTS tables...');
    // Note: FTS tables cannot be altered, so we'll just ensure they exist
    databaseService.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS entities_fts USING fts5(
        entity_id,
        full_name,
        primary_role,
        secondary_roles,
        connections_summary,
        content='entities',
        content_rowid='id'
      );
      
      CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
        document_id,
        filename,
        content_text,
        content='documents',
        content_rowid='id'
      );
    `);
    console.log('✓ Updated FTS tables');

    // 9. Verify migration
    console.log('9. Verifying migration...');
    const tables = databaseService
      .prepare(
        `
      SELECT name FROM sqlite_master WHERE type='table' ORDER BY name
    `,
      )
      .all();

    const tableNames = tables.map((table: any) => table.name);
    const requiredTables = [
      'entities',
      'evidence_types',
      'entity_evidence_types',
      'documents',
      'entity_mentions',
      'timeline_events',
      'entities_fts',
      'documents_fts',
    ];

    const missingTables = requiredTables.filter((table) => !tableNames.includes(table));
    if (missingTables.length > 0) {
      console.log('❌ Missing tables:', missingTables);
    } else {
      console.log('✓ All required tables present');
    }

    const views = databaseService
      .prepare(
        `
      SELECT name FROM sqlite_master WHERE type='view' ORDER BY name
    `,
      )
      .all();

    const viewNames = views.map((view: any) => view.name);
    const requiredViews = ['entity_summary', 'document_summary'];
    const missingViews = requiredViews.filter((view) => !viewNames.includes(view));
    if (missingViews.length > 0) {
      console.log('❌ Missing views:', missingViews);
    } else {
      console.log('✓ All required views present');
    }

    console.log('✅ Complete database migration finished successfully!');
  } catch (error) {
    console.error('❌ Database migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
completeDatabaseMigration()
  .then(() => {
    console.log('🎉 Database migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Database migration failed:', error);
    process.exit(1);
  });
