import { databaseService } from '../src/services/DatabaseService';

/**
 * RECALCULATE SPICE RATINGS AND RISK LEVELS
 * Set spice ratings based on mention counts and redistribute risk levels
 */

async function recalculateSpiceAndRisk() {
  console.log('='.repeat(80));
  console.log('RECALCULATING SPICE RATINGS AND RISK LEVELS');
  console.log('='.repeat(80));
  
  const db = (databaseService as any).db;
  
  // Step 1: Calculate spice ratings based on mentions
  console.log('\n[1/3] Calculating spice ratings based on mentions...');
  
  // Get mention statistics
  const stats = db.prepare(`
    SELECT 
      MAX(mentions) as max_mentions,
      MIN(mentions) as min_mentions,
      AVG(mentions) as avg_mentions
    FROM entities
  `).get();
  
  console.log(`Mention stats: min=${stats.min_mentions}, max=${stats.max_mentions}, avg=${stats.avg_mentions.toFixed(2)}`);
  
  // Define spice rating thresholds
  // 5 peppers: mentions >= avg * 10
  // 4 peppers: mentions >= avg * 5
  // 3 peppers: mentions >= avg * 2
  // 2 peppers: mentions >= avg
  // 1 pepper: mentions < avg
  
  const threshold5 = stats.avg_mentions * 10;
  const threshold4 = stats.avg_mentions * 5;
  const threshold3 = stats.avg_mentions * 2;
  const threshold2 = stats.avg_mentions;
  
  console.log(`Spice thresholds: 5🌶️>=${threshold5.toFixed(0)}, 4🌶️>=${threshold4.toFixed(0)}, 3🌶️>=${threshold3.toFixed(0)}, 2🌶️>=${threshold2.toFixed(0)}, 1🌶️<${threshold2.toFixed(0)}`);
  
  db.prepare(`UPDATE entities SET spice_rating = 5, spice_score = mentions * 5 WHERE mentions >= ?`).run(threshold5);
  db.prepare(`UPDATE entities SET spice_rating = 4, spice_score = mentions * 4 WHERE mentions >= ? AND mentions < ?`).run(threshold4, threshold5);
  db.prepare(`UPDATE entities SET spice_rating = 3, spice_score = mentions * 3 WHERE mentions >= ? AND mentions < ?`).run(threshold3, threshold4);
  db.prepare(`UPDATE entities SET spice_rating = 2, spice_score = mentions * 2 WHERE mentions >= ? AND mentions < ?`).run(threshold2, threshold3);
  db.prepare(`UPDATE entities SET spice_rating = 1, spice_score = mentions WHERE mentions < ?`).run(threshold2);
  
  const spiceDistribution = db.prepare(`
    SELECT spice_rating, COUNT(*) as count
    FROM entities
    GROUP BY spice_rating
    ORDER BY spice_rating DESC
  `).all();
  
  console.log('✓ Spice rating distribution:');
  spiceDistribution.forEach((row: any) => {
    console.log(`  ${'🌶️'.repeat(row.spice_rating)}: ${row.count} entities`);
  });
  
  // Step 2: Redistribute risk levels
  console.log('\n[2/3] Redistributing risk levels...');
  
  const entities = db.prepare('SELECT id, mentions FROM entities ORDER BY mentions').all();
  const totalEntities = entities.length;
  
  const lowPercentile = Math.floor(totalEntities * 0.33);
  const highPercentile = Math.floor(totalEntities * 0.67);
  
  const lowThreshold = entities[lowPercentile].mentions;
  const highThreshold = entities[highPercentile].mentions;
  
  console.log(`Risk thresholds: LOW<=${lowThreshold}, MEDIUM=${lowThreshold+1}-${highThreshold-1}, HIGH>=${highThreshold}`);
  
  db.prepare(`UPDATE entities SET likelihood_level = 'LOW' WHERE mentions <= ?`).run(lowThreshold);
  db.prepare(`UPDATE entities SET likelihood_level = 'MEDIUM' WHERE mentions > ? AND mentions < ?`).run(lowThreshold, highThreshold);
  db.prepare(`UPDATE entities SET likelihood_level = 'HIGH' WHERE mentions >= ?`).run(highThreshold);
  
  const riskDistribution = db.prepare(`
    SELECT likelihood_level, COUNT(*) as count
    FROM entities
    GROUP BY likelihood_level
    ORDER BY likelihood_level
  `).all();
  
  console.log('✓ Risk level distribution:');
  riskDistribution.forEach((row: any) => {
    const percentage = ((row.count / totalEntities) * 100).toFixed(1);
    console.log(`  ${row.likelihood_level}: ${row.count} entities (${percentage}%)`);
  });
  
  // Step 3: Show top entities
  console.log('\n[3/3] Top 20 entities by spice rating:');
  const topEntities = db.prepare(`
    SELECT full_name, spice_rating, mentions, likelihood_level, role
    FROM entities
    ORDER BY spice_rating DESC, mentions DESC
    LIMIT 20
  `).all();
  
  topEntities.forEach((e: any, i: number) => {
    console.log(`${i+1}. ${e.full_name} - ${'🌶️'.repeat(e.spice_rating)} (${e.mentions} mentions) [${e.likelihood_level}] {${e.role || 'Unknown'}}`);
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('RECALCULATION COMPLETE');
  console.log('='.repeat(80));
}

recalculateSpiceAndRisk().catch(console.error);
