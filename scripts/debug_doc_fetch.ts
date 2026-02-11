import { entitiesRepository } from '../src/server/db/entitiesRepository';

async function run() {
  try {
    console.log('Fetching documents for Entity ID 1 (Jeffrey Epstein)...');
    const docs = await entitiesRepository.getEntityDocuments('1');
    console.log(`Found ${docs.length} documents.`);
    if (docs.length > 0) {
      console.log('First document:', docs[0]);
    } else {
      console.log('No documents returned.');
    }
  } catch (error) {
    console.error('Error fetching documents:', error);
  }
}

run();
