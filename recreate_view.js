import Database from 'better-sqlite3';

// Open the database
const db = new Database('epstein-archive.db');

// Recreate the entity_summary view with the updated entities table
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