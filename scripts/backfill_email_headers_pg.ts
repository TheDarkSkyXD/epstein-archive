import { Client } from 'pg';
import { cleanMime } from '../src/server/services/mimeCleaner.js';

type Row = {
  id: number;
  content: string | null;
  metadata_json: Record<string, unknown> | null;
};

const BATCH_SIZE = Number(process.env.EMAIL_HEADER_BACKFILL_BATCH || 200);
const MAX_ROWS = Number(process.env.EMAIL_HEADER_BACKFILL_MAX || 20000);

function isBlank(value: unknown): boolean {
  if (value == null) return true;
  if (Array.isArray(value))
    return value.length === 0 || value.every((v) => String(v).trim() === '');
  return String(value).trim() === '';
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  const client = new Client({ connectionString });
  await client.connect();

  let processed = 0;
  let updated = 0;
  let failed = 0;

  try {
    while (processed < MAX_ROWS) {
      const limit = Math.min(BATCH_SIZE, MAX_ROWS - processed);
      const { rows } = await client.query<Row>(
        `
          SELECT id, content, metadata_json
          FROM documents
          WHERE evidence_type = 'email'
            AND content IS NOT NULL
            AND (
              metadata_json IS NULL
              OR COALESCE(metadata_json ->> 'from', '') = ''
              OR (
                COALESCE(metadata_json ->> 'to', '') = ''
                AND COALESCE(metadata_json ->> 'to_json', '') = ''
              )
            )
          ORDER BY id ASC
          LIMIT $1
        `,
        [limit],
      );

      if (rows.length === 0) break;

      for (const row of rows) {
        processed += 1;
        const source = String(row.content || '').trim();
        if (!source) continue;

        try {
          const parsed = await cleanMime(source);
          const existing = (
            row.metadata_json && typeof row.metadata_json === 'object' ? row.metadata_json : {}
          ) as Record<string, unknown>;

          const next = { ...existing } as Record<string, unknown>;
          if (!isBlank(next.from) && !isBlank(next.to)) continue;

          if (parsed.from && parsed.from.trim()) next.from = parsed.from.trim();
          if (parsed.to.length > 0) {
            next.to = parsed.to.join(', ');
            next.to_json = parsed.to;
          }
          if (parsed.cc.length > 0) {
            next.cc = parsed.cc.join(', ');
            next.cc_json = parsed.cc;
          }
          if (parsed.bcc.length > 0) {
            next.bcc = parsed.bcc.join(', ');
            next.bcc_json = parsed.bcc;
          }
          if (!isBlank(next.subject) || !parsed.subject.trim()) {
            // keep existing
          } else {
            next.subject = parsed.subject.trim();
          }
          if (parsed.date) next.date = parsed.date.toISOString();
          if (parsed.message_id && parsed.message_id.trim()) {
            next.messageId = parsed.message_id.trim();
            next.message_id = parsed.message_id.trim();
          }
          next.attachments_count = parsed.attachments_count;
          next.mime_parse_status = parsed.mime_parse_status;
          if (parsed.mime_parse_reason) next.mime_parse_reason = parsed.mime_parse_reason;

          await client.query(`UPDATE documents SET metadata_json = $2::jsonb WHERE id = $1`, [
            row.id,
            JSON.stringify(next),
          ]);
          updated += 1;
        } catch (error) {
          failed += 1;
          if (failed <= 10) {
            console.warn(`[email-header-backfill] parse failed for document ${row.id}:`, error);
          }
        }
      }

      console.log(
        `[email-header-backfill] progress processed=${processed} updated=${updated} failed=${failed}`,
      );

      if (rows.length < limit) break;
    }

    const { rows: completenessRows } = await client.query(
      `
        SELECT
          COUNT(*) FILTER (WHERE COALESCE(metadata_json ->> 'from', '') = '') AS missing_from,
          COUNT(*) FILTER (WHERE COALESCE(metadata_json ->> 'to', '') = '') AS missing_to,
          COUNT(*) AS total
        FROM documents
        WHERE evidence_type = 'email'
      `,
    );

    console.log(
      '[email-header-backfill] done',
      JSON.stringify({ processed, updated, failed, completeness: completenessRows[0] }),
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('[email-header-backfill] fatal', error);
  process.exit(1);
});
