/**
 * Enrich Media with EXIF Data and Generated Titles
 * 
 * This script:
 * 1. Scans original images from the USVI tranche
 * 2. Extracts EXIF metadata (date, camera, GPS, etc.)
 * 3. Generates descriptive titles based on metadata and content patterns
 * 4. Updates the database with enriched metadata
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import ExifParser from 'exif-parser';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'epstein-archive-production.db');
const ORIGINALS_DIR = path.join(process.cwd(), 'data', 'media', 'images', '12.03.25 USVI Production', 'originals');

interface ExifData {
  dateTaken?: string;
  cameraMake?: string;
  cameraModel?: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  imageWidth?: number;
  imageHeight?: number;
  orientation?: number;
  software?: string;
  artist?: string;
  copyright?: string;
}

function extractExif(filePath: string): ExifData | null {
  try {
    const buffer = fs.readFileSync(filePath);
    const parser = ExifParser.create(buffer);
    const result = parser.parse();
    
    const tags = result.tags;
    const exif: ExifData = {};
    
    // Date taken
    if (tags.DateTimeOriginal) {
      const timestamp = tags.DateTimeOriginal * 1000;
      exif.dateTaken = new Date(timestamp).toISOString();
    } else if (tags.CreateDate) {
      const timestamp = tags.CreateDate * 1000;
      exif.dateTaken = new Date(timestamp).toISOString();
    }
    
    // Camera info
    if (tags.Make) exif.cameraMake = tags.Make;
    if (tags.Model) exif.cameraModel = tags.Model;
    
    // GPS coordinates
    if (tags.GPSLatitude !== undefined && tags.GPSLongitude !== undefined) {
      exif.gpsLatitude = tags.GPSLatitude;
      exif.gpsLongitude = tags.GPSLongitude;
    }
    
    // Image dimensions
    if (result.imageSize) {
      exif.imageWidth = result.imageSize.width;
      exif.imageHeight = result.imageSize.height;
    }
    
    // Other metadata
    if (tags.Orientation) exif.orientation = tags.Orientation;
    if (tags.Software) exif.software = tags.Software;
    if (tags.Artist) exif.artist = tags.Artist;
    if (tags.Copyright) exif.copyright = tags.Copyright;
    
    return Object.keys(exif).length > 0 ? exif : null;
  } catch (error) {
    // Silently fail for files that can't be parsed
    return null;
  }
}

function generateTitle(filename: string, exif: ExifData | null): string {
  const baseName = path.basename(filename, path.extname(filename));
  
  // Extract patterns from filename
  const isDrone = baseName.startsWith('DJI_');
  const isPhoto = baseName.startsWith('IMG_');
  const isVideo = baseName.startsWith('MVI_');
  
  // Build descriptive title
  let title = '';
  
  if (isDrone) {
    title = 'Drone Footage';
    if (exif?.gpsLatitude && exif?.gpsLongitude) {
      // Check if coordinates are in USVI area (roughly 18.3N, -64.9W)
      if (exif.gpsLatitude > 17 && exif.gpsLatitude < 20 && 
          exif.gpsLongitude < -64 && exif.gpsLongitude > -66) {
        title = 'Drone Footage - Little St. James Island';
      }
    }
  } else if (isVideo) {
    title = 'Video Recording';
    if (exif?.gpsLatitude && exif?.gpsLongitude) {
      if (exif.gpsLatitude > 17 && exif.gpsLatitude < 20 && 
          exif.gpsLongitude < -64 && exif.gpsLongitude > -66) {
        title = 'Video - Little St. James Island';
      }
    }
  } else if (isPhoto) {
    title = 'Property Photo';
    if (exif?.gpsLatitude && exif?.gpsLongitude) {
      if (exif.gpsLatitude > 17 && exif.gpsLatitude < 20 && 
          exif.gpsLongitude < -64 && exif.gpsLongitude > -66) {
        title = 'Photo - Little St. James Island';
      }
    }
  } else {
    title = 'Media File';
  }
  
  // Add date if available
  if (exif?.dateTaken) {
    const date = new Date(exif.dateTaken);
    const dateStr = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    title += ` (${dateStr})`;
  }
  
  // Add camera info for drone footage
  if (isDrone && exif?.cameraModel) {
    title += ` - ${exif.cameraModel}`;
  }
  
  return title || baseName;
}

async function main() {
  console.log('🔄 Starting media enrichment with EXIF data...\n');
  console.log(`📂 Database: ${DB_PATH}`);
  console.log(`📁 Originals: ${ORIGINALS_DIR}`);
  
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  
  // Check if originals directory exists
  if (!fs.existsSync(ORIGINALS_DIR)) {
    console.error(`❌ Originals directory not found: ${ORIGINALS_DIR}`);
    process.exit(1);
  }
  
  // Get list of original files
  const files = fs.readdirSync(ORIGINALS_DIR).filter(f => {
    const ext = path.extname(f).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.mp4', '.mov', '.cr2'].includes(ext);
  });
  
  console.log(`\n📊 Found ${files.length} media files to process\n`);
  
  // Prepare database statements
  const checkStmt = db.prepare(`SELECT id, title, metadata_json, exif_json FROM documents WHERE file_name = ?`);
  const updateStmt = db.prepare(`
    UPDATE documents 
    SET title = ?, exif_json = ?
    WHERE id = ?
  `);
  
  let processed = 0;
  let updated = 0;
  let notFound = 0;
  
  for (const file of files) {
    const filePath = path.join(ORIGINALS_DIR, file);
    const ext = path.extname(file).toLowerCase();
    
    // Only extract EXIF from images
    let exif: ExifData | null = null;
    if (['.jpg', '.jpeg', '.cr2'].includes(ext)) {
      exif = extractExif(filePath);
    }
    
    // Generate title
    const title = generateTitle(file, exif);
    
    // Find matching document in database
    const doc = checkStmt.get(file) as any;
    
    if (doc) {
      // Merge with existing metadata
      let existingMeta = {};
      try {
        if (doc.metadata_json) {
          existingMeta = JSON.parse(doc.metadata_json);
        }
      } catch {}
      
      const mergedMeta = {
        ...existingMeta,
        exif: exif,
        enrichedAt: new Date().toISOString(),
        originalFile: filePath
      };
      
      // Update if title is currently just filename or empty
      const shouldUpdateTitle = !doc.title || doc.title === file || doc.title === path.basename(file, ext);
      
      if (shouldUpdateTitle || exif) {
        updateStmt.run(
          shouldUpdateTitle ? title : doc.title,
          JSON.stringify(mergedMeta),
          doc.id
        );
        updated++;
        console.log(`✅ Updated: ${file} -> "${title}"`);
      }
    } else {
      notFound++;
    }
    
    processed++;
    if (processed % 50 === 0) {
      console.log(`   Processed ${processed}/${files.length}...`);
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Files processed: ${processed}`);
  console.log(`   Documents updated: ${updated}`);
  console.log(`   Not found in DB: ${notFound}`);
  
  // Also try to update media_items table if it exists
  try {
    const mediaCheckStmt = db.prepare(`SELECT id, title, metadata_json, file_path FROM media_items LIMIT 1`);
    const hasMediaItems = mediaCheckStmt.get();
    
    if (hasMediaItems) {
      console.log('\n📸 Updating media_items table...');
      
      const mediaUpdateStmt = db.prepare(`
        UPDATE media_items 
        SET title = ?, metadata_json = ?
        WHERE id = ?
      `);
      
      const allMedia = db.prepare(`SELECT id, title, file_path, metadata_json FROM media_items`).all() as any[];
      let mediaUpdated = 0;
      
      for (const media of allMedia) {
        const fileName = path.basename(media.file_path);
        const originalPath = path.join(ORIGINALS_DIR, fileName);
        
        if (fs.existsSync(originalPath)) {
          const ext = path.extname(fileName).toLowerCase();
          let exif: ExifData | null = null;
          
          if (['.jpg', '.jpeg', '.cr2'].includes(ext)) {
            exif = extractExif(originalPath);
          }
          
          const title = generateTitle(fileName, exif);
          
          let existingMeta = {};
          try {
            if (media.metadata_json) {
              existingMeta = JSON.parse(media.metadata_json);
            }
          } catch {}
          
          const mergedMeta = {
            ...existingMeta,
            exif: exif,
            enrichedAt: new Date().toISOString()
          };
          
          const shouldUpdateTitle = !media.title || media.title === fileName;
          
          if (shouldUpdateTitle || exif) {
            mediaUpdateStmt.run(
              shouldUpdateTitle ? title : media.title,
              JSON.stringify(mergedMeta),
              media.id
            );
            mediaUpdated++;
          }
        }
      }
      
      console.log(`   Media items updated: ${mediaUpdated}`);
    }
  } catch (e) {
    console.log('   (media_items table not available)');
  }
  
  db.close();
  console.log('\n✅ Media enrichment complete!');
}

main().catch(console.error);
