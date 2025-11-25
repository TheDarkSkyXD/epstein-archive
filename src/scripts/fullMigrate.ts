import { databaseService } from '../services/DatabaseService';
import { join } from 'path';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';

async function fullMigrate() {
  console.log('Starting full migration of 178,791+ records...');
  const startTime = Date.now();
  
  try {
    const filePath = join(process.cwd(), 'public', 'data', 'people.json');
    console.log(`Reading file: ${filePath}`);
    
    // Use streaming for large files
    const readStream = createReadStream(filePath, { encoding: 'utf-8' });
    const rl = createInterface({ input: readStream });
    
    let buffer: any[] = [];
    let entityCount = 0;
    let isInArray = false;
    let currentEntity: string = '';
    let braceCount = 0;
    const BATCH_SIZE = 1000;
    
    console.log('Processing JSON stream...');
    
    for await (const line of rl) {
      const trimmedLine = line.trim();
      
      // Detect start of JSON array
      if (trimmedLine === '[') {
        isInArray = true;
        continue;
      }
      
      // Detect end of JSON array
      if (trimmedLine === ']' && isInArray) {
        // Process any remaining entity
        if (currentEntity) {
          try {
            const entity = JSON.parse(currentEntity.replace(/,$/, ''));
            buffer.push(entity);
            entityCount++;
            
            if (buffer.length >= BATCH_SIZE) {
              await processBatch(buffer);
              console.log(`Processed ${entityCount} entities...`);
              buffer = [];
            }
          } catch (error) {
            console.warn('Failed to parse entity:', error);
          }
        }
        break;
      }
      
      if (isInArray) {
        // Count braces to detect complete JSON objects
        for (const char of trimmedLine) {
          if (char === '{') braceCount++;
          if (char === '}') braceCount--;
        }
        
        currentEntity += line;
        
        // When brace count reaches 0, we have a complete JSON object
        if (braceCount === 0 && currentEntity.trim().startsWith('{')) {
          try {
            const entity = JSON.parse(currentEntity.replace(/,$/, ''));
            buffer.push(entity);
            entityCount++;
            
            if (buffer.length >= BATCH_SIZE) {
              await processBatch(buffer);
              console.log(`Processed ${entityCount} entities...`);
              buffer = [];
            }
          } catch (error) {
            console.warn('Failed to parse entity:', error);
          }
          
          currentEntity = '';
        }
      }
    }
    
    // Process any remaining entities
    if (buffer.length > 0) {
      await processBatch(buffer);
      console.log(`Processed ${entityCount} entities...`);
    }
    
    const endTime = Date.now();
    console.log(`\nMigration completed in ${((endTime - startTime) / 1000).toFixed(2)} seconds`);
    console.log(`Total entities processed: ${entityCount}`);
    
    // Show final statistics
    const stats = await databaseService.getStatistics();
    console.log('\nFinal database statistics:');
    console.log(`- Total entities: ${stats.totalEntities.toLocaleString()}`);
    console.log(`- Total documents: ${stats.totalDocuments.toLocaleString()}`);
    console.log(`- Total mentions: ${stats.totalMentions.toLocaleString()}`);
    console.log(`- Database size: ${(databaseService.getDatabaseSize() / 1024 / 1024).toFixed(2)} MB`);
    
    // Test performance
    console.log('\nTesting search performance...');
    const searchStart = Date.now();
    const searchResults = await databaseService.search('Epstein', 10);
    const searchEnd = Date.now();
    console.log(`Search completed in ${searchEnd - searchStart}ms`);
    console.log(`Found ${searchResults.entities.length} entities and ${searchResults.documents.length} documents`);
    
    // Test pagination performance
    console.log('\nTesting pagination performance...');
    const pageStart = Date.now();
    const page1 = await databaseService.getEntities(1, 24);
    const pageEnd = Date.now();
    console.log(`Pagination query completed in ${pageEnd - pageStart}ms`);
    console.log(`Page 1: ${page1.entities.length} entities out of ${page1.total} total`);
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

async function processBatch(batch: any[]): Promise<void> {
  const entities = batch.map((item: any) => {
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
      fullName: item.fullName || item.name || 'Unknown',
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
  
  await databaseService.bulkInsertEntities(entities);
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
      mentionType: 'mention',
      contextText: 'Mentioned in document'
    }));
  }
  
  if (Array.isArray(fileRefs)) {
    return fileRefs.slice(0, 5).map((ref: any) => ({
      fileName: ref.fileName || ref.name || 'Unknown',
      filePath: ref.filePath || ref.path || '',
      fileType: ref.fileType || ref.type || 'txt',
      evidenceType: ref.evidenceType || ref.evidence || 'document',
      context: ref.context || '',
      mentionType: ref.mentionType || 'mention',
      contextText: ref.contextText || ref.context || 'Mentioned in document'
    }));
  }
  
  return [];
}

// Run migration
fullMigrate().then(() => {
  console.log('Full migration completed successfully!');
  process.exit(0);
}).catch((error) => {
  console.error('Full migration failed:', error);
  process.exit(1);
});