import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import exifParser from 'exif-parser';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'epstein-archive.db');
const db = new Database(DB_PATH);

async function run() {
  const imagesDir = 'data/media/images/DOJ VOL000001';
  const albumName = 'DOJ VOL000001';

  console.log(`Ingesting images from ${imagesDir}...`);

  if (!fs.existsSync(imagesDir)) {
    console.error(`Directory not found: ${imagesDir}`);
    return;
  }

  // 1. Ensure album exists
  let album = db.prepare('SELECT id FROM media_albums WHERE name = ?').get(albumName) as
    | { id: number }
    | undefined;
  if (!album) {
    console.log(`Creating album: ${albumName}`);
    const result = db
      .prepare('INSERT INTO media_albums (name, description) VALUES (?, ?)')
      .run(albumName, 'Images released on 12.18.25');
    album = { id: result.lastInsertRowid as number };
  }
  const albumId = album.id;

  const files = fs
    .readdirSync(imagesDir)
    .filter((f) => ['.jpg', '.jpeg', '.png', '.webp'].includes(path.extname(f).toLowerCase()));

  console.log(`Found ${files.length} images.`);

  for (const filename of files) {
    const filePath = path.join(imagesDir, filename);
    await processImage(filePath, albumId);
  }

  console.log('Optimizing database...');
  db.exec('VACUUM;');
  console.log('Done.');
}

async function processImage(filePath: string, albumId: number) {
  const filename = path.basename(filePath);
  console.log(`Processing ${filename}...`);

  const buffer = fs.readFileSync(filePath);
  let width = 0;
  let height = 0;
  let dateTaken: string | null = null;
  let cameraMake: string | null = null;
  let cameraModel: string | null = null;
  let orientation = 1;

  try {
    const parser = exifParser.create(buffer);
    const result = parser.parse();
    const tags = result.tags || {};
    width = result.imageSize?.width || 0;
    height = result.imageSize?.height || 0;
    orientation = tags.Orientation || 1;
    dateTaken = tags.DateTimeOriginal ? new Date(tags.DateTimeOriginal * 1000).toISOString() : null;
    cameraMake = tags.Make || null;
    cameraModel = tags.Model || null;

    if (!width || !height) {
      const meta = await sharp(buffer).metadata();
      width = meta.width || 0;
      height = meta.height || 0;
      orientation = meta.orientation || orientation;
    }
  } catch (e) {
    try {
      const meta = await sharp(buffer).metadata();
      width = meta.width || 0;
      height = meta.height || 0;
      orientation = meta.orientation || 1;
    } catch (e2) {}
  }

  const stat = fs.statSync(filePath);

  // Use relative path for production compatibility
  const prodPath = filePath.replace(/\\/g, '/');
  const thumbDir = path.join(path.dirname(filePath), 'thumbnails');
  if (!fs.existsSync(thumbDir)) fs.mkdirSync(thumbDir, { recursive: true });

  const thumbFilename = `thumb_${filename}`;
  const thumbPath = path.join(thumbDir, thumbFilename).replace(/\\/g, '/');

  if (!fs.existsSync(thumbPath)) {
    try {
      await sharp(filePath).resize(400, 400, { fit: 'cover' }).rotate().toFile(thumbPath);
    } catch (e) {
      console.error(`Failed to generate thumbnail for ${filename}:`, e);
    }
  }

  const existing = db
    .prepare('SELECT id FROM media_images WHERE filename = ? AND album_id = ?')
    .get(filename, albumId) as { id: number } | undefined;

  if (existing) {
    db.prepare(
      `
            UPDATE media_images SET 
                path = ?, thumbnail_path = ?, width = ?, height = ?, file_size = ?, 
                date_taken = ?, camera_make = ?, camera_model = ?, orientation = ?
            WHERE id = ?
        `,
    ).run(
      prodPath,
      thumbPath,
      width,
      height,
      stat.size,
      dateTaken,
      cameraMake,
      cameraModel,
      orientation,
      existing.id,
    );
  } else {
    db.prepare(
      `
            INSERT INTO media_images (
                filename, original_filename, path, thumbnail_path, album_id,
                width, height, file_size, format, date_taken,
                camera_make, camera_model, orientation
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
    ).run(
      filename,
      filename,
      prodPath,
      thumbPath,
      albumId,
      width,
      height,
      stat.size,
      path.extname(filename).slice(1).toLowerCase(),
      dateTaken,
      cameraMake,
      cameraModel,
      orientation,
    );
  }
}

run().catch(console.error);
