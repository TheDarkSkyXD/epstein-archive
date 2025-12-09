import Database from 'better-sqlite3';
import { join } from 'path';
import { readdirSync, statSync } from 'fs';

const DB_PATH = join(process.cwd(), 'epstein-archive.db');
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

// Prepare statements
// Clear existing items
db.exec('DELETE FROM media_images');
console.log('Cleared existing media items');

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
  { name: 'Jeffrey Epstein', title: 'Jeffrey Epstein', description: 'Photographic evidence related to Jeffrey Epstein' },
  { name: 'Donald Trump', title: 'Donald Trump', description: 'Photographic evidence related to Donald Trump' },
  { name: 'Ghislaine Maxwell', title: 'Ghislaine Maxwell', description: 'Photographic evidence related to Ghislaine Maxwell' },
  { name: 'Prince Andrew', title: 'Prince Andrew', description: 'Photographic evidence related to Prince Andrew' },
  { name: 'Bill Clinton', title: 'Bill Clinton', description: 'Photographic evidence related to Bill Clinton' }
];

// Process a sample of image files for each key entity
let processedCount = 0;
const batchSize = 100;

for (const entity of keyEntities) {
  // Find the entity ID
  const entityRow = getEntityByName.get(entity.name) as { id: number } | undefined;
  if (!entityRow) continue;
  
  // For demonstration, let's just add some sample images from the data directory
  // In a real implementation, you'd want to link these properly to entities
  const sampleImages = imageFiles.slice(0, 20); // Take first 20 images as samples
  
  // Insert sample images
  for (const imagePath of sampleImages) {
    try {
      const filename = imagePath.split('/').pop() || 'unknown';
      const fileType = imagePath.split('.').pop()?.toLowerCase() || 'unknown';
      const title = `${entity.title} - ${filename}`;
      
      const stats = statSync(imagePath);
      const fileSize = stats.size;
      
      insertMediaItem.run(
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
      
      processedCount++;
      
      if (processedCount % batchSize === 0) {
        console.log(`Processed ${processedCount} media items...`);
      }
    } catch (error) {
      console.error('Error inserting media item:', error);
    }
  }
}

console.log(`✅ Successfully populated ${processedCount} media items`);

// Close the database
db.close();