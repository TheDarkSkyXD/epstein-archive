/**
 * AI Enrichment Pipeline - Full End-to-End Processor
 *
 * Runs ALL enrichment stages on documents:
 *   1. REPAIR   - MIME wildcard reconstruction
 *   2. CLASSIFY - Redaction type inference
 *   3. RELATE   - Relationship extraction
 *   4. SUMMARIZE - Forensic summary generation
 *
 * Usage:
 *   npx tsx scripts/ai_pipeline.ts
 *
 * Environment Variables:
 *   ID_START      - Starting document ID (inclusive, default: 1)
 *   ID_END        - Ending document ID (inclusive, default: all)
 *   STAGES        - Comma-separated stages to run (default: all)
 *                   Options: repair,classify,relate,summarize
 *   AI_PROVIDER   - 'local_ollama' or 'exo_cluster'
 *   BATCH_SIZE    - Documents per batch (default: 50)
 */

import Database from 'better-sqlite3';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { AIEnrichmentService } from '../src/server/services/AIEnrichmentService.js';

const DB_PATH = process.env.DB_PATH || './epstein-archive.db';
const ID_START = parseInt(process.env.ID_START || '1', 10);
const ID_END = parseInt(process.env.ID_END || '999999999', 10);
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '50', 10);
const STAGES = (process.env.STAGES || 'repair,classify,relate,summarize').split(',');
const OUTPUT_DIR = process.env.OUTPUT_DIR || './pipeline_results';
const CHECKPOINT_INTERVAL = parseInt(process.env.CHECKPOINT_INTERVAL || '100', 10);

// Ensure AI enrichment is enabled
process.env.ENABLE_AI_ENRICHMENT = 'true';
if (!process.env.AI_PROVIDER) {
  process.env.AI_PROVIDER = 'local_ollama';
}

interface PipelineResult {
  id: number;
  stages: {
    repair?: { applied: boolean; charsDiff: number };
    classify?: { redactions: { type: string; confidence: number }[] };
    relate?: {
      relationships: { source: string; target: string; type: string; confidence: number }[];
    };
    summarize?: { summary: string | null };
  };
  totalTimeMs: number;
  error?: string;
}

interface CheckpointState {
  lastProcessedId: number;
  totalProcessed: number;
  stageStats: Record<string, number>;
  startTime: string;
}

function loadCheckpoint(): CheckpointState | null {
  const checkpointPath = join(OUTPUT_DIR, 'checkpoint.json');
  if (existsSync(checkpointPath)) {
    try {
      return JSON.parse(readFileSync(checkpointPath, 'utf-8'));
    } catch {
      return null;
    }
  }
  return null;
}

function saveCheckpoint(state: CheckpointState): void {
  const checkpointPath = join(OUTPUT_DIR, 'checkpoint.json');
  writeFileSync(checkpointPath, JSON.stringify(state, null, 2));
}

function saveResults(results: PipelineResult[], batchNumber: number): void {
  const filename = join(OUTPUT_DIR, `batch_${batchNumber}.json`);
  writeFileSync(filename, JSON.stringify(results, null, 2));
  console.log(`  💾 Saved ${results.length} results to ${filename}`);
}

