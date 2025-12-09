import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'epstein.db');
const db = new Database(dbPath);

console.log('Migrating database to include relationship tables...');

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS entity_relationships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_entity_id INTEGER NOT NULL,
      target_entity_id INTEGER NOT NULL,
      relationship_type TEXT NOT NULL, -- 'emailed', 'traveled_with', 'co_occurrence', 'legal_adversary', 'associate'
      strength REAL DEFAULT 1.0, -- 0.0 to 1.0
      description TEXT,
      first_interaction_date DATETIME,
      last_interaction_date DATETIME,
      review_status TEXT DEFAULT 'auto_generated',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (source_entity_id) REFERENCES entities(id),
      FOREIGN KEY (target_entity_id) REFERENCES entities(id),
      UNIQUE(source_entity_id, target_entity_id, relationship_type)
    );

    CREATE TABLE IF NOT EXISTS relationship_evidence (
      relationship_id INTEGER NOT NULL,
      evidence_id INTEGER NOT NULL,
      confidence REAL,
      context TEXT,
      FOREIGN KEY (relationship_id) REFERENCES entity_relationships(id) ON DELETE CASCADE,
      FOREIGN KEY (evidence_id) REFERENCES evidence(id) ON DELETE CASCADE,
      PRIMARY KEY (relationship_id, evidence_id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_relationships_source ON entity_relationships(source_entity_id);
    CREATE INDEX IF NOT EXISTS idx_relationships_target ON entity_relationships(target_entity_id);
    CREATE INDEX IF NOT EXISTS idx_relationships_type ON entity_relationships(relationship_type);
  `);
  console.log('Migration completed successfully.');
} catch (error) {
  console.error('Migration failed:', error);
  process.exit(1);
}
