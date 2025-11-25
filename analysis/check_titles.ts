import { databaseService } from '../src/services/DatabaseService';

async function checkTitles() {
  console.log('Checking for entities with titles...');
  
  const count = databaseService.prepare("SELECT COUNT(*) as count FROM entities WHERE title IS NOT NULL AND title != ''").get() as { count: number };
  console.log(`Entities with titles: ${count.count}`);

  if (count.count > 0) {
    const samples = databaseService.prepare("SELECT full_name, title, role FROM entities WHERE title IS NOT NULL LIMIT 5").all();
    console.log('Samples:', samples);
  } else {
    console.log('No titles found. Consolidation script might need to be run.');
  }
}

checkTitles();
