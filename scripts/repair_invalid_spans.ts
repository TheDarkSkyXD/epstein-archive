import { getMaintenancePool } from '../src/server/db/connection.js';
import 'dotenv/config';

async function main() {
  const pool = getMaintenancePool();
  console.log('Repairing invalid document_spans offsets...\n');

  const spansResult = await pool.query(
    'SELECT id, start_offset, end_offset, document_id FROM document_spans',
  );
  const spans = spansResult.rows;

  let legacySpans = 0;
  let repaired = 0;

  for (const span of spans) {
    if (span.start_offset === 0 && span.end_offset === 0) {
      legacySpans++;
      continue;
    }

    const docResult = await pool.query(
      'SELECT content, content_refined FROM documents WHERE id = $1',
      [span.document_id],
    );
    const doc = docResult.rows[0] as
      | { content: string | null; content_refined: string | null }
      | undefined;

    const text =
      (doc?.content_refined && doc.content_refined.length > 0
        ? doc.content_refined
        : doc?.content && doc.content.length > 0
          ? doc.content
          : null) || null;

    let invalid = false;
    let reason = '';

    if (span.start_offset < 0 || span.end_offset <= span.start_offset) {
      invalid = true;
      reason = 'negative_or_non_increasing';
    } else if (text && span.end_offset > text.length) {
      invalid = true;
      reason = 'beyond_text_length';
    }

    if (invalid) {
      console.log(
        `  - fixing ${span.id} (doc=${span.document_id}, start=${span.start_offset}, end=${span.end_offset}, reason=${reason})`,
      );
      await pool.query('UPDATE document_spans SET start_offset = 0, end_offset = 0 WHERE id = $1', [
        span.id,
      ]);
      repaired++;
    }
  }

  console.log(
    `\nCompleted span offset repair. Legacy spans: ${legacySpans}, repaired spans: ${repaired}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
