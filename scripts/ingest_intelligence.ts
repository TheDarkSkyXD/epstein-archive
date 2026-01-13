import Database from 'better-sqlite3';
// fs imports reserved for future file operations

// Simplistic NLP / Term Extraction
// In a real "Ultimate" pipeline, we might call an LLM here,
// but for reliability/speed let's start with robust regex & heuristics + consolidation.

const DB_PATH = process.env.DB_PATH || 'epstein-archive.db';
const db = new Database(DB_PATH);

// CONFIGURATION
const BATCH_SIZE = 100;

// TYPE HEURISTICS
const ORG_SUFFIXES = [
  'Inc',
  'Corp',
  'LLC',
  'Ltd',
  'Bank',
  'Foundation',
  'University',
  'Institute',
  'Association',
  'Club',
  'Holdings',
  'Trust',
  'Limited',
  'Group',
  'Fund',
];
const LOC_TERMS = [
  'Street',
  'Avenue',
  'Boulevard',
  'Drive',
  'Road',
  'Lane',
  'Island',
  'City',
  'County',
  'State',
  'New York',
  'Florida',
  'Palm Beach',
  'Paris',
  'London',
  'Airport',
  'House',
  'Mansion',
];

function detectType(name: string): 'Person' | 'Organization' | 'Location' | 'Other' {
  const parts = name.split(/[\s,.]+/);
  if (ORG_SUFFIXES.some((s) => new RegExp(`\\b${s}\\b`, 'i').test(name))) return 'Organization';
  if (LOC_TERMS.some((s) => new RegExp(`\\b${s}\\b`, 'i').test(name))) return 'Location';
  if (parts.length >= 2 && parts.length <= 4) return 'Person'; // Default for 2-4 words capitalized
  return 'Other';
}

// Import centralized blacklist
import { ENTITY_BLACKLIST, ENTITY_BLACKLIST_REGEX, ENTITY_PARTIAL_BLOCKLIST } from '../src/config/entityBlacklist';

const JUNK_REGEX = ENTITY_BLACKLIST_REGEX;

// Entity Normalizer
function normalizeName(name: string): string {
  return name
    .replace(/[\n\r\t]/g, ' ') // Remove newlines
    .replace(/\s+/g, ' ') // Collapse spaces
    .replace(/^['"]|['"]$/g, '') // Remove quotes
    .replace(/[.,;:]$/g, '') // Remove trailing punctuation
    .trim();
}

function rebuildEntityPipeline() {
  console.log('🚀 Starting ULTIMATE Entity Ingestion Pipeline...');

  const insertEntity = db.prepare(
    'INSERT INTO entities (full_name, entity_type, red_flag_rating) VALUES (?, ?, ?)',
  );
  const insertMention = db.prepare(
    'INSERT INTO entity_mentions (entity_id, document_id, mention_context, keyword) VALUES (?, ?, ?, ?)',
  );

  // Stats
  let totalEntities = 0;
  let totalMentions = 0;
  try {
    db.prepare('ALTER TABLE documents ADD COLUMN analyzed_at DATETIME').run();
    console.log('✅ Added analyzed_at column to documents.');
  } catch {
    // Column already exists - safe to ignore
  }

  // 1. Load Cache
  const entityCache = new Map<string, number>();
  // Also cache detected type to avoid re-detecting
  // const typeCache = new Map<string, string>();

  const entityRows = db
    .prepare('SELECT id, full_name, aliases, entity_type FROM entities')
    .all() as any[];
  entityRows.forEach((row) => {
    entityCache.set(normalizeName(row.full_name).toLowerCase(), row.id);
    if (row.aliases) {
      row.aliases.split(',').forEach((alias: string) => {
        entityCache.set(normalizeName(alias).toLowerCase(), row.id);
      });
    }
  });
  console.log(`🧠 Loaded ${entityCache.size} existing entities into memory.`);

  // 2. Fetch Unanalyzed Documents
  // Process in batches
  let hasMoreDocs = true;
  while (hasMoreDocs) {
    const docs = db
      .prepare(
        `
        SELECT id, content, file_name
        FROM documents
        WHERE analyzed_at IS NULL AND content IS NOT NULL
        LIMIT ?
      `,
      )
      .all(BATCH_SIZE) as any[];

    if (docs.length === 0) {
      console.log('✨ All documents processed.');
      hasMoreDocs = false;
      continue;
    }

    console.log(`📄 Processing batch of ${docs.length} documents...`);
    let newEntities = 0;
    let newMentions = 0;

    const markAnalyzed = db.prepare(
      "UPDATE documents SET analyzed_at = datetime('now') WHERE id = ?",
    );

    db.transaction(() => {
      for (const doc of docs) {
        const content = doc.content as string;
        // Heuristic: Capitalized words (2-5 words long)
        const POTENTIAL_ENTITY_REGEX = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,5})\b/g;

        const matches = [...content.matchAll(POTENTIAL_ENTITY_REGEX)];
        const docMentions = new Set<string>(); // avoid dups per doc if context weak

        for (const match of matches) {
          const rawName = match[0];
          const cleanName = normalizeName(rawName);

          // A. Junk Filter
          if (cleanName.length < 4) continue;
          if (JUNK_REGEX.test(cleanName)) continue;
          if (cleanName.includes('Epstein') && !cleanName.includes('Island')) continue; // Skip generic Epstein, allow Island
          
          // Check partial blocklist (e.g. "Received Received")
          if (ENTITY_PARTIAL_BLOCKLIST.some(term => cleanName.toLowerCase().includes(term.toLowerCase()))) {
            continue;
          }

          // B. Resolve
          const lowerName = cleanName.toLowerCase();
          let entityId = entityCache.get(lowerName);
          let entityType = 'Person';

          if (!entityId) {
            // Heuristic Type Detection
            entityType = detectType(cleanName);
            if (entityType === 'Other') continue; // Skip ambiguous "Other" for now to reduce noise? OR keep as generic?
            // Let's keep strict for now: if implies Org/Loc or looks like Human Name

            try {
              const res = insertEntity.run(cleanName, entityType, 1);
              entityId = Number(res.lastInsertRowid);
              entityCache.set(lowerName, entityId);
              newEntities++;
            } catch (e) {
              continue;
            }
          }

          // C. Mention
          // Only add one mention per entity per doc UNLESS specific context? keeps DB smaller.
          // User requested "rich metadata", so full mentions are good.
          const idx = match.index || 0;
          const start = Math.max(0, idx - 50);
          const end = Math.min(content.length, idx + rawName.length + 50);
          const context = content.substring(start, end).replace(/\s+/g, ' ');

          insertMention.run(entityId, doc.id, context, cleanName);
          newMentions++;
        }
        markAnalyzed.run(doc.id);
      }
    })();

    console.log(`   Batch complete. New Entities: ${newEntities}, Mentions: ${newMentions}`);
    totalEntities += newEntities;
    totalMentions += newMentions;
  }

  // 3. Post-Process: Map Relationships (Co-occurrence)
  console.log('🔗 Mapping Relationships (Co-occurrence)...');
  mapCoOccurrences();

  console.log(`\n============== REPORT ==============`);
  console.log(`Total New Entities: ${totalEntities}`);
  console.log(`Total Mentions Added: ${totalMentions}`);
  console.log(`====================================`);
}

