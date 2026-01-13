import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { CompetitiveOCRService } from '../services/ocr/OCRService';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'epstein-archive.db');
const db = new Database(DB_PATH);
const ocrService = new CompetitiveOCRService();

async function run() {
  console.log('Starting Full Document Re-ingestion with Enhanced OCR...');

  // Get all documents
  // We prioritize those with missing content or where we suspect redactions might be missed
  // But for a "full" run, we can do all. For now, let's target the DOJ ones specifically as a batch
  // or just all PDFs.

  const documents = db
    .prepare(
      `
        SELECT id, file_path, file_name 
        FROM documents 
        WHERE file_type = 'pdf' OR file_type LIKE 'image/%'
        ORDER BY id DESC
    `,
    )
    .all() as { id: number; file_path: string; file_name: string }[];

  console.log(`Found ${documents.length} documents to process.`);

  let updatedCount = 0;
  let errorCount = 0;

  for (const [index, doc] of documents.entries()) {
    const fullPath = doc.file_path.startsWith('/')
      ? doc.file_path
      : path.join(process.cwd(), doc.file_path);

    // Allow graceful skip if file missing
    if (!fs.existsSync(fullPath)) {
      // console.warn(`File not found: ${fullPath} (Doc ID: ${doc.id})`);
      continue;
    }

    try {
      const result = await ocrService.process(fullPath, 'application/pdf'); // Mime type guess

      // Update DB
      db.prepare(
        `
                UPDATE documents 
                SET content = ?, 
                    has_redactions = ?, 
                    redaction_count = ?,
                    word_count = ?,
                    metadata_json = json_patch(COALESCE(metadata_json, '{}'), ?)
                WHERE id = ?
            `,
      ).run(
        result.text,
        result.hasRedactions ? 1 : 0,
        Math.floor(result.redactionRatio * 1000), // Store sortable integer score? Or just count blocks?
        // Schema says redaction_count is integer.
        // Let's use block count estimation or ratio scaled.
        // Previous SQL used block count.
        // OCRResult has redactionRatio.
        // Let's infer count from matches in text.

        result.text.split(/\s+/).length,
        JSON.stringify({
          ocr_engine: result.engine,
          ocr_confidence: result.confidence,
          last_ocr_date: new Date().toISOString(),
        }),
        doc.id,
      );

      updatedCount++;
      if (result.hasRedactions) {
        console.log(
          `[${index}/${documents.length}] Updated ID ${doc.id}: Found Redactions (Engine: ${result.engine})`,
        );
      } else if (index % 50 === 0) {
        console.log(`[${index}/${documents.length}] Processed ID ${doc.id}`);
      }
    } catch (e) {
      errorCount++;
      console.error(`Failed to process ID ${doc.id}:`, e);
    }
  }

  console.log('Re-ingestion Complete.');
  console.log(`Updated: ${updatedCount}`);
  console.log(`Errors: ${errorCount}`);
}

run();
