#!/usr/bin/env tsx
/**
 * Add album cover images for Sascha Barros Testimony
 */

import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, statSync } from 'fs';

const dbPath = process.env.DB_PATH || './epstein-archive.db';
const db = new Database(dbPath);

console.log('[INFO] Adding Sascha Barros album covers...');

// Check if cover images exist
const coverImagePathJpg = 'data/media/audio/lvoocaudiop1/lvoocaudiop1.jpg';
const coverImagePathWebp = 'data/media/audio/lvoocaudiop1/lvoocaudiop1.webp';
if (!existsSync(coverImagePathJpg)) {
  console.error('[ERROR] JPG cover image not found:', coverImagePathJpg);
  process.exit(1);
}
if (!existsSync(coverImagePathWebp)) {
  console.error('[ERROR] WEBP cover image not found:', coverImagePathWebp);
  process.exit(1);
}

const statsJpg = statSync(coverImagePathJpg);
const statsWebp = statSync(coverImagePathWebp);

try {
  // Ensure JPG exists in DB
  const existingJpg = db
    .prepare('SELECT id FROM media_images WHERE path = ?')
    .get(coverImagePathJpg);
  let coverImageId: number;
  if (existingJpg) {
    coverImageId = (existingJpg as { id: number }).id;
    console.log(`[INFO] JPG cover already exists with ID: ${coverImageId}`);
  } else {
    const insertJpg = db
      .prepare(
        `INSERT INTO media_images (
          filename, original_filename, path, thumbnail_path,
          title, description, album_id, file_size, format, date_added
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      )
      .run(
        'lvoocaudiop1.jpg',
        'lvoocaudiop1.jpg',
        coverImagePathJpg,
        null,
        'Sascha Barros Testimony Album Cover (JPG)',
        'Album cover (JPEG) for The Sascha Barros Testimony interview series',
        25,
        statsJpg.size,
        'jpeg',
      );
    coverImageId = Number(insertJpg.lastInsertRowid);
    console.log(`[INFO] Inserted JPG cover image with ID: ${coverImageId}`);
  }

  // Ensure WEBP exists in DB as a separate image
  const existingWebp = db
    .prepare('SELECT id FROM media_images WHERE path = ?')
    .get(coverImagePathWebp);
  if (existingWebp) {
    console.log(`[INFO] WEBP cover already exists with ID: ${(existingWebp as { id: number }).id}`);
  } else {
    const insertWebp = db
      .prepare(
        `INSERT INTO media_images (
          filename, original_filename, path, thumbnail_path,
          title, description, album_id, file_size, format, date_added
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      )
      .run(
        'lvoocaudiop1.webp',
        'lvoocaudiop1.webp',
        coverImagePathWebp,
        null,
        'Sascha Barros Testimony Album Cover (WEBP)',
        'Album cover (WEBP) for The Sascha Barros Testimony interview series',
        25,
        statsWebp.size,
        'webp',
      );
    const webpId = Number(insertWebp.lastInsertRowid);
    console.log(`[INFO] Inserted WEBP cover image with ID: ${webpId}`);
  }

  // Set album cover to the JPG by default (can be changed later)
  db.prepare('UPDATE media_albums SET cover_image_id = ? WHERE id = 25').run(coverImageId);

  console.log('[INFO] ✅ Successfully set album cover for Sascha Barros Testimony');
} catch (error) {
  console.error('[ERROR] Failed to add album covers:', error);
  process.exit(1);
} finally {
  db.close();
}
