import { databaseService } from '../src/services/DatabaseService';

async function checkSchema() {
  console.log('Checking database schema...');
  
  const tables = ['documents', 'entities'];

  for (const table of tables) {
    const columns = databaseService.prepare(`PRAGMA table_info(${table})`).all() as any[];
    console.log(`\nTable: ${table}`);
    console.log(columns.map(c => `${c.name} (${c.type})`).join(', '));
  }
}

checkSchema();
