import Database from 'better-sqlite3';
import { join } from 'path';

const DB_PATH = join(process.cwd(), 'epstein-archive.db');
const db = new Database(DB_PATH);

console.log('='.repeat(80));
console.log('SPICE-BASED RISK ASSESSMENT (Document Content Analysis)');
console.log('='.repeat(80));

// Spicy keywords that indicate incriminating context
const SPICY_KEYWORDS = {
  level5: { // Highly incriminating
    keywords: [
      'abuse', 'assault', 'victim', 'trafficking', 'underage', 'minor', 'rape',
      'sexual misconduct', 'exploitation', 'coercion', 'forced', 'illegal',
      'criminal', 'predator', 'molest'
    ],
    score: 100
  },
  level4: { // Seriously concerning
    keywords: [
      'inappropriate', 'misconduct', 'allegation', 'accused', 'complaint',
      'lawsuit', 'settlement', 'testimony', 'deposition', 'witness',
      'plaintiff', 'defendant', 'trial', 'conviction'
    ],
    score: 50
  },
  level3: { // Suspicious
    keywords: [
      'relationship', 'associate', 'connection', 'meeting', 'private',
      'confidential', 'secret', 'undisclosed', 'hidden', 'cover',
      'massage', 'recruit', 'procure'
    ],
    score: 20
  },
  level2: { // Notable connection
    keywords: [
      'friend', 'acquaintance', 'knew', 'met', 'visited', 'traveled',
      'flight', 'island', 'party', 'guest', 'passenger'
    ],
    score: 5
  },
  level1: { // Basic mention
    keywords: [
      'mentioned', 'referenced', 'name', 'list', 'contact', 'email'
    ],
    score: 1
  }
};

console.log('\nAnalyzing document content for spice scores...');

// Get all entities with their associated documents
const entities = db.prepare(`
  SELECT DISTINCT e.id, e.full_name
  FROM entities e
  INNER JOIN entity_mentions em ON e.id = em.entity_id
`).all() as any[];

console.log(`Found ${entities.length} entities with mentions`);

let processedCount = 0;

for (const entity of entities) {
  // Get all documents mentioning this entity
  const documents = db.prepare(`
    SELECT d.content
    FROM documents d
    INNER JOIN entity_mentions em ON d.id = em.document_id
    WHERE em.entity_id = ?
  `).all(entity.id) as any[];
  
  let totalSpiceScore = 0;
  let maxSpiceRating = 0;
  
  // Analyze each document
  for (const doc of documents) {
    const content = (doc.content || '').toLowerCase();
    const entityName = entity.full_name.toLowerCase();
    
    // Find all occurrences of the entity name
    const regex = new RegExp(entityName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = content.match(regex);
    
    if (!matches) continue;
    
    // For each mention, extract context (500 chars around mention)
    let index = 0;
    for (const match of matches) {
      index = content.indexOf(entityName, index);
      if (index === -1) break;
      
      const start = Math.max(0, index - 250);
      const end = Math.min(content.length, index + entityName.length + 250);
      const context = content.substring(start, end);
      
      // Check for spicy keywords in context
      for (const [level, data] of Object.entries(SPICY_KEYWORDS)) {
        for (const keyword of data.keywords) {
          if (context.includes(keyword)) {
            totalSpiceScore += data.score;
            const rating = parseInt(level.replace('level', ''));
            maxSpiceRating = Math.max(maxSpiceRating, rating);
          }
        }
      }
      
      index += entityName.length;
    }
  }
  
  // Update entity with spice scores
  db.prepare(`
    UPDATE entities 
    SET spice_score = ?, spice_rating = ?
    WHERE id = ?
  `).run(totalSpiceScore, maxSpiceRating, entity.id);
  
  processedCount++;
  
  if (processedCount % 1000 === 0) {
    console.log(`  Processed ${processedCount}/${entities.length} entities...`);
  }
}

console.log(`✓ Analyzed ${processedCount} entities`);

// Assign risk levels based on spice scores
console.log('\nAssigning risk levels...');

const highCount = db.prepare(`
  UPDATE entities 
  SET likelihood_level = 'HIGH'
  WHERE spice_score >= 50
`).run().changes;

const mediumCount = db.prepare(`
  UPDATE entities 
  SET likelihood_level = 'MEDIUM'
  WHERE spice_score >= 10 AND spice_score < 50
`).run().changes;

const lowCount = db.prepare(`
  UPDATE entities 
  SET likelihood_level = 'LOW'
  WHERE spice_score < 10
`).run().changes;

console.log(`✓ HIGH risk: ${highCount} entities (spice >= 50)`);
console.log(`✓ MEDIUM risk: ${mediumCount} entities (spice 10-49)`);
console.log(`✓ LOW risk: ${lowCount} entities (spice < 10)`);

// Show top spicy entities
console.log('\n' + '='.repeat(80));
console.log('TOP 20 HIGHEST SPICE SCORES');
console.log('='.repeat(80));

const topSpicy = db.prepare(`
  SELECT full_name, spice_score, spice_rating, likelihood_level, mentions
  FROM entities
  WHERE spice_score > 0
  ORDER BY spice_score DESC, mentions DESC
  LIMIT 20
`).all() as any[];

topSpicy.forEach((e: any, i: number) => {
  const peppers = '🌶️'.repeat(e.spice_rating);
  console.log(`${i + 1}. ${e.full_name}`);
  console.log(`   Spice: ${e.spice_score} (${peppers} ${e.spice_rating}/5) | Risk: ${e.likelihood_level} | Mentions: ${e.mentions}`);
});

// Final stats
const stats = db.prepare(`
  SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN likelihood_level = 'HIGH' THEN 1 ELSE 0 END) as high,
    SUM(CASE WHEN likelihood_level = 'MEDIUM' THEN 1 ELSE 0 END) as medium,
    SUM(CASE WHEN likelihood_level = 'LOW' THEN 1 ELSE 0 END) as low,
    AVG(spice_score) as avg_spice,
    MAX(spice_score) as max_spice
  FROM entities
`).get() as any;

console.log('\n' + '='.repeat(80));
console.log('FINAL STATISTICS');
console.log('='.repeat(80));
console.log(`Total Entities: ${stats.total.toLocaleString()}`);
console.log(`Average Spice: ${stats.avg_spice.toFixed(2)}`);
console.log(`Max Spice: ${stats.max_spice}`);
console.log(`\nRisk Distribution:`);
console.log(`  HIGH: ${stats.high.toLocaleString()} (${((stats.high / stats.total) * 100).toFixed(1)}%)`);
console.log(`  MEDIUM: ${stats.medium.toLocaleString()} (${((stats.medium / stats.total) * 100).toFixed(1)}%)`);
console.log(`  LOW: ${stats.low.toLocaleString()} (${((stats.low / stats.total) * 100).toFixed(1)}%)`);

console.log('\n' + '='.repeat(80));
console.log('✅ SPICE-BASED RISK ASSESSMENT COMPLETE');
console.log('='.repeat(80));

db.close();
