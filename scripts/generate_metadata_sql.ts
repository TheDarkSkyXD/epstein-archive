import fs from 'fs';
import path from 'path';
import exifParser from 'exif-parser';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const MEDIA_ROOT = path.join(PROJECT_ROOT, 'data/media');

function escapeSqlString(str: string | null | undefined): string {
  if (str === null || str === undefined) return 'NULL';
  return "'" + str.replace(/'/g, "''") + "'";
}

function escapeSqlNumber(num: number | undefined): string {
  if (num === undefined || num === null || isNaN(num)) return 'NULL';
  return num.toString();
}

console.log('-- Metadata Update Script');
console.log('BEGIN TRANSACTION;');

function processFile(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (!['.jpg', '.jpeg'].includes(ext)) return;

  const filename = path.basename(filePath);

  try {
    const buffer = fs.readFileSync(filePath);
    const parser = exifParser.create(buffer);
    const result = parser.parse();

    if (result.tags) {
        let hasUpdates = false;
        let setClauses = [];

        if (result.tags.DateTimeOriginal) {
            const date = new Date(result.tags.DateTimeOriginal * 1000).toISOString();
            setClauses.push(`date_taken = ${escapeSqlString(date)}`);
            hasUpdates = true;
        }
        if (result.tags.Make) {
             setClauses.push(`camera_make = ${escapeSqlString(result.tags.Make)}`);
             hasUpdates = true;
        }
        if (result.tags.Model) {
            setClauses.push(`camera_model = ${escapeSqlString(result.tags.Model)}`);
            hasUpdates = true;
        }
        if (result.tags.GPSLatitude) {
             setClauses.push(`latitude = ${escapeSqlNumber(result.tags.GPSLatitude)}`);
             hasUpdates = true;
        }
        if (result.tags.GPSLongitude) {
             setClauses.push(`longitude = ${escapeSqlNumber(result.tags.GPSLongitude)}`);
             hasUpdates = true;
        }
        if (result.tags.ISO) {
             setClauses.push(`iso = ${escapeSqlNumber(result.tags.ISO)}`);
             hasUpdates = true;
        }
        if (result.tags.FNumber) {
             setClauses.push(`aperture = ${escapeSqlNumber(result.tags.FNumber)}`);
             hasUpdates = true;
        }
        if (result.tags.ExposureTime) {
             setClauses.push(`shutter_speed = ${escapeSqlNumber(result.tags.ExposureTime)}`);
             hasUpdates = true;
        }
        if (result.tags.FocalLength) {
             setClauses.push(`focal_length = ${escapeSqlNumber(result.tags.FocalLength)}`);
             hasUpdates = true;
        }

        if (hasUpdates) {
             // We update by filename.
             // Note: using COALESCE or overwriting? Overwriting is fine since current data is NULL/empty.
             const sql = `UPDATE media_images SET ${setClauses.join(', ')} WHERE filename = ${escapeSqlString(filename)};`;
             console.log(sql);
        }
    }
  } catch (e) {
    // console.error(`-- Error processing ${filename}: ${e}`);
  }
}

function walkDir(dir: string) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach((f) => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath);
    } else {
      processFile(dirPath);
    }
  });
}

walkDir(MEDIA_ROOT);

console.log('COMMIT;');
