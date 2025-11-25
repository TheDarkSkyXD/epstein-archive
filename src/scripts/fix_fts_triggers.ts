import { databaseService } from '../services/DatabaseService';

async function rebuildFTS() {
  console.log('=== Rebuilding FTS Table ===\n');

  try {
    // Drop existing triggers
    console.log('Dropping FTS triggers...');
    databaseService.exec('DROP TRIGGER IF EXISTS entities_fts_insert');
    databaseService.exec('DROP TRIGGER IF EXISTS entities_fts_update');
    databaseService.exec('DROP TRIGGER IF EXISTS entities_fts_delete');
    console.log('✅ Dropped triggers\n');

    // Drop FTS table
    console.log('Dropping FTS table...');
    databaseService.exec('DROP TABLE IF EXISTS entities_fts');
    console.log('✅ Dropped FTS table\n');

    // Recreate FTS table
    console.log('Creating new FTS table...');
    databaseService.exec(`
      CREATE VIRTUAL TABLE entities_fts USING fts5(
        entity_id UNINDEXED,
        full_name,
        primary_role,
        secondary_roles,
        connections_summary
      )
    `);
    console.log('✅ Created FTS table\n');

    // Recreate triggers
    console.log('Creating FTS triggers...');
    
    databaseService.exec(`
      CREATE TRIGGER entities_fts_insert AFTER INSERT ON entities BEGIN
        INSERT INTO entities_fts(rowid, entity_id, full_name, primary_role, secondary_roles, connections_summary)
        VALUES (NEW.id, NEW.id, NEW.full_name, NEW.primary_role, NEW.secondary_roles, NEW.connections_summary);
      END
    `);

    databaseService.exec(`
      CREATE TRIGGER entities_fts_update AFTER UPDATE ON entities BEGIN
        DELETE FROM entities_fts WHERE rowid = OLD.id;
        INSERT INTO entities_fts(rowid, entity_id, full_name, primary_role, secondary_roles, connections_summary)
        VALUES (NEW.id, NEW.id, NEW.full_name, NEW.primary_role, NEW.secondary_roles, NEW.connections_summary);
      END
    `);

    databaseService.exec(`
      CREATE TRIGGER entities_fts_delete AFTER DELETE ON entities BEGIN
        DELETE FROM entities_fts WHERE rowid = OLD.id;
      END
    `);
    console.log('✅ Created triggers\n');

    // Populate FTS table
    console.log('Populating FTS table...');
    databaseService.exec(`
      INSERT INTO entities_fts(rowid, entity_id, full_name, primary_role, secondary_roles, connections_summary)
      SELECT id, id, full_name, primary_role, secondary_roles, connections_summary
      FROM entities
    `);
    console.log('✅ Populated FTS table\n');

    console.log('✅ FTS table rebuilt successfully!\n');

  } catch (error) {
    console.error('❌ Error rebuilding FTS:', error);
    process.exit(1);
  }
}

rebuildFTS();
