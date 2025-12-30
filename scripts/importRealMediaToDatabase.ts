#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import Database from 'better-sqlite3';
import { MediaService } from '../src/services/MediaService';
import { execSync } from 'child_process';
import ExifParser from 'exif-parser';
import sharp from 'sharp';

const SOURCE_DIR = process.env.SOURCE_DIR || '/opt/epstein-archive/data/media/images';
// ORIGINALS_DIR: Directory containing original (non-optimized) images for EXIF extraction
// Defaults to SOURCE_DIR/../originals - the "originals" folder is gitignored and never deployed
const ORIGINALS_DIR = process.env.ORIGINALS_DIR || path.join(path.dirname(SOURCE_DIR), 'originals');
const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'epstein-archive.db');

// Categories that need watermarking
const WATERMARK_CATEGORIES: Record<string, string> = {
  'Confirmed Fake': 'FAKE',
  'Unconfirmed Claims': 'UNVERIFIED'
};

/**
 * Apply watermark to an image for fake/unconfirmed content
 * Checks is_watermarked flag to avoid re-watermarking
 */
async function watermarkImage(
  imagePath: string, 
  watermarkText: string, 
  imageId: number, 
  db: any
): Promise<void> {
  // Check if already watermarked
  const image = db.prepare('SELECT is_watermarked FROM media_images WHERE id = ?').get(imageId) as { is_watermarked: number } | undefined;
  if (image?.is_watermarked === 1) {
    return; // Already watermarked, skip
  }

  if (!fs.existsSync(imagePath)) {
    console.warn(`Cannot watermark - file not found: ${imagePath}`);
    return;
  }

  const tempPath = imagePath + '.watermarked.tmp';

  try {
    const metadata = await sharp(imagePath).metadata();
    const width = metadata.width || 1000;
    const height = metadata.height || 1000;
    const fontSize = Math.floor(width * 0.15);

    const svgImage = `
      <svg width="${width}" height="${height}">
        <style>
          .watermark { fill: rgba(255, 0, 0, 0.5); font-size: ${fontSize}px; font-weight: bold; font-family: sans-serif; }
        </style>
        <text x="50%" y="50%" text-anchor="middle" class="watermark" transform="rotate(-45, ${width/2}, ${height/2})">${watermarkText}</text>
      </svg>
    `;

    await sharp(imagePath)
      .composite([{
        input: Buffer.from(svgImage),
        top: 0,
        left: 0,
      }])
      .toFile(tempPath);

    fs.renameSync(tempPath, imagePath);
    
    // Mark as watermarked in database
    db.prepare('UPDATE media_images SET is_watermarked = 1 WHERE id = ?').run(imageId);
    console.log(`  💧 Watermarked: ${path.basename(imagePath)}`);
  } catch (e) {
    console.error(`Failed to watermark ${imagePath}:`, e);
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  }
}

interface ImageMetadata {
  originalPath: string;
  originalFilename: string;
  newFilename: string;
  title: string;
  description: string;
  category: string;
  albumName: string;
  tags: string[];
  width: number;
  height: number;
  fileSize: number;
  format: string;
  dateTaken?: string;
  exifData?: any;
  // Enhanced EXIF fields
  cameraMake?: string;
  cameraModel?: string;
  lens?: string;
  focalLength?: string;
  aperture?: string;
  shutterSpeed?: string;
  iso?: number;
  latitude?: number;
  longitude?: number;
  colorProfile?: string;
  orientation?: number;
  // Subject analysis
  detectedSubjects?: string[];
}

