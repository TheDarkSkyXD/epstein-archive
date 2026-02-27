import { statsRepository } from '../../src/server/db/statsRepository.js';
import 'dotenv/config';

console.log('Checking stats repository...');

try {
  const stats = statsRepository.getStatistics();
  console.log('--- Statistics ---');
  console.log('Total Entities:', stats.totalEntities);
  console.log('Total Documents:', stats.totalDocuments);
  console.log('Total Mentions:', stats.totalMentions);
  console.log('Top Entities Count:', stats.topEntities.length);
  if (stats.topEntities.length > 0) {
    console.log('Top 3:', stats.topEntities.slice(0, 3));
  } else {
    console.log('WARNING: Top Entities is EMPTY');
  }
} catch (e) {
  console.error('Error fetching stats:', e);
}
