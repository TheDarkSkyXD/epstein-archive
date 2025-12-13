import { runMigrations } from '../server/db/migrator.js';

console.log('Starting database migrations...');
try {
    runMigrations();
    console.log('Database migrations completed successfully.');
} catch (error) {
    console.error('Database migrations failed:', error);
    process.exit(1);
}
