import Database from 'better-sqlite3';
import { join } from 'path';

interface MediaImage {
  id: number;
  title: string;
  original_filename: string;
  filename: string;
  description: string | null;
  album_id: number | null;
  album_name?: string;
  date_taken: string | null;
}

interface MediaAlbum {
  id: number;
  name: string;
  description: string | null;
}

/**
 * Update image titles to be descriptive based on content rather than just filenames.
 * Move current titles (which are filenames) to original_filename metadata field.
 */
async function updateImageTitles() {
  const dbPath = join(process.cwd(), 'epstein-archive.db');
  const db = new Database(dbPath);
  
  console.log('📸 Starting image title update process...\n');
  
  try {
    // First, get all albums for reference
    const albums = db.prepare('SELECT id, name, description FROM media_albums').all() as MediaAlbum[];
    const albumMap = new Map(albums.map(a => [a.id, a]));
    
    console.log(`Found ${albums.length} albums:`);
    albums.forEach(album => {
      console.log(`  - ${album.name} (${album.id})`);
    });
    console.log('');
    
    // Get all images with their current titles
    const images = db.prepare(`
      SELECT 
        id,
        title,
        original_filename,
        filename,
        description,
        album_id,
        date_taken
      FROM media_images
      ORDER BY album_id, id
    `).all() as MediaImage[];
    
    console.log(`Found ${images.length} images to process\n`);
    
    // Prepare update statement
    const updateStmt = db.prepare(`
      UPDATE media_images 
      SET 
        title = ?,
        original_filename = ?
      WHERE id = ?
    `);
    
    let updatedCount = 0;
    const updates: Array<{id: number, oldTitle: string, newTitle: string}> = [];
    
    // Begin transaction for better performance
    const updateMany = db.transaction((imagesToUpdate: MediaImage[]) => {
      for (const image of imagesToUpdate) {
        const album = image.album_id ? albumMap.get(image.album_id) : null;
        
        // Current title is the filename - this should move to original_filename
        const originalFilename = image.title; // e.g., "DJI 0360.JPG"
        
        // Generate descriptive title based on context
        let newTitle = '';
        
        if (album) {
          // Use album context to create meaningful title
          const albumName = album.name;
          
          // Get a sequential number within the album
          const albumImages = images.filter(img => img.album_id === album.id);
          const albumIndex = albumImages.findIndex(img => img.id === image.id) + 1;
          
          // Create context-aware title with unique sequential number per album
          // Generate from album context
          switch (albumName.toLowerCase()) {
            case 'usvi court production':
              newTitle = `USVI Court Production Document ${albumIndex.toString().padStart(3, '0')}`;
              break;
            case 'aircraft':
              newTitle = `Aircraft Evidence Photo ${albumIndex.toString().padStart(3, '0')}`;
              break;
            case 'epstein':
              newTitle = `Jeffrey Epstein Photo ${albumIndex.toString().padStart(3, '0')}`;
              break;
            case 'epstein wexner':
              newTitle = `Epstein-Wexner Connection ${albumIndex.toString().padStart(3, '0')}`;
              break;
            case 'evidence':
              newTitle = `General Evidence Photo ${albumIndex.toString().padStart(3, '0')}`;
              break;
            case 'ghislaine':
              newTitle = `Ghislaine Maxwell Photo ${albumIndex.toString().padStart(3, '0')}`;
              break;
            case 'maga':
              newTitle = `MAGA Connection Photo ${albumIndex.toString().padStart(3, '0')}`;
              break;
            case 'musk epstein':
              newTitle = `Musk-Epstein Connection ${albumIndex.toString().padStart(3, '0')}`;
              break;
            case 'perpetrators':
              newTitle = `Perpetrator Evidence ${albumIndex.toString().padStart(3, '0')}`;
              break;
            case 'properties':
              newTitle = `Property Evidence ${albumIndex.toString().padStart(3, '0')}`;
              break;
            case 'survivors':
              newTitle = `Survivor Photo ${albumIndex.toString().padStart(3, '0')}`;
              break;
            case 'trump epstein':
              newTitle = `Trump-Epstein Connection ${albumIndex.toString().padStart(3, '0')}`;
              break;
            case 'whistleblowers':
              newTitle = `Whistleblower Evidence ${albumIndex.toString().padStart(3, '0')}`;
              break;
            default:
              newTitle = `${albumName} Photo ${albumIndex.toString().padStart(3, '0')}`;
          }
          
          // Add date context if available
          if (image.date_taken) {
            const date = new Date(image.date_taken);
            if (!isNaN(date.getTime())) {
              const year = date.getFullYear();
              newTitle += ` (${year})`;
            }
          }
        } else {
          // No album - use generic title
          newTitle = `Evidence Photo ${image.id.toString().padStart(3, '0')}`;
        }
        
        // Update the database
        updateStmt.run(newTitle, originalFilename, image.id);
        
        updates.push({
          id: image.id,
          oldTitle: image.title,
          newTitle: newTitle
        });
        
        updatedCount++;
      }
    });
    
    // Execute the transaction
    console.log('Updating image titles...');
    updateMany(images);
    
    console.log(`\n✅ Successfully updated ${updatedCount} image titles\n`);
    
    // Show sample of changes
    console.log('Sample of title updates:');
    updates.slice(0, 10).forEach(update => {
      console.log(`  ID ${update.id}:`);
      console.log(`    Old: "${update.oldTitle}"`);
      console.log(`    New: "${update.newTitle}"`);
    });
    
    if (updates.length > 10) {
      console.log(`  ... and ${updates.length - 10} more`);
    }
    
    // Verify the changes
    console.log('\n📊 Verification:');
    const sampleAfter = db.prepare(`
      SELECT id, title, original_filename, album_id 
      FROM media_images 
      LIMIT 5
    `).all();
    
    console.log('Sample records after update:');
    sampleAfter.forEach((record: any) => {
      console.log(`  ID ${record.id}: "${record.title}" (original: "${record.original_filename}")`);
    });
    
  } catch (error) {
    console.error('❌ Error updating image titles:', error);
    throw error;
  } finally {
    db.close();
  }
  
  console.log('\n✨ Image title update completed successfully!');
}

// Run the update
updateImageTitles().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