async function processDocument(
  db: Database.Database,
  doc: { id: number; content: string; metadata_json: string | null; file_name: string },
  knownEntities: { id: number; name: string }[],
): Promise<PipelineResult> {
  const startTime = Date.now();
  const result: PipelineResult = {
    id: doc.id,
    stages: {},
    totalTimeMs: 0,
  };

  try {
    // Extract context from metadata
    let context = doc.file_name;
    let subject = doc.file_name;
    if (doc.metadata_json) {
      try {
        const meta = JSON.parse(doc.metadata_json);
        context = meta.subject || meta.title || doc.file_name;
        subject = meta.subject || doc.file_name;
      } catch {
        // Use filename as context
      }
    }

    let currentContent = doc.content;

    // Stage 1: REPAIR
    if (STAGES.includes('repair') && currentContent.includes('=')) {
      const repaired = await AIEnrichmentService.repairMimeWildcards(currentContent, context);
      const diff = Math.abs(repaired.length - currentContent.length);
      result.stages.repair = { applied: diff > 0, charsDiff: diff };

      // Update content in DB if repairs were made
      if (diff > 0) {
        db.prepare('UPDATE documents SET content = ? WHERE id = ?').run(repaired, doc.id);
        currentContent = repaired;
      }
    }

    // Stage 2: CLASSIFY (redactions)
    if (STAGES.includes('classify')) {
      const redactionMatches = Array.from(
        currentContent.matchAll(/\[(REDACTED|Redacted|redacted)\]/g),
      );
      const redactions: { type: string; confidence: number }[] = [];

      for (const match of redactionMatches) {
        const idx = match.index || 0;
        const preContext = currentContent.slice(Math.max(0, idx - 200), idx);
        const postContext = currentContent.slice(
          idx + match[0].length,
          idx + match[0].length + 200,
        );

        const inferences = await AIEnrichmentService.classifyRedaction(preContext, postContext);
        if (inferences.length > 0) {
          redactions.push({ type: inferences[0].type, confidence: inferences[0].confidence });
        }

        // Limit to first 5 redactions per doc for performance
        if (redactions.length >= 5) break;
      }

      result.stages.classify = { redactions };
    }

    // Stage 3: RELATE (relationships)
    if (STAGES.includes('relate')) {
      // Get entity mentions for this document
      const mentions = db
        .prepare(
          `
        SELECT e.full_name as name FROM entity_mentions em
        JOIN entities e ON em.entity_id = e.id
        WHERE em.document_id = ?
      `,
        )
        .all(doc.id) as { name: string }[];

      const entityNames = Array.from(new Set(mentions.map((m) => m.name))).slice(0, 10);

      if (entityNames.length >= 2) {
        // Take first 1000 chars as the analysis paragraph
        const paragraph = currentContent.slice(0, 1000);
        const relationships = await AIEnrichmentService.extractRelationships(
          paragraph,
          entityNames,
        );
        result.stages.relate = {
          relationships: relationships.map((r) => ({
            source: r.source,
            target: r.target,
            type: r.relationship,
            confidence: r.confidence,
          })),
        };

        // Store relationships in DB
        const insertRel = db.prepare(`
          INSERT OR IGNORE INTO entity_relationships 
          (source_entity_id, target_entity_id, relationship_type, confidence, source_document_id)
          SELECT s.id, t.id, ?, ?, ?
          FROM entities s, entities t
          WHERE s.name = ? AND t.name = ?
        `);

        for (const rel of relationships) {
          insertRel.run(rel.relationship, rel.confidence, doc.id, rel.source, rel.target);
        }
      }
    }

    // Stage 4: SUMMARIZE
    if (STAGES.includes('summarize') && currentContent.length > 100) {
      const summary = await AIEnrichmentService.summarizeDocument(currentContent, {
        fileName: doc.file_name,
        subject,
      });

      result.stages.summarize = { summary };

      if (summary) {
        // Store summary in document metadata
        const existingMeta = doc.metadata_json ? JSON.parse(doc.metadata_json) : {};
        existingMeta.ai_summary = summary;
        db.prepare('UPDATE documents SET metadata_json = ? WHERE id = ?').run(
          JSON.stringify(existingMeta),
          doc.id,
        );
      }
    }
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Unknown error';
  }

  result.totalTimeMs = Date.now() - startTime;
  return result;
}

