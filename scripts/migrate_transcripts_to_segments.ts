import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'epstein-archive.db');
const db = new Database(DB_PATH);

interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  speaker: string;
}

async function migrate() {
  console.log('🚀 Migrating media transcripts to granular segments...');

  const items = db
    .prepare(
      `
    SELECT id, metadata_json 
    FROM media_items 
    WHERE metadata_json IS NOT NULL
  `,
    )
    .all() as any[];

  let totalSegments = 0;
  let itemsProcessed = 0;

  const insertSegment = db.prepare(`
    INSERT OR IGNORE INTO media_transcripts (
      media_id, segment_index, start_ms, end_ms, speaker_label, transcript_text, engine
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  db.transaction(() => {
    for (const item of items) {
      let metadata;
      try {
        metadata = JSON.parse(item.metadata_json);
      } catch (err) {
        continue;
      }

      if (!metadata.transcript || !Array.isArray(metadata.transcript)) {
        continue;
      }

      const segments = metadata.transcript as TranscriptSegment[];
      segments.forEach((seg, index) => {
        insertSegment.run(
          item.id,
          index,
          Math.floor(seg.start * 1000), // convert to ms
          Math.floor(seg.end * 1000), // convert to ms
          seg.speaker || 'Unknown',
          seg.text,
          'legacy_importer',
        );
        totalSegments++;
      });
      itemsProcessed++;
    }
  })();

  console.log(
    `✅ Completed. Processed ${itemsProcessed} items and created ${totalSegments} segments.`,
  );
}

migrate().catch(console.error);
