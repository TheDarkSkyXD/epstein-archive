
import { DatabaseService } from '../src/services/DatabaseService';
import { MediaService } from '../src/services/MediaService';
import path from 'path';
import fs from 'fs';

// Initialize Services
const dbPath = path.join(process.cwd(), 'epstein-archive.db');
const dbService = DatabaseService.getInstance(); // Ensure DB is init
const mediaService = new MediaService(dbPath);

console.log('Generating missing thumbnails...');

const THUMBNAIL_DIR = path.join(process.cwd(), 'data/media/thumbnails');

async function main() {
  try {
    // Get all images
    const images = mediaService.getAllImages();
    console.log(`Checking ${images.length} images...`);

    let generateCount = 0;

    for (const image of images) {
      if (!image.path) continue;
      
      // Check if thumbnail exists
      const expectedThumbName = `thumb_${path.basename(image.path)}`;
      const expectedThumbPath = path.join(THUMBNAIL_DIR, expectedThumbName);

      if (image.thumbnailPath && fs.existsSync(image.thumbnailPath)) {
        continue; // Has valid thumbnail
      }

      if (fs.existsSync(expectedThumbPath)) {
        // Thumbnail exists but DB might not know
        if (image.thumbnailPath !== expectedThumbPath) {
          mediaService.updateImage(image.id, { thumbnailPath: expectedThumbPath });
        }
        continue;
      }

      // Generate
      if (fs.existsSync(image.path)) {
        console.log(`Generating thumbnail for ${image.filename}...`);
        try {
          const thumbPath = await mediaService.generateThumbnail(image.path, THUMBNAIL_DIR);
          mediaService.updateImage(image.id, { thumbnailPath: thumbPath });
          generateCount++;
        } catch (err) {
          console.error(`Failed to generate thumbnail for ${image.id}:`, err);
        }
      } else {
          console.warn(`Source file missing for image ${image.id}: ${image.path}`);
      }
    }

    console.log(`Thumbnail generation complete. Generated ${generateCount} new thumbnails.`);
  } catch (error) {
    console.error('Error generating thumbnails:', error);
  } finally {
    mediaService.close();
  }
}

main();
