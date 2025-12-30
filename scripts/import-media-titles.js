#!/usr/bin/env node
/**
 * Script to import media images with descriptive titles
 * Analyzes folder structure and file names to generate contextual titles
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const DB_PATH = path.join(__dirname, '..', 'epstein-archive.db');
const MEDIA_BASE = path.join(__dirname, '..', 'data', 'media', 'images');

// Category-based title templates
const TITLE_TEMPLATES = {
  'Survivors': (filename) => {
    const cleanName = filename.replace(/[-_]/g, ' ').replace(/\.(jpg|jpeg|png|gif|webp)$/i, '');
    // Check for known names
    if (filename.toLowerCase().includes('virigina') || filename.toLowerCase().includes('virginia') || filename.toLowerCase().includes('giuffre')) {
      return 'Virginia Giuffre - Epstein Survivor and Key Witness';
    }
    if (filename.toLowerCase().includes('teela') || filename.toLowerCase().includes('davies')) {
      return 'Teela Davies - Epstein Survivor';
    }
    // UUID names get generic but contextual title
    if (cleanName.match(/^[a-f0-9-]+$/i)) {
      return 'Epstein Survivor Testimony Photo';
    }
    return `${cleanName} - Survivor`;
  },
  'Perpetrators': (filename) => { // Note: typo in folder name preserved
    const cleanName = filename.replace(/[-_]/g, ' ').replace(/\.(jpg|jpeg|png|gif|webp)$/i, '');
    if (cleanName.match(/^[a-f0-9-]+/i)) {
      return 'Perpetrator in Epstein Network';
    }
    return cleanName;
  },
  'Trump Epstein': (filename) => {
    return 'Donald Trump with Jeffrey Epstein - Social Event Photo';
  },
  'Ghislaine': (filename) => {
    return 'Ghislaine Maxwell - Co-conspirator Photo';
  },
  'Evidence': (filename) => {
    return 'Documentary Evidence - Epstein Investigation';
  },
  'Properties': (filename) => {
    return 'Epstein Property Documentation';
  },
  'MAGA': (filename) => {
    return 'Political Connection Photo - Epstein Network';
  },
  'Musk Epstein': (filename) => {
    return 'Elon Musk with Jeffrey Epstein';
  },
  'Epstein Wexner': (filename) => {
    return 'Jeffrey Epstein with Les Wexner';
  },
  'Epstein': (filename) => {
    return 'Jeffrey Epstein Photo';
  },
  'Aircraft': (filename) => {
    return 'Epstein Private Aircraft ("Lolita Express")';
  },
  'Whistleblowers': (filename) => {
    return 'Whistleblower in Epstein Case';
  },
  '12.03.25 USVI Production': (filename) => {
    // DJI = drone
    if (filename.startsWith('DJI_')) {
      return 'Drone Aerial View - Little St. James Island';
    }
    // IMG = property photos
    const imgNum = filename.match(/IMG_(\d+)/);
    if (imgNum) {
      const num = parseInt(imgNum[1]);
      // Group by approximate photo numbers for location
      if (num < 5170) return 'Little St. James - Main Estate Exterior';
      if (num < 5185) return 'Little St. James - Pool Complex';
      if (num < 5200) return 'Little St. James - Guest Buildings';
      if (num < 5210) return 'Little St. James - Temple Structure';
      if (num < 5220) return 'Little St. James - Grounds and Pathways';
      if (num < 5230) return 'Little St. James - Beach and Dock Area';
      if (num < 5240) return 'Little St. James - Interior Spaces';
      if (num < 5250) return 'Little St. James - Support Buildings';
      return 'Little St. James Island Property Photo';
    }
    return 'USVI Property Documentation';
  }
};

function generateTitle(folder, filename) {
  const template = TITLE_TEMPLATES[folder];
  if (template) {
    return template(filename);
  }
  // Default: use folder + cleaned filename
  const cleanName = filename.replace(/[-_]/g, ' ').replace(/\.(jpg|jpeg|png|gif|webp)$/i, '');
  return `${folder} - ${cleanName}`;
}

function importMedia() {
  console.log('Database path:', DB_PATH);
  console.log('Media base:', MEDIA_BASE);
  
  if (!fs.existsSync(DB_PATH)) {
    console.error('Database not found at:', DB_PATH);
    return;
  }
  
  const db = new Database(DB_PATH);
  
  // Get existing media by file_path
  const existingMedia = new Set(
    db.prepare('SELECT file_path FROM media_items').all().map(r => r.file_path)
  );
  
  console.log(`Found ${existingMedia.size} existing media items`);
  
  let imported = 0;
  let updated = 0;
  
  // Scan all folders
  const folders = fs.readdirSync(MEDIA_BASE);
  
  for (const folder of folders) {
    if (folder.startsWith('.')) continue;
    
    const folderPath = path.join(MEDIA_BASE, folder);
    if (!fs.statSync(folderPath).isDirectory()) continue;
    
    const files = fs.readdirSync(folderPath);
    console.log(`Processing folder: ${folder} (${files.length} files)`);
    
    for (const file of files) {
      if (file.startsWith('.')) continue;
      if (!file.match(/\.(jpg|jpeg|png|gif|webp)$/i)) continue;
      
      const filePath = path.resolve(path.join(folderPath, file));
      const title = generateTitle(folder, file);
      
      if (existingMedia.has(filePath)) {
        // Update existing
        db.prepare(`
          UPDATE media_items SET title = ? WHERE file_path = ?
        `).run(title, filePath);
        updated++;
      } else {
        // Insert new
        try {
          const stats = fs.statSync(filePath);
          db.prepare(`
            INSERT INTO media_items (
              file_path, file_type, title, description, 
              verification_status, red_flag_rating, created_at
            ) VALUES (?, 'image', ?, ?, 'unverified', 0, datetime('now'))
          `).run(filePath, title, `Image from ${folder} collection`);
          imported++;
        } catch (err) {
          console.error(`Error importing ${file}:`, err.message);
        }
      }
    }
  }
  
  console.log(`\nResults:`);
  console.log(`  Imported: ${imported} new images`);
  console.log(`  Updated: ${updated} existing images`);
  
  db.close();
}

// Run
importMedia();
