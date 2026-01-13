import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'epstein-archive.db');
const db = new Database(dbPath);

console.log('Migrating entities table schema...');

try {
  const tableInfo = db.pragma('table_info(entities)') as { name: string }[];
  const columns = new Set(tableInfo.map((c) => c.name));

  db.transaction(() => {
    // 0. Drop problematic triggers and views
    const triggers = [
      'entities_ai',
      'entities_ad',
      'entities_au',
      'entities_fts_insert',
      'entities_fts_update',
      'entities_fts_delete',
    ];
    for (const trigger of triggers) {
      try {
        db.prepare(`DROP TRIGGER IF EXISTS ${trigger}`).run();
        console.log(`Dropped trigger: ${trigger}`);
      } catch (e) {
        console.log(`Could not drop trigger ${trigger}:`, e);
      }
    }

    const views = ['evidence_summary', 'entity_summary'];
    for (const view of views) {
      try {
        db.prepare(`DROP VIEW IF EXISTS ${view}`).run();
        console.log(`Dropped view: ${view}`);
      } catch (e) {
        console.log(`Could not drop view ${view}:`, e);
      }
    }

    // 1. Rename 'name' to 'full_name'
    if (columns.has('name') && !columns.has('full_name')) {
      console.log('Renaming name -> full_name');
      db.prepare('ALTER TABLE entities RENAME COLUMN name TO full_name').run();
    } else if (!columns.has('full_name')) {
      // Should not happen if name doesn't exist either, but just in case
      console.log('Adding full_name column');
      db.prepare('ALTER TABLE entities ADD COLUMN full_name TEXT').run();
    }

    // 2. Rename 'role' to 'primary_role'
    if (columns.has('role') && !columns.has('primary_role')) {
      console.log('Renaming role -> primary_role');
      db.prepare('ALTER TABLE entities RENAME COLUMN role TO primary_role').run();
    } else if (!columns.has('primary_role')) {
      console.log('Adding primary_role column');
      db.prepare('ALTER TABLE entities ADD COLUMN primary_role TEXT').run();
    }

    // 3. Add 'secondary_roles'
    if (!columns.has('secondary_roles')) {
      console.log('Adding secondary_roles column');
      db.prepare('ALTER TABLE entities ADD COLUMN secondary_roles TEXT').run();
    }

    // 4. Add 'connections_summary'
    if (!columns.has('connections_summary')) {
      console.log('Adding connections_summary column');
      db.prepare('ALTER TABLE entities ADD COLUMN connections_summary TEXT').run();
    }

    // 5. Add 'red_flag_score'
    if (!columns.has('red_flag_score')) {
      console.log('Adding red_flag_score column');
      db.prepare('ALTER TABLE entities ADD COLUMN red_flag_score INTEGER DEFAULT 0').run();
    }

    // 6. Add 'updated_at'
    if (!columns.has('updated_at')) {
      console.log('Adding updated_at column');
      db.prepare(
        "ALTER TABLE entities ADD COLUMN updated_at DATETIME DEFAULT '2024-01-01 00:00:00'",
      ).run();
    }
  })();

  console.log('Entities schema migration completed successfully.');
} catch (error) {
  console.error('Migration failed:', error);
} finally {
  db.close();
}
