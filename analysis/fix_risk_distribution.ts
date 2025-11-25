import { databaseService } from '../src/services/DatabaseService';

/**
 * FIX RISK DISTRIBUTION
 * Ensure proper LOW/MEDIUM/HIGH distribution
 */

async function fixRiskDistribution() {
  console.log('Fixing risk distribution...');
  
  const db = (databaseService as any).db;
  
  // Get all mention counts
  const entities = db.prepare('SELECT mentions FROM entities ORDER BY mentions').all();
  const totalEntities = entities.length;
  
  // Calculate percentile thresholds
  const lowPercentile = Math.floor(totalEntities * 0.33); // Bottom 33%
  const highPercentile = Math.floor(totalEntities * 0.67); // Top 33%
  
  const lowThreshold = entities[lowPercentile].mentions;
  const highThreshold = entities[highPercentile].mentions;
  
  console.log(`Total entities: ${totalEntities}`);
  console.log(`LOW threshold: mentions <= ${lowThreshold}`);
  console.log(`MEDIUM threshold: ${lowThreshold} < mentions < ${highThreshold}`);
  console.log(`HIGH threshold: mentions >= ${highThreshold}`);
  
  // Update risk levels
  db.prepare(`UPDATE entities SET likelihood_level = 'LOW' WHERE mentions <= ?`).run(lowThreshold);
  db.prepare(`UPDATE entities SET likelihood_level = 'MEDIUM' WHERE mentions > ? AND mentions < ?`).run(lowThreshold, highThreshold);
  db.prepare(`UPDATE entities SET likelihood_level = 'HIGH' WHERE mentions >= ?`).run(highThreshold);
  
  // Get distribution
  const distribution = db.prepare(`
    SELECT likelihood_level, COUNT(*) as count
    FROM entities
    GROUP BY likelihood_level
    ORDER BY likelihood_level
  `).all();
  
  console.log('\nRisk level distribution:');
  distribution.forEach((row: any) => {
    const percentage = ((row.count / totalEntities) * 100).toFixed(1);
    console.log(`  ${row.likelihood_level}: ${row.count} entities (${percentage}%)`);
  });
}

fixRiskDistribution().catch(console.error);
