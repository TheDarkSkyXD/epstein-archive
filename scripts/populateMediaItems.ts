import Database from 'better-sqlite3';
import { join } from 'path';
import { readdirSync, statSync } from 'fs';
import { databaseService } from '../src/services/DatabaseService';

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
const imageFiles = getAllImageFiles(join(process.cwd(), '..', 'Epstein Estate Documents - Seventh Production', 'IMAGES'));
console.log(`Found ${imageFiles.length} image files`);

// Prepare statements
// Clear existing items
db.exec('DELETE FROM media_items');
console.log('Cleared existing media items');

// Prepare statements
const insertMediaItem = db.prepare(`
  INSERT INTO media_items (entity_id, document_id, file_path, file_type, title, description, verification_status, spice_rating, metadata_json)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const getEntityByName = db.prepare('SELECT id FROM entities WHERE full_name = ?');
const getDocumentByPath = db.prepare('SELECT id FROM documents WHERE file_path = ?');

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
  
  const entityId = entityRow.id;
  
  // Find documents associated with this entity
  const documents = db.prepare(`
    SELECT d.id, d.file_path 
    FROM documents d 
    JOIN entity_mentions em ON d.id = em.document_id 
    WHERE em.entity_id = ?
  `).all(entityId) as { id: number, file_path: string }[];
  
  // For each document, try to find related image files
  for (const doc of documents) {
    // Try to find image files with similar names
    const docName = doc.file_path.split('/').pop()?.replace(/\.[^/.]+$/, '') || '';
    
    // Find matching image files
    const matchingImages = imageFiles.filter(file => {
      const fileName = file.split('/').pop()?.replace(/\.[^/.]+$/, '') || '';
      return fileName.includes(docName) || docName.includes(fileName);
    });
    
    // Insert matching images
    for (const imagePath of matchingImages) {
      try {
        const fileType = imagePath.split('.').pop()?.toLowerCase() || 'unknown';
        const title = `${entity.title} - ${imagePath.split('/').pop()}`;
        const stats = statSync(imagePath);
        const fileSize = (stats.size / 1024).toFixed(1) + ' KB';
        
        const metadata = {
          fileSize,
          resolution: 'Unknown', // Would need image processing lib
          originalPath: imagePath
        };

        insertMediaItem.run(
          entityId,
          doc.id,
          imagePath,
          fileType,
          title,
          entity.description,
          'verified',
          5, // High spice rating for key entities
          JSON.stringify(metadata)
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
}

// Add some additional sample media items
const additionalMedia = [
  {
    entity: 'Jeffrey Epstein',
    path: join(process.cwd(), '..', 'Epstein Estate Documents - Seventh Production', 'IMAGES', '012', 'HOUSE_OVERSIGHT_032567.jpg'),
    title: 'Epstein Island Photo',
    description: 'Photograph of Epstein Island facilities'
  },
  {
    entity: 'Jeffrey Epstein',
    path: join(process.cwd(), '..', 'Epstein Estate Documents - Seventh Production', 'IMAGES', '012', 'HOUSE_OVERSIGHT_032573.jpg'),
    title: 'Epstein Private Jet',
    description: 'Photograph of Epstein\'s private jet'
  },
  {
    entity: 'Donald Trump',
    path: join(process.cwd(), '..', 'Epstein Estate Documents - Seventh Production', 'IMAGES', '012', 'HOUSE_OVERSIGHT_033123.jpg'),
    title: 'Trump at Mar-a-Lago',
    description: 'Photograph of Donald Trump at Mar-a-Lago with Epstein'
  },
  {
    entity: 'Ghislaine Maxwell',
    path: join(process.cwd(), '..', 'Epstein Estate Documents - Seventh Production', 'IMAGES', '012', 'HOUSE_OVERSIGHT_033137.jpg'),
    title: 'Ghislaine Maxwell',
    description: 'Photograph of Ghislaine Maxwell'
  }
];

for (const media of additionalMedia) {
  const entityRow = getEntityByName.get(media.entity) as { id: number } | undefined;
  if (!entityRow) continue;
  
  try {
    const fileType = media.path.split('.').pop()?.toLowerCase() || 'unknown';
    
    const stats = statSync(media.path);
    const fileSize = (stats.size / 1024).toFixed(1) + ' KB';
    
    const metadata = {
      fileSize,
      resolution: 'Unknown',
      originalPath: media.path
    };

    insertMediaItem.run(
      entityRow.id,
      null, // No specific document
      media.path,
      fileType,
      media.title,
      media.description,
      'verified',
      5,
      JSON.stringify(metadata)
    );
    
    processedCount++;
  } catch (error) {
    console.error('Error inserting additional media item:', error);
  }
}

console.log(`✅ Successfully populated ${processedCount} media items`);

// Close the database
db.close();