import Database from 'better-sqlite3';
import { join } from 'path';

const DB_PATH = join(process.cwd(), 'epstein-archive.db');
const db = new Database(DB_PATH);

console.log('='.repeat(80));
console.log('CONTEXT EXTRACTION (STORING TEXT SNIPPETS)');
console.log('='.repeat(80));

function extractContexts() {
  console.log('\n[1/1] Extracting context snippets for mentions...');
  
  // Get all entities with mentions
  const entities = db.prepare(`
    SELECT DISTINCT e.id, e.full_name
    FROM entities e
    INNER JOIN entity_mentions em ON e.id = em.entity_id
    WHERE em.mention_context = 'Mentioned in document' OR em.mention_context IS NULL
  `).all() as any[];
  
  console.log(`Found ${entities.length} entities needing context extraction`);
  
  let processedCount = 0;
  let updatedMentions = 0;
  
  for (const entity of entities) {
    // Get documents for this entity
    const documents = db.prepare(`
      SELECT d.id, d.content
      FROM documents d
      INNER JOIN entity_mentions em ON d.id = em.document_id
      WHERE em.entity_id = ?
    `).all(entity.id) as any[];
    
    for (const doc of documents) {
      const content = (doc.content || '').replace(/\s+/g, ' '); // Normalize whitespace
      const entityName = entity.full_name;
      
      // Find entity in content (case insensitive)
      const regex = new RegExp(entityName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const match = content.match(regex);
      
      if (match) {
        const index = match.index!;
        const start = Math.max(0, index - 100);
        const end = Math.min(content.length, index + entityName.length + 100);
        let context = content.substring(start, end).trim();
        
        // Add ellipsis
        if (start > 0) context = '...' + context;
        if (end < content.length) context = context + '...';
        
        // Update mention
        db.prepare(`
          UPDATE entity_mentions 
          SET mention_context = ? 
          WHERE entity_id = ? AND document_id = ?
        `).run(context, entity.id, doc.id);
        
        updatedMentions++;
      }
    }
    
    processedCount++;
    if (processedCount % 1000 === 0) {
      console.log(`  Processed ${processedCount}/${entities.length} entities...`);
    }
  }
  
  console.log(`✓ Updated ${updatedMentions} mentions with context snippets`);
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  try {
    extractContexts();
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ CONTEXT EXTRACTION COMPLETE');
    console.log('='.repeat(80));
    
    db.close();
  } catch (error) {
    console.error('\n❌ Error:', error);
    db.close();
    process.exit(1);
  }
}

main();
