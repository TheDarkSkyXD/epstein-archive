import Database from 'better-sqlite3';
import { join, basename } from 'path';

interface MediaImage {
  id: number;
  title: string;
  path: string;
  original_filename: string;
}

/**
 * Fix image metadata:
 * 1. Extract actual original filename from the path
 * 2. Ensure original_filename field contains the actual file name (e.g., "DJI_0360.JPG")
 * 3. Keep the descriptive titles we already set
 */
async function fixImageMetadata() {
  const dbPath = join(process.cwd(), 'epstein-archive.db');
  const db = new Database(dbPath);
  
  console.log('🔧 Fixing image metadata...\n');
  
  try {
    // Get all images
    const images = db.prepare(`
      SELECT 
        id,
        title,
        path,
        original_filename
      FROM media_images
      ORDER BY id
    `).all() as MediaImage[];
    
    console.log(`Found ${images.length} images to fix\n`);
    
    // Prepare update statement
    const updateStmt = db.prepare(`
      UPDATE media_images 
      SET original_filename = ?
      WHERE id = ?
    `);
    
    let updatedCount = 0;
    const fixes: Array<{id: number, filename: string, title: string}> = [];
    
    // Begin transaction for better performance
    const fixMany = db.transaction((imagesToFix: MediaImage[]) => {
      for (const image of imagesToFix) {
        // Extract the actual filename from the path
        const actualFilename = basename(image.path);
        
        // Only update if the original_filename is not already the actual filename
        if (image.original_filename !== actualFilename) {
          updateStmt.run(actualFilename, image.id);
          
          fixes.push({
            id: image.id,
            filename: actualFilename,
            title: image.title
          });
          
          updatedCount++;
        }
      }
    });
    
    // Execute the transaction
    console.log('Updating original_filename fields...');
    fixMany(images);
    
    console.log(`\n✅ Successfully updated ${updatedCount} image records\n`);
    
    // Show sample of fixes
    if (fixes.length > 0) {
      console.log('Sample of metadata fixes:');
      fixes.slice(0, 10).forEach(fix => {
        console.log(`  ID ${fix.id}:`);
        console.log(`    Title: "${fix.title}"`);
        console.log(`    Original Filename: "${fix.filename}"`);
      });
      
      if (fixes.length > 10) {
        console.log(`  ... and ${fixes.length - 10} more`);
      }
    } else {
      console.log('ℹ️  All records already have correct original_filename values');
    }
    
    // Verify the changes
    console.log('\n📊 Verification:');
    const sampleAfter = db.prepare(`
      SELECT id, title, original_filename 
      FROM media_images 
      LIMIT 5
    `).all();
    
    console.log('Sample records after fix:');
    sampleAfter.forEach((record: any) => {
      console.log(`  ID ${record.id}:`);
      console.log(`    Title: "${record.title}"`);
      console.log(`    Original Filename: "${record.original_filename}"`);
    });
    
  } catch (error) {
    console.error('❌ Error fixing image metadata:', error);
    throw error;
  } finally {
    db.close();
  }
  
  console.log('\n✨ Image metadata fix completed successfully!');
}

// Run the fix
fixImageMetadata().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
