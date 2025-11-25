import { databaseService } from '../src/services/DatabaseService';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function populateDatabase() {
  try {
    console.log('Starting database population...');
    
    // Read the evidence database file
    const evidenceDatabasePath = path.join(__dirname, '..', 'public', 'data', 'evidence_database.json');
    console.log('Reading evidence database from:', evidenceDatabasePath);
    
    const evidenceData = JSON.parse(fs.readFileSync(evidenceDatabasePath, 'utf-8'));
    console.log('Loaded evidence data with', Object.keys(evidenceData.file_metadata).length, 'files');
    
    // Process a sample of files to populate the database
    const fileEntries = Object.entries(evidenceData.file_metadata);
    const sampleFiles = fileEntries.slice(0, 100); // Process first 100 files
    
    console.log('Processing', sampleFiles.length, 'files...');
    
    const entitiesToInsert: any[] = [];
    
    // Create sample entities based on the file metadata
    sampleFiles.forEach(([filePath, metadata]: [string, any], index) => {
      // Create a sample entity for each file
      const entity = {
        fullName: metadata.filename || `File ${index + 1}`,
        primaryRole: metadata.category || 'document',
        secondaryRoles: metadata.entities ? metadata.entities.slice(0, 3) : [],
        likelihoodLevel: 'MEDIUM',
        mentions: metadata.word_count || 0,
        currentStatus: 'active',
        connectionsSummary: `Mentioned in ${metadata.dates?.length || 0} dates`,
        spiceRating: Math.min(5, Math.floor((metadata.word_count || 0) / 10000)),
        spiceScore: metadata.word_count || 0,
        fileReferences: [{
          fileName: metadata.filename || path.basename(filePath),
          filePath: filePath,
          fileType: path.extname(filePath).substring(1) || 'txt',
          evidenceType: metadata.category || 'document',
          context: `File with ${metadata.word_count || 0} words`,
          mentionType: 'file_reference'
        }]
      };
      
      entitiesToInsert.push(entity);
    });
    
    console.log('Inserting', entitiesToInsert.length, 'entities into database...');
    
    // Insert entities into the database
    await databaseService.bulkInsertEntities(entitiesToInsert);
    
    console.log('Database population completed successfully!');
    
    // Verify the data was inserted
    const stats = await databaseService.getStatistics();
    console.log('Database statistics after population:', stats);
    
  } catch (error) {
    console.error('Error populating database:', error);
    process.exit(1);
  }
}

// Run the population script
populateDatabase().then(() => {
  console.log('Script completed successfully');
  process.exit(0);
}).catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});