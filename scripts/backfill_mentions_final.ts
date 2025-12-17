import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'epstein-archive.db');
const db = new Database(DB_PATH);

function main() {
  console.log(`Starting entity mentions backfill on ${DB_PATH}...`);
  
  // 1. Clear existing mentions
  try {
      db.exec('DELETE FROM entity_mentions');
  } catch (e) {
      console.log('entity_mentions does not exist or error clearing:', e);
  }

  // 2. Prepare temporary FTS table
  console.log('Creating temporary FTS table for high-speed matching...');
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS temp_docs_fts USING fts5(
      content,
      tokenize='porter' 
    );
  `);

  db.exec('DELETE FROM temp_docs_fts'); // Ensure clear

  const getAllDocuments = db.prepare('SELECT id, content FROM documents WHERE content IS NOT NULL');
  const insertFts = db.prepare('INSERT INTO temp_docs_fts(rowid, content) VALUES (?, ?)');
  
  const docs = getAllDocuments.all() as any[];
  console.log(`Indexing ${docs.length} documents...`);
  
  const indexTx = db.transaction((documents) => {
    for (const doc of documents) {
      insertFts.run(doc.id, doc.content);
    }
  });
  indexTx(docs);
  console.log('Indexing complete.');

  // 3. Match Entities
  const getAllEntities = db.prepare('SELECT id, name FROM entities');
  const entities = getAllEntities.all() as any[];
  console.log(`Scanning ${entities.length} entities...`);

  const searchFts = db.prepare(`
    SELECT rowid as docId 
    FROM temp_docs_fts 
    WHERE temp_docs_fts MATCH ? 
  `);
  
  const insertMention = db.prepare(`
    INSERT INTO entity_mentions (entity_id, document_id, mention_count, contexts_json)
    VALUES (?, ?, ?, ?)
  `);

  const updateEntityStats = db.prepare(`
    UPDATE entities 
    SET mentions = ?
    WHERE id = ?
  `);

  let totalMentions = 0;
  
  const batchSize = 100;
  let batchCount = 0;

  const entityStats = new Map<number, { mentions: number, docs: number }>();
  
  // Outer transaction for speed
  const runBackfill = db.transaction(() => {
      for (const entity of entities) {
          if (!entity.name) continue;
          
          // FTS match requires escaping quotes
          // And ideally simple phrase match: "Full Name"
          const safeName = entity.name.replace(/"/g, '""');
          const ftsQuery = `"${safeName}"`;
          
          let matchedDocs;
          try {
             matchedDocs = searchFts.all(ftsQuery) as { docId: number }[];
          } catch (e) {
             // FTS syntax error (e.g.weird chars), skip or fallback
             continue; 
          }

          if (matchedDocs.length === 0) continue;

          let entityMentions = 0;
          let entityDocs = 0;

          for (const match of matchedDocs) {
             // Retrieve content to count exact matches (optional, but good for data quality)
             // We can fetch from local docs array in memory to avoid DB roundtrip.
             const docContent = docs.find(d => d.id === match.docId)?.content;
             if (!docContent) continue;
             
             // Count exactly
             const escapedName = entity.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
             const regex = new RegExp(escapedName, 'gi');
             const count = (docContent.match(regex) || []).length;
             
             if (count > 0) {
                 insertMention.run(entity.id, match.docId, count, JSON.stringify([]));
                 entityMentions += count;
                 entityDocs++;
                 totalMentions++;
             }
          }
          
          if (entityDocs > 0) {
             updateEntityStats.run(entityMentions, entity.id);
          }
          
          batchCount++;
          if (batchCount % 1000 === 0) {
              process.stdout.write(`Processed ${batchCount}/${entities.length} entities...\r`);
          }
      }
  });

  try {
      runBackfill();
      console.log(`\nBackfill valid complete! Created ${totalMentions} mentions.`);
      
      // Clean up
      db.exec('DROP TABLE IF EXISTS temp_docs_fts');
      
  } catch (error) {
      console.error('Backfill failed:', error);
      process.exit(1);
  }
}

main();