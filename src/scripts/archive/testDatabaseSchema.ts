import { databaseService } from '../services/DatabaseService';

async function testDatabaseSchema() {
  console.log('Testing database schema alignment...');

  try {
    // Test that all required tables exist
    const tables = databaseService
      .prepare(
        `
      SELECT name FROM sqlite_master WHERE type='table' ORDER BY name
    `,
      )
      .all();

    console.log('Tables in database:');
    const tableNames = tables.map((table: any) => table.name);
    tableNames.forEach((name: string) => console.log(`- ${name}`));

    // Check for required tables
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
      console.log('Missing tables:', missingTables);
    } else {
      console.log('All required tables present!');
    }

    // Check for views
    const views = databaseService
      .prepare(
        `
      SELECT name FROM sqlite_master WHERE type='view' ORDER BY name
    `,
      )
      .all();

    console.log('Views in database:');
    const viewNames = views.map((view: any) => view.name);
    viewNames.forEach((name: string) => console.log(`- ${name}`));

    // Check for indexes
    const indexes = databaseService
      .prepare(
        `
      SELECT name, tbl_name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%' ORDER BY tbl_name
    `,
      )
      .all();

    console.log('Indexes in database:');
    indexes.forEach((index: any) => {
      console.log(`- ${index.name} (on ${index.tbl_name})`);
    });

    // Test inserting data
    console.log('Testing data insertion...');

    // Insert a test entity
    const insertEntity = databaseService.prepare(`
      INSERT INTO entities (full_name, primary_role, secondary_roles, likelihood_level, mentions, 
                           current_status, connections_summary, spice_rating, spice_score)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const entityResult = insertEntity.run(
      'Test Entity',
      'Manager',
      'Attorney, Writer',
      'HIGH',
      100,
      'Active',
      'Test connections',
      4,
      500,
    );

    console.log('Inserted entity with ID:', entityResult.lastInsertRowid);

    // Insert a test document
    const insertDocument = databaseService.prepare(`
      INSERT INTO documents (filename, file_path, file_type, date_created, date_modified)
      VALUES (?, ?, ?, ?, ?)
    `);

    const docResult = insertDocument.run(
      'test-document.txt',
      '/path/to/test-document.txt',
      'txt',
      new Date().toISOString(),
      new Date().toISOString(),
    );

    console.log('Inserted document with ID:', docResult.lastInsertRowid);

    // Insert a test mention
    const insertMention = databaseService.prepare(`
      INSERT INTO entity_mentions (entity_id, document_id, context_text, context_type)
      VALUES (?, ?, ?, ?)
    `);

    const mentionResult = insertMention.run(
      entityResult.lastInsertRowid,
      docResult.lastInsertRowid,
      'This is a test mention context',
      'mention',
    );

    console.log('Inserted mention with ID:', mentionResult.lastInsertRowid);

    console.log('Database schema test completed successfully!');
  } catch (error) {
    console.error('Database schema test failed:', error);
    process.exit(1);
  }
}

// Run the test
testDatabaseSchema()
  .then(() => {
    console.log('Database schema test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Database schema test failed:', error);
    process.exit(1);
  });