// Extract EXIF data using exif-parser (pure Node.js)
function extractEXIF(filepath: string): any {
  try {
    const buffer = fs.readFileSync(filepath);
    const parser = ExifParser.create(buffer);
    const result = parser.parse();
    
    const tags = result.tags || {};
    const imageSize = result.imageSize || {};
    
    // Extract GPS coordinates
    let latitude: number | undefined;
    let longitude: number | undefined;
    if (tags.GPSLatitude !== undefined && tags.GPSLongitude !== undefined) {
      latitude = tags.GPSLatitude;
      longitude = tags.GPSLongitude;
      // Apply reference direction
      if (tags.GPSLatitudeRef === 'S') latitude = -latitude;
      if (tags.GPSLongitudeRef === 'W') longitude = -longitude;
    }
    
    // Format shutter speed as fraction
    let shutterSpeed: string | undefined;
    if (tags.ExposureTime) {
      if (tags.ExposureTime < 1) {
        shutterSpeed = `1/${Math.round(1 / tags.ExposureTime)}s`;
      } else {
        shutterSpeed = `${tags.ExposureTime}s`;
      }
    }
    
    // Format focal length
    let focalLength: string | undefined;
    if (tags.FocalLength) {
      focalLength = `${tags.FocalLength}mm`;
    }
    
    return {
      Make: tags.Make,
      Model: tags.Model,
      Lens: tags.LensModel || tags.LensMake,
      FocalLength: focalLength,
      Aperture: tags.FNumber?.toString(),
      ShutterSpeed: shutterSpeed,
      ISO: tags.ISO,
      DateTimeOriginal: tags.DateTimeOriginal ? new Date(tags.DateTimeOriginal * 1000).toISOString() : undefined,
      CreateDate: tags.CreateDate ? new Date(tags.CreateDate * 1000).toISOString() : undefined,
      Latitude: latitude,
      Longitude: longitude,
      ColorSpace: tags.ColorSpace === 1 ? 'sRGB' : tags.ColorSpace === 2 ? 'Adobe RGB' : undefined,
      Orientation: tags.Orientation,
      Width: imageSize.width,
      Height: imageSize.height,
      Software: tags.Software,
      Artist: tags.Artist,
      Copyright: tags.Copyright
    };
  } catch (error) {
    // If exif-parser fails, try exiftool as fallback
    try {
      const output = execSync(`exiftool -json "${filepath}"`, { encoding: 'utf-8' });
      const data = JSON.parse(output);
      return data[0] || {};
    } catch {
      return {};
    }
  }
}

// Get image dimensions using sips (macOS built-in)
function getImageDimensions(filepath: string): { width: number; height: number } {
  try {
    const output = execSync(`sips -g pixelWidth -g pixelHeight "${filepath}"`, { encoding: 'utf-8' });
    const widthMatch = output.match(/pixelWidth:\s*(\d+)/);
    const heightMatch = output.match(/pixelHeight:\s*(\d+)/);
    
    return {
      width: widthMatch ? parseInt(widthMatch[1]) : 0,
      height: heightMatch ? parseInt(heightMatch[1]) : 0
    };
  } catch (error) {
    return { width: 0, height: 0 };
  }
}

