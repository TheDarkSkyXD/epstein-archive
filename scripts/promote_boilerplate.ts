import { getDb } from '../src/server/db/connection.js';

const db = getDb();

const BOILERPLATE_CANDIDATE_THRESHOLD = 10;
const BOILERPLATE_CONFIRMED_THRESHOLD = 100;

function promoteBoilerplate() {
  console.log('🔄 Starting Boilerplate Promotion Job...');

  // 1. Promote Pending -> Candidate
  const candidateResult = db
    .prepare(
      `
    UPDATE boilerplate_phrases
    SET status = 'candidate'
    WHERE status = 'pending' AND frequency > ?
  `,
    )
    .run(BOILERPLATE_CANDIDATE_THRESHOLD);

  if (candidateResult.changes > 0) {
    console.log(
      `   🔸 Promoted ${candidateResult.changes} phrases to 'candidate' (Freq > ${BOILERPLATE_CANDIDATE_THRESHOLD})`,
    );
  }

  // 2. Promote Candidate -> Confirmed
  // (We might want manual review for this, but user said "if freq > 100... confirmed")
  // Let's be aggressive as per "Ruthless" strategy.
  const confirmedResult = db
    .prepare(
      `
    UPDATE boilerplate_phrases
    SET status = 'confirmed'
    WHERE (status = 'pending' OR status = 'candidate') AND frequency > ?
  `,
    )
    .run(BOILERPLATE_CONFIRMED_THRESHOLD);

  if (confirmedResult.changes > 0) {
    console.log(
      `   ✅ Promoted ${confirmedResult.changes} phrases to 'confirmed' (Freq > ${BOILERPLATE_CONFIRMED_THRESHOLD})`,
    );
  }

  // 3. Update 'is_boilerplate' flag on document_sentences for newly confirmed phrases
  // This is retrospective: if we just confirmed a phrase, we must mark existing sentences.
  // This could be slow on massive DB, so we'll do it in batches or just for the newly updated ones.
  // Ideally, we'd fetch the hashes that became confirmed.

  // For now, let's just do a bulk update where is_boilerplate is 0 but hash matches confirmed phrase.
  // We need to join.

  const updateSentences = db.prepare(`
    UPDATE document_sentences
    SET is_boilerplate = 1
    WHERE is_boilerplate = 0 
    AND sentence_text IN (
      SELECT sentence_text_sample FROM boilerplate_phrases WHERE status = 'confirmed'
    )
  `);

  // Wait, matching by text sample is risky if sample is just one variant?
  // But our logic stores exact text.
  // Actually, we store `sentence_text` in document_sentences, and `sentence_text_sample` in boilerplate.
  // The boilerplate logic normalizes and hashes. `document_sentences` doesn't store the hash.
  // We technically should compute hash on the fly or matching exact text if `boilerplate_phrases` stores normalized?
  // `discoveryRepository` stores `sentence_text_sample` as the raw text of the *first* occurrence.
  // But checking equality of raw text misses case/whitespace variations that the hash caught.

  // Correct approach: We can't efficienty update `document_sentences` without re-hashing or storing the hash on `document_sentences`.
  // Phase 5 schema didn't add `sentence_hash` to `document_sentences`.
  // User "4A" says: "compute sentence_sha256... maintain frequency".
  // `discoveryRepository` computes hash.
  // If we want to retrospectively mark boolean `is_boilerplate`, we need to re-scan or add `sentence_hash` column.

  // Since we accept "Ruthless" active learning, let's assume `ingest_intelligence` handles new stuff.
  // For retrospective, we might need to add `sentence_hash` column to `document_sentences` to make this efficient.
  // But I can't change schema easily now without another migration.
  // Let's stick to future-looking for now, OR rely on `ingest_intelligence` re-running.

  // However, `ingest_intelligence` *reads* `is_boilerplate`. If we don't update it, we miss out.
  // Let's rely on the fact that `discoveryRepository` sets `is_boilerplate` at insertion time.
  // But if status changes later, we need to update.

  // Optimization: "Re-Scan Logic"
  // We can select all `boilerplate_phrases` that are confirmed, and run a query `WHERE lower(sentence_text) = ...`?
  // Too slow.

  // Decision: For now, this script only promotes the *Concept*.
  // Actual filtering happens at *Extraction Time*.
  // But `ingest_intelligence` checks `s.is_boilerplate`.
  // If `is_boilerplate` is outdated, we fail to filter.
  // Fix: `ingest_intelligence` (Phase 5) query:
  // `SELECT s.id... s.is_boilerplate...`
  // We should probably modify `ingest_intelligence` to JOIN with `boilerplate_phrases` on HASH?
  // We don't have hash in `document_sentences`.

  // Alternative: `ingest_intelligence` re-computes hash?
  // Yes, `processGranularProvenance` has the text. It can re-hash and check `boilerplate_phrases`.
  // But `discoveryRepository` already checked it.

  // Given constraints, I will leave the retrospective update out of this script for now,
  // and assume we will implement a "Re-Scan Sentences" job if needed.
  // But I will log a warning.

  console.log(
    '   ⚠️  Note: Existing document_sentences tables `is_boilerplate` flags are not automatically updated by this script.',
  );
  console.log(
    '       To apply retroactively, we need to re-process documents or add a sentence_hash column.',
  );

  console.log('🏁 Boilerplate Promotion Complete.');
}

promoteBoilerplate();
