import Database from 'better-sqlite3';
import { AIEnrichmentService } from '../src/server/services/AIEnrichmentService.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

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

  for (const entry of entries) {
    try {
      const cleaned = await AIEnrichmentService.cleanBlackBookEntry(entry.entry_text);

      if (cleaned) {
        db.prepare(
          `
          UPDATE black_book_entries 
          SET phone_numbers = ?, 
              email_addresses = ?, 
              addresses = ?, 
              notes = ?
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

  console.log('✨ Enrichment Finished.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runEnrichment().catch(console.error);
}
