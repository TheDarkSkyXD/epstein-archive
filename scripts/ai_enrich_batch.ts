/**
 * AI Enrichment Batch Processor
 *
 * Processes a specific ID range of documents through the AI Forensic Repair pipeline.
 * Outputs results to JSON files for safe merging into the master database.
 *
 * Usage:
 *   ID_START=1 ID_END=100000 npx tsx scripts/ai_enrich_batch.ts
 *
 * Environment Variables:
 *   ID_START      - Starting document ID (inclusive)
 *   ID_END        - Ending document ID (inclusive)
 *   BATCH_SIZE    - Documents per batch (default: 100)
 *   OUTPUT_DIR    - Output directory for JSON files (default: ./enrichment_results)
 *   CHECKPOINT_INTERVAL - Save checkpoint every N documents (default: 1000)
 */

import Database from 'better-sqlite3';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { AIEnrichmentService } from '../src/server/services/AIEnrichmentService.js';

const DB_PATH = process.env.DB_PATH || './epstein-archive.db';
const ID_START = parseInt(process.env.ID_START || '1', 10);
const ID_END = parseInt(process.env.ID_END || '1000', 10);
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '100', 10);
const OUTPUT_DIR = process.env.OUTPUT_DIR || './enrichment_results';
const CHECKPOINT_INTERVAL = parseInt(process.env.CHECKPOINT_INTERVAL || '1000', 10);

// Ensure AI enrichment is enabled
process.env.ENABLE_AI_ENRICHMENT = 'true';
process.env.AI_PROVIDER = 'local_ollama';

interface EnrichmentResult {
  id: number;
  originalContent: string;
  enrichedContent: string;
  repairsApplied: number;
  processingTimeMs: number;
  error?: string;
}

interface CheckpointState {
  lastProcessedId: number;
  totalProcessed: number;
  totalRepairs: number;
  startTime: string;
}

async function loadCheckpoint(): Promise<CheckpointState | null> {
  const checkpointPath = join(OUTPUT_DIR, `checkpoint_${ID_START}_${ID_END}.json`);
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
  const checkpointPath = join(OUTPUT_DIR, `checkpoint_${ID_START}_${ID_END}.json`);
  writeFileSync(checkpointPath, JSON.stringify(state, null, 2));
}

function saveResults(results: EnrichmentResult[], batchNumber: number): void {
  const filename = join(OUTPUT_DIR, `batch_${ID_START}_${ID_END}_${batchNumber}.json`);
  writeFileSync(filename, JSON.stringify(results, null, 2));
  console.log(`  💾 Saved ${results.length} results to ${filename}`);
}

async function main() {
  console.log(`\n🚀 AI Enrichment Batch Processor`);
  console.log(`   ID Range: ${ID_START} - ${ID_END}`);
  console.log(`   Database: ${DB_PATH}`);
  console.log(`   Output: ${OUTPUT_DIR}\n`);

  // Ensure output directory exists
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Load checkpoint if exists
  const checkpoint = await loadCheckpoint();
  let resumeFromId = ID_START;
  let totalProcessed = 0;
  let totalRepairs = 0;

  if (checkpoint) {
    resumeFromId = checkpoint.lastProcessedId + 1;
    totalProcessed = checkpoint.totalProcessed;
    totalRepairs = checkpoint.totalRepairs;
    console.log(
      `📍 Resuming from checkpoint: ID ${resumeFromId} (${totalProcessed} already processed)\n`,
    );
  }

  const db = new Database(DB_PATH, { readonly: true });

  // Count documents in range that need processing
  const countStmt = db.prepare(`
    SELECT COUNT(*) as count FROM documents 
    WHERE id >= ? AND id <= ? 
    AND content IS NOT NULL 
    AND content LIKE '%=%'
  `);
  const { count: totalToProcess } = countStmt.get(resumeFromId, ID_END) as { count: number };

  console.log(`📊 Documents to process: ${totalToProcess}`);

  // Fetch documents in batches
  const selectStmt = db.prepare(`
    SELECT id, content, metadata_json, file_name
    FROM documents 
    WHERE id >= ? AND id <= ? 
    AND content IS NOT NULL 
    AND content LIKE '%=%'
    ORDER BY id ASC
    LIMIT ?
  `);

  let currentId = resumeFromId;
  let batchNumber = Math.floor(totalProcessed / BATCH_SIZE) + 1;
  let batchResults: EnrichmentResult[] = [];
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
      const docStartTime = Date.now();

      try {
        // Extract context from metadata
        let context = doc.file_name;
        if (doc.metadata_json) {
          try {
            const meta = JSON.parse(doc.metadata_json);
            context = meta.subject || meta.title || doc.file_name;
          } catch {
            // Use filename as context
          }
        }

        // Apply AI enrichment
        const enrichedContent = await AIEnrichmentService.repairMimeWildcards(doc.content, context);
        const repairsApplied = Math.abs(enrichedContent.length - doc.content.length);

        batchResults.push({
          id: doc.id,
          originalContent: doc.content,
          enrichedContent,
          repairsApplied,
          processingTimeMs: Date.now() - docStartTime,
        });

        totalRepairs += repairsApplied > 0 ? 1 : 0;
      } catch (error) {
        batchResults.push({
          id: doc.id,
          originalContent: doc.content,
          enrichedContent: doc.content,
          repairsApplied: 0,
          processingTimeMs: Date.now() - docStartTime,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      totalProcessed++;
      currentId = doc.id + 1;

      // Progress logging
      if (totalProcessed % 10 === 0) {
        const elapsed = (Date.now() - new Date(startTime).getTime()) / 1000;
        const rate = totalProcessed / elapsed;
        const remaining = (totalToProcess - totalProcessed) / rate;

        process.stdout.write(
          `\r  ⏳ Progress: ${totalProcessed}/${totalToProcess} (${((totalProcessed / totalToProcess) * 100).toFixed(1)}%) | Rate: ${rate.toFixed(1)} docs/s | ETA: ${Math.ceil(remaining / 60)} min`,
        );
      }

      // Save checkpoint periodically
      if (totalProcessed % CHECKPOINT_INTERVAL === 0) {
        saveCheckpoint({
          lastProcessedId: doc.id,
          totalProcessed,
          totalRepairs,
          startTime,
        });
      }
    }

    // Save batch results
    if (batchResults.length >= BATCH_SIZE) {
      saveResults(batchResults, batchNumber);
      batchNumber++;
      batchResults = [];
    }
  }

  // Save any remaining results
  if (batchResults.length > 0) {
    saveResults(batchResults, batchNumber);
  }

  // Final checkpoint
  saveCheckpoint({
    lastProcessedId: ID_END,
    totalProcessed,
    totalRepairs,
    startTime,
  });

  db.close();

  console.log(`\n\n✅ Batch processing complete!`);
  console.log(`   Total Processed: ${totalProcessed}`);
  console.log(`   Total Repairs: ${totalRepairs}`);
  console.log(`   Output Directory: ${OUTPUT_DIR}`);
  console.log(`\n🔄 Next step: Run merge_enrichments.ts to apply results to the database.`);
}

main().catch((err) => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
