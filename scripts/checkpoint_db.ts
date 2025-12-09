import Database from 'better-sqlite3';
import { join } from 'path';

const dbPath = join(process.cwd(), 'epstein-archive.db');
console.log(`Checkpointing database at ${dbPath}...`);

try {
  const db = new Database(dbPath);
  db.pragma('wal_checkpoint(TRUNCATE)');
  console.log('Checkpoint complete. WAL file should be merged/deleted.');
  db.close();
} catch (error) {
  console.error('Error checkpointing database:', error);
  process.exit(1);
}
