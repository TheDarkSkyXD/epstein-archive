import Database from 'better-sqlite3';

// Open the database
const db = new Database('epstein-archive.db');

// Check if context_type column exists in entity_mentions table
try {
  const result = db.prepare("PRAGMA table_info(entity_mentions)").all();
  console.log('entity_mentions columns:');
  result.forEach(col => {
    console.log(`  ${col.cid}: ${col.name} (${col.type})`);
  });
  
  // Check if the column exists
  const hasContextType = result.some(col => col.name === 'context_type');
  console.log(`\nHas context_type column: ${hasContextType}`);
  
  if (!hasContextType) {
    console.log('Adding context_type column...');
    db.exec("ALTER TABLE entity_mentions ADD COLUMN context_type TEXT DEFAULT 'mention'");
    console.log('✅ context_type column added');
  }
  
} catch (error) {
  console.error('Error checking schema:', error.message);
}

db.close();