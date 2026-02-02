import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'epstein-archive.db');
const MIGRATIONS_DIR = path.join(process.cwd(), 'src', 'server', 'db', 'schema');

async function getDb() {
  const db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database,
  });
  await db.exec('PRAGMA journal_mode = "wal"');
  await db.exec('PRAGMA foreign_keys = ON');
  await db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      run_on DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  return db;
}

async function getAppliedMigrations(db: Database): Promise<Set<string>> {
  const rows = await db.all('SELECT name FROM schema_migrations ORDER BY id');
  return new Set(rows.map((r: any) => r.name as string));
}

async function applyMigration(db: Database, filename: string, sql: string) {
  console.log(`Applying migration: ${filename}`);
  await db.exec('BEGIN');
  try {
    // Check if we should split
    const hasTriggers = sql.includes('CREATE TRIGGER');

    if (hasTriggers) {
      await db.exec(sql);
    } else {
      // Split by semicolon, remove comments and empty lines
      const statements = sql
        .replace(/--.*$/gm, '') // Remove comments
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const stmt of statements) {
        try {
          await db.exec(stmt);
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

    await db.run('INSERT INTO schema_migrations (name) VALUES (?)', filename);
    await db.exec('COMMIT');
    console.log(`✔ Applied ${filename}`);
  } catch (err) {
    await db.exec('ROLLBACK');
    console.error(`✖ Failed ${filename}`);
    console.error(err);
    throw err;
  }
}

async function main() {
  const db = await getDb();
  const applied = await getAppliedMigrations(db);

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
    await applyMigration(db, file, sql);
  }

  console.log('All migrations applied.');
  await db.close();
}

import { fileURLToPath } from 'url';

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
