
import { MediaService } from '../src/services/MediaService';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'epstein-archive.db');
const THUMB_DIR = process.env.THUMB_DIR || path.join(process.cwd(), 'data/media/thumbnails');

async function run() {
    console.log(`🚀 Starting TARGETED Thumbnail Generation...`);
    
    if (!fs.existsSync(THUMB_DIR)) {
        fs.mkdirSync(THUMB_DIR, { recursive: true });
    }

    const mediaService = new MediaService(DB_PATH);
    
    // Target specific albums first (New Ingestions)
    const targetAlbums = [
        '12.03.25 USVI Production',
        '12.11.25 Estate Production',
        'DOJ VOL000001',
        '12.18.25 Release'
    ];
    
    // Get IDs for these albums
    const albumIds = mediaService['db'].prepare(`
        SELECT id FROM media_albums WHERE name IN (${targetAlbums.map(() => '?').join(',')})
    `).all(...targetAlbums) as {id: number}[];
    
    const ids = albumIds.map(a => a.id);
    console.log(`🎯 Targeting Albums IDs: ${ids.join(', ')}`);
    
    if (ids.length === 0) {
        console.log('No target albums found?');
        return;
    }
    
    // Get images for these albums
    const images = mediaService['db'].prepare(`
        SELECT id, path, filename, thumbnail_path 
        FROM media_images 
        WHERE album_id IN (${ids.join(',')})
        ORDER BY id DESC
    `).all() as {id: number, path: string, filename: string, thumbnail_path: string}[];
    
    console.log(`📸 Found ${images.length} images in target albums.`);
    
    let generated = 0;
    
    for (const img of images) {
        const relativeThumbPath = `/data/media/thumbnails/thumb_${img.filename}`;
        
        // Ensure DB has correct path
        if (img.thumbnail_path !== relativeThumbPath) {
             mediaService.updateImage(img.id, { thumbnailPath: relativeThumbPath });
        }
        
        const expectedThumbPath = path.join(THUMB_DIR, `thumb_${img.filename}`);
        if (fs.existsSync(expectedThumbPath)) continue;
        
        try {
            await mediaService.generateThumbnail(img.path, THUMB_DIR, { force: true });
            generated++;
            if (generated % 10 === 0) process.stdout.write(`Generated ${generated}...\r`);
        } catch (e) {
            console.error(`❌ Error img ${img.id}:`, e);
        }
    }
    
    console.log(`\n✅ Targeted generation complete. Created ${generated} thumbnails.`);
    mediaService.close();
}

run().catch(console.error);
