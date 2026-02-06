/**
 * Merge Enrichments Script
 *
 * Applies AI enrichment results from JSON batch files back to the master database.
 * This script should be run AFTER all distributed batch processing is complete.
 *
 * Usage:
 *   npx tsx scripts/merge_enrichments.ts
 *
 * Environment Variables:
 *   INPUT_DIR     - Directory containing JSON batch files (default: ./enrichment_results)
 *   DRY_RUN       - If 'true', don't actually update the database (default: false)
 */

import Database from 'better-sqlite3';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const DB_PATH = process.env.DB_PATH || './epstein-archive.db';
const INPUT_DIR = process.env.INPUT_DIR || './enrichment_results';
const DRY_RUN = process.env.DRY_RUN === 'true';

interface EnrichmentResult {
  id: number;
  originalContent: string;
  enrichedContent: string;
  repairsApplied: number;
  processingTimeMs: number;
  error?: string;
}

async function main() {
  console.log(`\n🔄 Merge Enrichments Script`);
  console.log(`   Input Directory: ${INPUT_DIR}`);
  console.log(`   Database: ${DB_PATH}`);
  console.log(`   Dry Run: ${DRY_RUN}\n`);

  // Find all batch JSON files
  const files = readdirSync(INPUT_DIR).filter((f) => f.startsWith('batch_') && f.endsWith('.json'));

  if (files.length === 0) {
    console.log('❌ No batch files found in', INPUT_DIR);
    process.exit(1);
  }

  console.log(`📂 Found ${files.length} batch files to merge.\n`);

  const db = new Database(DB_PATH);

  // Prepare update statement
  const updateStmt = db.prepare(`
    UPDATE documents 
    SET content = ?, 
        processing_status = 'ai_enriched',
        last_processed_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  let totalMerged = 0;
  let totalRepairs = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  // Process each batch file
  for (const file of files) {
    const filePath = join(INPUT_DIR, file);
    console.log(`  📄 Processing ${file}...`);

    try {
      const results: EnrichmentResult[] = JSON.parse(readFileSync(filePath, 'utf-8'));

      for (const result of results) {
        if (result.error) {
          totalErrors++;
          continue;
        }

        if (result.repairsApplied === 0) {
          totalSkipped++;
          continue;
        }

        if (!DRY_RUN) {
          updateStmt.run(result.enrichedContent, result.id);
        }

        totalMerged++;
        totalRepairs += result.repairsApplied;
      }

      console.log(`     ✓ ${results.length} records processed`);
    } catch (error) {
      console.error(`     ❌ Failed to process ${file}:`, error);
    }
  }

  db.close();

  console.log(`\n✅ Merge complete!`);
  console.log(`   Documents Updated: ${totalMerged}`);
  console.log(`   Total Repair Operations: ${totalRepairs}`);
  console.log(`   Skipped (no changes): ${totalSkipped}`);
  console.log(`   Errors: ${totalErrors}`);

  if (DRY_RUN) {
    console.log(`\n⚠️  DRY RUN - No changes were written to the database.`);
    console.log(`   Run without DRY_RUN=true to apply changes.`);
  }
}

main().catch((err) => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
