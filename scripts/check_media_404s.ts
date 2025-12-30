
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const db = new Database('epstein-archive.db');
const images = db.prepare('SELECT id, path, thumbnail_path FROM media_images').all();

console.log(`Checking ${images.length} images...`);

let missingFiles = 0;
let missingThumbs = 0;

for (const img of images) {
    if (!fs.existsSync(img.path)) {
        // Try resolving relative to app root
        const resolvedPath = path.join(process.cwd(), img.path.startsWith('/') ? img.path.slice(1) : img.path);
        if (!fs.existsSync(resolvedPath)) {
            console.log(`[404] Missing image file: ${img.path} (ID: ${img.id})`);
            missingFiles++;
        }
    }
    
    if (img.thumbnail_path && !fs.existsSync(img.thumbnail_path)) {
        const resolvedThumb = path.join(process.cwd(), img.thumbnail_path.startsWith('/') ? img.thumbnail_path.slice(1) : img.thumbnail_path);
        if (!fs.existsSync(resolvedThumb)) {
            console.log(`[404] Missing thumbnail: ${img.thumbnail_path} (ID: ${img.id})`);
            missingThumbs++;
        }
    }
}

console.log(`\nResults: ${missingFiles} missing files, ${missingThumbs} missing thumbnails.`);
db.close();
