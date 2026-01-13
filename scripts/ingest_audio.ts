import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { glob } from 'glob';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

// Configuration
const DB_PATH = process.env.DB_PATH || 'epstein-archive.db';
const AUDIO_ROOT = 'data/media/audio';
const WHISPER_MODEL = 'medium'; // 'tiny', 'base', 'small', 'medium', 'large'

// Extensions to ingest
const AUDIO_EXTS = ['.mp3', '.m4a', '.wav', '.ogg'];

const db = new Database(DB_PATH);

// Helper to run Whisper
async function transcribeAudio(filePath: string): Promise<{ transcript: any[]; duration: number }> {
  try {
    console.log(`🎙️ Transcribing ${path.basename(filePath)} with Whisper (${WHISPER_MODEL})...`);
    const outputDir = path.dirname(filePath); // Output next to file or tmp?
    // Using output directory same as source for now to keep artifacts, or tmp?
    // Let's use tmp to avoid cluttering source if not desired,
    // BUT keeping specific .json transcript next to audio is good practice.
    // Let's us specific temp dir.
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'whisper-'));

    // Command: whisper "file" --model base --output_format json --output_dir "tempDir"
    await execAsync(
      `whisper "${filePath}" --model ${WHISPER_MODEL} --output_format json --output_dir "${tempDir}"`,
    );

    const baseName = path.basename(filePath, path.extname(filePath));
    const jsonPath = path.join(tempDir, `${baseName}.json`);

    if (fs.existsSync(jsonPath)) {
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      // Clean up
      fs.rmSync(tempDir, { recursive: true, force: true });

      // Map segments
      const segments = data.segments.map((s: any) => ({
        start: s.start,
        end: s.end,
        text: s.text.trim(),
      }));

      return {
        transcript: segments,
        duration: data.duration || 0,
      };
    }
  } catch (error) {
    console.error('❌ Whisper failed:', error);
  }
  return { transcript: [], duration: 0 };
}

import os from 'os';

async function ingestAudio() {
  console.log(`🚀 Starting Audio Ingestion from ${AUDIO_ROOT}...`);

  if (!fs.existsSync(AUDIO_ROOT)) {
    console.error(`Audio root directory not found: ${AUDIO_ROOT}`);
    process.exit(1);
  }

  // Check for whisper
  let hasWhisper = false;
  try {
    await execAsync('which whisper');
    hasWhisper = true;
    console.log('✅ Whisper AI detected. Classification and transcription enabled.');
  } catch (e) {
    console.warn('⚠️ Whisper AI not found. Skipping transcription.');
  }

  // Find all audio files
  const files = glob
    .sync('**/*.*', { cwd: AUDIO_ROOT, nodir: true })
    .filter((f) => AUDIO_EXTS.includes(path.extname(f).toLowerCase()));

  console.log(`Found ${files.length} audio files.`);

  // Prepare existing check
  const checkStmt = db.prepare('SELECT id, metadata_json FROM media_items WHERE file_path = ?');
  const insertStmt = db.prepare(`
    INSERT INTO media_items (
      file_path, file_type, title, description, 
      metadata_json, verification_status, red_flag_rating, is_sensitive
    ) VALUES (
      ?, ?, ?, ?, 
      ?, ?, ?, ?
    )
  `);

  const updateStmt = db.prepare('UPDATE media_items SET metadata_json = ? WHERE id = ?');

  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (const file of files) {
    const fullPath = path.join(AUDIO_ROOT, file);
    const dbPath = '/' + path.join(AUDIO_ROOT, file);

    const existing = checkStmt.get(dbPath) as any;

    // Logic: If new, insert. If existing but (empty transcript AND hasWhisper), transcribe and update.

    let shouldTranscribe = hasWhisper;
    const isNew = !existing;

    if (!isNew) {
      // Check if existing has transcript
      try {
        const meta = JSON.parse(existing.metadata_json || '{}');
        if (meta.transcript && meta.transcript.length > 0) {
          shouldTranscribe = false; // Already has transcript
        }
      } catch (e) {}
    }

    if (!isNew && !shouldTranscribe) {
      skipped++;
      // console.log(`Skipping ${path.basename(file)} (already ingested/transcribed)`);
      continue;
    }

    const filename = path.basename(file);
    const ext = path.extname(file).toLowerCase().slice(1);
    const title = path.basename(file, '.' + ext);

    // Determine mime type
    let mime = 'audio/mpeg';
    if (ext === 'm4a') mime = 'audio/mp4';
    if (ext === 'wav') mime = 'audio/wav';
    if (ext === 'ogg') mime = 'audio/ogg';

    let metadata: any = {
      format: ext,
      duration: 0,
      transcript: [],
      chapters: [],
    };

    // Preserve existing metadata if updating
    if (!isNew) {
      try {
        metadata = { ...metadata, ...JSON.parse(existing.metadata_json || '{}') };
      } catch (e) {}
    }

    if (shouldTranscribe) {
      const result = await transcribeAudio(fullPath);
      if (result.transcript.length > 0) {
        metadata.transcript = result.transcript;
        metadata.duration = result.duration; // Update duration from whisper
        console.log(
          `✅ Transcription complete for ${filename} (${result.transcript.length} segments)`,
        );
      }
    }

    if (isNew) {
      try {
        insertStmt.run(
          dbPath,
          mime,
          title,
          `Imported audio file: ${filename}`,
          JSON.stringify(metadata),
          'unverified',
          1,
          0,
        );
        console.log(`✅ Added: ${filename}`);
        added++;
      } catch (err) {
        console.error(`❌ Failed to add ${filename}:`, err);
      }
    } else {
      // Update
      try {
        updateStmt.run(JSON.stringify(metadata), existing.id);
        console.log(`🔄 Updated: ${filename} with new metadata`);
        updated++;
      } catch (err) {
        console.error(`❌ Failed to update ${filename}:`, err);
      }
    }
  }

  console.log(`\nIngestion Complete.`);
  console.log(`Added: ${added}`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
}

ingestAudio();
