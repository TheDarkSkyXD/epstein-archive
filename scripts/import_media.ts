import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import exifParser from 'exif-parser';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DB_PATH = process.env.DB_PATH || path.join(PROJECT_ROOT, 'epstein-archive-production.db');
const MEDIA_ROOT = process.env.MEDIA_ROOT || path.join(PROJECT_ROOT, 'data/media');
const THUMBNAILS_ROOT = process.env.THUMBNAILS_ROOT || path.join(PROJECT_ROOT, 'data/thumbnails');
const BACKUPS_DIR = path.join(PROJECT_ROOT, 'backups');

console.log(`Using database: ${DB_PATH}`);
console.log(`Scanning media from: ${MEDIA_ROOT}`);
console.log(`Thumbnails output: ${THUMBNAILS_ROOT}`);

if (!fs.existsSync(DB_PATH)) {
  console.error('Database not found!');
  process.exit(1);
}

if (!fs.existsSync(THUMBNAILS_ROOT)) {
  fs.mkdirSync(THUMBNAILS_ROOT, { recursive: true });
}

const db = new Database(DB_PATH);

// --- Backup Recovery Setup ---
let backupDb: any = null;

function findLatestBackup(): string | null {
  if (!fs.existsSync(BACKUPS_DIR)) return null;
  
  const todayStr = '20251211';
  const files = fs.readdirSync(BACKUPS_DIR)
    .filter(f => f.startsWith('epstein') && f.endsWith('.db') && !f.includes(todayStr))
    .map(f => path.join(BACKUPS_DIR, f))
    .sort((a, b) => fs.statSync(b).mtime.getTime() - fs.statSync(a).mtime.getTime());

  return files.length > 0 ? files[0] : null;
}

const latestBackupPath = findLatestBackup();
if (latestBackupPath) {
  console.log(`💡 Found backup to recover titles from: ${latestBackupPath}`);
  try {
    backupDb = new Database(latestBackupPath, { readonly: true });
  } catch (err) {
    console.error(`⚠️  Failed to open backup database: ${err}`);
  }
} else {
  console.log('⚠️  No backup found. Titles will duplicate filenames.');
}

// Map of cache
const albumCache = new Map<string, number>();
const albumCounters = new Map<number, number>();

function getOrCreateAlbum(albumName: string): number {
  if (albumCache.has(albumName)) return albumCache.get(albumName)!;

  const stmt = db.prepare("SELECT id FROM media_albums WHERE name = ?");
  const album = stmt.get(albumName);
  
  if (album) {
    albumCache.set(albumName, (album as any).id);
    return (album as any).id;
  }

  const insert = db.prepare("INSERT INTO media_albums (name, description) VALUES (?, ?)");
  // If it's "Unsorted", keep the description, otherwise generic
  const desc = albumName === 'Unsorted' ? 'Automatically imported images' : `Images from ${albumName}`;
  const info = insert.run(albumName, desc);
  albumCache.set(albumName, Number(info.lastInsertRowid));
  return Number(info.lastInsertRowid);
}

// Ensure Unsorted exists
getOrCreateAlbum('Unsorted');

// Recursive function to walk directories
function walkDir(dir: string, callback: (filePath: string) => void) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach((f) => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      if (f === 'thumbnails') return; // Skip thumbnails dir if inside media
      walkDir(dirPath, callback);
    } else {
      callback(dirPath);
    }
  });
}