function mapCoOccurrences() {
  // 1. Find docs with > 1 entity
  // We limit to docs processed in this run? Or all?
  // "Ultimate" implies full regeneration, but we should be efficient.
  // Let's process valid docs.
  const BATCH_SIZE_REL = 500;

  // Group by document, get entity list
  // This query can be heavy. Let's do it in chunks or simpler way?
  // Aggregation in sqlite is okay.
  const rows = db
    .prepare(
      `
        SELECT document_id, GROUP_CONCAT(entity_id) as ids 
        FROM entity_mentions 
        GROUP BY document_id 
        HAVING COUNT(DISTINCT entity_id) > 1
    `,
    )
    .all() as { document_id: number; ids: string }[];

  console.log(`   Found ${rows.length} documents with multiple entities for linking.`);

  const insertRel = db.prepare(`
        INSERT INTO entity_relationships (source_entity_id, target_entity_id, relationship_type, strength, confidence) 
        VALUES (?, ?, 'co_occurrence', ?, 0.5) 
        ON CONFLICT(source_entity_id, target_entity_id, relationship_type) 
        DO UPDATE SET strength = strength + ?
    `);

  let pairsCount = 0;

  const tx = db.transaction((pairs: [number, number][]) => {
    for (const [a, b] of pairs) {
      insertRel.run(a, b, 1, 1);
    }
  });

  let buffer: [number, number][] = [];

  for (const row of rows) {
    // Unique integers, sorted
    const ids = [...new Set(row.ids.split(',').map(Number))].sort((a, b) => a - b);

    // Skip massive lists (e.g. index pages)
    if (ids.length > 50) continue;

    // Generate combinations
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        buffer.push([ids[i], ids[j]]);
      }
    }

    if (buffer.length >= BATCH_SIZE_REL) {
      tx(buffer);
      pairsCount += buffer.length;
      buffer = [];
      process.stdout.write(`   Linked ${pairsCount} pairs...\r`);
    }
  }

  if (buffer.length > 0) {
    tx(buffer);
    pairsCount += buffer.length;
  }
  console.log(`   ✅ Created/Updated ${pairsCount} relationship links.`);
}

rebuildEntityPipeline();
