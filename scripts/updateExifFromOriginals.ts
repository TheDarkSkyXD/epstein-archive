#!/usr/bin/env node
/**
 * Update EXIF data for existing media images from original high-res files
 * 
 * Usage:
 *   ORIGINALS_DIR="/path/to/originals" npx tsx scripts/updateExifFromOriginals.ts
 * 
 * This script:
 * 1. Scans existing images in the database
 * 2. Looks for matching original files in ORIGINALS_DIR
 * 3. Extracts EXIF data from originals
 * 4. Updates database entries (does NOT create new ones)
 */

import * as fs from 'fs';
import * as path from 'path';
import Database from 'better-sqlite3';
import ExifParser from 'exif-parser';
import { execSync } from 'child_process';

// Configuration
const ORIGINALS_DIR = process.env.ORIGINALS_DIR || path.join(process.cwd(), 'data/media/originals');
const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'epstein-archive.db');
const CATEGORY_FILTER = process.env.CATEGORY || ''; // Optional: filter by album/category name

console.log('📷 EXIF Update Script');
console.log('=====================');
console.log(`  Database: ${DB_PATH}`);
console.log(`  Originals: ${ORIGINALS_DIR}`);
if (CATEGORY_FILTER) console.log(`  Filter: ${CATEGORY_FILTER}`);
console.log('');

// Check if originals directory exists
if (!fs.existsSync(ORIGINALS_DIR)) {
  console.error(`❌ Originals directory not found: ${ORIGINALS_DIR}`);
  console.error(`   Create it and place original images there, matching folder structure.`);
  process.exit(1);
}

// Extract EXIF using exif-parser
function extractEXIF(filepath: string): any {
  try {
    const buffer = fs.readFileSync(filepath);
    const parser = ExifParser.create(buffer);
    const result = parser.parse();
    
    const tags = result.tags || {};
    
    // Extract GPS coordinates
    let latitude: number | null = null;
    let longitude: number | null = null;
    if (tags.GPSLatitude !== undefined && tags.GPSLongitude !== undefined) {
      const latValue = Number(tags.GPSLatitude);
      const lonValue = Number(tags.GPSLongitude);
      if (!isNaN(latValue)) {
        latitude = (tags.GPSLatitudeRef === 'S') ? -latValue : latValue;
      }
      if (!isNaN(lonValue)) {
        longitude = (tags.GPSLongitudeRef === 'W') ? -lonValue : lonValue;
      }
    }
    
    // Format shutter speed
    let shutterSpeed: string | undefined;
    if (tags.ExposureTime) {
      shutterSpeed = tags.ExposureTime < 1 
        ? `1/${Math.round(1 / tags.ExposureTime)}s`
        : `${tags.ExposureTime}s`;
    }
    
    // Format focal length
    let focalLength: string | undefined;
    if (tags.FocalLength) {
      focalLength = `${tags.FocalLength}mm`;
    }
    
    return {
      cameraMake: tags.Make,
      cameraModel: tags.Model,
      lens: tags.LensModel || tags.LensMake,
      focalLength,
      aperture: tags.FNumber?.toString(),
      shutterSpeed,
      iso: tags.ISO,
      latitude,
      longitude,
      colorProfile: tags.ColorSpace === 1 ? 'sRGB' : tags.ColorSpace === 2 ? 'Adobe RGB' : undefined,
      orientation: tags.Orientation,
      dateTaken: tags.DateTimeOriginal ? new Date(tags.DateTimeOriginal * 1000).toISOString() : undefined
    };
  } catch (error) {
    return null;
  }
}

// Find matching original file
function findOriginalFile(filename: string, albumName: string): string | null {
  // Try various locations
  const candidates = [
    path.join(ORIGINALS_DIR, albumName, filename),
    path.join(ORIGINALS_DIR, filename),
    // Try with original filename patterns
    path.join(ORIGINALS_DIR, albumName, filename.replace(/^\d{8}_/, '')),
    path.join(ORIGINALS_DIR, filename.replace(/^\d{8}_/, '')),
  ];
  
  // Also try common extensions
  const extensions = ['.jpg', '.jpeg', '.JPG', '.JPEG', '.png', '.PNG'];
  const baseWithoutExt = filename.replace(/\.[^/.]+$/, '');
  
  for (const ext of extensions) {
    candidates.push(path.join(ORIGINALS_DIR, albumName, baseWithoutExt + ext));
    candidates.push(path.join(ORIGINALS_DIR, baseWithoutExt + ext));
  }
  
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  
  return null;
}

async function main() {
  const db = new Database(DB_PATH);
  
  // Get all images, optionally filtered by album
  let query = `
    SELECT mi.id, mi.filename, mi.original_filename, mi.title, ma.name as album_name
    FROM media_images mi
    LEFT JOIN media_albums ma ON mi.album_id = ma.id
  `;
  
  if (CATEGORY_FILTER) {
    query += ` WHERE ma.name LIKE '%${CATEGORY_FILTER}%'`;
  }
  
  const images = db.prepare(query).all() as any[];
  console.log(`📊 Found ${images.length} images in database\n`);
  
  // Prepare update statement
  const updateStmt = db.prepare(`
    UPDATE media_images SET
      camera_make = COALESCE(?, camera_make),
      camera_model = COALESCE(?, camera_model),
      lens = COALESCE(?, lens),
      focal_length = COALESCE(?, focal_length),
      aperture = COALESCE(?, aperture),
      shutter_speed = COALESCE(?, shutter_speed),
      iso = COALESCE(?, iso),
      latitude = COALESCE(?, latitude),
      longitude = COALESCE(?, longitude),
      color_profile = COALESCE(?, color_profile),
      orientation = COALESCE(?, orientation),
      date_taken = COALESCE(?, date_taken)
    WHERE id = ?
  `);
  
  let updated = 0;
  let notFound = 0;
  let noExif = 0;
  
  for (const image of images) {
    const albumName = image.album_name || 'Uncategorized';
    const originalFilename = image.original_filename || image.filename;
    
    // Find matching original
    const originalPath = findOriginalFile(originalFilename, albumName);
    
    if (!originalPath) {
      notFound++;
      continue;
    }
    
    // Extract EXIF
    const exif = extractEXIF(originalPath);
    
    if (!exif || (!exif.cameraMake && !exif.latitude && !exif.dateTaken)) {
      noExif++;
      continue;
    }
    
    // Update database
    updateStmt.run(
      exif.cameraMake,
      exif.cameraModel,
      exif.lens,
      exif.focalLength,
      exif.aperture,
      exif.shutterSpeed,
      exif.iso,
      exif.latitude,
      exif.longitude,
      exif.colorProfile,
      exif.orientation,
      exif.dateTaken,
      image.id
    );
    
    updated++;
    if (updated % 10 === 0) {
      process.stdout.write(`\r✓ Updated ${updated} images...`);
    }
  }
  
  console.log(`\n\n📊 Results:`);
  console.log(`  ✅ Updated: ${updated}`);
  console.log(`  ⚠️  No original found: ${notFound}`);
  console.log(`  📭 No EXIF data: ${noExif}`);
  
  db.close();
  console.log('\n✅ EXIF update complete!');
}

main().catch(console.error);
