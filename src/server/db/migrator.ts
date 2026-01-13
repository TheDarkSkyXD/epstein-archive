import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from './connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function runMigrations() {
  const db = getDb();
  const schemaDir = path.join(__dirname, 'schema');

  // 0. Ensure migration history table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT UNIQUE NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log(`[Migrator] Checking for migrations in ${schemaDir}...`);

  let dirToScan = schemaDir;
  if (!fs.existsSync(schemaDir)) {
    const fallbackDir = path.join(process.cwd(), 'src', 'server', 'db', 'schema');
    if (fs.existsSync(fallbackDir)) {
      dirToScan = fallbackDir;
    } else {
      console.error(`[Migrator] Schema directory not found.`);
      return;
    }
  }

  const files = fs
    .readdirSync(dirToScan)
    .filter((file) => file.endsWith('.sql') && !file.startsWith('.'))
    .sort();

  for (const file of files) {
    // Check if migration already executed
    const alreadyRun = db.prepare('SELECT 1 FROM schema_migrations WHERE filename = ?').get(file);
    if (alreadyRun) {
      continue;
    }

    console.log(`[Migrator] 🚀 Executing migration: ${file}`);
    const filePath = path.join(dirToScan, file);
    const sql = fs.readFileSync(filePath, 'utf-8');

    // Execute as a single transaction
    const transaction = db.transaction(() => {
      // We use .exec() as it handles multi-statement strings correctly in better-sqlite3
      db.exec(sql);
      db.prepare('INSERT INTO schema_migrations (filename) VALUES (?)').run(file);
    });

    try {
      transaction();
      console.log(`[Migrator] ✅ ${file} completed successfully.`);
    } catch (error: any) {
      console.error(`[Migrator] ❌ Critical failure in ${file}:`, error.message);
      // In production, we might want to stop startup if a migration fails
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    }
  }

  console.log('[Migrator] Database is up to date.');
}
