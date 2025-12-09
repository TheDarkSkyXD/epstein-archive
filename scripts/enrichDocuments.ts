import { DatabaseService } from '../src/services/DatabaseService';
import Database from 'better-sqlite3';

const dbService = DatabaseService.getInstance();
const db = dbService.getDatabase();

// Keywords for red flag rating (copied from DocumentProcessor)
const SPICY_KEYWORDS: Record<string, number> = {
  'criminal': 5, 'indictment': 5, 'charges': 5, 'arrest': 5, 'conviction': 5,
  'sex': 4, 'minor': 4, 'underage': 4, 'rape': 4, 'assault': 4,
  'flight': 3, 'private jet': 3, 'island': 3, 'lolita': 3, 'massage': 3,
  'trump': 2, 'clinton': 2, 'president': 2, 'prince': 2, 'senator': 2,
  'epstein': 1, 'maxwell': 1, 'ghislaine': 1
};

async function enrichDocuments() {
  console.log('Starting document enrichment...');

  // 1. Load all entities for lookup
  console.log('Loading entities...');
  const entities = db.prepare('SELECT id, full_name, title, role FROM entities').all() as any[];
  const entityMap = new Map<string, number>();
  
  entities.forEach(e => {
    if (e.full_name) entityMap.set(e.full_name.toLowerCase(), e.id);
    // Add variations if needed, e.g. last name only? strict for now to avoid false positives
  });
  console.log(`Loaded ${entities.length} entities.`);

  // 2. Fetch documents that need enrichment (no mentions yet)
  // We'll check all documents to be safe, but optimize by checking if they have mentions
  // actually, let's just process the ones we imported recently or all of them if count is low.
  // 2353 docs is small enough to process all.
  const documents = db.prepare('SELECT id, title, content, file_name FROM documents').all() as any[];
  console.log(`Processing ${documents.length} documents...`);

  const insertMention = db.prepare(`
    INSERT INTO entity_mentions (entity_id, document_id, mention_context, mention_type, significance_score)
    VALUES (@entity_id, @document_id, @mention_context, @mention_type, @significance_score)
  `);

  const updateDoc = db.prepare(`
    UPDATE documents 
    SET red_flag_rating = @rating, 
        spice_rating = @rating,
        mentions_count = @mentions_count
    WHERE id = @id
  `);

  const checkMention = db.prepare('SELECT id FROM entity_mentions WHERE entity_id = ? AND document_id = ?');

  let totalMentionsAdded = 0;
  let processedCount = 0;

  for (const doc of documents) {
    if (!doc.content) continue;

    const contentLower = doc.content.toLowerCase();
    let docMentions = 0;
    let redFlagScore = 0;

    // Calculate Red Flag Score
    for (const [keyword, weight] of Object.entries(SPICY_KEYWORDS)) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = contentLower.match(regex);
      if (matches) {
        redFlagScore += matches.length * weight;
      }
    }
    const redFlagRating = Math.min(5, Math.ceil(redFlagScore / 20)) || 1;

    // Extract Entities
    // We iterate through our entity list. For 47k entities this is O(N*M) which is slow.
    // Optimization: Extract capitalized words from doc and look them up in entityMap.
    
    const potentialNames = new Set<string>();
    // Regex for capitalized words (simple)
    const matches = doc.content.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b/g);
    if (matches) {
      matches.forEach((m: string) => potentialNames.add(m.toLowerCase()));
    }

    // Also check for specific key figures explicitly even if casing is wrong
    const keyFigures = ['epstein', 'maxwell', 'trump', 'clinton', 'prince andrew'];
    keyFigures.forEach(k => {
      if (contentLower.includes(k)) potentialNames.add(k);
    });

    for (const name of potentialNames) {
      if (entityMap.has(name)) {
        const entityId = entityMap.get(name);
        
        // Check if already linked
        const existing = checkMention.get(entityId, doc.id);
        if (!existing) {
          // Find context
          const idx = contentLower.indexOf(name);
          const start = Math.max(0, idx - 50);
          const end = Math.min(doc.content.length, idx + name.length + 50);
          const context = doc.content.substring(start, end).replace(/\s+/g, ' ').trim();

          try {
            insertMention.run({
              entity_id: entityId,
              document_id: doc.id,
              mention_context: context || 'Mentioned in document',
              mention_type: 'mention',
              significance_score: 1
            });
            docMentions++;
            totalMentionsAdded++;
          } catch (e) {
            // ignore duplicates if any constraint
          }
        } else {
            // Already linked, but we count it
            docMentions++; 
        }
      }
    }

    // Update document stats
    updateDoc.run({
      rating: redFlagRating,
      mentions_count: docMentions,
      id: doc.id
    });

    processedCount++;
    if (processedCount % 100 === 0) process.stdout.write('.');
  }

  console.log(`\nEnrichment complete.`);
  console.log(`Processed ${processedCount} documents.`);
  console.log(`Added ${totalMentionsAdded} new entity mentions.`);
}

enrichDocuments().catch(console.error);
