import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || 'postgresql://epstein:epstein@localhost:5435/epstein_archive',
});

const DATE_PATTERNS = [
  // Email Header: Date: Mon, 11 Sep 2001 ...
  /Date:\s+([A-Z][a-z]{2},\s+\d{1,2}\s+[A-Z][a-z]{2}\s+\d{4})/i,
  // Numerical Date: Date: 09/11/2001 or 11/09/01
  /Date:\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
  // Military/EU: 11 Sep 2001
  /(\d{1,2}\s+[A-Z][a-z]{2}\s+\d{4})/,
  // Full month: September 11, 2001
  /([A-Z][a-z]{3,}\s+\d{1,2},\s+\d{4})/,
  // Legal/Generic patterns
  /Filed\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
  /Filed\s+([A-Z][a-z]+\s+\d{1,2},\s+\d{4})/i,
  /Dated:\s+([A-Z][a-z]+\s+\d{1,2},\s+\d{4})/i,
  // Fallback generic
  /([A-Z][a-z]{2}\s+\d{1,2},\s+\d{4})/,
];

function tryParseDate(str: string): Date | null {
  if (!str) return null;
  const clean = str.trim().replace(/\s+/g, ' ');
  const native = new Date(clean);
  if (!isNaN(native.getTime()) && native.getFullYear() > 1950 && native.getFullYear() < 2026) {
    return native;
  }
  return null;
}

async function run() {
  console.log('🔍 Starting advanced date extraction v2 (leftovers)...');
  const BATCH_SIZE = 2000;
  let lastId = 0;
  let totalUpdated = 0;
  let totalProcessed = 0;

  while (true) {
    const { rows } = await pool.query(
      `
      SELECT id, content, metadata_json 
      FROM documents 
      WHERE extracted_date IS NULL AND content IS NOT NULL AND id > $1
      ORDER BY id ASC
      LIMIT $2
    `,
      [lastId, BATCH_SIZE],
    );

    if (rows.length === 0) break;

    for (const doc of rows) {
      totalProcessed++;
      lastId = Number(doc.id);
      let foundDate: Date | null = null;

      // 1. Check metadata (unlikely if v1 missed but good for completeness)
      const meta =
        typeof doc.metadata_json === 'string'
          ? JSON.parse(doc.metadata_json)
          : doc.metadata_json || {};
      const metaDateStr = meta.sent_date || meta.creation_date || meta.date || meta.OriginalDate;
      if (metaDateStr) {
        foundDate = tryParseDate(metaDateStr);
      }

      // 2. Check content (first 6000 chars this time)
      if (!foundDate && doc.content) {
        const snippet = doc.content.slice(0, 6000);
        for (const pattern of DATE_PATTERNS) {
          const match = snippet.match(pattern);
          if (match && match[1]) {
            foundDate = tryParseDate(match[1]);
            if (foundDate) break;
          }
        }
      }

      if (foundDate) {
        await pool.query('UPDATE documents SET extracted_date = $1 WHERE id = $2', [
          foundDate,
          doc.id,
        ]);
        totalUpdated++;
      }
    }

    if (totalProcessed % 2000 === 0) {
      console.log(
        `📄 v2 Processed ${totalProcessed} documents, updated ${totalUpdated}... (Last ID: ${lastId})`,
      );
    }
  }

  console.log(
    `✨ v2 Extraction complete. Total updated: ${totalUpdated} / Total processed: ${totalProcessed}`,
  );
  console.log('🔄 Refreshing materialized view...');
  await pool.query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_timeline_data');
  await pool.end();
}

run();