const insertStmt = db.prepare(`
  INSERT INTO media_images (
    filename, original_filename, path, thumbnail_path, title, description,
    album_id, file_size, format, date_added,
    width, height, date_taken, camera_make, camera_model,
    latitude, longitude, iso, aperture, shutter_speed, focal_length
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const updateStmt = db.prepare(`
  UPDATE media_images SET 
    thumbnail_path = ?,
    album_id = ?,
    width = ?,
    height = ?,
    date_taken = ?,
    camera_make = ?,
    camera_model = ?,
    latitude = ?,
    longitude = ?,
    iso = ?,
    aperture = ?,
    shutter_speed = ?,
    focal_length = ?,
    title = COALESCE(?, title), 
    description = COALESCE(?, description)
  WHERE path = ?
`);

async function processImage(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (!['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) return;

  // Skip files in "originals" directories
  const pathParts = filePath.split(path.sep);
  if (pathParts.includes('originals')) {
    console.log(`  ⏭️  Skipping file in originals directory: ${filePath}`);
    return;
  }

  const filename = path.basename(filePath);
  const relativeFromData = path.relative(path.join(PROJECT_ROOT, 'data'), filePath);
  const webPath = '/data/' + relativeFromData.split(path.sep).join('/'); 

  // --- Album Logic ---
  // Get parent folder name relative to MEDIA_ROOT
  // filePath: .../data/media/images/Aircraft/Img1.jpg
  // MEDIA_ROOT: .../data/media
  // relative: images/Aircraft/Img1.jpg
  // dir: images/Aircraft
  const relativeFromMediaRoot = path.relative(MEDIA_ROOT, filePath);
  const dirName = path.dirname(relativeFromMediaRoot);
  // dirName could be "images/Aircraft", "Aircraft", etc. 
  // We want the *immediate* parent folder name provided it's not the root or "images" generically
  
  const dirPathParts = dirName.split(path.sep);
  // Filter out 'images' if it's the top level
  // Strategy: Use the last part of the directory path as Album Name. 
  // If it is '.' or empty, use 'Unsorted'.
  let albumName = 'Unsorted';
  if (dirPathParts.length > 0 && String(dirPathParts[dirPathParts.length-1]) !== '.') {
      const lastPart =  dirPathParts[dirPathParts.length-1];
      if (lastPart !== 'images') {
          albumName = lastPart;
      }
  }
  
  const albumId = getOrCreateAlbum(albumName);

  // --- Thumbnail Generation ---
  const thumbFilename = `thumb_${filename.replace(/\.[^/.]+$/, "")}.webp`;
  // Mirror structure relative to MEDIA_ROOT
  const thumbDir = path.join(THUMBNAILS_ROOT, dirName);
  if (!fs.existsSync(thumbDir)) fs.mkdirSync(thumbDir, { recursive: true });
  
  const thumbPath = path.join(thumbDir, thumbFilename);
  const relativeThumbFromData = path.relative(path.join(PROJECT_ROOT, 'data'), thumbPath);
  const legacyThumbPath = '/' + relativeThumbFromData.split(path.sep).join('/'); // e.g. /thumbnails/images/Aircraft/thumb.webp

  const stats = fs.statSync(filePath);
  let fileBuffer = fs.readFileSync(filePath);

  // --- Check for original file with richer EXIF data ---
  // Look for matching file in originals subdirectory
  let originalFilePath = null;
  const originalsDir = path.join(path.dirname(filePath), 'originals');
  if (fs.existsSync(originalsDir)) {
    const originalCandidate = path.join(originalsDir, filename);
    if (fs.existsSync(originalCandidate)) {
      originalFilePath = originalCandidate;
      console.log(`  🔍 Found original file: ${filename}`);
    } else {
      // Try with different extensions
      const baseName = path.basename(filename, path.extname(filename));
      const extensions = ['.jpg', '.jpeg', '.JPG', '.JPEG', '.png', '.PNG'];
      for (const ext of extensions) {
        const originalCandidate = path.join(originalsDir, baseName + ext);
        if (fs.existsSync(originalCandidate)) {
          originalFilePath = originalCandidate;
          console.log(`  🔍 Found original file with different extension: ${baseName + ext}`);
          break;
        }
      }
    }
  }

  // If original file found, use it for EXIF extraction
  if (originalFilePath) {
    try {
      fileBuffer = fs.readFileSync(originalFilePath);
      console.log(`  📸 Using original file for EXIF extraction: ${path.basename(originalFilePath)}`);
    } catch (e) {
      console.log(`  ⚠️  Failed to read original file, falling back to web version`);
    }
  }

  let metadata: any = {
    width: 0,
    height: 0,
    generatedThumb: false
  };

  try {
     // 1. Generate Thumbnail
     if (!fs.existsSync(thumbPath)) {
        await sharp(fileBuffer)
          .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 80 })
          .toFile(thumbPath);
        metadata.generatedThumb = true;
     }

     // 2. Parse EXIF
     if (['.jpg', '.jpeg'].includes(ext)) {
        try {
           const parser = exifParser.create(fileBuffer);
           const result = parser.parse();
           if (result.tags) {
              metadata.date_taken = result.tags.DateTimeOriginal ? new Date(result.tags.DateTimeOriginal * 1000).toISOString() : null;
              metadata.camera_make = result.tags.Make;
              metadata.camera_model = result.tags.Model;
              metadata.iso = result.tags.ISO;
              metadata.aperture = result.tags.FNumber;
              metadata.shutter_speed = result.tags.ExposureTime;
              metadata.focal_length = result.tags.FocalLength;
              metadata.latitude = result.tags.GPSLatitude;
              metadata.longitude = result.tags.GPSLongitude;
              
              if (metadata.date_taken) console.log(`  📸 Found EXIF Date: ${metadata.date_taken}`);
              if (metadata.camera_make) console.log(`  📷 Found Camera: ${metadata.camera_make}`);
           } else {
             console.log(`  ⚠️  No EXIF tags found for ${filename}`);
           }
           if (result.imageSize) {
             metadata.width = result.imageSize.width;
             metadata.height = result.imageSize.height;
           }
        } catch (e: any) {
           console.error(`  ❌ EXIF Parse Error: ${e.message}`);
        }
     } else {
        const sharpMeta = await sharp(fileBuffer).metadata();
        metadata.width = sharpMeta.width;
        metadata.height = sharpMeta.height;
     }

     // 3. Recovery from Backup
     let recoveredTitle = filename;
     let recoveredDescription = null;

     if (backupDb) {
         try {
             // Try match by filename exact
             const backupRec = backupDb.prepare('SELECT title, description FROM media_images WHERE filename = ?').get(filename);
             if (backupRec) {
                 if (backupRec.title && backupRec.title !== filename) {
                     recoveredTitle = backupRec.title;
                     console.log(`  ♻️  Recovered Title: "${recoveredTitle}"`);
                 }
                 if (backupRec.description) {
                     recoveredDescription = backupRec.description;
                     console.log(`  📝 Recovered Description: "${backupRec.description.substring(0,20)}..."`);
                 }
             } else {
                // console.log(`  ⚠️  No backup record for ${filename}`);
             }
         } catch (e) { /* ignore backup errors */ }
     }

     // Generate title from filename if no better title was recovered
      // 3. Title Refinement
      let generatedTitle = recoveredTitle;

      // Maintain a counter for this album to ensure unique and stable numbering during this run
      // This solves the issue where updates against a full DB would always get the same (max+1) count
      let currentSeq = albumCounters.get(albumId) || 0;
      currentSeq++;
      albumCounters.set(albumId, currentSeq);

      // Special Rule: USVI
      if (albumName.includes('USVI') || albumName.includes('Little Saint James')) {
         const uuidPattern = /^[a-f0-9]{8}[-_][a-f0-9]{4}[-_][a-f0-9]{4}[-_][a-f0-9]{4}[-_][a-f0-9]{12}/i;
         const isUuid = uuidPattern.test(filename.replace(/\.[^/.]+$/, ""));
         const isCamera = /^(DSC|IMG|PXL|MVI|H)_/i.test(filename) || /^\d{8}[-_]\d{6}/.test(filename); // Matches timestamps too
         
         // Apply to UUIDs, Camera filenames, or if the current title is just the filename
         if (generatedTitle === filename || isUuid || isCamera) {
             generatedTitle = `Little Saint James, U.S. Virgin Islands ${currentSeq}`;
             // console.log(`  🏝️  USVI Image detected: "${generatedTitle}"`);
         }
      }

      const ALBUM_DESCRIPTIONS: Record<string, string> = {
        'USVI': 'Little Saint James, a private island in the U.S. Virgin Islands, was the primary residence of Jeffrey Epstein. These images depict the structures, grounds, and interior of the complex, known locally as "Epstein Island".',
        'Little Saint James': 'Little Saint James, a private island in the U.S. Virgin Islands, was the primary residence of Jeffrey Epstein. These images depict the structures, grounds, and interior of the complex, known locally as "Epstein Island".',
        'Trump': 'Photographs documenting interactions between Donald Trump and Jeffrey Epstein, primarily from the 1990s and early 2000s at Mar-a-Lago and other social events.',
        'Prince Andrew': 'Images involving Prince Andrew, Duke of York, often in the company of Jeffrey Epstein or Ghislaine Maxwell.',
        'Ghislaine': 'Images of Ghislaine Maxwell, Epstein\'s longtime associate and convicted sex offender.',
        'Clinton': 'Photographs showing Bill Clinton in proximity to Epstein or Maxwell, including trips aboard Epstein\'s aircraft.',
        'Aircraft': 'Images of Epstein\'s private fleet, including the Boeing 727 (N908JE) and Gulfstream jets.',
        'Properties': 'Various properties owned by Jeffrey Epstein, including the New York mansion (9 E 71st St), Palm Beach estate, and Zorro Ranch in New Mexico.',
        'Survivors': 'Images related to the brave survivors who have come forward to testify about the abuse they suffered.',
        'Perpretrators': 'Individuals alleged to have participated in or facilitated the trafficking network.',
        'Evidence': 'Physical and digital evidence collected during investigations.'
      };

      let generatedDescription = recoveredDescription;
      if (!generatedDescription) {
         for (const [key, desc] of Object.entries(ALBUM_DESCRIPTIONS)) {
             if (albumName.includes(key)) {
                 generatedDescription = desc;
                 break;
             }
         }
      }

      if (generatedTitle === filename) {
        // Check if filename looks like a UUID (contains many hyphens and hex chars)
        const uuidPattern = /^[a-f0-9]{8}[-_][a-f0-9]{4}[-_][a-f0-9]{4}[-_][a-f0-9]{4}[-_][a-f0-9]{12}/i;
        const isUuidFilename = uuidPattern.test(filename.replace(/\.[^/.]+$/, ""));
        
        if (isUuidFilename && albumName !== 'Unsorted') {
          // Use album name as base title for UUID-named files
          generatedTitle = `${albumName} Photo ${currentSeq}`;
          console.log(`  🔄 UUID filename detected, using album-based title: "${generatedTitle}"`);
        } else {
          // Remove extension and replace underscores/hyphens with spaces
          generatedTitle = filename.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
          // Capitalize first letter of each word
          generatedTitle = generatedTitle.replace(/\b\w/g, char => char.toUpperCase());
        }
      }

     // 4. Upsert
     // Since we changed album logic, we must check if file exists.
     // We match by PATH (webPath).
     
     // Legacy path check (without /data prefix if old DB had that)
     const legacyWebPath = '/' + path.relative(path.join(PROJECT_ROOT, 'data'), filePath).split(path.sep).join('/');
     // Actually legacyWebPath IS webPath in my logic above. 
     // Old import might have used: const relativePath = path.relative(path.join(PROJECT_ROOT, 'data'), filePath);
     // Let's rely on filename match if path fails? No, filenames duplicate. Path is key.
     
     const existing = db.prepare('SELECT id FROM media_images WHERE path = ?').get(webPath);

     if (existing) {
        // Update
        updateStmt.run(
          legacyThumbPath,
          albumId,
          metadata.width,
          metadata.height,
          metadata.date_taken,
          metadata.camera_make,
          metadata.camera_model,
          metadata.latitude,
          metadata.longitude,
          metadata.iso,
          metadata.aperture,
          metadata.shutter_speed,
          metadata.focal_length,
          recoveredTitle !== filename ? recoveredTitle : generatedTitle, // Use generated title if no better one was recovered
          generatedDescription, // Description from backup or album rules
          webPath
        );
        process.stdout.write('.');
     } else {
        // Insert
        insertStmt.run(
          filename,
          filename,
          webPath,
          legacyThumbPath,
          recoveredTitle !== filename ? recoveredTitle : generatedTitle, // Use generated title if no better one was recovered
          generatedDescription,
          albumId,
          stats.size,
          ext.replace('.', ''),
          metadata.width,
          metadata.height,
          metadata.date_taken,
          metadata.camera_make,
          metadata.camera_model,
          metadata.latitude,
          metadata.longitude,
          metadata.iso,
          metadata.aperture,
          metadata.shutter_speed,
          metadata.focal_length
        );
        process.stdout.write('+');
     }

  } catch (err) {
     console.error(`\nFailed to process ${filename}:`, err);
  }
}

// Ensure promises are handled
const queue: string[] = [];
walkDir(MEDIA_ROOT, (fp) => queue.push(fp));

console.log(`Found ${queue.length} files. Processing...`);

(async () => {
    for (const fp of queue) {
        await processImage(fp);
    }
    console.log('\nDone.');
})();
