import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'epstein-archive.db');
const db = new Database(DB_PATH);

const ALBUM_ID = 25;

interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  speaker: string;
}

function generateTranscripts() {
  console.log(`Generating transcripts for Album ID ${ALBUM_ID}...`);

  const items = db
    .prepare('SELECT id, title, metadata_json, document_id FROM media_items WHERE album_id = ?')
    .all(ALBUM_ID) as any[];

  const insertDoc = db.prepare(`
    INSERT INTO documents (
      file_name, file_path, file_type, content, is_sensitive, created_at, date_modified
    ) VALUES (
      ?, ?, 'text/plain', ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
  `);

  const updateMedia = db.prepare('UPDATE media_items SET document_id = ? WHERE id = ?');

  let count = 0;

  db.transaction(() => {
    for (const item of items) {
      if (item.document_id) {
        console.log(`Item ${item.id} already has document ${item.document_id}, skipping.`);
        continue;
      }
      if (!item.metadata_json) continue;

      let metadata;
      try {
        metadata = JSON.parse(item.metadata_json);
      } catch (e) {
        console.error(`Failed to parse metadata for item ${item.id}`);
        continue;
      }

      if (!metadata.transcript || !Array.isArray(metadata.transcript)) {
        console.log(`No transcript found for item ${item.id}`);
        continue;
      }

      // Generate Clean Transcript
      let cleanText = `Transcript: ${item.title}\n\n`;
      let lastSpeaker = '';

      for (const seg of metadata.transcript as TranscriptSegment[]) {
        const speaker = seg.speaker ? seg.speaker.trim() : 'Unknown';
        const text = seg.text ? seg.text.trim() : '';

        if (speaker !== lastSpeaker) {
          cleanText += `\n**${speaker}**:\n${text}`;
          lastSpeaker = speaker;
        } else {
          cleanText += ` ${text}`;
        }
      }

      const fileName = `generated_transcript_${item.id}.txt`;
      const filePath = `/generated/transcripts/${fileName}`;
      const docTitle = `Transcript: ${item.title}`;

      // Create Document
      // Using docTitle as file_name for display purposes if the UI uses file_name as title
      const result = insertDoc.run(docTitle, filePath, cleanText);
      const docId = result.lastInsertRowid;

      // Link to Media Item
      updateMedia.run(docId, item.id);

      console.log(`Generated transcript for item ${item.id} -> Document ${docId}`);
      count++;
    }
  })();

  console.log(`Successfully generated ${count} transcripts.`);
}

generateTranscripts();
