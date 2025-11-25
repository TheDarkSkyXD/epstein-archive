import { DatabaseService } from '../services/DatabaseService';

const db = DatabaseService.getInstance();

console.log('Adding title column to documents table...');

try {
  db.exec('ALTER TABLE documents ADD COLUMN title TEXT;');
  console.log('Successfully added title column.');
} catch (error: any) {
  if (error.message.includes('duplicate column name')) {
    console.log('Title column already exists.');
  } else {
    console.error('Error adding title column:', error);
  }
}

console.log('Migration complete.');
process.exit(0);
