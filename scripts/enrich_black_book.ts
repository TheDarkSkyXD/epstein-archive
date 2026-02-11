import Database from 'better-sqlite3';
import { AIEnrichmentService } from '../src/server/services/AIEnrichmentService.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { AgenticAudit } from '../src/server/utils/agenticAudit.js';
import { makeId } from '../src/server/utils/id_utils.js';

dotenv.config();

const DB_PATH = process.env.DB_PATH || 'epstein-archive.db';
const db = new Database(DB_PATH);

/**
 * Black Book Enrichment Script
 * iterates through entries and uses AI to fix OCR and extract structured contact info.
 */
async function runEnrichment() {
  console.log('🚀 Starting Black Book AI Enrichment...');

  const entries = db
    .prepare(
      `
    SELECT id, entry_text, notes, document_id
    FROM black_book_entries 
    WHERE (phone_numbers IS NULL OR email_addresses IS NULL OR addresses IS NULL)
    OR notes LIKE '%[CREDENTIAL]%'
  `,
    )
    .all() as any[];

  console.log(`📊 Found ${entries.length} entries for processing.`);

  // 1. Initialize an ingest run for this enrichment session
  const runId = makeId();
  const gitCommit = 'manual-enrichment';
  db.prepare(
    `
    INSERT INTO ingest_runs (id, status, git_commit, pipeline_version, agentic_enabled, notes)
    VALUES (?, 'running', ?, '1.0.0-enrichment', 1, 'Black Book manual enrichment session')
  `,
  ).run(runId, gitCommit);

  for (const entry of entries) {
    try {
      const cleaned = await AIEnrichmentService.cleanBlackBookEntry(entry.entry_text);

      if (cleaned) {
        // 2. Audit the transformation
        await AgenticAudit.auditAndEnqueue({
          type: 'entity_creation',
          subject_id: `black-book-entry-${entry.id}`,
          ingest_run_id: runId,
          before: { text: entry.entry_text, notes: entry.notes },
          after: cleaned,
          notes: `AI normalization of black book entry ${entry.id}`,
        });

        db.prepare(
          `
          UPDATE black_book_entries 
          SET phone_numbers = ?, 
              email_addresses = ?, 
              addresses = ?, 
              notes = ?,
              was_agentic = 1
          WHERE id = ?
        `,
        ).run(
          JSON.stringify(cleaned.phones || []),
          JSON.stringify(cleaned.emails || []),
          JSON.stringify(cleaned.addresses || []),
          `${entry.notes || ''}\n[AI CLEANED]: ${cleaned.notes || ''}`.trim(),
          entry.id,
        );
        console.log(`✅ Processed ID ${entry.id}: ${cleaned.name}`);
      }
    } catch (e) {
      console.error(`❌ Error on entry ${entry.id}:`, e);
    }
  }

  // 3. Finalize run
  db.prepare(
    "UPDATE ingest_runs SET status = 'success', finished_at = CURRENT_TIMESTAMP WHERE id = ?",
  ).run(runId);
  console.log('✨ Enrichment Finished.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runEnrichment().catch(console.error);
}
