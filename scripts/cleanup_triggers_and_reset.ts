
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'epstein-archive.db');
const db = new Database(DB_PATH);

function main() {
  console.log(`Cleaning up triggers and resetting migration 003 on ${DB_PATH}...`);
  
  // 1. Drop broken triggers
  const triggers = [
    'documents_fts_insert', 
    'documents_fts_update', 
    'documents_fts_delete',
    'entities_fts_insert',
    'entities_fts_update',
    'entities_fts_delete'
  ];
  
  for (const trigger of triggers) {
    try {
      db.exec(`DROP TRIGGER IF EXISTS ${trigger}`);
      console.log(`Dropped trigger: ${trigger}`);
    } catch (e: any) {
      console.error(`Failed to drop trigger ${trigger}: ${e.message}`);
    }
  }

  // 2. Rename entity_mentions if it exists and backup doesn't
  try {
      // Check if backup exists
      const backupExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='entity_mentions_backup'").get();
      if (backupExists) {
        console.log('entity_mentions_backup already exists. Skipping rename.');
        // Optionally drop current entity_mentions if we want to force re-creation
        // db.exec("DROP TABLE IF EXISTS entity_mentions");
      } else {
        const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='entity_mentions'").get();
        if (tableExists) {
           db.exec("ALTER TABLE entity_mentions RENAME TO entity_mentions_backup");
           console.log("Renamed entity_mentions to entity_mentions_backup");
        } else {
           console.log("entity_mentions table not found, nothing to rename.");
        }
      }
  } catch (e: any) {
      console.error("Error managing entity_mentions tables:", e.message);
  }

  // 3. Reset schema_migrations for 003
  try {
    const result = db.prepare("DELETE FROM schema_migrations WHERE filename LIKE '003_%'").run();
    console.log(`Deleted ${result.changes} rows from schema_migrations for 003_*`);
  } catch (e: any) {
    console.error("Failed to reset migration record:", e.message);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
