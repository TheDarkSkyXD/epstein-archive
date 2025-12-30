
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'epstein-archive.db');
const db = new Database(DB_PATH);

console.log('🧹 Starting DOJ Album Cleanup...');

// 1. Identify Target Albums
const targetName = 'DOJ VOL000001';
const dojAlbums = db.prepare("SELECT id, name FROM media_albums WHERE name = ? ORDER BY id DESC").all(targetName) as {id: number, name: string}[];

if (dojAlbums.length === 0) {
    console.log('No DOJ VOL000001 albums found?');
    process.exit(0);
}

// Keep the newest (highest ID) as authoritative
const keeper = dojAlbums[0];
const duplicates = dojAlbums.slice(1);

console.log(`✅ Keeping authoritative album: '${keeper.name}' (ID: ${keeper.id})`);

// 2. Identify "DOJ Discovery (Vol 1)" (ID 52) which is the "DOJ People" candidate
const legacyAlbum = db.prepare("SELECT id, name FROM media_albums WHERE name = 'DOJ Discovery (Vol 1)'").get() as {id: number, name: string} | undefined;

const albumsToDelete = [...duplicates];
if (legacyAlbum) {
    albumsToDelete.push(legacyAlbum);
}

console.log(`🗑️  Albums to delete:`, albumsToDelete);

// 3. Delete Logic
const deleteTags = db.prepare('DELETE FROM media_image_tags WHERE image_id = ?');
const deleteImage = db.prepare('DELETE FROM media_images WHERE id = ?');
const deleteAlbum = db.prepare('DELETE FROM media_albums WHERE id = ?');
const getImages = db.prepare('SELECT id, path FROM media_images WHERE album_id = ?');

const runTransaction = db.transaction(() => {
    let deletedImages = 0;
    
    for (const album of albumsToDelete) {
        console.log(`\nProcessing Album: '${album.name}' (ID: ${album.id})...`);
        const images = getImages.all(album.id) as {id: number, path: string}[];
        
        for (const img of images) {
            // Check if file is physically shared with Keeper?
            // If we delete the record, should we delete the file?
            // "data/media/images/DOJ VOL000001/..." is used by the Keeper.
            // If legacy used "data/originals/..." we might want to keep it?
            // Actually, ingest_doj_media.ts (legacy) likely used different paths.
            // But user said "remove duplicates".
            // Safest: Delete the DB record. Leave file if unsure, OR check if path is shared.
            
            // Check if path is used by Keeper images?
            const isUsedByKeeper = db.prepare('SELECT id FROM media_images WHERE album_id = ? AND path = ?').get(keeper.id, img.path);
            
            deleteTags.run(img.id);
            deleteImage.run(img.id);
            deletedImages++;
            
            // Only try to delete file if it looks like a generated duplicate or we are sure.
            // For now, let's strictly do DB cleanup to fix the UI duplicates.
        }
        
        deleteAlbum.run(album.id);
        console.log(`   Deleted album and ${images.length} images.`);
    }
    
    console.log(`\nTotal deleted images: ${deletedImages}`);
});

runTransaction();
console.log('✅ Cleanup Complete.');
