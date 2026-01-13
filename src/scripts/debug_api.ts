import { databaseService } from '../services/DatabaseService';

async function run() {
  try {
    console.log('Testing search...');
    const results = await databaseService.search('Epstein', 10);
    console.log('Search results:', results.entities.length);
  } catch (error: any) {
    console.error('Search Error:', error.message);
  }

  try {
    console.log('Testing relationships...');
    const rels = await databaseService.getRelationships(112);
    console.log('Relationships:', rels.length);
  } catch (error: any) {
    console.error('Relationships Error:', error.message);
  }
}

run();
