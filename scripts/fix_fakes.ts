
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'epstein-archive.db');
const db = new Database(DB_PATH);

async function run() {
    console.log('🧹 Consolidating Fake/Unconfirmed Albums & Watermarking...');

    const categories = [
        { name: 'Confirmed Fake', watermark: 'FAKE' },
        { name: 'Unconfirmed Claims', watermark: 'UNVERIFIED' }
    ];

    for (const cat of categories) {
        console.log(`\nProcessing '${cat.name}'...`);
        
        // 1. Find albums
        const albums = db.prepare("SELECT id, name FROM media_albums WHERE name = ? ORDER BY id DESC").all(cat.name) as {id: number, name: string}[];
        
        if (albums.length === 0) {
            console.log(`No albums found for ${cat.name}`);
            continue;
        }

        // Keep the newest (highest ID) as authoritative
        const keeper = albums[0];
        const duplicates = albums.slice(1);
        
        console.log(`✅ Keeping: ${keeper.name} (ID: ${keeper.id})`);
        
        // Move images from duplicates to keeper, then delete duplicates
        const updateImage = db.prepare('UPDATE media_images SET album_id = ? WHERE album_id = ?');
        const deleteAlbum = db.prepare('DELETE FROM media_albums WHERE id = ?');
        
        for (const dup of duplicates) {
            console.log(`   Merging ID ${dup.id} -> ${keeper.id}`);
            updateImage.run(keeper.id, dup.id);
            deleteAlbum.run(dup.id);
        }

        // 2. Watermark Images
        const images = db.prepare('SELECT id, path, filename, original_filename FROM media_images WHERE album_id = ?').all(keeper.id) as {id: number, path: string, filename: string, original_filename: string}[];
        
        console.log(`💧 Watermarking ${images.length} images...`);
        
        for (const img of images) {
            // Resolve path
            let imgPath = img.path;
             if (imgPath.startsWith('/data/') || imgPath.startsWith('/')) {
                const relativePath = imgPath.startsWith('/') ? imgPath.slice(1) : imgPath;
                const candidatePath = path.join(process.cwd(), relativePath);
                if (fs.existsSync(candidatePath)) {
                  imgPath = candidatePath;
                }
            }
            
            if (!fs.existsSync(imgPath)) {
                console.warn(`Original file missing: ${imgPath}`);
                continue;
            }

            // Check if already watermarked (hacky: check if backup exists?)
            // Or just overwrite. Ideally we keep original in 'originals/' and serve watermarked.
            // Current pipeline: 'data/media/images/...' IS the served image.
            
            const tempPath = imgPath + '.watermarked.tmp';
            
            try {
                const metadata = await sharp(imgPath).metadata();
                const width = metadata.width || 1000;
                const height = metadata.height || 1000;
                const fontSize = Math.floor(width * 0.15); // 15% of width
                
                const svgImage = `
                <svg width="${width}" height="${height}">
                  <style>
                    .title { fill: rgba(255, 0, 0, 0.5); font-size: ${fontSize}px; font-weight: bold; font-family: sans-serif; }
                  </style>
                  <text x="50%" y="50%" text-anchor="middle" class="title" transform="rotate(-45, ${width/2}, ${height/2})">${cat.watermark}</text>
                </svg>
                `;

                await sharp(imgPath)
                    .composite([
                        {
                            input: Buffer.from(svgImage),
                            top: 0,
                            left: 0,
                        },
                    ])
                    .toFile(tempPath);
                
                // Replace original
                fs.renameSync(tempPath, imgPath);
                console.log(`   Marked: ${img.filename}`);
                
                // Force thumbnail regen?
                // Thumbnails are generated from this file, so next regen will pick it up.
                // Or we can delete current thumbnail to force regen.
                const thumbPath = path.join(process.cwd(), 'data/media/thumbnails', `thumb_${img.filename}`);
                if (fs.existsSync(thumbPath)) {
                    fs.unlinkSync(thumbPath);
                }

            } catch (e) {
                console.error(`Failed to watermark ${img.filename}:`, e);
            }
        }
    }
    
    console.log('Done.');
}

run().catch(console.error);
