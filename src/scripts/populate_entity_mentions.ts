import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'epstein.db');
const db = new Database(dbPath);

console.log('Starting entity mention population...');

// 1. Load Entities into Map
// Key: lowercase name, Value: id
const entityMap = new Map<string, number>();
const entities = db.prepare('SELECT id, full_name FROM entities').all() as any[];

let maxWords = 0;
for (const e of entities) {
  if (e.full_name) {
    const name = e.full_name.trim();
    if (name.length < 3) continue; // Skip very short names
    // Skip likely junk (e.g. "Page 1") if needed, but for now include all

    const normalized = name.toLowerCase();
    entityMap.set(normalized, e.id);

    const wordCount = normalized.split(/\s+/).length;
    if (wordCount > maxWords) maxWords = wordCount;
  }
}
// Cap max words to reasonable limit to avoid performance kill on outliers
maxWords = Math.min(maxWords, 6);

console.log(`Loaded ${entityMap.size} entities. Max name length: ${maxWords} words.`);

// 2. Process Documents
const documents = db
  .prepare('SELECT id, content FROM documents WHERE content IS NOT NULL')
  .all() as any[];
console.log(`Processing ${documents.length} documents...`);

const insertStmt = db.prepare(`
  INSERT INTO entity_mentions (entity_id, document_id, mention_context, mention_type, position_in_text, significance_score)
  VALUES (@entityId, @docId, @context, 'text_match', @pos, 1)
`);

const deleteStmt = db.prepare('DELETE FROM entity_mentions');
deleteStmt.run();
console.log('Cleared existing mentions.');

let totalMentions = 0;

db.transaction(() => {
  for (let dIndex = 0; dIndex < documents.length; dIndex++) {
    const doc = documents[dIndex];
    const text = doc.content || '';
    if (!text) continue;

    // Tokenize roughly by whitespace, keeping track of positions?
    // Regex to split but keep indices is tricky.
    // Simple approach: Match all words, reconstructing n-grams.

    // Better: Normalized text for matching, original for context.
    const normalizedText = text.toLowerCase();

    // We need word start indices to report position and extract context.
    // Regex to find words and their indices.
    const wordRegex = /[a-z0-9']+/g;
    let match;
    const words: { str: string; index: number; end: number }[] = [];

    while ((match = wordRegex.exec(normalizedText)) !== null) {
      words.push({
        str: match[0],
        index: match.index,
        end: wordRegex.lastIndex,
      });
    }

    const docMentions = new Set<string>(); // avoid duplicates per doc? Or just limit freq?
    // Storing (entityId + position) to allow multiple mentions

    for (let i = 0; i < words.length; i++) {
      // Try n-grams starting at i
      let phrase = '';
      for (let j = 0; j < maxWords && i + j < words.length; j++) {
        const wordObj = words[i + j];
        if (j > 0) phrase += ' '; // Simple space joining
        phrase += wordObj.str;

        if (entityMap.has(phrase)) {
          const entityId = entityMap.get(phrase)!;

          // Context window: approx 50 chars before and after
          const start = words[i].index;
          const end = wordObj.end;
          const contextStart = Math.max(0, start - 50);
          const contextEnd = Math.min(text.length, end + 50);
          const context = text.slice(contextStart, contextEnd).replace(/\s+/g, ' ').trim();

          insertStmt.run({
            entityId: entityId,
            docId: doc.id,
            context: `...${context}...`,
            pos: start,
          });

          totalMentions++;

          // Optimization: If we matched "Jeffrey Epstein", we don't need to match "Jeffrey" at this position?
          // Actually, "Jeffrey" might be ambiguous anyway.
          // If we matched a longer phrase, likely we shouldn't match sub-phrases starting at same `i`.
          // We can break inner loop?
          // But "New York" and "New York City" - if we match "New York", we might miss "City".
          // If we match "New York City", we implicitly matched "New York".
          // Greedy approach: Match longest possible?
          // Let's stick to matching all for now, or match longest.
          // If we match longest, we should probably ignore shorter ones starting at `i`.
          // But `entityMap` has raw strings.
          // Let's implement longest match preference:
          // Check all n-grams, keep the longest match.
        }
      }
    }

    if (dIndex % 100 === 0) process.stdout.write('.');
  }
})();

console.log(`\nMentions population complete. Generated ${totalMentions} mentions.`);
