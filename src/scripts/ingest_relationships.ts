import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

const dbPath = path.join(process.cwd(), 'epstein.db');
const db = new Database(dbPath, { timeout: 30000 });
db.pragma('journal_mode = WAL');
const DATA_DIR = path.join(process.cwd(), '../data');

console.log('Starting relationship ingestion...');

// 1. Load Entities Map for fast lookup
const entities = db.prepare('SELECT id, full_name, role FROM entities').all() as any[];
// Create normalized map for matching
const entityMap = new Map<string, number>();
entities.forEach(e => {
  if (e.full_name) {
    entityMap.set(e.full_name.toLowerCase().trim(), e.id);
    // Add variations if needed (e.g. "Epstein, Jeffrey" -> "Jeffrey Epstein")
    if (e.full_name.includes(', ')) {
      const [last, first] = e.full_name.split(', ');
      entityMap.set(`${first} ${last}`.toLowerCase().trim(), e.id);
    }
  }
});
console.log(`Loaded ${entities.length} entities for matching.`);

// Helper to find entity ID
function findEntityId(name: string): number | null {
  if (!name) return null;
  const normalized = name.toLowerCase().trim();
  if (entityMap.has(normalized)) return entityMap.get(normalized)!;
  
  // Fuzzy matching could be added here, but sticking to exact for safety first
  return null;
}

// Helper to create relationship
const insertRelStmt = db.prepare(`
  INSERT INTO entity_relationships (source_entity_id, target_entity_id, relationship_type, strength, description, first_interaction_date)
  VALUES (@source, @target, @type, @strength, @desc, @date)
  ON CONFLICT(source_entity_id, target_entity_id, relationship_type) 
  DO UPDATE SET strength = MAX(strength, @strength), last_interaction_date = MAX(last_interaction_date, @date)
`);

function createRelationship(sourceId: number, targetId: number, type: string, strength: number, desc: string, date?: string) {
  if (sourceId === targetId) return;
  // Ensure consistent ordering for undirected relationships to avoid duplicates? 
  // For 'emailed', direction matters. For 'traveled_with', it doesn't.
  // We'll store directional for email, bidirectional for others if needed.
  
  try {
    insertRelStmt.run({
      source: sourceId,
      target: targetId,
      type: type,
      strength: strength,
      desc: desc,
      date: date || new Date().toISOString()
    });
  } catch (err) {
    // console.error(`Failed to insert relationship: ${err}`);
  }
}

// 2. Ingest Communications (CSV)
function ingestCommunications() {
  console.log('Ingesting communications from CSV...');
  const csvPath = path.join(DATA_DIR, 'csv/house_oversight_clean.csv');
  if (fs.existsSync(csvPath)) {
    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split(/\r?\n/);
    const headerIndex = lines.findIndex(l => l.includes('Bates Begin'));
    
    if (headerIndex === -1) {
        console.error('Could not find CSV header row starting with "Bates Begin"');
        return;
    }
    
    const csvContent = lines.slice(headerIndex).join('\n');
    
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true
    });

    let count = 0;
    const insertTrans = db.transaction((batch) => {
        for (const op of batch) op();
    });
    
    let ops: (() => void)[] = [];

    for (const record of records as any[]) {
      // Columns: 'Email From', 'Email To', 'Email CC', 'Email BCC', 'Author'
      // Warning: 'Email From' might be empty.
      const from = record['Email From'] || record['Author'];
      const to = record['Email To'];
      const date = record['Date Sent'] || record['Date Created'];
      
      if (!from) continue;

      const sourceId = findEntityId(from);
      if (sourceId) {
        if (to) {
          const recipients = to.split(/[;,]/).map((s: string) => s.trim());
          for (const recipient of recipients) {
            const targetId = findEntityId(recipient);
            if (targetId) {
              ops.push(() => createRelationship(sourceId, targetId, 'emailed', 1.0, `Email sent on ${date}`, date));
              count++;
            }
          }
        }
      }
      
      if (ops.length >= 1000) {
        insertTrans(ops);
        ops = [];
      }
    }
    if (ops.length > 0) insertTrans(ops);
    console.log(`Ingested ${count} email relationships.`);
  } else {
    console.log('CSV file not found, skipping communications.');
  }
}

// 3. Ingest Graph/Co-occurrence
function ingestCoOccurrence() {
  console.log('Ingesting co-occurrences...');
  
  // Get all documents with mentions
  const docs = db.prepare(`
    SELECT document_id, count(DISTINCT entity_id) as entity_count
    FROM entity_mentions 
    GROUP BY document_id 
    HAVING entity_count > 1 AND entity_count <= 50
  `).all() as any[];
  
  console.log(`Processing ${docs.length} documents for co-occurrence (skipped huge docs > 50 entities)...`);

  let count = 0;
  
  const getMentionsStmt = db.prepare('SELECT DISTINCT entity_id FROM entity_mentions WHERE document_id = ?');
  
  const processBatch = db.transaction((docIds: number[]) => {
      for (const dId of docIds) {
          const mentions = getMentionsStmt.all(dId) as any[];
          const ids = mentions.map(m => m.entity_id);
          for (let i = 0; i < ids.length; i++) {
            for (let j = i + 1; j < ids.length; j++) {
                createRelationship(ids[i], ids[j], 'appears_with', 0.5, 'Co-occured in document');
                createRelationship(ids[j], ids[i], 'appears_with', 0.5, 'Co-occured in document');
                count++;
            }
          }
      }
  });

  const BATCH_SIZE = 100;
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
      const batch = docs.slice(i, i + BATCH_SIZE).map(d => d.document_id);
      processBatch(batch);
      if (i % 1000 === 0) process.stdout.write('.');
  }
  
  console.log(`\nIngested ${count} co-occurrence relationships.`);
}

// 4. Flight Logs
function ingestFlightLogs() {
  console.log('Scanning for flight log connections...');
  const flightDocs = db.prepare(`
    SELECT id FROM documents WHERE file_name LIKE '%flight%' OR file_name LIKE '%log%'
  `).all() as any[];

  let count = 0;
  // Transaction per document to be safe/incremental
  const runBatch = db.transaction((ops: (()=>void)[]) => ops.forEach(o => o()));
  
  for (const doc of flightDocs) {
    const mentions = db.prepare('SELECT entity_id FROM entity_mentions WHERE document_id = ?').all(doc.id) as any[];
    const ids = mentions.map(m => m.entity_id);
    
    if (ids.length > 100) continue; // Skip if too many

    const ops: (()=>void)[] = [];
    for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
            ops.push(() => {
                createRelationship(ids[i], ids[j], 'traveled_with', 1.0, 'Appeared in flight log document');
                createRelationship(ids[j], ids[i], 'traveled_with', 1.0, 'Appeared in flight log document');
            });
            count++;
        }
    }
    if (ops.length > 0) runBatch(ops);
  }
  console.log(`Ingested ${count} flight log relationships (inferred).`);
}

db.transaction(() => {
  ingestCommunications();
  ingestCoOccurrence();
  ingestFlightLogs();
})();

console.log('Relationship ingestion complete.');
