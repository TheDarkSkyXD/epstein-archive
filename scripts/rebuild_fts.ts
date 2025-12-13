
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DB_PATH = process.env.DB_PATH || path.join(PROJECT_ROOT, 'epstein-archive-production.db');

const db = new Database(DB_PATH);

console.log('🔧 Rebuilding FTS Table...');

// 1. Drop existing FTS table
console.log('1️⃣  Dropping entities_fts...');
db.exec('DROP TABLE IF EXISTS entities_fts');

// 2. Recreate FTS table
console.log('2️⃣  Recreating entities_fts...');
db.exec(`
    CREATE VIRTUAL TABLE entities_fts USING fts5(
        full_name,
        primary_role,
        connections_summary,
        content='entities',
        content_rowid='id'
    )
`);

// 3. Re-populate FTS table
console.log('3️⃣  Populating FTS table...');
db.exec(`
    INSERT INTO entities_fts(rowid, full_name, primary_role, connections_summary)
    SELECT id, full_name, primary_role, connections_summary FROM entities
`);

console.log('✅ FTS Table Rebuilt.');

// 4. Ensure triggers exist (re-run logic from fix_fts_and_consolidate roughly)
console.log('4️⃣  Ensuring Triggers...');
db.exec('DROP TRIGGER IF EXISTS entities_fts_insert');
db.exec('DROP TRIGGER IF EXISTS entities_fts_update');
db.exec('DROP TRIGGER IF EXISTS entities_fts_delete');

db.exec(`
    CREATE TRIGGER entities_fts_insert AFTER INSERT ON entities BEGIN
        INSERT INTO entities_fts(rowid, full_name, primary_role, connections_summary)
        VALUES (NEW.id, NEW.full_name, NEW.primary_role, NEW.connections_summary);
    END;
`);

db.exec(`
    CREATE TRIGGER entities_fts_update AFTER UPDATE ON entities BEGIN
        UPDATE entities_fts SET 
          full_name = NEW.full_name,
          primary_role = NEW.primary_role,
          connections_summary = NEW.connections_summary
        WHERE rowid = OLD.id;
    END;
`);

db.exec(`
    CREATE TRIGGER entities_fts_delete AFTER DELETE ON entities BEGIN
        DELETE FROM entities_fts WHERE rowid = OLD.id;
    END;
`);

console.log('✨ All Done.');
