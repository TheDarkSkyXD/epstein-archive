#!/usr/bin/env tsx
import { getDb } from '../src/server/db/connection.js';
import { discoveryRepository } from '../src/server/db/discoveryRepository.js';
import { RedactionClassifier } from '../src/server/services/RedactionClassifier.js';
import { TextCleaner } from './utils/text_cleaner.js';
import { BoilerplateService } from '../src/server/services/BoilerplateService.js';

const BATCH_SIZE = 500;

async function backfill() {
  const db = getDb();
  console.log('🚀 Starting Metadata Backfill for Legacy Documents...');

  let processedCount = 0;
  let hasMore = true;

  while (hasMore) {
    // Find documents that haven't been backfilled
    // We check for NULL signal_score as the trigger
    const docs = db
      .prepare(
        `
      SELECT id, content, file_path 
      FROM documents 
      WHERE signal_score IS NULL 
      AND content IS NOT NULL
      LIMIT ?
    `,
      )
      .all(BATCH_SIZE) as any[];

    if (docs.length === 0) {
      hasMore = false;
      break;
    }

    console.log(`📦 Processing batch of ${docs.length} documents...`);

    for (const doc of docs) {
      try {
        await processWithRetry(doc);
        processedCount++;
        if (processedCount % 100 === 0) {
          process.stdout.write(`   Progress: ${processedCount} documents...\r`);
        }
      } catch (err) {
        console.error(`\n❌ Error processing document ${doc.id}:`, err);
      }
    }
  }

  console.log(`\n✅ Backfill complete! Total processed: ${processedCount}`);
}

async function processWithRetry(doc: any, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      await processDocumentBackfill(doc);
      return;
    } catch (err: any) {
      if (err.code === 'SQLITE_BUSY' && i < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 200 * (i + 1)));
        continue;
      }
      throw err;
    }
  }
}

async function processDocumentBackfill(doc: any) {
  const db = getDb();
  const content = doc.content;

  // 1. Sentence Tokenization
  const sentences = content
    .split(/(?<=[.!?])\s+/)
    .map((s: string) => s.trim())
    .filter((s: string) => s.length > 10);

  // Use a transaction for the granular data of a single document
  db.transaction(() => {
    // Clear existing granular data if any (idempotency)
    db.prepare('DELETE FROM document_sentences WHERE document_id = ?').run(doc.id);
    db.prepare('DELETE FROM redaction_spans WHERE document_id = ?').run(doc.id);

    // Add sentences
    for (let i = 0; i < sentences.length; i++) {
      discoveryRepository.addSentence({
        document_id: doc.id,
        sentence_index: i,
        sentence_text: sentences[i],
      });
    }

    // 2. Redaction Backfill
    storeRedactions(doc.id, content);

    // 3. Rollup Signal Score
    rollupScores(doc.id);
  })();
}

function storeRedactions(documentId: number, content: string) {
  const db = getDb();
  const insertSpan = db.prepare(`
      INSERT INTO redaction_spans (
        document_id, span_start, span_end, redaction_kind,
        inferred_class, inferred_role, confidence, evidence_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

  const redactedPattern =
    /(REDACTED|Media Redacted|Excerpt Redacted|Redacted|redacted|Privileged - Redacted)/gi;
  let match;
  let count = 0;
  while ((match = redactedPattern.exec(content)) !== null) {
    count++;
    const start = match.index;
    const end = match.index + match[0].length;
    const pre = content.substring(Math.max(0, start - 100), start);
    const post = content.substring(end, end + 100);

    const inference = RedactionClassifier.classify(pre, post);

    insertSpan.run(
      documentId,
      start,
      end,
      'removed_text',
      inference.inferredClass,
      inference.inferredRole,
      inference.confidence,
      JSON.stringify(inference.evidence),
    );
  }
  if (count > 0) {
    db.prepare('UPDATE documents SET has_redactions = 1, redaction_count = ? WHERE id = ?').run(
      count,
      documentId,
    );
    console.log(`\n      📝 Stored ${count} redactions for doc ${documentId}`);
  }
}

function rollupScores(docId: number) {
  const db = getDb();

  // First, update sentence-level signal scores since discoveryRepository defaults to 0
  // We boost non-boilerplate sentences
  db.prepare(
    `
        UPDATE document_sentences 
        SET signal_score = 0.7 
        WHERE document_id = ? AND is_boilerplate = 0
    `,
  ).run(docId);

  db.prepare(
    `
        UPDATE document_sentences 
        SET signal_score = 0.1 
        WHERE document_id = ? AND is_boilerplate = 1
    `,
  ).run(docId);

  // Calculate signal from sentences (Avg of non-boilerplate sentences)
  const stats = db
    .prepare(
      `
        SELECT AVG(signal_score) as avg_score
        FROM document_sentences
        WHERE document_id = ?
    `,
    )
    .get(docId) as { avg_score: number | null };

  const score = stats.avg_score !== null ? stats.avg_score : 0.0;

  db.prepare(
    "UPDATE documents SET signal_score = ?, analyzed_at = datetime('now') WHERE id = ?",
  ).run(score, docId);
}

backfill().catch(console.error);
