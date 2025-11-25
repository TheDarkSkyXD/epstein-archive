const Database = require('better-sqlite3');
const fs = require('fs');

const dbPath = '/var/www/epstein-archive/epstein-archive.db';
try {
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }
} catch (e) {
  console.log('Could not delete existing DB, might be in use or missing');
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

console.log('Restoring database from SQL...');
try {
  const sql = fs.readFileSync('/var/www/epstein-archive/deploy_fixed.sql', 'utf8');
  db.exec(sql);
  console.log('Main data restored.');
} catch (e) {
  console.error('Error executing SQL:', e);
  process.exit(1);
}

console.log('Rebuilding FTS...');
try {
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS entities_fts USING fts5(
      full_name,
      primary_role,
      secondary_roles,
      connections_summary,
      content='entities',
      content_rowid='id'
    );
    CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
      file_name,
      content_preview,
      evidence_type,
      content,
      content='documents',
      content_rowid='id'
    );
    INSERT INTO entities_fts(entities_fts) VALUES('rebuild');
    INSERT INTO documents_fts(documents_fts) VALUES('rebuild');
  `);
  console.log('FTS rebuilt.');
} catch (e) {
  console.error('Error rebuilding FTS:', e);
  // Don't exit, main data is fine
}

console.log('Done.');
