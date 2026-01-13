/**
 * Ingestion script for Manuel Sascha Barros (SR) testimony audio files
 *
 * This script:
 * 1. Creates a dedicated album for the SR testimony
 * 2. Ingests all 6 audio files (A-F) from lvoocaudiop1 directory
 * 3. Links transcripts from data/text/lvoocaudiop1
 * 4. Marks all content as sensitive
 * 5. Parses metadata (duration, chapters, etc.)
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { glob } from 'glob';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'epstein-archive.db');
const AUDIO_DIR = path.join(process.cwd(), 'data/media/audio/lvoocaudiop1');
const TRANSCRIPT_DIR = path.join(process.cwd(), 'data/text/lvoocaudiop1');

interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

async function main() {
  console.log('🎙️  Starting SR Testimony ingestion...\n');

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  try {
    // 1. Create or get album
    const albumName = 'Manuel Sascha Barros Testimony';
    const albumDescription = 'Audio testimony from victim/survivor. Content is graphic, traumatic, and disturbing. Listener discretion strongly advised.';

    let album = db.prepare('SELECT id FROM media_albums WHERE name = ?').get(albumName) as { id: number } | undefined;

    if (!album) {
      const result = db.prepare(`
        INSERT INTO media_albums (name, description, created_at, date_modified)
        VALUES (?, ?, datetime('now'), datetime('now'))
      `).run(albumName, albumDescription);
      album = { id: result.lastInsertRowid as number };
      console.log(`✅ Created album: ${albumName} (ID: ${album.id})\n`);
    } else {
      console.log(`📁 Using existing album: ${albumName} (ID: ${album.id})\n`);
    }

    // 2. Find audio files
    const audioFiles = await glob('*.m4a', { cwd: AUDIO_DIR });
    console.log(`Found ${audioFiles.length} audio files:\n`);
    audioFiles.forEach(f => console.log(`  - ${f}`));
    console.log();

    // 3. Ingest each audio file
    for (const filename of audioFiles) {
      const fullPath = path.join(AUDIO_DIR, filename);
      const stats = fs.statSync(fullPath);

      // Check if already ingested
      const existing = db.prepare('SELECT id FROM media_items WHERE file_path = ?').get(fullPath);
      if (existing) {
        console.log(`⏭️  Skipping ${filename} (already ingested)`);
        continue;
      }

      // Determine part number (A-F)
      const partMatch = filename.match(/([A-F])of6/i);
      const partLetter = partMatch ? partMatch[1].toUpperCase() : '?';
      const partNumber = partLetter.charCodeAt(0) - 'A'.charCodeAt(0) + 1;

      // Title
      const title = `Manuel Sascha Barros Testimony - Part ${partLetter} of 6`;

      // Load transcript if exists
      const transcriptFilename = `${partNumber}_eng.txt`;
      const transcriptPath = path.join(TRANSCRIPT_DIR, transcriptFilename);

      let transcript: TranscriptSegment[] = [];
      let metadata: any = {};

      if (fs.existsSync(transcriptPath)) {
        const transcriptText = fs.readFileSync(transcriptPath, 'utf-8');
        console.log(`  📄 Found transcript: ${transcriptFilename} (${transcriptText.length} chars)`);

        // Simple transcript parsing: split by paragraph
        const lines = transcriptText.split('\n\n').filter(l => l.trim());
        transcript = lines.map((text, i) => ({
          start: i * 30, // Rough estimate: 30 seconds per segment
          end: (i + 1) * 30,
          text: text.trim()
        }));

        metadata.transcript = transcript;
        metadata.transcriptPath = transcriptPath;
      } else {
        console.log(`  ⚠️  No transcript found: ${transcriptFilename}`);
      }

      // Rough duration estimate based on file size (approximate)
      const roughDuration = Math.round(stats.size / 100000); // Very rough estimate
      metadata.duration = roughDuration;
      metadata.fileSize = stats.size;

      // Insert into database
      const insertResult = db.prepare(`
        INSERT INTO media_items (
          file_path,
          file_type,
          title,
          description,
          album_id,
          is_sensitive,
          red_flag_rating,
          metadata_json,
          verification_status,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(
        fullPath,
        'audio/mp4',
        title,
        `Testimony part ${partLetter} of 6. Sensitive content.`,
        album.id,
        1, // is_sensitive = true
        5, // red_flag_rating = highest
        JSON.stringify(metadata),
        'verified'
      );

      console.log(`✅ Ingested: ${title} (ID: ${insertResult.lastInsertRowid})\n`);
    }

    console.log('\n🎉 SR Testimony ingestion complete!');
    console.log(`📊 Summary:`);
    console.log(`   Album: ${albumName}`);
    console.log(`   Files ingested: ${audioFiles.length}`);
    console.log(`   Album ID: ${album.id}`);
    console.log(`\n⚠️  All files marked as SENSITIVE with RED FLAG rating 5`);

  } catch (error) {
    console.error('❌ Error during ingestion:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

main();
