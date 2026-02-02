#!/usr/bin/env tsx
/**
 * Unified Data Ingestion and Processing Pipeline
 *
 * Combines functionality from:
 * - ingest_unified.ts (PDF/image ingestion with OCR)
 * - enrich_external_data.ts (entity extraction and relationship mapping)
 * - extractEntities_v2.ts (entity normalization)
 *
 * Features:
 * - PDF text extraction with fallback OCR
 * - Multi-collection support
 * - Entity extraction and relationship mapping
 * - Progress tracking and error handling
 * - Production database schema compatibility
 */

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { join, basename, extname } from 'path';
import { statSync, readFileSync, existsSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { globSync } from 'glob';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
// Fix for pdf-parse v2 import issues
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParseModule = require('pdf-parse');
const PDFParse = pdfParseModule.PDFParse || pdfParseModule.default?.PDFParse || pdfParseModule;
import * as crypto from 'crypto';
import { execFile } from 'child_process';

import { createWorker } from 'tesseract.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

const DB_PATH = process.env.DB_PATH || 'epstein-archive.db';

interface CollectionConfig {
  name: string;
  rootPath: string;
  description: string;
  enabled: boolean;
}

const COLLECTIONS: CollectionConfig[] = [
  {
    name: 'Epstein Estate Documents - Seventh Production',
    rootPath: 'data/originals/Epstein Estate Documents - Seventh Production',
    description: 'Seventh Production of Estate Documents',
    enabled: true,
  },
  {
    name: 'DOJ Discovery VOL00001',
    rootPath: 'data/originals/DOJ VOL00001',
    description: 'FBI Discovery Materials Vol 1',
    enabled: true,
  },
  {
    name: 'DOJ Discovery VOL00002',
    rootPath: 'data/originals/DOJ VOL00002',
    description: 'FBI Discovery Materials Vol 2',
    enabled: true,
  },
  {
    name: 'DOJ Discovery VOL00003',
    rootPath: 'data/originals/DOJ VOL00003',
    description: 'FBI Discovery Materials Vol 3',
    enabled: true,
  },
  {
    name: 'DOJ Discovery VOL00004',
    rootPath: 'data/originals/DOJ VOL00004',
    description: 'FBI Discovery Materials Vol 4',
    enabled: true,
  },
  {
    name: 'DOJ Discovery VOL00005',
    rootPath: 'data/originals/DOJ VOL00005',
    description: 'FBI Discovery Materials Vol 5',
    enabled: true,
  },
  {
    name: 'DOJ Discovery VOL00006',
    rootPath: 'data/originals/DOJ VOL00006',
    description: 'FBI Discovery Materials Vol 6',
    enabled: true,
  },
  {
    name: 'DOJ Discovery VOL00007',
    rootPath: 'data/originals/DOJ VOL00007',
    description: 'FBI Discovery Materials Vol 7',
    enabled: true,
  },
  {
    name: 'DOJ Discovery VOL00008',
    rootPath: 'data/originals/DOJ VOL00008',
    description: 'FBI Discovery Materials Vol 8',
    enabled: true,
  },
  {
    name: 'Court Case Evidence',
    rootPath: 'data/originals/Court Case Evidence',
    description: 'Various Court Exhibits',
    enabled: true,
  },
  {
    name: 'Maxwell Proffer',
    rootPath: 'data/originals/Maxwell Proffer',
    description: 'Ghislaine Maxwell Proffer Documents',
    enabled: true,
  },
  {
    name: 'DOJ Phase 1',
    rootPath: 'data/originals/DOJ Phase 1',
    description: 'DOJ Phase 1 Documents',
    enabled: true,
  },
  {
    name: 'Evidence Images',
    rootPath: 'data/media/images/Evidence',
    description: 'Miscellaneous evidence images',
    enabled: true,
  },
  {
    name: 'DOJ Data Set 9',
    rootPath: '/Users/veland/Downloads/doj_epstein_pdfs/data-set-9', // External path to downloaded files
    description: '12,260 PDF files released Feb 1, 2026',
    enabled: false,
  },
  {
    name: 'DOJ Data Set 10',
    rootPath: '/Users/veland/Downloads/doj_epstein_pdfs/data-set-10',
    description: 'Data Set 10 from DOJ',
    enabled: true,
  },
  {
    name: 'DOJ Data Set 11',
    rootPath: '/Users/veland/Downloads/doj_epstein_pdfs/data-set-11',
    description: 'Data Set 11 (Videos) from DOJ',
    enabled: true,
  },
  {
    name: 'DOJ Data Set 12',
    rootPath: 'data/ingest/DOJVOL00012',
    description: 'Data Set 12 from DOJ',
    enabled: true,
  },
  {
    name: 'DOJ Discovery VOL00012',
    rootPath: 'data/originals/DOJ VOL00012',
    description: 'DOJ Discovery Materials Vol 12',
    enabled: true,
  },
];

// ============================================================================
// DATABASE SETUP
// ============================================================================

// Database instance placeholder
let db: any;

async function initDb() {
  db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database,
  });
}

