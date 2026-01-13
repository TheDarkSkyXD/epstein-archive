#!/usr/bin/env node
/**
 * Thumbnail Generation Script
 * Generates optimized thumbnails for all media images
 */

import sharp from 'sharp';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const THUMBNAIL_WIDTH = 400;
const THUMBNAIL_QUALITY = 80;
const THUMBNAILS_DIR = 'data/media/thumbnails';
const DB_PATH = process.env.DB_PATH || './epstein-archive.db';

interface MediaImage {
  id: number;
  filename: string;
  path: string;
  thumbnail_path: string | null;
}

async function generateThumbnails() {
  console.log('🖼️  Starting thumbnail generation...\n');

  // Open database
  const db = new Database(DB_PATH);

  // Create thumbnails directory if it doesn't exist
  const thumbnailsPath = path.resolve(process.cwd(), THUMBNAILS_DIR);
  if (!fs.existsSync(thumbnailsPath)) {
    fs.mkdirSync(thumbnailsPath, { recursive: true });
    console.log(`📁 Created thumbnails directory: ${thumbnailsPath}`);
  }

  // Get all images that need thumbnails
  const images = db
    .prepare(
      `
    SELECT id, filename, path, thumbnail_path 
    FROM media_images 
    ORDER BY id
  `,
    )
    .all() as MediaImage[];

  console.log(`Found ${images.length} images to process\n`);

  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (const image of images) {
    try {
      // Construct source path
      let sourcePath = image.path;
      if (sourcePath.startsWith('/data/')) {
        sourcePath = path.resolve(process.cwd(), sourcePath.substring(1));
      } else if (sourcePath.startsWith('data/')) {
        sourcePath = path.resolve(process.cwd(), sourcePath);
      } else {
        sourcePath = path.resolve(process.cwd(), 'data', sourcePath);
      }

      // Check if source exists
      if (!fs.existsSync(sourcePath)) {
        console.log(`⚠️  Source not found: ${sourcePath}`);
        errors++;
        continue;
      }

      // Generate thumbnail filename
      const ext = path.extname(image.filename).toLowerCase();
      const baseName = path.basename(image.filename, ext);
      const thumbnailFilename = `${baseName}_thumb${ext}`;
      const thumbnailPath = path.join(thumbnailsPath, thumbnailFilename);
      const dbThumbnailPath = `/${THUMBNAILS_DIR}/${thumbnailFilename}`;

      // Check if thumbnail already exists and is valid
      if (fs.existsSync(thumbnailPath)) {
        const thumbStats = fs.statSync(thumbnailPath);
        if (thumbStats.size > 0) {
          // Update database if needed
          if (image.thumbnail_path !== dbThumbnailPath) {
            db.prepare('UPDATE media_images SET thumbnail_path = ? WHERE id = ?').run(
              dbThumbnailPath,
              image.id,
            );
          }
          skipped++;
          continue;
        }
      }

      // Generate thumbnail
      await sharp(sourcePath)
        .resize(THUMBNAIL_WIDTH, null, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: THUMBNAIL_QUALITY })
        .toFile(thumbnailPath);

      // Update database
      db.prepare('UPDATE media_images SET thumbnail_path = ? WHERE id = ?').run(
        dbThumbnailPath,
        image.id,
      );

      processed++;
      if (processed % 10 === 0) {
        console.log(`✅ Processed ${processed}/${images.length} images...`);
      }
    } catch (error) {
      console.error(`❌ Error processing ${image.filename}:`, error);
      errors++;
    }
  }

  db.close();

  console.log('\n📊 Thumbnail Generation Complete!');
  console.log(`   ✅ Generated: ${processed}`);
  console.log(`   ⏭️  Skipped (existing): ${skipped}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   📁 Thumbnails saved to: ${thumbnailsPath}`);
}

// Run
generateThumbnails().catch(console.error);
