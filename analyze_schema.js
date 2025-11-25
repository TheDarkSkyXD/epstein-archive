import Database from 'better-sqlite3';

// Open the database
const db = new Database('epstein-archive.db');

console.log('=== DATABASE SCHEMA ANALYSIS ===\n');

// Get all tables
try {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  console.log('Tables found:');
  tables.forEach(table => {
    console.log(`\n--- Table: ${table.name} ---`);
    const columns = db.prepare(`PRAGMA table_info(${table.name})`).all();
    columns.forEach(col => {
      console.log(`  ${col.cid}: ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
    });
  });
  
  console.log('\n=== VIEWS ===');
  const views = db.prepare("SELECT name, sql FROM sqlite_master WHERE type='view' ORDER BY name").all();
  views.forEach(view => {
    console.log(`\n--- View: ${view.name} ---`);
    console.log(`SQL: ${view.sql}`);
  });
  
} catch (error) {
  console.error('Error analyzing schema:', error.message);
}

db.close();