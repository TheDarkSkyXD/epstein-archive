
import { DatabaseService } from '../src/services/DatabaseService';
import path from 'path';

// Initialize DB
const dbPath = path.join(process.cwd(), 'epstein-archive.db');
const dbService = DatabaseService.getInstance();
const db = dbService.getDatabase();

console.log(`Checking for duplicate albums in ${dbPath}...`);

try {
  const duplicates = db.prepare(`
    SELECT name, COUNT(*) as count 
    FROM media_albums 
    GROUP BY name 
    HAVING count > 1
  `).all() as { name: string; count: number }[];

  if (duplicates.length === 0) {
    console.log('No duplicate album names found.');
  } else {
    console.log('Found duplicate albums:');
    duplicates.forEach(d => {
      console.log(`- "${d.name}": ${d.count} copies`);
    });
  }
} catch (error) {
  console.error('Error checking duplicates:', error);
}
