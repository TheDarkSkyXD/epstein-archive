import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'epstein-archive.db');

function fixView() {
  console.log('Fixing entity_summary view...');
  
  if (!fs.existsSync(DB_PATH)) {
    console.error('Database not found:', DB_PATH);
    process.exit(1);
  }

  const db = new Database(DB_PATH);

  try {
    // Drop existing view
    console.log('Dropping existing view...');
    db.exec('DROP VIEW IF EXISTS entity_summary');

    // Create new view without e.title
    console.log('Creating new view...');
    const createViewSql = `
      CREATE VIEW entity_summary AS
      SELECT 
          e.id,
          e.full_name,
          e.primary_role,
          e.likelihood_level,
          e.mentions,
          e.spice_rating,
          e.spice_score,
          -- e.title removed
          -- e.title_variants removed
          (
            SELECT GROUP_CONCAT(type_name)
            FROM (
              SELECT DISTINCT et.type_name AS type_name
              FROM entity_evidence_types eet2
              JOIN evidence_types et ON eet2.evidence_type_id = et.id
              WHERE eet2.entity_id = e.id
            ) AS distinct_types
          ) AS evidence_types,
          COUNT(DISTINCT em.document_id) as document_count,
          COUNT(DISTINCT em.id) as mention_count
      FROM entities e
      LEFT JOIN entity_mentions em ON e.id = em.entity_id
      GROUP BY e.id
    `;
    
    db.exec(createViewSql);
    console.log('View recreated successfully!');
    
    // Verify the new view definition
    const newView = db.prepare("SELECT sql FROM sqlite_master WHERE type='view' AND name='entity_summary'").get() as any;
    console.log('New view definition:', newView.sql);

  } catch (error) {
    console.error('Error fixing view:', error);
  } finally {
    db.close();
  }
}

fixView();
