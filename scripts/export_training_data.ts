import { getApiPool } from '../src/server/db/connection.js';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const EXPORT_DIR = 'data/training_exports';
if (!fs.existsSync(EXPORT_DIR)) {
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
}

async function exportTrainingData() {
  const pool = getApiPool();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  console.log('Exporting Active Learning Training Data...');

  const mentionsResult = await pool.query(`
    SELECT m.mention_context, m.span_text as entity_text,
      e.full_name as linked_entity, e.entity_type, m.verified, m.rejection_reason
    FROM entity_mentions m
    JOIN entities e ON m.entity_id = e.id
    WHERE m.verified != 0
  `);
  if (mentionsResult.rows.length > 0) {
    const filename = path.join(EXPORT_DIR, `mentions_feedback_${timestamp}.jsonl`);
    const stream = fs.createWriteStream(filename);
    mentionsResult.rows.forEach((row) => {
      stream.write(JSON.stringify(row) + '\n');
    });
    stream.end();
    console.log(`Exported ${mentionsResult.rows.length} mention feedback records to ${filename}`);
  } else {
    console.log('No verified mention data found.');
  }

  const claimsResult = await pool.query(`
    SELECT c.subject_entity_id, es.full_name as subject, c.predicate, c.object_text,
      c.modality, ds.sentence_text, c.verified, c.rejection_reason
    FROM claim_triples c
    JOIN entities es ON c.subject_entity_id = es.id
    LEFT JOIN document_sentences ds ON c.sentence_id = ds.id
    WHERE c.verified != 0
  `);
  if (claimsResult.rows.length > 0) {
    const filename = path.join(EXPORT_DIR, `claims_feedback_${timestamp}.jsonl`);
    const stream = fs.createWriteStream(filename);
    claimsResult.rows.forEach((row) => {
      stream.write(JSON.stringify(row) + '\n');
    });
    stream.end();
    console.log(`Exported ${claimsResult.rows.length} claim feedback records to ${filename}`);
  } else {
    console.log('No verified claim data found.');
  }

  const boilerplateResult = await pool.query(`
    SELECT bp.sentence_text_sample, bp.frequency, bp.status
    FROM boilerplate_phrases bp
    WHERE bp.status = 'candidate'
    ORDER BY bp.frequency DESC
    LIMIT 1000
  `);
  if (boilerplateResult.rows.length > 0) {
    const filename = path.join(EXPORT_DIR, `boilerplate_candidates_${timestamp}.csv`);
    const stream = fs.createWriteStream(filename);
    stream.write('text,frequency,status\n');
    boilerplateResult.rows.forEach((row: any) => {
      const safeText = `"${row.sentence_text_sample.replace(/"/g, '""')}"`;
      stream.write(`${safeText},${row.frequency},${row.status}\n`);
    });
    stream.end();
    console.log(`Exported ${boilerplateResult.rows.length} boilerplate candidates to ${filename}`);
  } else {
    console.log('No boilerplate candidates found.');
  }
}

exportTrainingData().catch((e) => {
  console.error(e);
  process.exit(1);
});
