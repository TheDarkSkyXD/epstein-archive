import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { glob } from 'glob';
import util from 'util';
import { exec } from 'child_process';
import os from 'os';

const execAsync = util.promisify(exec);

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'epstein-archive.db');
const VIDEO_ROOT =
  process.env.KJ_VIDEO_ROOT || path.join('data', 'media', 'videos', 'KatieJohnson');
const ALBUM_NAME = 'Katie Johnson Complaint';
const ALBUM_DESC = 'Video evidence and related materials for the 2016 Katie Johnson complaint.';

const db = new Database(DB_PATH);

function ensureAlbum(name: string, description?: string): number {
  const existing = db.prepare('SELECT id FROM media_albums WHERE name = ?').get(name) as any;
  if (existing?.id) return existing.id;
  const res = db
    .prepare(
      "INSERT INTO media_albums (name, description, created_at, date_modified) VALUES (?, ?, datetime('now'), datetime('now'))",
    )
    .run(name, description || null);
  return Number(res.lastInsertRowid);
}

async function extractAudio(inputVideo: string, outDir: string): Promise<string | null> {
  try {
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, path.basename(inputVideo) + '.m4a');
    await execAsync(`ffmpeg -y -i "${inputVideo}" -vn -acodec aac "${outPath}"`);
    return outPath;
  } catch {
    return null;
  }
}

async function runWhisper(audioPath: string): Promise<{ transcript: any[]; duration: number }> {
  try {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'whisper-kj-'));
    await execAsync(
      `whisper "${audioPath}" --model base --output_format json --output_dir "${tempDir}"`,
    );
    const baseName = path.basename(audioPath, path.extname(audioPath));
    const jsonPath = path.join(tempDir, `${baseName}.json`);
    if (fs.existsSync(jsonPath)) {
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      fs.rmSync(tempDir, { recursive: true, force: true });
      const segments = (data.segments || []).map((s: any) => ({
        start: s.start,
        end: s.end,
        text: String(s.text || '').trim(),
      }));
      return { transcript: segments, duration: data.duration || 0 };
    }
  } catch {
    /* no-op */
  }
  return { transcript: [], duration: 0 };
}

function detectMimeFromExt(ext: string): string {
  const e = ext.toLowerCase();
  if (e === '.mp4') return 'video/mp4';
  if (e === '.mov') return 'video/quicktime';
  if (e === '.mkv') return 'video/x-matroska';
  return `video/${e.replace('.', '')}`;
}

async function ingest() {
  const albumId = ensureAlbum(ALBUM_NAME, ALBUM_DESC);

  const pattern = `${VIDEO_ROOT}/**/*.{mp4,mov,mkv}`;
  const files = glob.sync(pattern, { nodir: true });

  const insertStmt = db.prepare(`
    INSERT INTO media_items (
      entity_id, document_id, file_path, file_type, title, description,
      album_id, is_sensitive, verification_status, red_flag_rating, metadata_json, created_at
    ) VALUES (NULL, NULL, ?, ?, ?, ?, ?, 1, 'verified', 5, ?, datetime('now'))
  `);
  const updateStmt = db.prepare(
    `UPDATE media_items SET metadata_json = ?, album_id = ? WHERE id = ?`,
  );
  const existingStmt = db.prepare(`SELECT id, metadata_json FROM media_items WHERE file_path = ?`);

  let added = 0;
  let updated = 0;
  for (const f of files) {
    const existing = existingStmt.get(f) as any;
    const title = path.basename(f);
    const fileType = detectMimeFromExt(path.extname(f));

    let meta: any = {};
    if (existing?.metadata_json) {
      try {
        meta = JSON.parse(existing.metadata_json);
      } catch {
        meta = {};
      }
    }

    if (!meta.transcript || !Array.isArray(meta.transcript) || meta.transcript.length === 0) {
      const audioPath = await extractAudio(f, path.join(process.cwd(), 'tmp', 'kj_audio'));
      if (audioPath) {
        const w = await runWhisper(audioPath);
        if (w.transcript.length > 0) {
          meta.transcript = w.transcript;
          meta.duration = w.duration;
          meta.external_transcript_text = w.transcript.map((s: any) => s.text).join('\n');
        }
      }
    }

    const metadataJson = JSON.stringify(meta);

    if (existing?.id) {
      updateStmt.run(metadataJson, albumId, existing.id);
      updated++;
    } else {
      insertStmt.run(f, fileType, title, 'Ingested Katie Johnson video', albumId, metadataJson);
      added++;
    }
  }

  console.log(`Katie Johnson video ingestion complete. Added: ${added}, Updated: ${updated}`);
}

ingest();
