import { databaseService } from '../src/services/DatabaseService';

/**
 * FIX RISK DISTRIBUTION
 * Properly distribute entities across LOW/MEDIUM/HIGH risk levels
 */

async function fixRiskDistribution() {
  console.log('Fixing risk distribution...');
  
  const db = (databaseService as any).db;
  
  // Get all entities sorted by mentions
  const entities = db.prepare('SELECT id, mentions FROM entities ORDER BY mentions ASC').all();
  const totalEntities = entities.length;
  
  console.log(`Total entities: ${totalEntities}`);
  
  // Calculate percentile indices
  const lowIndex = Math.floor(totalEntities * 0.40); // Bottom 40%
  const highIndex = Math.floor(totalEntities * 0.75); // Top 25%
  
  const lowThreshold = entities[lowIndex].mentions;
  const highThreshold = entities[highIndex].mentions;
  
  console.log(`Thresholds: LOW <= ${lowThreshold}, MEDIUM = ${lowThreshold+1}-${highThreshold-1}, HIGH >= ${highThreshold}`);
  
  // Update risk levels using ID ranges for efficiency
  const lowIds = entities.slice(0, lowIndex + 1).map(e => e.id);
  const highIds = entities.slice(highIndex).map(e => e.id);
  
  // Set all to MEDIUM first
  db.prepare('UPDATE entities SET likelihood_level = ?').run('MEDIUM');
  
  // Then set LOW and HIGH
  for (const id of lowIds) {
    db.prepare('UPDATE entities SET likelihood_level = ? WHERE id = ?').run('LOW', id);
  }
  
  for (const id of highIds) {
    db.prepare('UPDATE entities SET likelihood_level = ? WHERE id = ?').run('HIGH', id);
  }
  
  // Get final distribution
  const distribution = db.prepare(`
    SELECT likelihood_level, COUNT(*) as count
    FROM entities
    GROUP BY likelihood_level
    ORDER BY likelihood_level
  `).all();
  
  console.log('\nFinal risk distribution:');
  distribution.forEach((row: any) => {
    const percentage = ((row.count / totalEntities) * 100).toFixed(1);
    console.log(`  ${row.likelihood_level}: ${row.count} entities (${percentage}%)`);
  });
}

fixRiskDistribution().catch(console.error);
