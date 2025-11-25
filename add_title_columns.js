import Database from 'better-sqlite3';

// Open the database
const db = new Database('epstein-archive.db');

// Check entities table schema
console.log('=== ENTITIES TABLE SCHEMA ===');
const entityColumns = db.prepare("PRAGMA table_info(entities)").all();
entityColumns.forEach(col => {
  console.log(`  ${col.cid}: ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
});

// Check if title and role columns exist
const hasTitle = entityColumns.some(col => col.name === 'title');
const hasRole = entityColumns.some(col => col.name === 'role');

console.log(`\nHas title column: ${hasTitle}`);
console.log(`Has role column: ${hasRole}`);

// Add missing columns if they don't exist
if (!hasTitle) {
  console.log('Adding title column...');
  db.exec("ALTER TABLE entities ADD COLUMN title TEXT");
  console.log('✅ title column added');
}

if (!hasRole) {
  console.log('Adding role column...');
  db.exec("ALTER TABLE entities ADD COLUMN role TEXT");
  console.log('✅ role column added');
}

// Recreate the entity_summary view with the correct columns
db.exec(`
  DROP VIEW IF EXISTS entity_summary;
  
  CREATE VIEW entity_summary AS
  SELECT 
      e.id,
      e.full_name,
      e.primary_role,
      e.likelihood_level,
      e.mentions,
      e.spice_rating,
      e.spice_score,
      e.title,
      e.role,
      COUNT(DISTINCT em.document_id) as document_count,
      COUNT(DISTINCT em.id) as mention_count
  FROM entities e
  LEFT JOIN entity_mentions em ON e.id = em.entity_id
  GROUP BY e.id;
`);

console.log('✅ entity_summary view recreated with title and role columns');

db.close();