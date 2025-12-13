
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import exifParser from 'exif-parser';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'epstein-archive.db');
const db = new Database(DB_PATH);

const TARGET_DIR = '/home/deploy/epstein-archive/data/media/images/12.11.25 Estate Production';

async function run() {
  console.log(`Starting ingestion for directory: ${TARGET_DIR}`);

  if (!fs.existsSync(TARGET_DIR)) {
      console.error(`Directory not found: ${TARGET_DIR}`);
      process.exit(1);
  }

  const files = fs.readdirSync(TARGET_DIR);
  const imageFiles = files.filter(f => f.match(/\.(jpg|jpeg|png)$/i) && !f.startsWith('thumb_'));

  console.log(`Found ${imageFiles.length} images to process.`);

  for (const filename of imageFiles) {
    const filePath = path.join(TARGET_DIR, filename);
    await processFile(filePath);
  }
  
  console.log('Ingestion complete.');
}

async function processFile(filePath: string) {
    const filename = path.basename(filePath);
    // console.log(`Processing ${filename}...`);

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
        // console.warn(`Metadata parse failed for ${filename}:`, e.message);
         try {
            const meta = await sharp(buffer).metadata();
            width = meta.width || 0;
            height = meta.height || 0;
        } catch (e2) {}
    }

    const stat = fs.statSync(filePath);
    
    // 2. Check if exists in DB
    const existing = db.prepare('SELECT id, path FROM media_images WHERE filename = ?').get(filename) as any;
    
    if (existing) {
        // console.log(`Updating existing record ID ${existing.id}...`);
        // Update
        db.prepare(`
            UPDATE media_images SET 
                file_size = ?,
                width = ?,
                height = ?,
                orientation = ?,
                date_taken = ?
            WHERE id = ?
        `).run(
            stat.size,
            width,
            height,
            orientation,
            tags.DateTimeOriginal ? new Date(tags.DateTimeOriginal * 1000).toISOString() : null,
            existing.id
        );
        
        // Regenerate thumbnail if missing
        const thumbDir = path.join(path.dirname(filePath), 'thumbnails');
        const thumbPath = path.join(thumbDir, `thumb_${filename}`);
        if (!fs.existsSync(thumbPath)) {
            await generateThumbnail(existing.id, filePath);
        }
        
    } else {
        console.log(`Inserting new record: ${filename}`);
        // Insert
        const info = db.prepare(`
           INSERT INTO media_images (
            filename, original_filename, path, file_size, format,
            width, height, date_taken, album_id, date_added,
            orientation
           ) VALUES (
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, datetime('now'),
            ?
           )
        `).run(
            filename,
            filename, 
            filePath,
            stat.size,
            path.extname(filename).slice(1).toLowerCase(),
            width,
            height,
            tags.DateTimeOriginal ? new Date(tags.DateTimeOriginal * 1000).toISOString() : null,
            null,
            orientation
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
        // console.log('Thumbnail generated.');
    } catch (e) {
        console.error(`Thumbnail generation failed for ${path.basename(filePath)}:`, e);
    }
}

run().catch(console.error);
