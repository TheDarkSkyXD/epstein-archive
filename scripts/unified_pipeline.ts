#!/usr/bin/env tsx
/**
 * Unified Evidence Pipeline Orchestrator
 *
 * Single entry point for all evidence processing:
 *   1. INGEST   - File extraction, OCR, parsing (ingest_pipeline.ts)
 *   2. INTEL    - Entity extraction, relationships (ingest_intelligence.ts)
 *   3. ENRICH   - AI enrichment: repair, classify, summarize (AIEnrichmentService)
 *
 * Usage:
 *   npx tsx scripts/unified_pipeline.ts --mode ingest --source data/ingest
 *   npx tsx scripts/unified_pipeline.ts --mode backfill
 *   npx tsx scripts/unified_pipeline.ts --mode full --source data/ingest
 *
 * Environment Variables:
 *   AI_PROVIDER    - 'local_ollama' or 'exo_cluster' (default: exo_cluster)
 *   DB_PATH        - Path to SQLite database (default: ./epstein-archive.db)
 *   BATCH_SIZE     - Documents per batch for AI enrichment (default: 50)
 */

import Database from 'better-sqlite3';
import { spawn, execSync } from 'child_process';
import { existsSync, readdirSync, statSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { AIEnrichmentService } from '../src/server/services/AIEnrichmentService.js';

// Configuration
const DB_PATH = process.env.DB_PATH || './epstein-archive.db';
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '50', 10);
const CHECKPOINT_DIR = './pipeline_checkpoints';

// Ensure AI is enabled with Exo by default
process.env.ENABLE_AI_ENRICHMENT = 'true';
if (!process.env.AI_PROVIDER) {
  process.env.AI_PROVIDER = 'exo_cluster';
}

interface PipelineStats {
  mode: string;
  startTime: string;
  ingestStats?: { filesProcessed: number; errors: number };
  intelStats?: { entitiesExtracted: number; relationsFound: number };
  enrichStats?: { documentsEnriched: number; summariesGenerated: number };
}

/**
 * Run a subprocess and stream its output
 */
