import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from './connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function runMigrations() {
  const db = getDb();
  const schemaDir = path.join(__dirname, 'schema');
  
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

  const files = fs.readdirSync(dirToScan)
    .filter(file => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    console.log(`[Migrator] Processing: ${file}`);
    const filePath = path.join(dirToScan, file);
    const sql = fs.readFileSync(filePath, 'utf-8');
    
    // Split by semicolon to execute statements individually
    // This allows "ALTER TABLE" to fail (if column exists) without stopping the whole script
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      try {
        db.exec(statement);
      } catch (error: any) {
        // Ignore "duplicate column name" errors
        if (error.message.includes('duplicate column name')) {
           // console.log(`[Migrator] Skipped existing column: ${statement.substring(0, 50)}...`);
        } else if (error.message.includes('no such column')) {
            // This might happen if we try to UPDATE a column we just failed to ADD.
            // But we should try to add it.
            console.warn(`[Migrator] Warning executing statement in ${file}: ${error.message}`);
        } else if (error.message.includes('already exists')) {
            // Table/Index already exists
        } else {
            console.error(`[Migrator] ❌ Error in ${file}:`, error.message);
            // console.error(`Statement: ${statement}`);
        }
      }
    }
    console.log(`[Migrator] ✅ ${file} processed.`);
  }
  
  console.log('[Migrator] All migrations completed.');
}
