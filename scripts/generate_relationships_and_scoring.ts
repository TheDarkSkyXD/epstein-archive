import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../epstein-archive.db');

console.log('🕸️  Generating Entity Relationships & Importance Scores\n');

const db = new Database(DB_PATH);

// Configuration
const CO_OCCURRENCE_WEIGHT = 1.0;
const TIMELINE_WEIGHT = 5.0;
const BATCH_SIZE = 1000;

function generateRelationships() {
  console.log('1️⃣  Generating Co-occurrence Relationships...');
  
  // Get entities per document
  // Filter for Person entities only to keep graph manageable?
  // Or include Organizations? Let's include both but maybe filter by mention count later.
  // For now, let's do all entities involved in mentions.
  
  const stmt = db.prepare(`
    SELECT document_id, GROUP_CONCAT(entity_id) as entity_ids
    FROM entity_mentions
    GROUP BY document_id
    HAVING COUNT(entity_id) > 1
  `);

  let processedDocs = 0;
  let relationshipsCreated = 0;
  
  const insertStmt = db.prepare(`
    INSERT INTO entity_relationships (source_id, target_id, relationship_type, weight, confidence)
    VALUES (?, ?, 'co_occurrence', ?, 0.6)
    ON CONFLICT(source_id, target_id, relationship_type) 
    DO UPDATE SET weight = weight + ?
  `);

  const transaction = db.transaction((pairs: [number, number][]) => {
    for (const [src, tgt] of pairs) {
      insertStmt.run(src, tgt, CO_OCCURRENCE_WEIGHT, CO_OCCURRENCE_WEIGHT);
      // Also insert reverse? Or assume undirected?
      // Let's insert undirected by ensuring source < target
      // Actually, let's just store source < target to save space
    }
  });

  const rows = stmt.all() as {document_id: number, entity_ids: string}[];
  console.log(`   Found ${rows.length} documents with multiple entities.`);

  let batch: [number, number][] = [];

  for (const row of rows) {
    const ids = row.entity_ids.split(',').map(Number).sort((a, b) => a - b);
    // Remove duplicates
    const uniqueIds = [...new Set(ids)];
    
    if (uniqueIds.length > 50) {
      // Skip documents with too many entities (likely lists/indexes) to avoid explosion
      continue;
    }

    for (let i = 0; i < uniqueIds.length; i++) {
      for (let j = i + 1; j < uniqueIds.length; j++) {
        batch.push([uniqueIds[i], uniqueIds[j]]);
      }
    }

    if (batch.length >= BATCH_SIZE) {
      transaction(batch);
      relationshipsCreated += batch.length;
      batch = [];
      process.stdout.write(`   Processed ${processedDocs} docs, ${relationshipsCreated} links...\r`);
    }
    processedDocs++;
  }

  if (batch.length > 0) {
    transaction(batch);
    relationshipsCreated += batch.length;
  }
  
  console.log(`\n   ✅ Created ${relationshipsCreated} co-occurrence links.\n`);
}

function generateTimelineRelationships() {
  console.log('2️⃣  Generating Timeline Relationships...');
  
  const rows = db.prepare(`
    SELECT id, people_involved
    FROM timeline_events
    WHERE people_involved IS NOT NULL AND people_involved != '[]'
  `).all() as {id: number, people_involved: string}[];

  let links = 0;
  const insertStmt = db.prepare(`
    INSERT INTO entity_relationships (source_id, target_id, relationship_type, weight, confidence)
    VALUES (?, ?, 'timeline_connection', ?, 0.8)
    ON CONFLICT(source_id, target_id, relationship_type) 
    DO UPDATE SET weight = weight + ?
  `);

  const transaction = db.transaction((pairs: [number, number][]) => {
    for (const [src, tgt] of pairs) {
      insertStmt.run(src, tgt, TIMELINE_WEIGHT, TIMELINE_WEIGHT);
    }
  });

  let batch: [number, number][] = [];

  for (const row of rows) {
    try {
      const ids = JSON.parse(row.people_involved).map(Number).sort((a: number, b: number) => a - b);
      const uniqueIds = [...new Set(ids)] as number[];

      for (let i = 0; i < uniqueIds.length; i++) {
        for (let j = i + 1; j < uniqueIds.length; j++) {
          batch.push([uniqueIds[i], uniqueIds[j]]);
        }
      }
    } catch (e) {
      continue;
    }
  }

  if (batch.length > 0) {
    transaction(batch);
    links += batch.length;
  }

  console.log(`   ✅ Created ${links} timeline links.\n`);
}

function calculateImportanceScores() {
  console.log('3️⃣  Calculating Importance Scores...');

  // 1. Base Score: Log(Mentions)
  // 2. Degree Centrality: Number of relationships
  // 3. Black Book Bonus
  
  // Get max mentions for normalization
  const maxMentions = (db.prepare('SELECT MAX(mentions) as m FROM entities').get() as {m: number}).m || 1;
  
  // Get degree counts
  const degreeMap = new Map<number, number>();
  const relRows = db.prepare('SELECT source_id, target_id FROM entity_relationships').all() as {source_id: number, target_id: number}[];
  for (const row of relRows) {
    degreeMap.set(row.source_id, (degreeMap.get(row.source_id) || 0) + 1);
    degreeMap.set(row.target_id, (degreeMap.get(row.target_id) || 0) + 1);
  }
  
  // Get Black Book presence
  const blackBookIds = new Set(
    (db.prepare('SELECT DISTINCT person_id FROM black_book_entries WHERE person_id IS NOT NULL').all() as {person_id: number}[]).map(r => r.person_id)
  );

  const entities = db.prepare('SELECT id, mentions FROM entities').all() as {id: number, mentions: number}[];
  
  const updateStmt = db.prepare('UPDATE entities SET importance_score = ? WHERE id = ?');
  
  const transaction = db.transaction((updates: [number, number][]) => {
    for (const [id, score] of updates) {
      updateStmt.run(score, id);
    }
  });

  let batch: [number, number][] = [];
  
  for (const entity of entities) {
    // 1. Mention Score (0-50)
    // Log scale: log10(mentions) / log10(max) * 50
    const mentionScore = (Math.log10(Math.max(1, entity.mentions)) / Math.log10(maxMentions)) * 50;
    
    // 2. Connection Score (0-30)
    // Cap degree at 100 for max score
    const degree = degreeMap.get(entity.id) || 0;
    const connectionScore = Math.min(30, (degree / 100) * 30);
    
    // 3. Black Book Bonus (20)
    const blackBookScore = blackBookIds.has(entity.id) ? 20 : 0;
    
    const totalScore = Math.min(100, mentionScore + connectionScore + blackBookScore);
    
    batch.push([entity.id, Number(totalScore.toFixed(2))]);
    
    if (batch.length >= BATCH_SIZE) {
      transaction(batch);
      batch = [];
    }
  }
  
  if (batch.length > 0) {
    transaction(batch);
  }

  console.log(`   ✅ Updated importance scores for ${entities.length} entities.\n`);
}

// Run
try {
  generateRelationships();
  generateTimelineRelationships();
  calculateImportanceScores();
  console.log('🎉 Enhancement Complete!');
} catch (error) {
  console.error('❌ Error:', error);
  process.exit(1);
}
