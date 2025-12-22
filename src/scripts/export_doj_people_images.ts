
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-cpu';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { createCanvas, loadImage } from 'canvas';

// Database setup
const DB_PATH = process.env.DB_PATH || 'epstein-archive.db';
const db = new Database(DB_PATH);

// Constants
const SOURCE_DIR = 'data/media/images/DOJ VOL000001';
const CONFIDENCE_THRESHOLD = 0.6; // 60% confidence for person detection

async function run() {
    console.log(`🚀 Starting DOJ People Export...`);
    console.log(`📁 Source: ${SOURCE_DIR}`);

    if (!fs.existsSync(SOURCE_DIR)) {
        console.error(`❌ Source directory not found: ${SOURCE_DIR}`);
        return;
    }

    // 1. Load Model
    console.log('🧠 Loading TensorFlow model...');
    await tf.ready();
    const model = await cocoSsd.load();
    console.log('✅ Model loaded.');

    // 2. Get Images
    const files = fs.readdirSync(SOURCE_DIR).filter(f => /\.(jpg|jpeg|png)$/i.test(f));
    console.log(`📸 Found ${files.length} images.`);

    // 3. Process
    let peopleCount = 0;
    
    // Ensure "DOJ People" album exists
    let album = db.prepare("SELECT id FROM media_albums WHERE name = 'DOJ People'").get();
    if (!album) {
        const info = db.prepare("INSERT INTO media_albums (name, description) VALUES (?, ?)").run('DOJ People', 'Images of people extracted from DOJ release');
        album = { id: info.lastInsertRowid };
    }
    const albumId = album.id;

    console.log(`📂 Using Album ID: ${albumId}`);

    for (const file of files) {
        const filePath = path.join(SOURCE_DIR, file);
        
        // Detect objects
        try {
            const img = await loadImage(filePath);
            const canvas = createCanvas(img.width, img.height);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            // @ts-ignore - TFJS types with canvas can be tricky
            const predictions = await model.detect(canvas as any);
            
            const hasPerson = predictions.some(p => p.class === 'person' && p.score > CONFIDENCE_THRESHOLD);
            
            if (hasPerson) {
                console.log(`👤 Person detected in ${file}`);
                peopleCount++;
                
                // Generate Thumbnail
                const resizeWidth = 400;
                const thumbDir = path.join(path.dirname(filePath), 'thumbnails');
                if (!fs.existsSync(thumbDir)) fs.mkdirSync(thumbDir, { recursive: true });
                const thumbFilename = `thumb_${file}`;
                const thumbPath = path.join(thumbDir, thumbFilename);
                
                try {
                    if (!fs.existsSync(thumbPath)) {
                        await sharp(filePath)
                            .resize(resizeWidth, resizeWidth, { fit: 'cover' })
                            .rotate() // Auto-orient
                            .toFile(thumbPath);
                    }
                } catch (e) {
                    console.error(`Failed to generate thumbnail for ${file}`, e);
                }

                // Add to DB (media_images)
                const stats = fs.statSync(filePath);
                
                // Check existence first to avoid ON CONFLICT issues
                const existing = db.prepare('SELECT id FROM media_images WHERE filename = ? AND album_id = ?').get(file, albumId) as { id: number } | undefined;

                if (existing) {
                    db.prepare(`
                        UPDATE media_images SET 
                            path = ?, thumbnail_path = ?, width = ?, height = ?, file_size = ?, 
                            date_taken = ?, date_added = CURRENT_TIMESTAMP
                        WHERE id = ?
                    `).run(
                        filePath.replace(/\\/g, '/'), 
                        thumbPath.replace(/\\/g, '/'),
                        img.width, 
                        img.height, 
                        stats.size, 
                        new Date().toISOString(),
                        existing.id
                    );
                } else {
                    db.prepare(`
                        INSERT INTO media_images (
                            filename, original_filename, path, thumbnail_path, album_id, width, height, file_size, 
                            format, date_taken, date_added
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                    `).run(
                        file,
                        file,
                        filePath.replace(/\\/g, '/'), 
                        thumbPath.replace(/\\/g, '/'),
                        albumId, 
                        img.width, 
                        img.height, 
                        stats.size, 
                        path.extname(file).slice(1).toLowerCase(),
                        new Date().toISOString()
                    );
                }
                
                // Add to media_image_objects if needed (for search)
                // db.prepare("INSERT INTO media_image_objects ...").run(...)
            }
        } catch (e) {
            console.error(`Error processing ${file}:`, e);
        }
    }

    console.log(`\n🎉 Done! Found ${peopleCount} images of people.`);
}

run();
