import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = process.env.DB_PATH || path.resolve(__dirname, '../epstein-archive.db');
console.log(`Connecting to database at: ${dbPath}`);
const db = new Database(dbPath);

function fixPropertyFlags() {
  try {
    console.log('Starting property flag fix...');

    // Count before update
    const beforeCount = db
      .prepare('SELECT COUNT(*) as count FROM palm_beach_properties WHERE is_known_associate = 1')
      .get() as { count: number };
    console.log(`Properties marked as known associates (before): ${beforeCount.count}`);

    // Update Query
    const info = db
      .prepare(
        `
      UPDATE palm_beach_properties 
      SET is_known_associate = 1 
      WHERE linked_entity_id IS NOT NULL 
      AND (is_known_associate = 0 OR is_known_associate IS NULL)
    `,
      )
      .run();

    console.log(`Updated ${info.changes} properties to be marked as known associates.`);

    // Count after update
    const afterCount = db
      .prepare('SELECT COUNT(*) as count FROM palm_beach_properties WHERE is_known_associate = 1')
      .get() as { count: number };
    console.log(`Properties marked as known associates (after): ${afterCount.count}`);

    console.log('Property flags fixed successfully.');
  } catch (error) {
    console.error('Failed to fix property flags:', error);
    process.exit(1);
  }
}

fixPropertyFlags();