async function verifyDatabase() {
  console.log('✅ Verifying database connection...');
  try {
    const count = await db.get('SELECT COUNT(*) as count FROM documents') as { count: number };
    console.log(`   Database connected. ${count.count} documents currently in database.`);
    return true;
  } catch (e) {
    console.error('❌ Database connection failed:', e);
    return false;
  }
}

// ============================================================================
// PDF & IMAGE TEXT EXTRACTION
// ============================================================================

async function extractTextFromPdf(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
  try {
    const parser = new PDFParse(new Uint8Array(buffer));
    const data = await parser.getText();
    const info = await parser.getInfo();
    return {
      text: data?.text || '',
      pageCount: info?.numpages || 0,
    };
  } catch (e) {
    console.warn('  ⚠️  PDF extraction failed:', (e as Error).message);
    return { text: '', pageCount: 0 };
  }
}

async function extractTextFromImage(
  filePath: string,
): Promise<{ text: string; pageCount: number }> {
  try {
    const worker = await createWorker('eng');
    const {
      data: { text },
    } = await worker.recognize(filePath);
    await worker.terminate();
    return {
      text: text || '',
      pageCount: 1,
    };
  } catch (e) {
    console.warn('  ⚠️  Image OCR failed:', (e as Error).message);
    return { text: '', pageCount: 1 };
  }
}

/**
 * Run the Python unredact pipeline on a PDF and return the path to the
 * unredacted PDF if successful, otherwise fall back to the original.
 *
 * This is intentionally conservative: failures will not break ingestion,
 * they just skip unredaction.
 */
async function maybeUnredactPdf(originalPath: string): Promise<string> {
  // Only run on obvious PDF paths
  if (!originalPath.toLowerCase().endsWith('.pdf')) return originalPath;

  return await new Promise((resolve) => {
    try {
      const tmpDir = mkdtempSync(join(tmpdir(), 'unredact-'));
      const scriptPath = join(
        process.cwd(),
        'scripts',
        'unredact_restored.py',
      );

      const args = [scriptPath, '-i', originalPath, '-o', tmpDir, '-b', '1', '--highlight', '0'];

      const child = execFile('python3', args, { cwd: tmpDir }, (err) => {
        if (err) {
          console.warn('  ⚠️  unredact.py failed, using original PDF:', err.message);
          return resolve(originalPath);
        }

        // Infer name: original.pdf -> original_UNREDACTED.pdf
        const base = basename(originalPath, '.pdf');
        const candidate = join(tmpDir, `${base}_UNREDACTED.pdf`);
        if (existsSync(candidate)) {
          console.log(`   🧰 Using unredacted PDF for OCR: ${candidate}`);
          return resolve(candidate);
        }

        // Fallback to original if we cannot locate output
        console.warn('  ⚠️  unredact.py completed but output not found, using original PDF');
        resolve(originalPath);
      });

      // If the process errors before callback
      child.on('error', (err) => {
        console.warn('  ⚠️  Failed to spawn unredact.py, using original PDF:', err.message);
        resolve(originalPath);
      });
    } catch (e) {
      console.warn(
        '  ⚠️  Exception running unredact.py, using original PDF:',
        (e as Error).message,
      );
      resolve(originalPath);
    }
  });
}

// ============================================================================
// DOCUMENT INGESTION
// ============================================================================

interface ProcessedDocument {
  success: boolean;
  documentId?: number;
  error?: string;
}

