import { databaseService } from './src/services/DatabaseService';

async function testDatabase() {
  try {
    console.log('Testing database connection...');
    const stats = await databaseService.getStatistics();
    console.log('Database stats:', stats);
  } catch (error) {
    console.error('Error:', error);
  }
}

testDatabase();