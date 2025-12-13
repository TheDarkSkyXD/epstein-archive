/**
 * Import USVI Images with EXIF Data
 * 
 * Extracts EXIF from originals and imports web-optimized images into media_items
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import ExifParser from 'exif-parser';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'epstein-archive-production.db');
const USVI_DIR = path.join(process.cwd(), 'data', 'media', 'images', '12.03.25 USVI Production');
const ORIGINALS_DIR = path.join(USVI_DIR, 'originals');

interface ExifData {
  dateTaken?: string;
  cameraMake?: string;
  cameraModel?: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  imageWidth?: number;
  imageHeight?: number;
  orientation?: number;
}

function extractExif(filePath: string): ExifData | null {
  try {
    const buffer = fs.readFileSync(filePath);
    const parser = ExifParser.create(buffer);
    const result = parser.parse();
    
    const tags = result.tags;
    const exif: ExifData = {};
    
    if (tags.DateTimeOriginal) {
      exif.dateTaken = new Date(tags.DateTimeOriginal * 1000).toISOString();
    } else if (tags.CreateDate) {
      exif.dateTaken = new Date(tags.CreateDate * 1000).toISOString();
    }
    
    if (tags.Make) exif.cameraMake = tags.Make;
    if (tags.Model) exif.cameraModel = tags.Model;
    
    if (tags.GPSLatitude !== undefined && tags.GPSLongitude !== undefined) {
      exif.gpsLatitude = tags.GPSLatitude;
      exif.gpsLongitude = tags.GPSLongitude;
    }
    
    if (result.imageSize) {
      exif.imageWidth = result.imageSize.width;
      exif.imageHeight = result.imageSize.height;
    }
    
    if (tags.Orientation) exif.orientation = tags.Orientation;
    
    return Object.keys(exif).length > 0 ? exif : null;
  } catch {
    return null;
  }
}

function generateTitle(filename: string, exif: ExifData | null): string {
  const baseName = path.basename(filename, path.extname(filename));
  const isDrone = baseName.startsWith('DJI_');
  const isVideo = baseName.startsWith('MVI_');
  
  let title = '';
  let location = '';
  
  // Check GPS for Little St. James Island (approximately 18.3°N, 64.8°W)
  if (exif?.gpsLatitude && exif?.gpsLongitude) {
    if (exif.gpsLatitude > 17 && exif.gpsLatitude < 20 && 
        exif.gpsLongitude < -64 && exif.gpsLongitude > -66) {
      location = 'Little St. James Island';
    }
  }
  
  if (isDrone) {
    title = location ? `Drone Aerial - ${location}` : 'Drone Aerial Footage';
    if (exif?.cameraModel) {
      title += ` (${exif.cameraModel})`;
    }
  } else if (isVideo) {
    title = location ? `Video - ${location}` : 'Property Video Recording';
  } else {
    title = location ? `Property Photo - ${location}` : 'USVI Property Photo';
  }
  
  // Add date if available
  if (exif?.dateTaken) {
    const date = new Date(exif.dateTaken);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    title += ` - ${dateStr}`;
  }
  
  return title;
}

async function main() {
  console.log('🔄 Importing USVI images with EXIF data...\n');
  
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  
  // Get web-optimized images (not in originals subfolder)
  const webImages = fs.readdirSync(USVI_DIR).filter(f => {
    if (f === 'originals' || f.startsWith('.')) return false;
    const ext = path.extname(f).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.mp4', '.mov'].includes(ext);
  });
  
  console.log(`📊 Found ${webImages.length} web-optimized images`);
  console.log(`📁 Originals dir: ${ORIGINALS_DIR}\n`);
  
  // Check/create media_items insert statement
  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO media_items 
    (file_path, file_type, title, description, metadata_json, verification_status, red_flag_rating)
    VALUES (?, ?, ?, ?, ?, 'verified', 3)
  `);
  
  let imported = 0;
  let withExif = 0;
  let withGps = 0;
  
  const transaction = db.transaction(() => {
    for (const file of webImages) {
      const webPath = path.join(USVI_DIR, file);
      const originalPath = path.join(ORIGINALS_DIR, file);
      const ext = path.extname(file).toLowerCase();
      const fileType = ['.mp4', '.mov'].includes(ext) ? 'video' : 'image';
      
      // Try to get EXIF from original (better quality/more data)
      let exif: ExifData | null = null;
      if (['.jpg', '.jpeg'].includes(ext)) {
        if (fs.existsSync(originalPath)) {
          exif = extractExif(originalPath);
        } else {
          exif = extractExif(webPath);
        }
      }
      
      const title = generateTitle(file, exif);
      const description = exif?.gpsLatitude 
        ? `GPS: ${exif.gpsLatitude.toFixed(6)}, ${exif.gpsLongitude?.toFixed(6)}`
        : 'USVI Property Documentation';
      
      const metadata = {
        exif,
        originalPath: fs.existsSync(originalPath) ? originalPath : null,
        importedAt: new Date().toISOString(),
        source: 'USVI Production Dec 2025'
      };
      
      insertStmt.run(
        webPath,
        fileType,
        title,
        description,
        JSON.stringify(metadata)
      );
      
      imported++;
      if (exif) {
        withExif++;
        if (exif.gpsLatitude) withGps++;
      }
      
      if (imported <= 5) {
        console.log(`✅ ${file} -> "${title}"`);
        if (exif?.gpsLatitude) {
          console.log(`   📍 GPS: ${exif.gpsLatitude.toFixed(4)}, ${exif.gpsLongitude?.toFixed(4)}`);
        }
      }
    }
  });
  
  transaction();
  
  console.log(`\n📊 Summary:`);
  console.log(`   Images imported: ${imported}`);
  console.log(`   With EXIF data: ${withExif}`);
  console.log(`   With GPS coords: ${withGps}`);
  
  db.close();
  console.log('\n✅ USVI image import complete!');
}

main().catch(console.error);
