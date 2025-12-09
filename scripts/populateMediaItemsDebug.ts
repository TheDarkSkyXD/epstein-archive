import Database from 'better-sqlite3';
import { join } from 'path';
import { readdirSync, statSync } from 'fs';

const DB_PATH = join(process.cwd(), 'epstein-archive.db');
console.log('Using database path:', DB_PATH);

const db = new Database(DB_PATH);

console.log('Populating media items...');

// Function to get all image files recursively
function getAllImageFiles(dir: string): string[] {
  let results: string[] = [];
  const list = readdirSync(dir);
  
  list.forEach((file) => {
    file = join(dir, file);
    const stat = statSync(file);
    
    if (stat && stat.isDirectory()) {
      results = [...results, ...getAllImageFiles(file)];
    } else {
      if (file.match(/\.(jpg|jpeg|png|gif|bmp|tiff)$/i)) {
        results.push(file);
      }
    }
  });
  
  return results;
}

// Get all image files
const imageFiles = getAllImageFiles(join(process.cwd(), '..', 'data', 'media', 'images'));
console.log(`Found ${imageFiles.length} image files`);

// Check current count
const initialCount = db.prepare('SELECT COUNT(*) as count FROM media_images').get() as { count: number };
console.log('Initial media_images count:', initialCount.count);

// Prepare statements
// Clear existing items
db.exec('DELETE FROM media_images');
console.log('Cleared existing media items');

// Check count after clearing
const afterClearCount = db.prepare('SELECT COUNT(*) as count FROM media_images').get() as { count: number };
console.log('Media_images count after clearing:', afterClearCount.count);

// Prepare statements
const insertMediaItem = db.prepare(`
  INSERT INTO media_images (
    filename, original_filename, path, title, description, 
    width, height, file_size, format, date_taken, date_added
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const getEntityByName = db.prepare('SELECT id FROM entities WHERE full_name = ?');

// Sample media items for key entities
const keyEntities = [
  { name: 'Jeffrey Epstein', title: 'Jeffrey Epstein', description: 'Photographic evidence related to Jeffrey Epstein' }
];

// Process a sample of image files for each key entity
let processedCount = 0;
const batchSize = 5;

for (const entity of keyEntities) {
  // Find the entity ID
  const entityRow = getEntityByName.get(entity.name) as { id: number } | undefined;
  if (!entityRow) {
    console.log(`Entity not found: ${entity.name}`);
    continue;
  }
  
  console.log(`Processing entity: ${entity.name} (ID: ${entityRow.id})`);
  
  // Take first 5 images as samples
  const sampleImages = imageFiles.slice(0, 5);
  console.log(`Processing ${sampleImages.length} sample images`);
  
  // Insert sample images
  for (const imagePath of sampleImages) {
    try {
      const filename = imagePath.split('/').pop() || 'unknown';
      const fileType = imagePath.split('.').pop()?.toLowerCase() || 'unknown';
      const title = `${entity.title} - ${filename}`;
      
      const stats = statSync(imagePath);
      const fileSize = stats.size;
      
      console.log(`Inserting image: ${filename}`);
      
      const result = insertMediaItem.run(
        filename,
        filename,
        imagePath,
        title,
        entity.description,
        0, // width (would need image processing)
        0, // height (would need image processing)
        fileSize,
        fileType,
        null, // date_taken
        new Date().toISOString() // date_added
      );
      
      console.log(`Inserted row with ID: ${result.lastInsertRowid}`);
      processedCount++;
      
      if (processedCount % batchSize === 0) {
        console.log(`Processed ${processedCount} media items...`);
      }
    } catch (error) {
      console.error('Error inserting media item:', error);
    }
  }
}

console.log(`✅ Successfully processed ${processedCount} media items`);

// Check final count
const finalCount = db.prepare('SELECT COUNT(*) as count FROM media_images').get() as { count: number };
console.log('Final media_images count:', finalCount.count);

// Show some sample data
console.log('Sample media items:');
const sampleItems = db.prepare('SELECT id, filename, title FROM media_images LIMIT 5').all();
console.log(sampleItems);

// Close the database
db.close();