async function main() {
  console.log(`\n🚀 AI Enrichment Pipeline (End-to-End)`);
  console.log(`   Provider: ${process.env.AI_PROVIDER}`);
  console.log(`   ID Range: ${ID_START} - ${ID_END === 999999999 ? 'ALL' : ID_END}`);
  console.log(`   Stages: ${STAGES.join(' → ')}`);
  console.log(`   Database: ${DB_PATH}`);
  console.log(`   Output: ${OUTPUT_DIR}\n`);

  // Ensure output directory exists
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Load checkpoint
  const checkpoint = loadCheckpoint();
  let resumeFromId = ID_START;
  let totalProcessed = 0;
  const stageStats: Record<string, number> = {};
  STAGES.forEach((s) => (stageStats[s] = 0));

  if (checkpoint) {
    resumeFromId = checkpoint.lastProcessedId + 1;
    totalProcessed = checkpoint.totalProcessed;
    Object.assign(stageStats, checkpoint.stageStats);
    console.log(`📍 Resuming from ID ${resumeFromId} (${totalProcessed} already processed)\n`);
  }

  const db = new Database(DB_PATH);

  // Ensure entity_relationships table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS entity_relationships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_entity_id INTEGER NOT NULL,
      target_entity_id INTEGER NOT NULL,
      relationship_type TEXT NOT NULL,
      confidence REAL DEFAULT 0.5,
      source_document_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(source_entity_id, target_entity_id, relationship_type)
    )
  `);

  // Count documents
  const countStmt = db.prepare(`
    SELECT COUNT(*) as count FROM documents 
    WHERE id >= ? AND id <= ? AND content IS NOT NULL
  `);
  const { count: totalDocs } = countStmt.get(resumeFromId, ID_END) as { count: number };
  console.log(`📊 Documents to process: ${totalDocs}\n`);

  // Load known entities for disambiguation
  const knownEntities = db
    .prepare('SELECT id, full_name as name FROM entities LIMIT 1000')
    .all() as { id: number; name: string }[];

  // Process in batches
  const selectStmt = db.prepare(`
    SELECT id, content, metadata_json, file_name
    FROM documents 
    WHERE id >= ? AND id <= ? AND content IS NOT NULL
    ORDER BY id ASC
    LIMIT ?
  `);

  let currentId = resumeFromId;
  let batchNumber = Math.floor(totalProcessed / BATCH_SIZE) + 1;
  let batchResults: PipelineResult[] = [];
  const startTime = checkpoint?.startTime || new Date().toISOString();

  while (currentId <= ID_END) {
    const docs = selectStmt.all(currentId, ID_END, BATCH_SIZE) as Array<{
      id: number;
      content: string;
      metadata_json: string | null;
      file_name: string;
    }>;

    if (docs.length === 0) break;

    for (const doc of docs) {
      const result = await processDocument(db, doc, knownEntities);
      batchResults.push(result);

      // Update stage stats
      if (result.stages.repair?.applied) stageStats['repair']++;
      if (result.stages.classify?.redactions.length) stageStats['classify']++;
      if (result.stages.relate?.relationships.length) stageStats['relate']++;
      if (result.stages.summarize?.summary) stageStats['summarize']++;

      totalProcessed++;
      currentId = doc.id + 1;

      // Progress logging
      if (totalProcessed % 5 === 0) {
        const elapsed = (Date.now() - new Date(startTime).getTime()) / 1000;
        const rate = totalProcessed / elapsed;
        const remaining = (totalDocs - totalProcessed) / rate;

        process.stdout.write(
          `\r  ⏳ ${totalProcessed}/${totalDocs} (${((totalProcessed / totalDocs) * 100).toFixed(1)}%) | ${rate.toFixed(2)} docs/s | ETA: ${Math.ceil(remaining / 60)} min`,
        );
      }

      // Checkpoint
      if (totalProcessed % CHECKPOINT_INTERVAL === 0) {
        saveCheckpoint({
          lastProcessedId: doc.id,
          totalProcessed,
          stageStats,
          startTime,
        });
      }
    }

    // Save batch
    if (batchResults.length >= BATCH_SIZE) {
      saveResults(batchResults, batchNumber);
      batchNumber++;
      batchResults = [];
    }
  }

  // Save remaining
  if (batchResults.length > 0) {
    saveResults(batchResults, batchNumber);
  }

  // Final checkpoint
  saveCheckpoint({
    lastProcessedId: currentId - 1,
    totalProcessed,
    stageStats,
    startTime,
  });

  db.close();

  console.log(`\n\n✅ Pipeline complete!`);
  console.log(`   Total Processed: ${totalProcessed}`);
  console.log(`   Stage Statistics:`);
  for (const [stage, count] of Object.entries(stageStats)) {
    console.log(`     ${stage}: ${count} documents affected`);
  }
}

main().catch((err) => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
