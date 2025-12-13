import { getDb } from '../src/server/db/connection.js';
import { runMigrations } from '../src/server/db/migrator.js';

async function backfillMentions() {
  console.log('Starting entity mentions backfill...');
  
  // Ensure schema is up to date
  runMigrations();
  
  const db = getDb();

  // DROP TRIGGERS to avoid FTS corruption/overhead during bulk update
  console.log('Dropping triggers for performance...');
  db.exec('DROP TRIGGER IF EXISTS entities_au');
  db.exec('DROP TRIGGER IF EXISTS entities_ai');
  db.exec('DROP TRIGGER IF EXISTS entities_ad');
  
  // Get all entities
  const entities = db.prepare('SELECT id, full_name, mentions FROM entities').all() as any[];
  console.log(`Found ${entities.length} entities.`);
  
  // Get all documents
  const documents = db.prepare('SELECT id, content, date_created FROM documents WHERE content IS NOT NULL').all() as any[];
  console.log(`Found ${documents.length} documents.`);
  
  let totalMentions = 0;
  
  // Begin transaction
  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO entity_mentions (entity_id, document_id, mention_count, first_seen_at, last_seen_at)
    VALUES (@entityId, @docId, @count, @date, @date)
  `);
  
  const updateEntityStmt = db.prepare(`
    UPDATE entities 
    SET mentions = (SELECT SUM(mention_count) FROM entity_mentions WHERE entity_id = @id),
        document_count = (SELECT COUNT(*) FROM entity_mentions WHERE entity_id = @id)
    WHERE id = @id
  `);

  // Use a transaction for bulk insert
  const transaction = db.transaction(() => {
    for (const doc of documents) {
      if (!doc.content) continue;
      const contentLower = doc.content.toLowerCase();
      
      for (const entity of entities) {
        if (!entity.full_name) continue;
        const nameLower = entity.full_name.toLowerCase();
        
        // Simple substring match (can be improved with regex/boundaries)
        // Count occurrences
        let count = 0;
        let pos = contentLower.indexOf(nameLower);
        while (pos !== -1) {
          count++;
          pos = contentLower.indexOf(nameLower, pos + 1);
        }
        
        if (count > 0) {
          insertStmt.run({
            entityId: entity.id,
            docId: doc.id,
            count: count,
            date: doc.date_created || new Date().toISOString()
          });
          totalMentions += count;
        }
      }
    }
    
    // Update entity aggregates
    console.log('Updating entity aggregates...');
    for (const entity of entities) {
        updateEntityStmt.run({ id: entity.id });
    }
  });
  
  transaction();
  
  // Restore Triggers
  console.log('Restoring triggers...');
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS entities_ai AFTER INSERT ON entities BEGIN
      INSERT INTO entities_fts(rowid, full_name, primary_role, connections_summary)
      VALUES (new.id, new.full_name, new.primary_role, new.connections_summary);
    END;

    CREATE TRIGGER IF NOT EXISTS entities_ad AFTER DELETE ON entities BEGIN
      INSERT INTO entities_fts(entities_fts, rowid, full_name, primary_role, connections_summary)
      VALUES('delete', old.id, old.full_name, old.primary_role, old.connections_summary);
    END;

    CREATE TRIGGER IF NOT EXISTS entities_au AFTER UPDATE ON entities BEGIN
      INSERT INTO entities_fts(entities_fts, rowid, full_name, primary_role, connections_summary)
      VALUES('delete', old.id, old.full_name, old.primary_role, old.connections_summary);
      INSERT INTO entities_fts(rowid, full_name, primary_role, connections_summary)
      VALUES (new.id, new.full_name, new.primary_role, new.connections_summary);
    END;
  `);

  // Rebuild FTS
  console.log('Rebuilding FTS...');
  db.prepare("INSERT INTO entities_fts(entities_fts) VALUES('rebuild')").run();
  
  console.log(`Backfill complete. Inserted ${totalMentions} total mentions.`);
}

backfillMentions().catch(console.error);