async function estimateTextCoverage(text: string, pageCount: number): Promise<number> {
  if (!text || pageCount <= 0) return 0;
  // Very rough heuristic: words per page, capped to avoid extreme outliers
  const words = (text.match(/\b[\w']+\b/g) || []).length;
  const wordsPerPage = words / pageCount;
  const normalized = Math.min(wordsPerPage / 350, 1); // assume ~350 words/page is "full"
  return normalized;
}

/**
 * Build a baseline vocabulary from the original (pre-unredaction) OCR text.
 *
 * We normalise tokens to lowercase and keep only reasonably-sized tokens to
 * reduce noise and payload size. Stored as a space-separated list of tokens.
 */
function buildBaselineVocab(text: string): string {
  if (!text) return '';
  const tokens = text.match(/\b[\w']+\b/g) || [];
  const seen = new Set<string>();
  const result: string[] = [];

  for (const rawToken of tokens) {
    const token = rawToken.toLowerCase();
    // Skip very short/long tokens and obvious noise
    if (token.length < 4 || token.length > 40) continue;
    if (/^[0-9]+$/.test(token)) continue;
    if (seen.has(token)) continue;
    seen.add(token);
    result.push(token);
    // Hard cap to avoid pathological documents blowing up the row size
    if (result.length >= 5000) break;
  }

  return result.join(' ');
}

async function processDocument(
  filePath: string,
  collection: CollectionConfig,
): Promise<ProcessedDocument> {
  try {
    // Check if already processed
    // We use basename match for now, or relative path if stored
    const existing = await db.get('SELECT id FROM documents WHERE file_path = ?', filePath);
    if (existing) {
      return { success: true, documentId: (existing as any).id };
    }

    const stats = statSync(filePath);
    const buffer = readFileSync(filePath);
    const hash = crypto.createHash('md5').update(buffer).digest('hex');
    const ext = extname(filePath).toLowerCase();

    let content = '';
    let pageCount = 0;
    let unredactionAttempted = 0;
    let unredactionSucceeded = 0;
    let redactionCoverageBefore: number | null = null;
    let redactionCoverageAfter: number | null = null;
    let unredactedTextGain: number | null = null;
    let unredactionBaselineVocab: string | null = null;

    // Extract text based on file type
    if (ext === '.pdf') {
      // First, extract from the original PDF so we can estimate baseline coverage.
      const originalBuffer = readFileSync(filePath);
      const originalResult = await extractTextFromPdf(originalBuffer);
      const originalText = (originalResult.text || '').trim();
      const originalPages = originalResult.pageCount || 0;
      const baselineCoverage = await estimateTextCoverage(originalText, originalPages || 1);
      unredactionBaselineVocab = buildBaselineVocab(originalText);

      // Try to unredact the PDF before extracting any text so we capture
      // redacted-under graphics/text where possible.
      unredactionAttempted = 1;
      const pdfPathForOcr = await maybeUnredactPdf(filePath);
      const pdfBuffer = readFileSync(pdfPathForOcr);
      const result = await extractTextFromPdf(pdfBuffer);
      const unredactedText = (result.text || '').trim();
      content = unredactedText;
      pageCount = result.pageCount;

      const afterCoverage = await estimateTextCoverage(unredactedText, pageCount || 1);
      redactionCoverageBefore = 1 - baselineCoverage;
      redactionCoverageAfter = 1 - afterCoverage;
      unredactedTextGain = afterCoverage - baselineCoverage;

      if (
        pdfPathForOcr !== filePath &&
        unredactedText &&
        unredactedText.length > originalText.length
      ) {
        unredactionSucceeded = 1;
      }
    } else if (['.txt', '.rtf'].includes(ext)) {
      content = readFileSync(filePath, 'utf-8');
      pageCount = 1;
    } else if (['.jpg', '.jpeg', '.png'].includes(ext)) {
      const result = await extractTextFromImage(filePath);
      content = result.text;
      pageCount = result.pageCount;
    } else {
      // For other file types, mark as unprocessed
      content = `[${ext.toUpperCase()} FILE - OCR NOT YET PROCESSED]`;
      pageCount = 1;
    }

    // Calculate metadata
    const contentPreview = content.substring(0, 500);
    const wordCount = content ? (content.match(/\b[\w']+\b/g) || []).length : 0;
    const fileType = ext.replace('.', '').toUpperCase();

    // Insert into database
    const result = await db.run(
      `
            INSERT INTO documents (
                filename, content, file_path, source_collection,
                content_hash, page_count, metadata_json, red_flag_rating,
                content_preview, file_type, file_size, word_count,
                created_at,
                unredaction_attempted,
                unredaction_succeeded,
                redaction_coverage_before,
                redaction_coverage_after,
                unredacted_text_gain,
                unredaction_baseline_vocab
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?, ?, ?, ?, ?)
        `,
      basename(filePath),
      content,
      filePath,
      collection.name,
      hash,
      pageCount,
      JSON.stringify({
        originalFilename: basename(filePath),
        size: stats.size,
        mtime: stats.mtime,
        collection: collection.name,
      }),
      0,
      contentPreview,
      fileType,
      stats.size,
      wordCount,
      unredactionAttempted,
      unredactionSucceeded,
      redactionCoverageBefore,
      redactionCoverageAfter,
      unredactedTextGain,
      unredactionBaselineVocab,
    );

    return { success: true, documentId: result.lastID };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

// ============================================================================
// COLLECTION PROCESSING
// ============================================================================

async function processCollection(collection: CollectionConfig): Promise<{ processed: number; skipped: number; errors: number; }> {
  console.log(`\n📦 Processing: ${collection.name}`);
  console.log(`   Path: ${collection.rootPath}`);

  if (!existsSync(collection.rootPath)) {
    console.log(`   ⚠️  Directory not found, skipping...`);
    return { processed: 0, skipped: 0, errors: 0 };
  }

  // Find all files
  const pattern = join(collection.rootPath, '**/*.{pdf,txt,rtf,jpg,jpeg,png}');
  const files = globSync(pattern, {
    ignore: ['**/thumbs/**', '**/.DS_Store'],
  });

  console.log(`   Found ${files.length} files`);

  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (const file of files) {
    const result = await processDocument(file, collection);

    if (result.success && result.documentId) {
      processed++;
      if (processed % 50 === 0) {
        process.stdout.write(`   Progress: ${processed}/${files.length}...\r`);
      }
    } else if (result.success) {
      skipped++;
    } else {
      errors++;
      console.error(`   ❌ Error processing ${basename(file)}: ${result.error}`);
    }
  }

  console.log(`   ✅ Complete: ${processed} processed, ${skipped} skipped, ${errors} errors`);

  return { processed, skipped, errors };
}

// ============================================================================
// MAIN PIPELINE
// ============================================================================

async function main() {
  console.log('='.repeat(80));
  console.log('🚀 UNIFIED DATA INGESTION PIPELINE');
  console.log('='.repeat(80));
  console.log();

  // Initialize DB
  await initDb();

  // Verify database
  if (!(await verifyDatabase())) {
    console.error('❌ Database verification failed. Exiting.');
    process.exit(1);
  }

  console.log();

  // Process each collection
  const stats = {
    totalProcessed: 0,
    totalSkipped: 0,
    totalErrors: 0,
  };

  const collectionsToProcess = COLLECTIONS.filter((c) => c.enabled);

  for (const collection of collectionsToProcess) {
    const result = await processCollection(collection);
    stats.totalProcessed += result.processed;
    stats.totalSkipped += result.skipped;
    stats.totalErrors += result.errors;
  }

  // Final summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 PIPELINE SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total documents processed:  ${stats.totalProcessed}`);
  console.log(`Total documents skipped:    ${stats.totalSkipped}`);
  console.log(`Total errors:               ${stats.totalErrors}`);

  // Current database stats
  const finalCount = await db.get('SELECT COUNT(*) as count FROM documents') as {
    count: number;
  };
  console.log(`\nFinal database count:       ${finalCount.count} documents`);

  // Collection breakdown
  console.log('\nBy Collection:');
  const collections = await db.all(
    'SELECT source_collection, COUNT(*) as count FROM documents GROUP BY source_collection ORDER BY count DESC',
  ) as any[];
  for (const coll of collections) {
    console.log(`  • ${coll.source_collection}: ${coll.count}`);
  }

  console.log('='.repeat(80));
  console.log('✅ Ingestion complete! Now starting Intelligence Pipeline...');

  // Trigger Intelligence Pipeline
  try {
    const { execSync } = require('child_process');
    execSync('npx tsx scripts/ingest_intelligence.ts', { stdio: 'inherit' });
  } catch (e) {
    console.error('❌ Error running Intelligence Pipeline:', e);
  }

  await db.close();
}

// Run the pipeline
main().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