function runScript(scriptPath: string, args: string[] = []): Promise<number> {
  return new Promise((resolve, reject) => {
    console.log(`\n📜 Running: npx tsx ${scriptPath} ${args.join(' ')}`);
    const child = spawn('npx', ['tsx', scriptPath, ...args], {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: process.env,
    });

    child.on('close', (code) => {
      resolve(code || 0);
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Phase 1: INGEST - Process raw files from source directory
 */
async function runIngestPhase(
  sourceDir: string,
): Promise<{ filesProcessed: number; errors: number }> {
  console.log('\n' + '='.repeat(70));
  console.log('📥 PHASE 1: INGEST (OCR, Extraction, Parsing)');
  console.log('='.repeat(70));
  console.log(`   Source: ${sourceDir}`);

  if (!existsSync(sourceDir)) {
    console.log(`   ⚠️  Source directory not found: ${sourceDir}`);
    return { filesProcessed: 0, errors: 0 };
  }

  // Count files to process
  const countFiles = (dir: string): number => {
    let count = 0;
    const items = readdirSync(dir);
    for (const item of items) {
      const fullPath = join(dir, item);
      if (statSync(fullPath).isDirectory()) {
        count += countFiles(fullPath);
      } else if (!item.startsWith('.')) {
        count++;
      }
    }
    return count;
  };

  const fileCount = countFiles(sourceDir);
  console.log(`   Files to process: ${fileCount}`);

  if (fileCount === 0) {
    console.log('   ⚠️  No files found to ingest');
    return { filesProcessed: 0, errors: 0 };
  }

  // Run the ingest pipeline
  const exitCode = await runScript('scripts/ingest_pipeline.ts', ['--source', sourceDir]);

  return {
    filesProcessed: fileCount,
    errors: exitCode !== 0 ? 1 : 0,
  };
}

/**
 * Phase 2: INTEL - Entity extraction and relationship mapping
 */
async function runIntelPhase(): Promise<{ entitiesExtracted: number; relationsFound: number }> {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 PHASE 2: INTELLIGENCE (Entity Extraction, Relations)');
  console.log('='.repeat(70));

  const db = new Database(DB_PATH, { timeout: 30000 });

  // Get counts before
  const entitiesBefore = (db.prepare('SELECT COUNT(*) as c FROM entities').get() as any).c;
  const relationsBefore = (
    db.prepare('SELECT COUNT(*) as c FROM entity_relationships').get() as any
  ).c;

  db.close();

  // Run intelligence pipeline
  const exitCode = await runScript('scripts/ingest_intelligence.ts');

  // Get counts after
  const db2 = new Database(DB_PATH, { timeout: 30000 });
  const entitiesAfter = (db2.prepare('SELECT COUNT(*) as c FROM entities').get() as any).c;
  const relationsAfter = (
    db2.prepare('SELECT COUNT(*) as c FROM entity_relationships').get() as any
  ).c;
  db2.close();

  return {
    entitiesExtracted: entitiesAfter - entitiesBefore,
    relationsFound: relationsAfter - relationsBefore,
  };
}

/**
 * Phase 3: ENRICH - AI-powered enrichment for all documents
 * This phase ALWAYS produces output - no nulls, no data loss
 */
async function runEnrichPhase(
  mode: 'new' | 'backfill' | 'all',
): Promise<{ documentsEnriched: number; summariesGenerated: number }> {
  console.log('\n' + '='.repeat(70));
  console.log('🤖 PHASE 3: AI ENRICHMENT (Summaries, Classification)');
  console.log('='.repeat(70));
  console.log(`   Provider: ${process.env.AI_PROVIDER}`);
  console.log(`   Mode: ${mode}`);

  const db = new Database(DB_PATH, { timeout: 30000 });

  // Build query based on mode
  let whereClause = 'content IS NOT NULL AND length(content) > 50';
  if (mode === 'backfill') {
    // Only documents without AI summary
    whereClause += " AND (metadata_json IS NULL OR metadata_json NOT LIKE '%ai_summary%')";
  } else if (mode === 'new') {
    // Only recently added documents (last 24 hours)
    whereClause += " AND created_at > datetime('now', '-1 day')";
  }

  const totalDocs = (
    db.prepare(`SELECT COUNT(*) as c FROM documents WHERE ${whereClause}`).get() as any
  ).c;

  console.log(`   Documents to enrich: ${totalDocs}`);

  if (totalDocs === 0) {
    console.log('   ✅ All documents already enriched');
    db.close();
    return { documentsEnriched: 0, summariesGenerated: 0 };
  }

  // Prepare statements
  const selectStmt = db.prepare(`
    SELECT id, content, metadata_json, file_name
    FROM documents
    WHERE ${whereClause}
    ORDER BY id ASC
    LIMIT ?
    OFFSET ?
  `);

  const updateMetaStmt = db.prepare(`
    UPDATE documents SET metadata_json = ? WHERE id = ?
  `);

  let documentsEnriched = 0;
  let summariesGenerated = 0;
  let offset = 0;
  const startTime = Date.now();

  while (offset < totalDocs) {
    const docs = selectStmt.all(BATCH_SIZE, offset) as Array<{
      id: number;
      content: string;
      metadata_json: string | null;
      file_name: string;
    }>;

    if (docs.length === 0) break;

    for (const doc of docs) {
      try {
        // Parse existing metadata (preserve everything)
        let meta: Record<string, any> = {};
        if (doc.metadata_json) {
          try {
            meta = JSON.parse(doc.metadata_json);
          } catch {
            meta = { _original: doc.metadata_json };
          }
        }

        // Get subject/context for better summarization
        const subject = meta.subject || meta.title || doc.file_name || 'Unknown Document';

        // Step 1: Semantic Repair (Cleanup for human readability)
        let refinedText = doc.content;
        if (doc.content.includes('=')) {
          // console.log(`\n   🧹 Repairing text for document ${doc.id}...`);
          refinedText = await AIEnrichmentService.repairMimeWildcards(doc.content, subject);
        }

        // Step 2: Generate AI summary - ALWAYS produce something
        let summary = await AIEnrichmentService.summarizeDocument(refinedText, {
          fileName: doc.file_name,
          subject,
        });

        // If LLM returned null/empty, create a basic summary (never return null)
        if (!summary || summary.length < 10) {
          // Create fallback summary from content
          const contentPreview = refinedText
            .replace(/[\r\n]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 200);

          summary = `Document "${doc.file_name}" contains ${doc.content.length} characters. Preview: ${contentPreview}...`;
        }

        // Store AI enrichment (additive - never delete existing data)
        meta.ai_summary = summary;
        meta.ai_enriched_at = new Date().toISOString();
        meta.ai_provider = process.env.AI_PROVIDER;

        // Update with BOTH refined content and metadata
        db.prepare('UPDATE documents SET metadata_json = ?, content_refined = ? WHERE id = ?').run(
          JSON.stringify(meta),
          refinedText === doc.content ? null : refinedText,
          doc.id,
        );
        summariesGenerated++;
        documentsEnriched++;
      } catch (error) {
        // Even on error, mark as attempted with basic summary
        let meta: Record<string, any> = {};
        if (doc.metadata_json) {
          try {
            meta = JSON.parse(doc.metadata_json);
          } catch {
            meta = {};
          }
        }
        meta.ai_summary = `[Auto-generated] Document: ${doc.file_name} (${doc.content.length} chars)`;
        meta.ai_enriched_at = new Date().toISOString();
        meta.ai_error = error instanceof Error ? error.message : 'Unknown error';
        db.prepare('UPDATE documents SET metadata_json = ? WHERE id = ?').run(
          JSON.stringify(meta),
          doc.id,
        );
        documentsEnriched++;
      }

      // Progress
      if (documentsEnriched % 10 === 0) {
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = documentsEnriched / elapsed;
        const eta = (totalDocs - documentsEnriched) / rate / 60;
        process.stdout.write(
          `\r   ⏳ ${documentsEnriched}/${totalDocs} (${((documentsEnriched / totalDocs) * 100).toFixed(1)}%) | ${rate.toFixed(1)} docs/s | ETA: ${eta.toFixed(1)} min`,
        );
      }
    }

    offset += BATCH_SIZE;
  }

  db.close();
  console.log('\n');

  return { documentsEnriched, summariesGenerated };
}

/**
 * Main orchestrator
 */
async function main() {
  const args = process.argv.slice(2);
  const modeIndex = args.indexOf('--mode');
  const sourceIndex = args.indexOf('--source');

  const mode = modeIndex >= 0 ? args[modeIndex + 1] : 'full';
  const sourceDir = sourceIndex >= 0 ? args[sourceIndex + 1] : 'data/ingest';

  console.log('\n' + '╔' + '═'.repeat(68) + '╗');
  console.log('║' + ' '.repeat(20) + 'UNIFIED EVIDENCE PIPELINE' + ' '.repeat(23) + '║');
  console.log('╠' + '═'.repeat(68) + '╣');
  console.log(`║  Mode: ${mode.padEnd(58)}║`);
  console.log(`║  Source: ${sourceDir.padEnd(56)}║`);
  console.log(`║  Database: ${DB_PATH.padEnd(54)}║`);
  console.log(`║  AI Provider: ${(process.env.AI_PROVIDER || 'exo_cluster').padEnd(51)}║`);
  console.log('╚' + '═'.repeat(68) + '╝');

  const stats: PipelineStats = {
    mode,
    startTime: new Date().toISOString(),
  };

  try {
    // Phase 1: Ingest (if mode is 'ingest' or 'full')
    if (mode === 'ingest' || mode === 'full') {
      stats.ingestStats = await runIngestPhase(sourceDir);
    }

    // Phase 2: Intelligence (if mode is 'ingest' or 'full')
    if (mode === 'ingest' || mode === 'full') {
      stats.intelStats = await runIntelPhase();
    }

    // Phase 3: Enrich
    if (mode === 'backfill') {
      stats.enrichStats = await runEnrichPhase('backfill');
    } else if (mode === 'ingest') {
      stats.enrichStats = await runEnrichPhase('new');
    } else if (mode === 'enrich-worker') {
      console.log('\n🚀 Starting Continuous AI Enrichment Worker...');
      console.log('   Polling for completed documents to summarize...');

      // Continuous loop for background worker
      while (true) {
        const result = await runEnrichPhase('backfill');
        if (result.documentsEnriched === 0) {
          // No documents to process, wait and retry
          process.stdout.write('\r   💤 Waiting for new ingested documents (60s)...');
          await new Promise((resolve) => setTimeout(resolve, 60000));
        } else {
          console.log(`\n   ✅ Worker Batch Complete: ${result.documentsEnriched} docs enriched.`);
        }
      }
    } else {
      // Full mode: enrich all
      stats.enrichStats = await runEnrichPhase('all');
    }

    // Final summary
    console.log('\n' + '='.repeat(70));
    console.log('✅ PIPELINE COMPLETE');
    console.log('='.repeat(70));
    console.log(`   Started: ${stats.startTime}`);
    console.log(`   Finished: ${new Date().toISOString()}`);

    if (stats.ingestStats) {
      console.log(`   Files Ingested: ${stats.ingestStats.filesProcessed}`);
    }
    if (stats.intelStats) {
      console.log(`   Entities Extracted: ${stats.intelStats.entitiesExtracted}`);
      console.log(`   Relations Found: ${stats.intelStats.relationsFound}`);
    }
    if (stats.enrichStats) {
      console.log(`   Documents Enriched: ${stats.enrichStats.documentsEnriched}`);
      console.log(`   Summaries Generated: ${stats.enrichStats.summariesGenerated}`);
    }

    // Save stats
    if (!existsSync(CHECKPOINT_DIR)) {
      execSync(`mkdir -p ${CHECKPOINT_DIR}`);
    }
    writeFileSync(join(CHECKPOINT_DIR, `run_${Date.now()}.json`), JSON.stringify(stats, null, 2));
  } catch (error) {
    console.error('\n❌ Pipeline error:', error);
    process.exit(1);
  }
}

main().catch(console.error);
