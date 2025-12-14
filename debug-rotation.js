
import { MediaService } from './dist/services/MediaService.js';
import fs from 'fs';
import path from 'path';

console.log('Starting debug script (ESM Corrected - Metadata Test)...');

// Initialize Service
const main = async () => {
  try {
    const dbPath = path.join(process.cwd(), 'epstein-archive-production.db');
    console.log('Connecting to DB:', dbPath);
    
    const ms = new MediaService(dbPath);
    const id = 1;

    const img = ms.getImageById(id);
    if (!img) { console.error('Image 1 not found'); process.exit(1); }

    console.log('Initial Title:', img.title);

    console.log('Attempting metadata update...');
    try {
        const newTitle = 'Debug Title ' + Date.now();
        ms.updateImage(id, { title: newTitle });
        console.log('Update completed (sync).');
        
        const updatedImg = ms.getImageById(id);
        console.log('New Title:', updatedImg.title);
        
        if (updatedImg.title === newTitle) {
            console.log('Metadata Update: SUCCESS');
        } else {
            console.error('Metadata Update: FAILED');
        }
    } catch (err) {
        console.error('Update FAILED:', err);
    }
    
    console.log('Attempting rotation check...');
    try {
        await ms.rotateImage(id, 90);
        console.log('Rotation: SUCCESS');
    } catch (err) {
        console.error('Rotation FAILED:', err);
    }

  } catch (e) {
    console.error('Setup error:', e);
  }
};

main();
