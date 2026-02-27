import { statsRepository } from '../../src/server/db/statsRepository.js';
import 'dotenv/config';

try {
  console.log('Testing statsRepository.getStatistics()...');
  const stats = statsRepository.getStatistics();
  console.log('Success! Stats output:');
  console.log(JSON.stringify(stats, null, 2));
} catch (error) {
  console.error('Failed to get statistics:', error);
  process.exit(1);
}
