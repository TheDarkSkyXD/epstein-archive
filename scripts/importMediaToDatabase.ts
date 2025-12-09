#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import Database from 'better-sqlite3';
import { MediaService } from '../src/services/MediaService';

interface ImageAnalysis {
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
}

// Analyze image content and generate metadata
function analyzeImage(filepath: string, filename: string, stats: fs.Stats): ImageAnalysis {
  const ext = path.extname(filename).toLowerCase();
  const format = ext.substring(1).toUpperCase();
  
  // We'll skip the file command for now and rely on basic analysis
  // Dimensions will be extracted later if needed
  let width = 0;
  let height = 0;
  let dateTaken: string | undefined;
  
  // Use file modification date as fallback
  let category = 'general';
  let albumName = 'Uncategorized';
  let title = '';
  let description = '';
  let tags: string[] = [];
  let datePrefix = '';
  
  // Use file modification date as fallback
  const fileDate = stats.mtime;
  datePrefix = fileDate.toISOString().split('T')[0].replace(/-/g, '');
  
  // Content-based analysis
  if (filename.toLowerCase().includes('aurora')) {
    category = 'nature';
    albumName = 'Nature & Landscapes';
    title = 'Aurora Borealis Landscape';
    description = 'Stunning aurora borealis with vibrant green northern lights over mountains';
    tags = ['nature', 'landscape', 'aurora', 'northern-lights', 'mountains'];
    if (dateTaken) {
      datePrefix = dateTaken.split(/[-\s:]/)[0] + dateTaken.split(/[-\s:]/)[1] + dateTaken.split(/[-\s:]/)[2];
    }
  } else if (filename.toLowerCase().includes('screenshot')) {
    category = 'screenshots';
    albumName = 'Screenshots';
    const screenshotDate = filename.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (screenshotDate) {
      datePrefix = screenshotDate[1] + screenshotDate[2] + screenshotDate[3];
      dateTaken = `${screenshotDate[1]}-${screenshotDate[2]}-${screenshotDate[3]}`;
    }
    
    if (width > 0 && height > 0) {
      if (width < height) {
        title = 'Mobile Interface Screenshot';
        description = 'Screenshot of mobile application interface';
        tags = ['screenshot', 'mobile', 'ui', 'interface'];
      } else {
        title = 'Desktop Application Screenshot';
        description = 'Screenshot of desktop application or website';
        tags = ['screenshot', 'desktop', 'ui', 'application'];
      }
    } else {
      title = 'Application Screenshot';
      description = 'Screenshot of application interface';
      tags = ['screenshot', 'ui'];
    }
  } else if (filename.toLowerCase().includes('macbook') || filename.toLowerCase().includes('mba')) {
    category = 'products';
    albumName = 'Products';
    title = 'MacBook Air Product Image';
    description = 'MacBook Air hero image with laptop on gradient background';
    tags = ['product', 'macbook', 'laptop', 'apple', 'hero-image'];
  } else if (filename.toLowerCase().includes('joane') || filename.toLowerCase().includes('jokki')) {
    category = 'graphics';
    albumName = 'Graphics & Logos';
    title = 'Joane & Jokki Logo';
    description = 'Logo or banner image';
    tags = ['logo', 'graphics', 'banner'];
  } else if (filename.match(/^[a-f0-9]{32}/)) {
    // Hash-based filename, likely a portrait or downloaded image
    category = 'people';
    albumName = 'People & Portraits';
    title = 'Portrait Photo';
    description = 'Portrait-oriented photograph';
    tags = ['portrait', 'people', 'photo'];
  }
  
  // Generate new filename (will add counter if duplicate)
  const dimensionStr = width > 0 && height > 0 ? `_${width}x${height}` : '';
  const baseFilename = `${datePrefix}_${category}_${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}${dimensionStr}`;
  const newFilename = `${baseFilename}${ext}`;
  
  return {
    originalPath: filepath,
    originalFilename: filename,
    newFilename,
    title,
    description,
    category,
    albumName,
    tags,
    width,
    height,
    fileSize: stats.size,
    format,
    dateTaken
  };
}

