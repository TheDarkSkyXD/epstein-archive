import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'epstein-archive.db');

async function populateContext() {
  console.log('Starting context population...');
  
  if (!fs.existsSync(DB_PATH)) {
    console.error('Database not found:', DB_PATH);
    process.exit(1);
  }

  const db = new Database(DB_PATH);

  try {
    // Get mentions with missing context
    // Limit to 10000 per batch to avoid memory issues if there are too many
    // We can run this script multiple times or loop
    const mentions = db.prepare(`
      SELECT id, document_id, position_start, position_end 
      FROM entity_mentions 
      WHERE context_text IS NULL OR context_text = ''
      ORDER BY document_id
    `).all() as any[];

    console.log(`Found ${mentions.length} mentions with missing context.`);

    if (mentions.length === 0) {
      console.log('No missing contexts found.');
      return;
    }

    // Group by document_id
    const mentionsByDoc = new Map<number, any[]>();
    for (const m of mentions) {
      if (!mentionsByDoc.has(m.document_id)) {
        mentionsByDoc.set(m.document_id, []);
      }
      mentionsByDoc.get(m.document_id)?.push(m);
    }

    console.log(`Processing ${mentionsByDoc.size} documents...`);

    let updatedCount = 0;
    const updateStmt = db.prepare('UPDATE entity_mentions SET context_text = ? WHERE id = ?');

    db.transaction(() => {
      for (const [docId, docMentions] of mentionsByDoc.entries()) {
        // Get document content
        const doc = db.prepare('SELECT content FROM documents WHERE id = ?').get(docId) as any;
        
        if (!doc || !doc.content) {
          console.warn(`Document ${docId} not found or has no content. Skipping ${docMentions.length} mentions.`);
          continue;
        }

        const content = doc.content;
        const contentLength = content.length;

        for (const m of docMentions) {
          // Extract context (±100 chars)
          const start = Math.max(0, m.position_start - 100);
          const end = Math.min(contentLength, m.position_end + 100);
          
          let context = content.substring(start, end);
          
          // Clean up whitespace
          context = context.replace(/\s+/g, ' ').trim();
          
          // Add ellipsis if truncated
          if (start > 0) context = '...' + context;
          if (end < contentLength) context = context + '...';

          updateStmt.run(context, m.id);
          updatedCount++;
        }

        if (updatedCount % 1000 === 0) {
          console.log(`Updated ${updatedCount} mentions...`);
        }
      }
    })();

    console.log('Context population complete!');
    console.log(`Updated ${updatedCount} mentions.`);

  } catch (error) {
    console.error('Error during context population:', error);
  } finally {
    db.close();
  }
}

populateContext();
