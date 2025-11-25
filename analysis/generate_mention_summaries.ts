import Database from 'better-sqlite3';
import { join } from 'path';

const DB_PATH = join(process.cwd(), 'epstein-archive.db');

interface MentionRow {
  id: number;
  entity_name: string;
  document_id: number;
  content: string;
  context_text: string;
  position_start: number;
  position_end: number;
}

/**
 * Generate AI summary for a document mention
 * Creates a concise summary explaining the mention context using sentence extraction
 */
function generateSummary(mention: MentionRow): string {
  const { entity_name, content, context_text, position_start, position_end } = mention;
  
  // Helper to clean text
  const clean = (text: string) => text.replace(/\s+/g, ' ').trim();
  
  if (!content) return `This document contains a reference to ${entity_name}.`;

  // 1. Extract the specific sentence(s) containing the mention
  let mentionContext = '';
  if (position_start !== null && position_end !== null) {
    // Look backwards for sentence start
    let start = Math.max(0, position_start);
    while (start > 0 && start > position_start - 200 && !'.!?\n'.includes(content[start])) {
      start--;
    }
    if ('.!?\n'.includes(content[start])) start++; // Skip the punctuation

    // Look forwards for sentence end
    let end = Math.min(content.length, position_end);
    while (end < content.length && end < position_end + 200 && !'.!?\n'.includes(content[end])) {
      end++;
    }
    if (end < content.length) end++; // Include punctuation

    mentionContext = clean(content.substring(start, end));
  }

  // 2. Extract document opening (first 150 chars) for overall context
  const docOpening = clean(content.substring(0, 150));
  
  // 3. Construct the summary
  if (mentionContext && mentionContext.length > 10) {
    // If we have a good mention context
    if (docOpening.length > 20 && !mentionContext.startsWith(docOpening.substring(0, 20))) {
      return `Document starts with: "${docOpening}..." \n\n${entity_name} is mentioned: "${mentionContext}"`;
    } else {
      return `${entity_name} is mentioned in the context: "${mentionContext}"`;
    }
  } else if (context_text && context_text.trim() && context_text !== 'Mentioned in document') {
    // Fallback to existing context_text if available
    return `Context: ${context_text}`;
  } else {
    // Fallback to document preview
    return `${entity_name} appears in this document. Preview: "${docOpening}..."`;
  }
}

async function generateAllSummaries() {
  console.log('🚀 Starting AI summary generation for entity mentions...');
  console.log(`📂 Database: ${DB_PATH}`);
  
  const db = new Database(DB_PATH);
  
  try {
    // First, add the column if it doesn't exist (migration)
    try {
      db.exec('ALTER TABLE entity_mentions ADD COLUMN ai_summary TEXT');
      console.log('✅ Added ai_summary column to entity_mentions table');
    } catch (error: any) {
      if (error.message.includes('duplicate column')) {
        console.log('ℹ️  ai_summary column already exists');
      } else {
        throw error;
      }
    }
    
    // Get total count
    const countResult = db.prepare('SELECT COUNT(*) as total FROM entity_mentions').get() as { total: number };
    const total = countResult.total;
    console.log(`📊 Total entity mentions to process: ${total.toLocaleString()}`);
    
    // Process in chunks to avoid memory issues
    const CHUNK_SIZE = 1000;
    let totalProcessed = 0;
    
    // eslint-disable-next-line no-constant-condition
    while (true) {
      // Query a chunk of mentions without summaries
      const query = `
        SELECT 
          em.id,
          e.full_name as entity_name,
          em.document_id,
          d.content,
          em.context_text,
          em.position_start,
          em.position_end
        FROM entity_mentions em
        JOIN entities e ON em.entity_id = e.id
        JOIN documents d ON em.document_id = d.id
        WHERE (em.ai_summary IS NULL OR em.ai_summary = '')
        ORDER BY CASE WHEN em.entity_id = 19 THEN 0 ELSE 1 END, em.id
        LIMIT ${CHUNK_SIZE}
      `;
      
      const mentions = db.prepare(query).all() as MentionRow[];
      
      if (mentions.length === 0) {
        console.log('✅ All mentions processed!');
        break;
      }
      
      console.log(`🔄 Processing chunk of ${mentions.length} mentions...`);
      
      const updateStmt = db.prepare('UPDATE entity_mentions SET ai_summary = ? WHERE id = ?');
      
      const transaction = db.transaction((batch: MentionRow[]) => {
        for (const mention of batch) {
          const summary = generateSummary(mention);
          updateStmt.run(summary, mention.id);
        }
      });
      
      transaction(mentions);
      totalProcessed += mentions.length;
      console.log(`  ⏳ Total processed: ${totalProcessed.toLocaleString()}`);
      
      // Optional: Force garbage collection if possible, or just rely on scope
      if (global.gc) {
        global.gc();
      }
    }
    
    console.log(`✅ Successfully generated ${totalProcessed.toLocaleString()} summaries!`);
    
    // Show some examples
    console.log('\\n📝 Sample summaries:');
    const samples = db.prepare(`
      SELECT 
        e.full_name as entity_name,
        em.ai_summary
      FROM entity_mentions em
      JOIN entities e ON em.entity_id = e.id
      WHERE em.ai_summary IS NOT NULL
      LIMIT 5
    `).all() as Array<{ entity_name: string; ai_summary: string }>;
    
    samples.forEach((sample, i) => {
      console.log(`\\n${i + 1}. ${sample.entity_name}:`);
      console.log(`   "${sample.ai_summary.substring(0, 150)}${sample.ai_summary.length > 150 ? '...' : ''}"`);
    });
    
  } catch (error) {
    console.error('❌ Error generating summaries:', error);
    throw error;
  } finally {
    db.close();
  }
}

// Run directly
generateAllSummaries()
  .then(() => {
    console.log('\\n✨ Summary generation complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\\n❌ Fatal error:', error);
    process.exit(1);
  });

export { generateAllSummaries };