// Analyze image and generate metadata
function analyzeImage(filepath: string, filename: string, category: string, stats: fs.Stats): ImageMetadata {
  const ext = path.extname(filename).toLowerCase();
  const format = ext.substring(1).toUpperCase();
  
  // Get dimensions from the optimized image
  const { width, height } = getImageDimensions(filepath);
  
  // Determine where to read EXIF from
  // If ORIGINALS_DIR is set, try to find the original file there for better EXIF data
  let exifSourcePath = filepath;
  if (ORIGINALS_DIR) {
    // Try to find matching original file
    // The original should be in ORIGINALS_DIR/category/filename (same structure)
    const originalPath = path.join(ORIGINALS_DIR, category, filename);
    if (fs.existsSync(originalPath)) {
      exifSourcePath = originalPath;
      console.log(`  📷 Reading EXIF from original: ${originalPath}`);
    } else {
      // Try without category (flat structure)
      const flatOriginalPath = path.join(ORIGINALS_DIR, filename);
      if (fs.existsSync(flatOriginalPath)) {
        exifSourcePath = flatOriginalPath;
        console.log(`  📷 Reading EXIF from original: ${flatOriginalPath}`);
      }
    }
  }
  
  // Extract EXIF from original (or optimized if no original found)
  const exif = extractEXIF(exifSourcePath);
  
  // Try to get date from EXIF
  let dateTaken: string | undefined;
  if (exif.DateTimeOriginal) {
    dateTaken = exif.DateTimeOriginal.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
  } else if (exif.CreateDate) {
    dateTaken = exif.CreateDate.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
  }
  
  // Use file modification date as fallback
  const fileDate = dateTaken || stats.mtime.toISOString().split('T')[0];
  const datePrefix = fileDate.replace(/-/g, '');
  
  // Generate title and description based on category and filename
  const baseName = path.basename(filename, ext);
  let title = baseName.replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
  let description = '';
  let tags: string[] = [];
  let albumName = category;
  
  // Category-specific processing
  switch (category) {
    case 'Trump Epstein':
      tags = ['trump', 'epstein', 'evidence', 'photo'];
      description = 'Photographic evidence of Trump-Epstein association';
      break;
    case 'Epstein':
      tags = ['epstein', 'photo', 'evidence'];
      description = 'Jeffrey Epstein photograph';
      break;
    case 'Ghislaine':
      tags = ['ghislaine-maxwell', 'photo', 'evidence'];
      description = 'Ghislaine Maxwell photograph';
      break;
    case 'Survivors':
      tags = ['survivors', 'victims', 'evidence'];
      description = 'Survivor/victim related image';
      break;
    case 'Evidence':
      tags = ['evidence', 'document', 'legal'];
      description = 'Legal evidence document or photograph';
      break;
    case 'Properties':
      tags = ['property', 'real-estate', 'location'];
      description = 'Property or location photograph';
      break;
    case 'Aircraft':
      tags = ['aircraft', 'lolita-express', 'transportation'];
      description = 'Aircraft photograph';
      break;
    case 'MAGA':
      tags = ['trump', 'maga', 'political'];
      description = 'MAGA/Trump related image';
      break;
    case 'Musk Epstein':
      tags = ['musk', 'epstein', 'photo'];
      description = 'Musk-Epstein association image';
      break;
    case 'Epstein Wexner':
      tags = ['epstein', 'wexner', 'photo'];
      description = 'Epstein-Wexner association image';
      break;
    case 'Perpetrators':
      tags = ['perpetrators', 'accused', 'evidence'];
      description = 'Perpetrator photograph';
      albumName = 'Perpetrators'; // Fix spelling
      break;
    case 'Whistleblowers':
      tags = ['whistleblowers', 'sources'];
      description = 'Whistleblower related image';
      break;
    case '12.03.25 USVI Production':
      tags = ['usvi', 'court-documents', 'legal', 'production'];
      description = 'USVI court production document';
      albumName = 'USVI Court Production';
      break;
    default:
      tags = ['uncategorized'];
      description = 'Media image';
  }
  
  // Create descriptive filename
  const categorySlug = category.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const titleSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50);
  const sizeStr = width > 0 && height > 0 ? `_${width}x${height}` : '';
  const newFilename = `${datePrefix}_${categorySlug}_${titleSlug}${sizeStr}${ext}`;
  
  // Detect subjects from filename/category for enhanced tagging
  const detectedSubjects: string[] = [];
  const lowerFilename = filename.toLowerCase();
  const lowerTitle = title.toLowerCase();
  
  // Subject detection patterns
  const subjectPatterns: [RegExp, string][] = [
    [/epstein/i, 'Jeffrey Epstein'],
    [/maxwell|ghislaine/i, 'Ghislaine Maxwell'],
    [/trump/i, 'Donald Trump'],
    [/clinton/i, 'Bill Clinton'],
    [/prince.?andrew|andrew/i, 'Prince Andrew'],
    [/wexner/i, 'Les Wexner'],
    [/musk|elon/i, 'Elon Musk'],
    [/gates|bill/i, 'Bill Gates'],
    [/spacey|kevin/i, 'Kevin Spacey'],
    [/dershowitz/i, 'Alan Dershowitz'],
  ];
  
  for (const [pattern, subject] of subjectPatterns) {
    if (pattern.test(lowerFilename) || pattern.test(lowerTitle) || pattern.test(category)) {
      if (!detectedSubjects.includes(subject)) {
        detectedSubjects.push(subject);
      }
    }
  }
  
  // Add detected subjects to tags
  const enhancedTags = [...tags, ...detectedSubjects.map(s => s.toLowerCase().replace(/\s+/g, '-'))];
  
  return {
    originalPath: filepath,
    originalFilename: filename,
    newFilename,
    title,
    description,
    category: categorySlug,
    albumName,
    tags: enhancedTags,
    width: exif.Width || width,
    height: exif.Height || height,
    fileSize: stats.size,
    format,
    dateTaken,
    exifData: exif,
    // Enhanced EXIF fields
    cameraMake: exif.Make,
    cameraModel: exif.Model,
    lens: exif.Lens,
    focalLength: exif.FocalLength,
    aperture: exif.Aperture,
    shutterSpeed: exif.ShutterSpeed,
    iso: exif.ISO,
    latitude: exif.Latitude,
    longitude: exif.Longitude,
    colorProfile: exif.ColorSpace,
    orientation: exif.Orientation,
    detectedSubjects
  };
}

