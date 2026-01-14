import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { glob } from 'glob';
import { exec } from 'child_process';
import util from 'util';
import os from 'os';

const execAsync = util.promisify(exec);

// Configuration
const DB_PATH = process.env.DB_PATH || 'epstein-archive.db';
const AUDIO_ROOT = 'data/media/audio';
const TEXT_ROOT = 'data/text'; // Root for finding text transcripts
const WHISPER_MODEL = 'base'; // Switched to base as per plan

// Extensions to ingest
const AUDIO_EXTS = ['.mp3', '.m4a', '.wav', '.ogg'];

const db = new Database(DB_PATH);

// Helper to run Whisper
async function transcribeAudio(filePath: string): Promise<{ transcript: any[]; duration: number }> {
  try {
    console.log(`🎙️ Transcribing ${path.basename(filePath)} with Whisper (${WHISPER_MODEL})...`);

    // Create unique temp dir
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

// Helper to find external text transcript
function findExternalTranscript(filenameWithoutExt: string): string | null {
  // 1. Specific Logic for SRTestimony -> Lvoocaudiop1 PDF Transcripts
  // Filenames like: SRTestimonyBof6_PublicCopy_LNV_July242025E
  if (filenameWithoutExt.includes('SRTestimony')) {
    const charMatch = filenameWithoutExt.match(/SRTestimony([A-F])of6/);
    if (charMatch) {
      const char = charMatch[1]; // A, B, C...
      const index = char.charCodeAt(0) - 'A'.charCodeAt(0) + 1; // 1, 2, 3...
      const pdfTranscriptPath = path.join(TEXT_ROOT, 'lvoocaudiop1', `${index}_eng.txt`);

      if (fs.existsSync(pdfTranscriptPath)) {
        console.log(
          `📄 Mapped SRTestimony${char} to converted PDF transcript: ${path.basename(pdfTranscriptPath)}`,
        );
        return fs.readFileSync(pdfTranscriptPath, 'utf-8');
      }
    }

    // 2. Logic for SRTestimony -> Maxwell (Fallback)
    let dateMatch: string | null = null;
    if (filenameWithoutExt.includes('July24')) dateMatch = '2025.07.24';
    if (filenameWithoutExt.includes('July25') || filenameWithoutExt.includes('July26'))
      dateMatch = '2025.07.25';

    if (dateMatch) {
      // Look for Maxwell...dateMatch..._cft.txt (prioritize) or just .txt
      const pattern = `**/*Maxwell*${dateMatch}*cft*.txt`;
      const matches = glob.sync(pattern, { cwd: TEXT_ROOT, nodir: true });
      if (matches.length > 0) {
        const fullPath = path.join(TEXT_ROOT, matches[0]);
        console.log(`📄 Mapped SRTestimony to Maxwell transcript: ${matches[0]}`);
        return fs.readFileSync(fullPath, 'utf-8');
      }
      // Fallback to non-cft
      const pattern2 = `**/*Maxwell*${dateMatch}*.txt`;
      const matches2 = glob.sync(pattern2, { cwd: TEXT_ROOT, nodir: true });
      if (matches2.length > 0) {
        const fullPath = path.join(TEXT_ROOT, matches2[0]);
        console.log(`📄 Mapped SRTestimony to Maxwell transcript: ${matches2[0]}`);
        return fs.readFileSync(fullPath, 'utf-8');
      }
    }
  }

  // 3. Default Logic: Exact name match
  const matches = glob.sync(`**/${filenameWithoutExt}*.txt`, { cwd: TEXT_ROOT, nodir: true });

  if (matches.length > 0) {
    const exact = matches.find((m) => path.basename(m, '.txt') === filenameWithoutExt);
    const target = exact || matches[0];

    try {
      const fullPath = path.join(TEXT_ROOT, target);
      console.log(`📄 Found external transcript: ${target}`);
      return fs.readFileSync(fullPath, 'utf-8');
    } catch (err) {
      console.error(`Failed to read transcript ${target}`, err);
    }
  }
  return null;
}

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
  const skipped = 0;

  for (const file of files) {
    const fullPath = path.join(AUDIO_ROOT, file);
    const dbPath = '/' + path.join(AUDIO_ROOT, file);

    const existing = checkStmt.get(dbPath) as any;
    let existingMeta: any = {};
    if (existing) {
      try {
        existingMeta = JSON.parse(existing.metadata_json || '{}');
      } catch {
        // JSON parse failed, use empty object
      }
    }

    const filename = path.basename(file);
    const filenameWithoutExt = path.basename(file, path.extname(file));
    const ext = path.extname(file).toLowerCase().slice(1);
    const title = path.basename(file, '.' + ext);

    // Initial metadata structure
    const metadata: any = {
      format: ext,
      duration: existingMeta.duration || 0,
      transcript: existingMeta.transcript || [],
      chapters: existingMeta.chapters || [],
      external_transcript_text: existingMeta.external_transcript_text || null,
    };

    // Try to find external transcript text if missing, or update it
    const externalText = findExternalTranscript(filenameWithoutExt);
    if (externalText && !metadata.external_transcript_text) {
      metadata.external_transcript_text = externalText;
      console.log(`Updated external transcript for ${filename}`);
    } else if (externalText) {
      // Already have it, but maybe update logic if we want to ensure it matches
    }

    // Attempt fuzzy thumbnail mapping from images if missing
    if (!existingMeta.thumbnailPath) {
      try {
        const base = filenameWithoutExt.toLowerCase();
        const like = `%${base}%`;
        const thumbRow = db
          .prepare(
            `SELECT path, file_size FROM media_images 
             WHERE LOWER(original_filename) LIKE ? OR LOWER(path) LIKE ?
             ORDER BY file_size DESC LIMIT 1`,
          )
          .get(like, like) as { path: string; file_size: number } | undefined;
        if (thumbRow?.path) {
          metadata.thumbnailPath = thumbRow.path;
          console.log(`🖼️ Mapped thumbnail for ${filename} -> ${thumbRow.path}`);
        }
      } catch (e) {
        console.warn('Thumbnail fuzzy search failed:', e);
      }
      // Secondary pass: use folder segment or album name to find a related image
      if (!metadata.thumbnailPath) {
        try {
          const relParts = file.split(path.sep);
          const segment = (relParts[0] || '').toLowerCase();
          if (segment) {
            const albumRow = db
              .prepare(
                `SELECT id FROM media_albums 
                 WHERE LOWER(name) LIKE ? 
                 ORDER BY date_modified DESC LIMIT 1`,
              )
              .get(`%${segment}%`) as { id: number } | undefined;
            if (albumRow?.id) {
              const imgRow = db
                .prepare(
                  `SELECT path, file_size FROM media_images 
                   WHERE album_id = ? 
                   ORDER BY file_size DESC LIMIT 1`,
                )
                .get(albumRow.id) as { path: string; file_size: number } | undefined;
              if (imgRow?.path) {
                metadata.thumbnailPath = imgRow.path;
                console.log(`🖼️ Mapped by album "${segment}" for ${filename} -> ${imgRow.path}`);
              }
            } else {
              // Fallback: search images by segment in path
              const segRow = db
                .prepare(
                  `SELECT path, file_size FROM media_images 
                   WHERE LOWER(path) LIKE ? 
                   ORDER BY file_size DESC LIMIT 1`,
                )
                .get(`%${segment}%`) as { path: string; file_size: number } | undefined;
              if (segRow?.path) {
                metadata.thumbnailPath = segRow.path;
                console.log(`🖼️ Mapped by folder segment "${segment}" -> ${segRow.path}`);
              }
            }
          }
        } catch (e) {
          console.warn('Secondary thumbnail mapping failed:', e);
        }
      }
    }

    // Determine if we need to transcribe (Whisper)
    // Skip if we already have transcript segments OR if we have external text (we will fake segments)
    let shouldTranscribe = hasWhisper;

    // IF we have external text, we prioritize it and do NOT run Whisper,
    // BUT we must ensure 'transcript' is populated.
    if (metadata.external_transcript_text) {
      shouldTranscribe = false;

      if (!metadata.transcript || metadata.transcript.length === 0) {
        console.log(
          `ℹ️ Generating paragraph-based transcript segments from external text for ${filename}...`,
        );

        // Simple splitting by double newline to get paragraphs
        const paragraphs = metadata.external_transcript_text.split(/\n\s*\n/);
        const segmentCount = paragraphs.length;
        const estimatedDuration = metadata.duration || 3600;
        const durationPerSeg = estimatedDuration / (segmentCount || 1);

        metadata.transcript = paragraphs
          .map((p: string, i: number) => ({
            start: i * durationPerSeg,
            end: (i + 1) * durationPerSeg,
            text: p.trim(),
          }))
          .filter((s: any) => s.text.length > 0);

        console.log(`✅ Created ${metadata.transcript.length} transcript segments from text.`);
      } else {
        console.log(
          `⏭️ Skipping Whisper for ${filename} (Already has transcript segments and external text)`,
        );
      }
    } else if (metadata.transcript.length > 0) {
      shouldTranscribe = false;
      console.log(`⏭️ Skipping Whisper for ${filename} (Already has transcript segments)`);
    }

    // Now, run Whisper if still needed
    if (shouldTranscribe) {
      console.log(`🎙️ Need transcription for ${filename}`);
      const result = await transcribeAudio(fullPath);
      if (result.transcript.length > 0) {
        metadata.transcript = result.transcript;
        metadata.duration = result.duration; // Update duration from actual audio analysis
        // Also populate external text field for consistency?
        metadata.external_transcript_text = result.transcript.map((s: any) => s.text).join('\n');
        console.log(
          `✅ Transcription complete for ${filename} (${result.transcript.length} segments)`,
        );
      }
    }

    const metadataJson = JSON.stringify(metadata);

    if (existing) {
      updateStmt.run(metadataJson, existing.id);
      updated++;
    } else {
      insertStmt.run(
        dbPath,
        'audio',
        title,
        'Ingested audio file',
        metadataJson,
        'unverified',
        0,
        0,
      );
      added++;
    }
  }

  console.log(`\n🎉 Ingestion Complete:`);
  console.log(`   Added: ${added}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped: ${skipped}`);
}

ingestAudio();
