import Database from 'better-sqlite3';
import { join } from 'path';

const DB_PATH = process.env.DB_PATH || join(process.cwd(), 'epstein-archive.db');
const db = new Database(DB_PATH);

console.log(`Fixing triggers in database at ${DB_PATH}`);

try {
  // Drop bad triggers
  console.log('Dropping bad triggers...');
  db.exec('DROP TRIGGER IF EXISTS entities_fts_insert');
  db.exec('DROP TRIGGER IF EXISTS entities_fts_update');
  db.exec('DROP TRIGGER IF EXISTS entities_fts_delete');

  // Verify remaining triggers
  const triggers = db
    .prepare("SELECT name, sql FROM sqlite_master WHERE type='trigger' AND tbl_name='entities'")
    .all();
  console.log('Remaining triggers on entities table:');
  triggers.forEach((t: any) => {
    console.log(`- ${t.name}`);
  });

  console.log('✅ Triggers fixed.');
} catch (error) {
  console.error('Error fixing triggers:', error);
  process.exit(1);
}
