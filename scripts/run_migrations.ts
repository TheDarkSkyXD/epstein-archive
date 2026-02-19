import { runMigrations } from '../src/server/db/migrator.js';
import { getDb } from '../src/server/db/connection.js';

console.log('Running migrations...');
try {
  runMigrations();
  console.log('Migrations complete.');
  // Explicitly close to release lock if needed, though process exit should handle it
  // getDb().close();
} catch (error) {
  console.error('Migration failed:', error);
  process.exit(1);
}
