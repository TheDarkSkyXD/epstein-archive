
import { MediaService } from '../src/services/MediaService';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import Database from 'better-sqlite3';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'epstein-archive-production.db');
const THUMBNAIL_DIR = path.join(process.cwd(), 'data/media/thumbnails');

async function main() {
  console.log(`Using DB: ${DB_PATH}`);
  const db = new Database(DB_PATH);
  
  // Create thumbnails dir if missing
  if (!fs.existsSync(THUMBNAIL_DIR)) {
      fs.mkdirSync(THUMBNAIL_DIR, { recursive: true });
  }

  const images = db.prepare(`SELECT * FROM media_images`).all() as any[];
  console.log(`Found ${images.length} images to check.`);

  let count = 0;
  let errors = 0;

  for (const img of images) {
    if (!img.path) continue;
    
    // Fix paths if they start with /data/
    let sourcePath = img.path;
    if (sourcePath.startsWith('/data/')) {
        sourcePath = path.join(process.cwd(), sourcePath.substring(1));
    }
    
    if (!fs.existsSync(sourcePath)) {
        console.warn(`[MISSING] ${sourcePath}`);
        continue;
    }

    const filename = path.basename(sourcePath);
    const thumbName = `thumb_${filename}`;
    const thumbPath = path.join(THUMBNAIL_DIR, thumbName);

    // Force regenerate or check if legitimate?
    // User said "thumbnails are very WRONG".
    // I should DELETE existing thumb and regenerate.
    if (fs.existsSync(thumbPath)) {
        fs.unlinkSync(thumbPath);
    }

    try {
        await sharp(sourcePath)
            .rotate() // Auto-rotate based on EXIF
            .resize(300, 300, { fit: 'cover' })
            .toFile(thumbPath);
            
        // Update DB
        const relativeThumbPath = `/data/media/thumbnails/${thumbName}`; // Store relative or absolute?
        // Server.ts expects path.join(process.cwd(), p.substring(1)) if starts with /
        // Let's store absolute path for now to match current DB style (which seems to be mixed)
        // Actually, let's use the format that works.
        // `img.thumbnailPath` usually stores absolute path in this legacy DB?
        // Or relative?
        // Checking `refresh_thumbnails.ts`: `mediaService.updateImage(image.id, { thumbnailPath: thumbPath });`
        // Where `thumbPath` is absolute.
        
        db.prepare('UPDATE media_images SET thumbnail_path = ? WHERE id = ?').run(thumbPath, img.id);
        
        process.stdout.write('.');
        count++;
    } catch (e) {
        console.error(`\n[ERROR] ${filename}:`, e);
        errors++;
    }
  }
  
  console.log(`\n\nRegenerated ${count} thumbnails.`);
  console.log(`Errors: ${errors}`);
}

main();