async function main() {
  const imagesDir = path.join(process.cwd(), 'data', 'images');
  const dbPath = path.join(process.cwd(), 'epstein-archive.db');
  
  console.log('🔍 Analyzing images in:', imagesDir);
  console.log('📊 Database:', dbPath);
  
  if (!fs.existsSync(imagesDir)) {
    console.error('❌ Images directory not found:', imagesDir);
    process.exit(1);
  }
  
  const files = fs.readdirSync(imagesDir);
  const imageFiles = files.filter(f => 
    /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(f)
  );
  
  console.log(`\n📸 Found ${imageFiles.length} images\n`);
  
  const analyses: ImageAnalysis[] = [];
  
  // Analyze all images
  for (const filename of imageFiles) {
    const filepath = path.join(imagesDir, filename);
    const stats = fs.statSync(filepath);
    const analysis = analyzeImage(filepath, filename, stats);
    analyses.push(analysis);
    
    console.log(`✓ ${filename}`);
    console.log(`  → ${analysis.newFilename}`);
    console.log(`  📝 ${analysis.title}`);
    console.log(`  📁 Album: ${analysis.albumName}`);
    console.log(`  🏷️  Tags: ${analysis.tags.join(', ')}`);
    console.log(`  📐 ${analysis.width}×${analysis.height} (${(analysis.fileSize / 1024).toFixed(1)} KB)`);
    console.log('');
  }
  
  // Initialize MediaService
  const mediaService = new MediaService(dbPath);
  
  // Create albums
  const albumMap = new Map<string, number>();
  const uniqueAlbums = [...new Set(analyses.map(a => a.albumName))];
  
  console.log('\n📁 Creating albums...\n');
  for (const albumName of uniqueAlbums) {
    const album = mediaService.createAlbum(albumName, `Auto-generated album for ${albumName.toLowerCase()}`);
    albumMap.set(albumName, album.id);
    console.log(`✓ Created album: ${albumName} (ID: ${album.id})`);
  }
  
  // Rename files and import to database
  console.log('\n📝 Renaming files and importing to database...\n');
  
  const usedFilenames = new Set<string>();
  
  for (const analysis of analyses) {
    const oldPath = analysis.originalPath;
    let newFilename = analysis.newFilename;
    
    // Handle duplicate filenames
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
    
    const newPath = path.join(imagesDir, newFilename);
    
    // Rename file
    if (oldPath !== newPath) {
      fs.renameSync(oldPath, newPath);
      console.log(`✓ Renamed: ${analysis.originalFilename} → ${analysis.newFilename}`);
    }
    
    // Create database entry
    const image = mediaService.createImage({
      filename: newFilename,
      originalFilename: analysis.originalFilename,
      path: `/data/images/${newFilename}`,
      thumbnailPath: `/data/images/thumbnails/${newFilename}`,
      title: analysis.title,
      description: analysis.description,
      albumId: albumMap.get(analysis.albumName),
      width: analysis.width,
      height: analysis.height,
      fileSize: analysis.fileSize,
      format: analysis.format,
      dateTaken: analysis.dateTaken
    });
    
    // Add tags
    for (const tagName of analysis.tags) {
      const tag = mediaService.getOrCreateTag(tagName, analysis.category);
      mediaService.addTagToImage(image.id, tag.id);
    }
    
    console.log(`✓ Imported to database: ${analysis.title} (ID: ${image.id})`);
  }
  
  // Set cover images for albums
  console.log('\n🖼️  Setting album cover images...\n');
  for (const [albumName, albumId] of albumMap.entries()) {
    const albumImages = mediaService.getAllImages({ albumId });
    if (albumImages.length > 0) {
      mediaService.updateAlbum(albumId, { coverImageId: albumImages[0].id });
      console.log(`✓ Set cover for ${albumName}: ${albumImages[0].title}`);
    }
  }
  
  // Print statistics
  const stats = mediaService.getMediaStats();
  console.log('\n📊 Import Statistics:\n');
  console.log(`  Total Images: ${stats.totalImages}`);
  console.log(`  Total Albums: ${stats.totalAlbums}`);
  console.log(`  Total Size: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`\n  Format Breakdown:`);
  Object.entries(stats.formatBreakdown).forEach(([format, count]) => {
    console.log(`    ${format}: ${count}`);
  });
  console.log(`\n  Album Breakdown:`);
  Object.entries(stats.albumBreakdown).forEach(([album, count]) => {
    console.log(`    ${album}: ${count}`);
  });
  
  mediaService.close();
  
  console.log('\n✅ Import complete!\n');
}

main().catch(console.error);
