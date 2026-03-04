import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || 'postgresql://epstein:epstein@localhost:5435/epstein_archive',
});

const DATE_PATTERNS = [
  /Date:\s+([A-Z][a-z]{2},\s+\d{1,2}\s+[A-Z][a-z]{2}\s+\d{4})/gi,
  /Date:\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi,
  /(\d{1,2}\s+[A-Z][a-z]{2}\s+\d{4})/g,
  /([A-Z][a-z]{3,}\s+\d{1,2},\s+\d{4})/g,
  /Filed\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi,
  /Filed\s+([A-Z][a-z]+\s+\d{1,2},\s+\d{4})/gi,
  /Dated:\s+([A-Z][a-z]+\s+\d{1,2},\s+\d{4})/gi,
  /([A-Z][a-z]{2}\s+\d{1,2},\s+\d{4})/g,
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
  console.log('🔍 Starting temporal metadata enrichment (v3)...');
  const BATCH_SIZE = 1000;
  let lastId = 0;
  let totalEnriched = 0;
  let totalProcessed = 0;

  while (true) {
    const { rows } = await pool.query(
      `
      SELECT id, content, metadata_json 
      FROM documents 
      WHERE content IS NOT NULL AND id > $1
      ORDER BY id ASC
      LIMIT $2
    `,
      [lastId, BATCH_SIZE],
    );

    if (rows.length === 0) break;

    for (const doc of rows) {
      totalProcessed++;
      lastId = Number(doc.id);

      const snippet = doc.content.slice(0, 10000);
      const foundDates: Date[] = [];

      for (const pattern of DATE_PATTERNS) {
        let match;
        while ((match = pattern.exec(snippet)) !== null) {
          const d = tryParseDate(match[1] || match[0]);
          if (d) foundDates.push(d);
        }
      }

      if (foundDates.length > 0) {
        foundDates.sort((a, b) => a.getTime() - b.getTime());
        const minDate = foundDates[0];
        const maxDate = foundDates[foundDates.length - 1];

        // Use first date as primary if not already set or if better quality
        // For now, we mainly want to enrich metadata_json
        const currentMeta =
          typeof doc.metadata_json === 'string'
            ? JSON.parse(doc.metadata_json)
            : doc.metadata_json || {};

        currentMeta.temporal = {
          min: minDate.toISOString(),
          max: maxDate.toISOString(),
          count: foundDates.length,
          primary: foundDates[0].toISOString(), // Simplified heuristic
          source: 'text_heuristics_v3',
        };

        await pool.query('UPDATE documents SET metadata_json = $1 WHERE id = $2', [
          JSON.stringify(currentMeta),
          doc.id,
        ]);
        totalEnriched++;
      }
    }

    if (totalProcessed % 2000 === 0) {
      console.log(
        `📄 v3 Processed ${totalProcessed}, enriched ${totalEnriched}... (Last ID: ${lastId})`,
      );
    }
  }

  console.log(
    `✨ v3 Enrichment complete. Total enriched: ${totalEnriched} / Total processed: ${totalProcessed}`,
  );
  await pool.end();
}

run();
