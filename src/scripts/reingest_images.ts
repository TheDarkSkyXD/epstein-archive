import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import exifParser from 'exif-parser';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'epstein-archive.db');
const db = new Database(DB_PATH);

const FILES_TO_UPDATE = ['HOUSE_OVERSIGHT_083618 - Copy.JPG', 'HOUSE_OVERSIGHT_083621 - Copy.JPG'];

async function run() {
  console.log('Starting re-ingestion of specific images...');

  const possibleRoots = [
    '/Users/veland/Downloads/Epstein Files',
    path.join(process.cwd(), 'data'),
    './data',
  ];

  const foundFiles: string[] = [];

  function findFile(dir: string, filename: string) {
    if (!fs.existsSync(dir)) return;
    try {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        // Skip hidden files and node_modules
        if (item.startsWith('.') || item === 'node_modules') continue;

        const fullPath = path.join(dir, item);
        try {
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            findFile(fullPath, filename);
          } else if (item === filename) {
            foundFiles.push(fullPath);
          }
        } catch (e) {
          // Ignore access errors
        }
      }
    } catch (e) {
      // Ignore readdir errors
    }
  }

  // Find all instances
  for (const root of possibleRoots) {
    if (fs.existsSync(root)) {
      for (const filename of FILES_TO_UPDATE) {
        findFile(root, filename);
      }
    }
  }

  // Dedup
  const uniqueFiles = [...new Set(foundFiles)];

  console.log(`Found ${uniqueFiles.length} files to process:`);
  uniqueFiles.forEach((f) => console.log(`- ${f}`));

  for (const filePath of uniqueFiles) {
    await processFile(filePath);
  }

  console.log('Done.');
}

async function processFile(filePath: string) {
  const filename = path.basename(filePath);
  console.log(`Processing ${filename}...`);

  // 1. Parse EXIF and Metadata
  const buffer = fs.readFileSync(filePath);
  let tags: any = {};
  let width = 0;
  let height = 0;
  let orientation = 1;

  try {
    const parser = exifParser.create(buffer);
    const result = parser.parse();
    tags = result.tags || {};
    width = result.imageSize?.width || 0;
    height = result.imageSize?.height || 0;
    orientation = tags.Orientation || 1;

    // If EXIF size missing, try sharp
    if (!width || !height) {
      const meta = await sharp(buffer).metadata();
      width = meta.width || 0;
      height = meta.height || 0;
      orientation = meta.orientation || orientation;
    }
  } catch (e) {
    console.warn('Metadata parse failed:', e);
    try {
      const meta = await sharp(buffer).metadata();
      width = meta.width || 0;
      height = meta.height || 0;
    } catch (e2) {}
  }

  const stat = fs.statSync(filePath);

  // 2. Check if exists in DB
  const existing = db
    .prepare('SELECT id, path FROM media_images WHERE filename = ?')
    .get(filename) as any;

  if (existing) {
    console.log(`Updating existing record ID ${existing.id}...`);
    // Update
    db.prepare(
      `
            UPDATE media_images SET 
                file_size = ?,
                width = ?,
                height = ?,
                orientation = ?,
                date_taken = ?
            WHERE id = ?
        `,
    ).run(
      stat.size,
      width,
      height,
      orientation,
      tags.DateTimeOriginal ? new Date(tags.DateTimeOriginal * 1000).toISOString() : null,
      existing.id,
    );

    // Regenerate thumbnail
    await generateThumbnail(existing.id, filePath);
  } else {
    console.log(`Inserting new record...`);
    // Insert
    // Need to figure out album_id? Default to null.
    const info = db
      .prepare(
        `
           INSERT INTO media_images (
            filename, original_filename, path, file_size, format,
            width, height, date_taken, album_id, date_added,
            orientation
           ) VALUES (
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, datetime('now'),
            ?
           )
        `,
      )
      .run(
        filename,
        filename,
        filePath, // Note: might want relative path if strict about it, but absolute is safer for now if local
        stat.size,
        path.extname(filename).slice(1).toLowerCase(),
        width,
        height,
        tags.DateTimeOriginal ? new Date(tags.DateTimeOriginal * 1000).toISOString() : null,
        null,
        orientation,
      );

    await generateThumbnail(info.lastInsertRowid as number, filePath);
  }
}

async function generateThumbnail(id: number, filePath: string) {
  const thumbDir = path.join(path.dirname(filePath), 'thumbnails');
  if (!fs.existsSync(thumbDir)) {
    fs.mkdirSync(thumbDir, { recursive: true });
  }

  const thumbPath = path.join(thumbDir, `thumb_${path.basename(filePath)}`);

  try {
    await sharp(filePath)
      .resize(300, 300, { fit: 'cover' })
      .rotate() // Auto-rotate based on EXIF
      .toFile(thumbPath);

    // Update DB with thumb path
    db.prepare('UPDATE media_images SET thumbnail_path = ? WHERE id = ?').run(thumbPath, id);
    console.log('Thumbnail generated.');
  } catch (e) {
    console.error('Thumbnail generation failed:', e);
  }
}

run().catch(console.error);
