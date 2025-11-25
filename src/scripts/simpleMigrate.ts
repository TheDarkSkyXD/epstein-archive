import { databaseService } from '../services/DatabaseService';
import { join } from 'path';
import { readFileSync } from 'fs';

async function simpleMigrate() {
  console.log('Starting simple migration test...');
  
  try {
    // Read a small sample of the data first
    const filePath = join(process.cwd(), 'public', 'data', 'people.json');
    console.log(`Reading file: ${filePath}`);
    
    const fileContent = readFileSync(filePath, 'utf-8');
    console.log(`File size: ${(fileContent.length / 1024 / 1024).toFixed(2)} MB`);
    
    // Parse first 1000 records only for testing
    console.log('Parsing JSON...');
    const allData = JSON.parse(fileContent);
    console.log(`Total records: ${allData.length}`);
    
    const sampleData = allData.slice(0, 100); // First 100 records for testing
    console.log(`Processing ${sampleData.length} sample records...`);
    
    // Transform data to database format
    const entities = sampleData.map((item: any, index: number) => {
      // Handle secondaryRoles - could be string or array
      let secondaryRoles = [];
      if (item.secondaryRoles) {
        if (typeof item.secondaryRoles === 'string') {
          secondaryRoles = item.secondaryRoles.split(',').map((r: string) => r.trim()).filter(Boolean);
        } else if (Array.isArray(item.secondaryRoles)) {
          secondaryRoles = item.secondaryRoles;
        }
      }
      
      return {
        fullName: item.fullName || item.name || `Unknown ${index}`,
        primaryRole: item.primaryRole || 'Unknown',
        secondaryRoles: secondaryRoles,
        likelihoodLevel: item.likelihoodLevel || 'LOW',
        mentions: item.mentions || 0,
        currentStatus: item.currentStatus || 'Unknown',
        connectionsSummary: item.connectionsToEpstein || item.connectionsSummary || '',
        spiceRating: calculateSpiceRating(item),
        spiceScore: (item.mentions || 0) + (item.connectionsToEpstein ? 10 : 0),
        fileReferences: parseFileReferences(item.fileReferences)
      };
    });
    
    console.log('Inserting into database...');
    await databaseService.bulkInsertEntities(entities);
    
    console.log('Migration completed!');
    
    // Check stats
    const stats = await databaseService.getStatistics();
    console.log('Database statistics:');
    console.log(`- Total entities: ${stats.totalEntities}`);
    console.log(`- Total documents: ${stats.totalDocuments}`);
    console.log(`- Total mentions: ${stats.totalMentions}`);
    console.log(`- Database size: ${(databaseService.getDatabaseSize() / 1024 / 1024).toFixed(2)} MB`);
    
    // Test search
    console.log('\nTesting search...');
    const searchResults = await databaseService.search('Epstein', 5);
    console.log(`Found ${searchResults.entities.length} entities and ${searchResults.documents.length} documents`);
    
    // Test pagination
    console.log('\nTesting pagination...');
    const page1 = await databaseService.getEntities(1, 10);
    console.log(`Page 1: ${page1.entities.length} entities out of ${page1.total} total`);
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

function calculateSpiceRating(item: any): number {
  const mentions = item.mentions || 0;
  const likelihoodLevel = item.likelihoodLevel;
  
  const baseSpice = mentions > 1000 ? 4 : mentions > 500 ? 3 : mentions > 100 ? 2 : 1;
  const likelihoodBonus = likelihoodLevel === 'HIGH' ? 1 : 0;
  
  return Math.min(5, baseSpice + likelihoodBonus);
}

function parseFileReferences(fileRefs: string | any[]): any[] {
  if (!fileRefs) return [];
  
  if (typeof fileRefs === 'string') {
    return fileRefs.split(',').slice(0, 5).map((file: string) => ({
      fileName: file.trim(),
      filePath: '',
      fileType: 'txt',
      evidenceType: 'document',
      context: '',
      mentionType: 'mention'
    }));
  }
  
  if (Array.isArray(fileRefs)) {
    return fileRefs.slice(0, 5).map((ref: any) => ({
      fileName: ref.fileName || ref.name || 'Unknown',
      filePath: ref.filePath || ref.path || '',
      fileType: ref.fileType || ref.type || 'txt',
      evidenceType: ref.evidenceType || ref.evidence || 'document',
      context: ref.context || '',
      mentionType: ref.mentionType || 'mention'
    }));
  }
  
  return [];
}

// Run migration
simpleMigrate().then(() => {
  console.log('Simple migration test completed successfully!');
  process.exit(0);
}).catch((error) => {
  console.error('Simple migration test failed:', error);
  process.exit(1);
});