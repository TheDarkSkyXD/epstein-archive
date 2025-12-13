/**
 * Sync Albums and Ingest New Images
 * 
 * This script:
 * 1. Renames existing albums to match directory names on disk
 * 2. Creates new albums for directories not yet in DB
 * 3. Ingests any new images not already in DB
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'epstein-archive-production.db');
const MEDIA_ROOT = path.join(process.cwd(), 'data', 'media', 'images');

console.log(`[SyncAlbums] DB: ${DB_PATH}`);
console.log(`[SyncAlbums] Media Root: ${MEDIA_ROOT}`);

const db = new Database(DB_PATH);

// Album renaming map: old DB name -> new disk name
const ALBUM_RENAMES: Record<string, string> = {
  'Epstein': 'Jeffrey Epstein',
  'Ghislaine': 'Ghislaine Maxwell',
  'Trump Epstein': 'Donald Trump',
  'Musk Epstein': 'Elon Musk',
  'Epstein Wexner': 'Les Wexner',
  '4 December 2025': '12.11.25 Estate Production', // Likely the same batch
  'Perpretrators': 'Perpetrators', // Fix typo
};

async function run() {
  // Step 1: Rename existing albums
  console.log('\n[Step 1] Renaming albums to match disk structure...');
  for (const [oldName, newName] of Object.entries(ALBUM_RENAMES)) {
    const existing = db.prepare('SELECT id FROM media_albums WHERE name = ?').get(oldName) as any;
    if (existing) {
      // Check if new name already exists
      const newExists = db.prepare('SELECT id FROM media_albums WHERE name = ?').get(newName) as any;
      if (newExists) {
        console.log(`  Merging "${oldName}" (id:${existing.id}) into "${newName}" (id:${newExists.id})...`);
        // Move images from old album to new album
        db.prepare('UPDATE media_images SET album_id = ? WHERE album_id = ?').run(newExists.id, existing.id);
        // Delete old album
        db.prepare('DELETE FROM media_albums WHERE id = ?').run(existing.id);
      } else {
        console.log(`  Renaming "${oldName}" -> "${newName}"...`);
        db.prepare('UPDATE media_albums SET name = ? WHERE id = ?').run(newName, existing.id);
      }
    }
  }

  // Step 2: Sync directories with albums
  console.log('\n[Step 2] Syncing directories with albums...');
  const directories = fs.readdirSync(MEDIA_ROOT).filter(f => {
    const fullPath = path.join(MEDIA_ROOT, f);
    return fs.statSync(fullPath).isDirectory() && !f.startsWith('.');
  });

  const albumMap = new Map<string, number>();

  for (const dirName of directories) {
    let album = db.prepare('SELECT id, name FROM media_albums WHERE name = ?').get(dirName) as any;
    
    if (!album) {
      console.log(`  Creating new album: "${dirName}"`);
      const result = db.prepare('INSERT INTO media_albums (name, description) VALUES (?, ?)').run(
        dirName,
        `Images from ${dirName}`
      );
      album = { id: result.lastInsertRowid, name: dirName };
    }
    
    albumMap.set(dirName, album.id as number);
  }

  // Step 3: Ingest new images
  console.log('\n[Step 3] Ingesting new images...');
  
  const insertImage = db.prepare(`
    INSERT INTO media_images (
      filename, original_filename, path, thumbnail_path, title, album_id,
      file_size, format, width, height, date_added
    ) VALUES (
      @filename, @original_filename, @path, @thumbnail_path, @title, @album_id,
      @file_size, @format, @width, @height, datetime('now')
    )
  `);

  let totalNew = 0;
  let totalExisting = 0;

  for (const dirName of directories) {
    const albumId = albumMap.get(dirName)!;
    const albumPath = path.join(MEDIA_ROOT, dirName);
    
    const files = fs.readdirSync(albumPath).filter(f => {
      const ext = path.extname(f).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext) && !f.startsWith('.');
    });

    console.log(`  Album "${dirName}": ${files.length} images on disk`);

    for (const file of files) {
      const filePath = path.join(albumPath, file);
      const webPath = `/data/media/images/${dirName}/${file}`;
      
      // Check if already exists
      const existing = db.prepare('SELECT id FROM media_images WHERE path = ?').get(webPath) as any;
      if (existing) {
        totalExisting++;
        continue;
      }

      // Get file info
      const stats = fs.statSync(filePath);
      const ext = path.extname(file).slice(1).toLowerCase();
      
      // Get dimensions with sharp
      let width = 0;
      let height = 0;
      try {
        const meta = await sharp(filePath).metadata();
        width = meta.width || 0;
        height = meta.height || 0;
      } catch (e) {
        // Ignore
      }

      // Generate thumbnail
      const thumbDir = path.join(albumPath, 'thumbnails');
      if (!fs.existsSync(thumbDir)) {
        fs.mkdirSync(thumbDir, { recursive: true });
      }
      
      const thumbPath = path.join(thumbDir, `thumb_${file}`);
      const thumbWebPath = `/data/media/images/${dirName}/thumbnails/thumb_${file}`;
      
      try {
        await sharp(filePath)
          .resize(300, 300, { fit: 'cover' })
          .rotate() // Auto-rotate based on EXIF
          .toFile(thumbPath);
      } catch (e) {
        console.warn(`    Failed to generate thumbnail for ${file}`);
      }

      // Insert
      insertImage.run({
        filename: file,
        original_filename: file,
        path: webPath,
        thumbnail_path: fs.existsSync(thumbPath) ? thumbWebPath : webPath,
        title: path.basename(file, path.extname(file)),
        album_id: albumId,
        file_size: stats.size,
        format: ext,
        width,
        height
      });

      totalNew++;
    }

    // Update album cover if not set
    const album = db.prepare('SELECT id, cover_image_id FROM media_albums WHERE id = ?').get(albumId) as any;
    if (!album.cover_image_id) {
      const firstImage = db.prepare('SELECT id FROM media_images WHERE album_id = ? LIMIT 1').get(albumId) as any;
      if (firstImage) {
        db.prepare('UPDATE media_albums SET cover_image_id = ? WHERE id = ?').run(firstImage.id, albumId);
      }
    }
  }

  console.log(`\n[Done] Ingested ${totalNew} new images. ${totalExisting} already existed.`);

  // Print final album stats
  console.log('\n[Final Album Summary]');
  const albums = db.prepare('SELECT a.id, a.name, COUNT(i.id) as image_count FROM media_albums a LEFT JOIN media_images i ON a.id = i.album_id GROUP BY a.id ORDER BY a.name').all() as any[];
  albums.forEach(a => console.log(`  ${a.name}: ${a.image_count} images`));
}

run().catch(console.error);
