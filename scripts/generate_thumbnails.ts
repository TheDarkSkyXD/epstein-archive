
import { MediaService } from '../src/services/MediaService';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'epstein-archive.db');
// Ensure absolute path for output
const THUMB_DIR = process.env.THUMB_DIR || path.join(process.cwd(), 'data/media/thumbnails');

async function run() {
    console.log(`🚀 Starting Thumbnail Generation...`);
    console.log(`📁 DB Path: ${DB_PATH}`);
    console.log(`📁 Thumbnail Dir: ${THUMB_DIR}`);

    if (!fs.existsSync(THUMB_DIR)) {
        console.log(`Creating directory: ${THUMB_DIR}`);
        fs.mkdirSync(THUMB_DIR, { recursive: true });
    }

    const mediaService = new MediaService(DB_PATH);
    
    // Get all images
    // We can use getAllImages but it might be heavy with joins. 
    // Let's iterate ID/Path cheaply.
    const stmt = mediaService['db'].prepare('SELECT id, path, filename, thumbnail_path FROM media_images');
    const images = stmt.all() as {id: number, path: string, filename: string, thumbnail_path: string}[];
    
    console.log(`📸 Found ${images.length} images.`);
    
    let generated = 0;
    let errors = 0;
    let skipped = 0;

    for (const img of images) {
        const expectedThumbPath = path.join(THUMB_DIR, `thumb_${img.filename}`);
        
        // Update DB if path is different (previous standard was just /data/media/thumbnails/...)
        const relativeThumbPath = `/data/media/thumbnails/thumb_${img.filename}`;
        
        if (img.thumbnail_path !== relativeThumbPath) {
             // Fix DB path
             mediaService.updateImage(img.id, { thumbnailPath: relativeThumbPath });
        }
        
        if (fs.existsSync(expectedThumbPath)) {
            skipped++;
            if (skipped % 100 === 0) process.stdout.write(`Skipped ${skipped}...\r`);
            continue;
        }
        
        // Generate
        try {
            // MediaService.generateThumbnail expects absolute paths?
            // The method resolves relative checks, but let's pass what we have.
            // If img.path is /data/... we rely on MediaService logic (which we saw handled it).
            await mediaService.generateThumbnail(img.path, THUMB_DIR, { force: true });
            generated++;
            if (generated % 10 === 0) process.stdout.write(`Generated ${generated}...\r`);
        } catch (e) {
            console.error(`\n❌ Failed id=${img.id}:`, e);
            errors++;
        }
    }
    
    console.log(`\n🎉 Process Complete!`);
    console.log(`✅ Generated: ${generated}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`❌ Errors: ${errors}`);
    
    mediaService.close();
}

run().catch(console.error);
