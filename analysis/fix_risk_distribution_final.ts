import Database from 'better-sqlite3';
import { join } from 'path';

const DB_PATH = join(process.cwd(), 'epstein-archive.db');
const db = new Database(DB_PATH);

console.log('='.repeat(80));
console.log('FIXING RISK DISTRIBUTION (IMPROVED)');
console.log('='.repeat(80));

// Get mention statistics
const stats = db.prepare(`
  SELECT 
    MAX(mentions) as max_mentions,
    MIN(mentions) as min_mentions,
    AVG(mentions) as avg_mentions,
    COUNT(*) as total_entities
  FROM entities
`).get() as any;

console.log('\nCurrent Statistics:');
console.log(`Total Entities: ${stats.total_entities.toLocaleString()}`);
console.log(`Max Mentions: ${stats.max_mentions}`);
console.log(`Min Mentions: ${stats.min_mentions}`);
console.log(`Avg Mentions: ${stats.avg_mentions.toFixed(2)}`);

// Better strategy: Use mention count tiers
// HIGH: 10+ mentions (very frequently mentioned)
// MEDIUM: 3-9 mentions (moderately mentioned)
// LOW: 1-2 mentions (rarely mentioned)

const highThreshold = 10;
const mediumThreshold = 3;

console.log('\nUsing Tiered Thresholds:');
console.log(`HIGH Risk: mentions >= ${highThreshold}`);
console.log(`MEDIUM Risk: ${mediumThreshold} <= mentions < ${highThreshold}`);
console.log(`LOW Risk: mentions < ${mediumThreshold}`);

// Update risk levels
console.log('\nUpdating risk levels...');

const highCount = db.prepare(`
  UPDATE entities 
  SET likelihood_level = 'HIGH'
  WHERE mentions >= ?
`).run(highThreshold).changes;

const lowCount = db.prepare(`
  UPDATE entities 
  SET likelihood_level = 'LOW'
  WHERE mentions < ?
`).run(mediumThreshold).changes;

const mediumCount = db.prepare(`
  UPDATE entities 
  SET likelihood_level = 'MEDIUM'
  WHERE mentions >= ? AND mentions < ?
`).run(mediumThreshold, highThreshold).changes;

console.log(`✓ Updated ${highCount} entities to HIGH risk`);
console.log(`✓ Updated ${mediumCount} entities to MEDIUM risk`);
console.log(`✓ Updated ${lowCount} entities to LOW risk`);

// Verify distribution
const distribution = db.prepare(`
  SELECT likelihood_level, COUNT(*) as count
  FROM entities
  GROUP BY likelihood_level
  ORDER BY 
    CASE likelihood_level
      WHEN 'HIGH' THEN 1
      WHEN 'MEDIUM' THEN 2
      WHEN 'LOW' THEN 3
    END
`).all() as any[];

console.log('\n' + '='.repeat(80));
console.log('FINAL DISTRIBUTION');
console.log('='.repeat(80));

for (const row of distribution) {
  const percentage = ((row.count / stats.total_entities) * 100).toFixed(1);
  console.log(`${row.likelihood_level}: ${row.count.toLocaleString()} (${percentage}%)`);
}

// Show some examples from each tier
console.log('\n' + '='.repeat(80));
console.log('SAMPLE ENTITIES BY RISK LEVEL');
console.log('='.repeat(80));

const highSamples = db.prepare(`
  SELECT full_name, mentions 
  FROM entities 
  WHERE likelihood_level = 'HIGH' 
  ORDER BY mentions DESC 
  LIMIT 5
`).all() as any[];

console.log('\nHIGH Risk (top 5):');
highSamples.forEach((e: any) => console.log(`  ${e.full_name}: ${e.mentions} mentions`));

const mediumSamples = db.prepare(`
  SELECT full_name, mentions 
  FROM entities 
  WHERE likelihood_level = 'MEDIUM' 
  ORDER BY mentions DESC 
  LIMIT 5
`).all() as any[];

console.log('\nMEDIUM Risk (top 5):');
mediumSamples.forEach((e: any) => console.log(`  ${e.full_name}: ${e.mentions} mentions`));

const lowSamples = db.prepare(`
  SELECT full_name, mentions 
  FROM entities 
  WHERE likelihood_level = 'LOW' 
  ORDER BY mentions DESC 
  LIMIT 5
`).all() as any[];

console.log('\nLOW Risk (top 5):');
lowSamples.forEach((e: any) => console.log(`  ${e.full_name}: ${e.mentions} mentions`));

console.log('\n' + '='.repeat(80));
console.log('✅ RISK DISTRIBUTION FIXED');
console.log('='.repeat(80));

db.close();
