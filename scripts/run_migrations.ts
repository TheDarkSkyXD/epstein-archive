import { runMigrations } from '../src/server/db/migrator.js';

console.log('Running migrations...');
try {
  await runMigrations();
  console.log('Migrations complete.');
} catch (error) {
  console.error('Migration failed:', error);
  process.exit(1);
}
