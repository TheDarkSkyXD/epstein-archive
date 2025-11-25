import Database from 'better-sqlite3';

// Open the database
const db = new Database('epstein-archive.db');

// Check and fix entity_mentions table schema
try {
  const result = db.prepare("PRAGMA table_info(entity_mentions)").all();
  console.log('Current entity_mentions columns:');
  result.forEach(col => {
    console.log(`  ${col.cid}: ${col.name} (${col.type})`);
  });
  
  // Add missing columns
  const columnsToAdd = [
    { name: 'context_type', type: 'TEXT', default: "'mention'" },
    { name: 'context_text', type: 'TEXT', default: "''" },
    { name: 'keyword', type: 'TEXT', default: 'NULL' },
    { name: 'position_start', type: 'INTEGER', default: 'NULL' },
    { name: 'position_end', type: 'INTEGER', default: 'NULL' },
    { name: 'significance_score', type: 'INTEGER', default: '1' }
  ];
  
  for (const col of columnsToAdd) {
    try {
      db.exec(`ALTER TABLE entity_mentions ADD COLUMN ${col.name} ${col.type} DEFAULT ${col.default}`);
      console.log(`✅ Added ${col.name} column`);
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        console.log(`ℹ️  ${col.name} column already exists`);
      } else {
        throw error;
      }
    }
  }
  
} catch (error) {
  console.error('Error updating schema:', error.message);
}

db.close();