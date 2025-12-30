
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const db = new Database('epstein-archive.db');
const images = db.prepare('SELECT id, path, thumbnail_path FROM media_images').all();

console.log(`Checking ${images.length} images...`);

let missingFiles = 0;
let missingThumbs = 0;

for (const img of images) {
    const fullPath = path.isAbsolute(img.path) ? img.path : path.join(process.cwd(), img.path);
    if (!fs.existsSync(fullPath)) {
        console.log(`[404] Missing image file: ${img.path} (ID: ${img.id})`);
        missingFiles++;
    }
    
    if (img.thumbnail_path) {
        const fullThumbPath = path.isAbsolute(img.thumbnail_path) ? img.thumbnail_path : path.join(process.cwd(), img.thumbnail_path);
        if (!fs.existsSync(fullThumbPath)) {
            console.log(`[404] Missing thumbnail: ${img.thumbnail_path} (ID: ${img.id})`);
            missingThumbs++;
        }
    }
}

console.log(`\nResults: ${missingFiles} missing files, ${missingThumbs} missing thumbnails.`);
db.close();
process.exit(missingFiles > 0 ? 1 : 0);
