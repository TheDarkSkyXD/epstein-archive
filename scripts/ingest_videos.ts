import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..');
const DB_PATH = process.env.DB_PATH || path.join(PROJECT_ROOT, 'epstein-archive.db');
const MEDIA_ROOT = path.join(PROJECT_ROOT, 'data/media');
const VIDEOS_ROOT = path.join(MEDIA_ROOT, 'videos');
const THUMBNAILS_ROOT = path.join(MEDIA_ROOT, 'thumbnails', 'videos');

console.log(`Using database: ${DB_PATH}`);
const db = new Database(DB_PATH);

// Ensure thumbnails directory exists
if (!fs.existsSync(THUMBNAILS_ROOT)) {
  fs.mkdirSync(THUMBNAILS_ROOT, { recursive: true });
}

function getDuration(filePath: string): number {
  try {
    const cmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`;
    const duration = execSync(cmd).toString().trim();
    return parseFloat(duration);
  } catch (error) {
    console.error(`Error getting duration for ${filePath}:`, error);
    return 0;
  }
}

function generateThumbnail(filePath: string, filename: string): string | null {
  try {
    const thumbnailName = `${path.basename(filename, path.extname(filename))}.jpg`;
    const thumbnailPath = path.join(THUMBNAILS_ROOT, thumbnailName);
    const dbPath = `/data/media/thumbnails/videos/${thumbnailName}`;

    // Take a frame at 10% of the video or 5 seconds, whichever is smaller/safer?
    // Let's just do 00:00:05.
    const cmd = `ffmpeg -y -i "${filePath}" -ss 00:00:05 -vframes 1 "${thumbnailPath}"`;
    execSync(cmd, { stdio: 'ignore' }); // Suppress output

    if (fs.existsSync(thumbnailPath)) {
      return dbPath;
    }
    return null;
  } catch (error) {
    console.error(`Error generating thumbnail for ${filePath}:`, error);
    return null;
  }
}

// Helper to recursively find files
function findVideoFiles(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);

  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat && stat.isDirectory()) {
      results = results.concat(findVideoFiles(filePath));
    } else {
      if (
        file.toLowerCase().endsWith('.mp4') ||
        file.toLowerCase().endsWith('.mov') ||
        file.toLowerCase().endsWith('.mkv') ||
        file.toLowerCase().endsWith('.webm')
      ) {
        results.push(filePath);
      }
    }
  }
  return results;
}

function ingestVideos() {
  if (!fs.existsSync(VIDEOS_ROOT)) {
    console.log(`Videos directory not found: ${VIDEOS_ROOT}`);
    return;
  }

  const files = findVideoFiles(VIDEOS_ROOT);

  console.log(`Found ${files.length} video files.`);

  // Fixed schema: removed 'source' and 'date_added' (uses created_at default)
  const insertStmt = db.prepare(`
    INSERT INTO media_items (title, description, file_path, file_type, entity_id, is_sensitive, metadata_json)
    VALUES (@title, @description, @file_path, @file_type, NULL, 0, @metadata_json)
  `);

  const checkStmt = db.prepare('SELECT id FROM media_items WHERE file_path = ?');

  let added = 0;
  let skipped = 0;

  for (const fullPath of files) {
    const relativePath = path.relative(MEDIA_ROOT, fullPath);
    const dbFilePath = `/data/media/${relativePath}`; // Standardize on forward slashes if needed, primarily for DB

    // Ensure posix path for DB
    const normalizedDbPath = dbFilePath.split(path.sep).join('/');

    const filename = path.basename(fullPath);

    const existing = checkStmt.get(normalizedDbPath);
    if (existing) {
      console.log(`Skipping existing: ${filename}`);
      skipped++;
      continue;
    }

    console.log(`Processing: ${filename}`);
    const duration = getDuration(fullPath);
    const thumbnailPath = generateThumbnail(fullPath, filename);

    const metadata = {
      duration,
      thumbnailPath,
      transcript: null,
      chapters: [],
    };

    try {
      insertStmt.run({
        title: path.basename(filename, path.extname(filename)).replace(/[_-]/g, ' '),
        description: 'Video file',
        file_path: normalizedDbPath,
        file_type: 'video/mp4',
        metadata_json: JSON.stringify(metadata),
      });
      console.log(`Added: ${filename}`);
      added++;
    } catch (err) {
      console.error(`Failed to insert ${filename}:`, err);
    }
  }

  console.log(`\nIngestion complete.`);
  console.log(`Added: ${added}`);
  console.log(`Skipped: ${skipped}`);
}

ingestVideos();
