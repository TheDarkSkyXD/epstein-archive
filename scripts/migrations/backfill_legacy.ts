import Database from 'better-sqlite3';
import * as crypto from 'crypto';

const DB_PATH = process.env.DB_PATH || 'epstein-archive.db';

async function backfillLegacy() {
  console.log('📦 Starting Legacy Evidence Backfill...');
  const db = new Database(DB_PATH);
  db.pragma('foreign_keys = OFF'); // Temporarily disable to handle legacy orphans gracefully
  try {
    // 1. Create legacy ingest run
    const runId = 'legacy_import';
    const existingRun = db.prepare('SELECT id FROM ingest_runs WHERE id = ?').get(runId);

    if (!existingRun) {
      db.prepare(
        `
        INSERT INTO ingest_runs (id, status, notes, pipeline_version)
        VALUES (?, 'success', 'Backfilled legacy import data', '1.0.0-legacy')
      `,
      ).run(runId);
      console.log('✅ Created legacy_import run manifest.');
    }

    // 2. Backfill Document Spans (Coarse - one per document)
    console.log('⏳ Creating coarse spans for existing documents...');
    const documents = db.prepare('SELECT id, content FROM documents').all() as any[];

    const insertSpan = db.prepare(`
      INSERT OR IGNORE INTO document_spans (id, document_id, start_offset, end_offset, extraction_method, confidence, ingest_run_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const doc of documents) {
      const spanId = `span-legacy-${doc.id}`;
      const contentLength = doc.content ? doc.content.length : 0;
      insertSpan.run(
        spanId,
        doc.id,
        0,
        contentLength,
        'other',
        0.5, // Coarse confidence
        runId,
      );
    }

    // 3. Backfill Entity Mentions
    console.log('⏳ Migrating legacy mentions to new schema...');
    // Existing data is now in entity_mentions_legacy (renamed by migration)
    const legacyMentions = db
      .prepare(
        `
      SELECT * FROM entity_mentions_legacy
    `,
      )
      .all() as any[];

    const insertMention = db.prepare(`
      INSERT OR IGNORE INTO entity_mentions (
        id, entity_id, document_id, span_id, start_offset, end_offset, surface_text, confidence, ingest_run_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const m of legacyMentions) {
      const mentionId = `mention-legacy-${m.id}`;
      const spanId = `span-legacy-${m.document_id}`;
      try {
        insertMention.run(
          mentionId,
          m.entity_id,
          m.document_id,
          spanId,
          0,
          0, // No specific offsets in legacy
          m.mention_context || m.context_snippet || '',
          m.confidence_score || m.confidence || 0.5,
          runId,
        );
      } catch (e: any) {
        console.error(`  ❌ Failed mention ${m.id}:`, e.message);
      }
    }

    // 4. Update Relations and Claim Triples
    console.log('⏳ Stamping relations and triples with run ID...');
    db.prepare('UPDATE entity_relationships SET ingest_run_id = ? WHERE ingest_run_id IS NULL').run(
      runId,
    );
    db.prepare('UPDATE claim_triples SET ingest_run_id = ? WHERE ingest_run_id IS NULL').run(runId);

    console.log('🏁 Legacy backfill complete.');
  } catch (error) {
    console.error('❌ Backfill failed:', error);
  } finally {
    db.close();
  }
}

backfillLegacy();
