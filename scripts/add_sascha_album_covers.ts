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
const coverImagePath = 'data/media/audio/lvoocaudiop1/lvoocaudiop1.jpg';
if (!existsSync(coverImagePath)) {
  console.error('[ERROR] Cover image not found:', coverImagePath);
  process.exit(1);
}

const stats = statSync(coverImagePath);

try {
  // Check if image already exists
  const existing = db
    .prepare('SELECT id FROM media_images WHERE path = ?')
    .get(coverImagePath);

  let coverImageId: number;

  if (existing) {
    coverImageId = (existing as { id: number }).id;
    console.log(`[INFO] Cover image already exists with ID: ${coverImageId}`);
  } else {
    // Insert the cover image
    const insertResult = db
      .prepare(
        `INSERT INTO media_images (
        filename, original_filename, path, thumbnail_path,
        title, description, album_id, file_size, format, date_added
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      )
      .run(
        'lvoocaudiop1.jpg',
        'lvoocaudiop1.jpg',
        coverImagePath,
        'data/media/audio/lvoocaudiop1/lvoocaudiop1.webp',
        'Sascha Barros Testimony Album Cover',
        'Album cover for The Sascha Barros Testimony interview series',
        25, // Album ID for Sascha
        stats.size,
        'jpeg',
      );

    coverImageId = Number(insertResult.lastInsertRowid);
    console.log(`[INFO] Inserted cover image with ID: ${coverImageId}`);
  }

  // Update the album to use this cover image
  db.prepare('UPDATE media_albums SET cover_image_id = ? WHERE id = 25').run(coverImageId);

  console.log('[INFO] ✅ Successfully set album cover for Sascha Barros Testimony');
} catch (error) {
  console.error('[ERROR] Failed to add album covers:', error);
  process.exit(1);
} finally {
  db.close();
}