async function main() {
  console.log('🔍 Scanning media directories...\n');
  
  if (!fs.existsSync(SOURCE_DIR)) {
    console.error('❌ Source directory not found:', SOURCE_DIR);
    process.exit(1);
  }
  
  const mediaService = new MediaService(DB_PATH);
  const db = new Database(DB_PATH); // For watermark tracking
  const analyses: ImageMetadata[] = [];
  const albumMap = new Map<string, number>();
  
  // Scan all category directories
  const categories = fs.readdirSync(SOURCE_DIR).filter(name => {
    const fullPath = path.join(SOURCE_DIR, name);
    return fs.statSync(fullPath).isDirectory() && !name.startsWith('.');
  });
  
  console.log(`📁 Found ${categories.length} categories\n`);
  
  // Analyze all images
  for (const category of categories) {
    const categoryPath = path.join(SOURCE_DIR, category);
    const files = fs.readdirSync(categoryPath).filter(f => 
      /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(f) && !f.startsWith('.')
    );
    
    console.log(`📸 ${category}: ${files.length} images`);
    
    for (const filename of files) {
      const filepath = path.join(categoryPath, filename);
      const stats = fs.statSync(filepath);
      const analysis = analyzeImage(filepath, filename, category, stats);
      analyses.push(analysis);
    }
  }
  
  console.log(`\n✅ Analyzed ${analyses.length} total images\n`);
  
  // Create or get existing albums (idempotent)
  console.log('📁 Creating/Getting albums...\n');
  const uniqueAlbums = [...new Set(analyses.map(a => a.albumName))];
  
  for (const albumName of uniqueAlbums) {
    const album = mediaService.getOrCreateAlbum(
      albumName,
      `Collection of ${albumName.toLowerCase()} related images`
    );
    albumMap.set(albumName, album.id);
    console.log(`✓ Album: ${albumName} (ID: ${album.id})`);
  }
  
  // Import images to database
  console.log('\n📝 Importing images to database...\n');
  
  const usedFilenames = new Set<string>();
  let imported = 0;
  let skipped = 0;
  
  for (const analysis of analyses) {
    const albumId = albumMap.get(analysis.albumName);
    
    // Skip if image already exists in database (idempotent)
    if (mediaService.imageExists(analysis.originalFilename, albumId)) {
      skipped++;
      continue;
    }
    
    // Handle duplicate filenames
    let newFilename = analysis.newFilename;
    if (usedFilenames.has(newFilename)) {
      const ext = path.extname(newFilename);
      const base = newFilename.substring(0, newFilename.length - ext.length);
      let counter = 2;
      while (usedFilenames.has(`${base}-${counter}${ext}`)) {
        counter++;
      }
      newFilename = `${base}-${counter}${ext}`;
    }
    usedFilenames.add(newFilename);
    
    // Generate enhanced title with detected subjects
    let enhancedTitle = analysis.title;
    if (analysis.detectedSubjects && analysis.detectedSubjects.length > 0) {
      enhancedTitle = `${analysis.detectedSubjects.join(' & ')} - ${analysis.title}`;
    }
    
    // Create database entry with all EXIF data
    const image = mediaService.createImage({
      filename: newFilename,
      originalFilename: analysis.originalFilename,
      path: analysis.originalPath,
      thumbnailPath: `/data/media/thumbnails/${newFilename}`,
      title: enhancedTitle,
      description: analysis.description,
      albumId,
      width: analysis.width,
      height: analysis.height,
      fileSize: analysis.fileSize,
      format: analysis.format,
      dateTaken: analysis.dateTaken,
      // Full EXIF data
      cameraMake: analysis.cameraMake,
      cameraModel: analysis.cameraModel,
      lens: analysis.lens,
      focalLength: analysis.focalLength,
      aperture: analysis.aperture,
      shutterSpeed: analysis.shutterSpeed,
      iso: analysis.iso,
      latitude: analysis.latitude,
      longitude: analysis.longitude,
      colorProfile: analysis.colorProfile,
      orientation: analysis.orientation
    });
    
    // Add tags
    for (const tagName of analysis.tags) {
      const tag = mediaService.getOrCreateTag(tagName, analysis.category);
      mediaService.addTagToImage(image.id, tag.id);
    }

    // Watermark fake/unconfirmed images
    const watermarkText = WATERMARK_CATEGORIES[analysis.albumName];
    if (watermarkText) {
      await watermarkImage(analysis.originalPath, watermarkText, image.id, db);
    }

    // Generate thumbnail
    try {
      // Ensure the output directory is 'data/media/thumbnails' (relative to cwd or absolute)
      const thumbDir = path.join(process.cwd(), 'data/media/thumbnails');
      await mediaService.generateThumbnail(image.path, thumbDir, { force: false });
    } catch (e) {
      console.warn(`⚠️ Failed to generate thumbnail for ${image.filename}:`, e);
    }
    
    imported++;
    if (imported % 10 === 0) {
      process.stdout.write(`\r✓ Imported ${imported}/${analyses.length - skipped} images...`);
    }
  }
  
  console.log(`\n\n✅ Import complete! (${imported} new, ${skipped} skipped)\n`);
  
  // Set cover images for albums
  console.log('🖼️  Setting album cover images...\n');
  for (const [albumName, albumId] of albumMap.entries()) {
    const albumImages = mediaService.getAllImages({ albumId });
    if (albumImages.length > 0) {
      mediaService.updateAlbum(albumId, { coverImageId: albumImages[0].id });
      console.log(`✓ Set cover for ${albumName}`);
    }
  }
  
  // Print statistics
  const stats = mediaService.getMediaStats();
  console.log('\n📊 Final Statistics:\n');
  console.log(`  Total Images: ${stats.totalImages}`);
  console.log(`  Total Albums: ${stats.totalAlbums}`);
  console.log(`  Total Size: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`\n  Album Breakdown:`);
  Object.entries(stats.albumBreakdown).forEach(([album, count]) => {
    console.log(`    ${album}: ${count}`);
  });
  
  mediaService.close();
  console.log('\n✅ Media library rebuild complete!\n');
}

main().catch(console.error);
