import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'epstein-archive.db');
const MIGRATIONS_DIR = path.join(process.cwd(), 'src', 'server', 'db', 'schema');

function getDb() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = "wal"');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      run_on DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  return db;
}

function getAppliedMigrations(db: Database.Database): Set<string> {
  const rows = db.prepare('SELECT name FROM schema_migrations ORDER BY id').all();
  return new Set(rows.map((r: any) => r.name as string));
}

function applyMigration(db: Database.Database, filename: string, sql: string) {
  console.log(`Applying migration: ${filename}`);
  db.exec('BEGIN');
  try {
    // Check if we should split
    // Triggers contain semicolons within their body, so simple splitting breaks them.
    // If the file defines triggers, we execute it as a single block (assuming it's written idempotently)
    const hasTriggers = sql.includes('CREATE TRIGGER');

    if (hasTriggers) {
      db.exec(sql);
    } else {
      // Split by semicolon, remove comments and empty lines
      const statements = sql
        .replace(/--.*$/gm, '') // Remove comments
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const stmt of statements) {
        try {
          db.exec(stmt);
        } catch (err: any) {
          // Ignore duplicate column errors (manual IF NOT EXISTS)
          if (err.message && err.message.includes('duplicate column name')) {
            console.log(`  ⚠ Skipping duplicate column: ${stmt.substring(0, 50)}...`);
            continue;
          }
          throw err;
        }
      }
    }

    db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run(filename);
    db.exec('COMMIT');
    console.log(`✔ Applied ${filename}`);
  } catch (err) {
    db.exec('ROLLBACK');
    console.error(`✖ Failed ${filename}`);
    console.error(err);
    throw err;
  }
}

function main() {
  const db = getDb();
  const applied = getAppliedMigrations(db);

  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.log(`No migrations directory found at ${MIGRATIONS_DIR}, nothing to do.`);
    return;
  }

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    if (!sql.trim()) continue;
    applyMigration(db, file, sql);
  }

  console.log('All migrations applied.');
}

import { fileURLToPath } from 'url';

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
