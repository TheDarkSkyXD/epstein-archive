
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import exifParser from 'exif-parser';
import { createCanvas, loadImage } from 'canvas';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-cpu';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'epstein-archive-production.db'); // Use PRODUCTION DB by default
const db = new Database(DB_PATH);

const TARGET_DIR = './data/media/images/12.11.25 Estate Production';

async function run() {
  console.log(`Starting ingestion for directory: ${TARGET_DIR}`);

  if (!fs.existsSync(TARGET_DIR)) {
      console.error(`Directory not found: ${TARGET_DIR}`);
      process.exit(1);
  }

  // Load Model
  console.log('Loading TensorFlow model...');
  await tf.setBackend('cpu');
  const model = await cocoSsd.load();
  console.log('Model loaded.');

  const files = fs.readdirSync(TARGET_DIR);
  const imageFiles = files.filter(f => f.match(/\.(jpg|jpeg|png)$/i) && !f.startsWith('thumb_'));

  console.log(`Found ${imageFiles.length} images to process.`);

  for (const [index, filename] of imageFiles.entries()) {
    const filePath = path.join(TARGET_DIR, filename);
    await processFile(filePath, model);
    if ((index + 1) % 10 === 0) console.log(`Processed ${index + 1}/${imageFiles.length}...`);
  }
  
  console.log('Ingestion complete.');
}

async function processFile(filePath: string, model: cocoSsd.ObjectDetection) {
    const filename = path.basename(filePath);
    
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
         try {
            const meta = await sharp(buffer).metadata();
            width = meta.width || 0;
            height = meta.height || 0;
        } catch (e2) {}
    }

    const stat = fs.statSync(filePath);
    
    // 2. Check if exists in DB
    let imageId: number | bigint;
    const existing = db.prepare('SELECT id, path FROM media_images WHERE filename = ?').get(filename) as any;
    
    if (existing) {
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
        imageId = existing.id;
    } else {
        console.log(`Inserting new record: ${filename}`);
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
        imageId = info.lastInsertRowid;
    }

    // 3. Generate Thumbnail
    const thumbDir = path.join(path.dirname(filePath), 'thumbnails');
    const thumbPath = path.join(thumbDir, `thumb_${filename}`);
    if (!fs.existsSync(thumbPath)) {
        await generateThumbnail(Number(imageId), filePath);
    }
    
    // 4. Enrich with Object Detection
    try {
        const img = await loadImage(buffer);
        // TensorFlow expects HTMLImageElement or Canvas. Node canvas is compatible.
        // But coco-ssd strict typing might complain. Cast to any.
        const predictions = await model.detect(img as any);
        
        const validPredictions = predictions.filter(p => p.score > 0.6);
        if (validPredictions.length > 0) {
            // console.log(`  Found ${validPredictions.length} objects: ${validPredictions.map(p => p.class).join(', ')}`);
            for (const p of validPredictions) {
                await addTagToImage(Number(imageId), p.class);
            }
        }
    } catch (e) {
        console.error(`Object detection failed for ${filename}:`, e);
    }
}

async function addTagToImage(imageId: number, tagName: string) {
    const normalized = tagName.toLowerCase();
    
    // Ensure tag exists
    let tag = db.prepare('SELECT id FROM tags WHERE name = ?').get(normalized) as any;
    if (!tag) {
        const info = db.prepare(`INSERT INTO tags (name, category) VALUES (?, 'auto')`).run(normalized);
        tag = { id: info.lastInsertRowid };
    }
    
    // Link to image
    try {
        db.prepare('INSERT OR IGNORE INTO image_tags (image_id, tag_id) VALUES (?, ?)').run(imageId, tag.id);
    } catch (e) {}
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
    } catch (e) {
        console.error(`Thumbnail generation failed for ${path.basename(filePath)}:`, e);
    }
}

run().catch(console.error);
