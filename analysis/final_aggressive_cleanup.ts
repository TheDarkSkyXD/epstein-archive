import { databaseService } from '../src/services/DatabaseService';

/**
 * FINAL AGGRESSIVE CLEANUP
 * Remove remaining bad entities: countries, locations, date fragments
 */

const BAD_ENTITY_PATTERNS = [
  // Date fragments
  /^on\s+(mon|tue|wed|thu|fri|sat|sun)$/i,
  /^on\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)$/i,
  
  // Countries and regions
  /^united\s+states$/i,
  /^saudi\s+arabia$/i,
  /^middle\s+east$/i,
  /^south\s+korea$/i,
  /^north\s+korea$/i,
  /^great\s+britain$/i,
  /^united\s+kingdom$/i,
  
  // Government buildings/locations
  /^white\s+house$/i,
  /^capitol\s+hill$/i,
  /^pentagon$/i,
  
  // Generic titles without names
  /^president\s+(obama|trump|clinton|bush)$/i, // Keep these, they're valid
  /^jeffrey\s+epstein\s+unauthorized$/i, // Book title, not a person
];

async function finalAggressiveCleanup() {
  console.log('Running final aggressive cleanup...');
  
  const db = (databaseService as any).db;
  
  const entities = db.prepare('SELECT id, full_name FROM entities').all();
  console.log(`Analyzing ${entities.length} entities...`);
  
  const invalidIds: number[] = [];
  
  for (const entity of entities) {
    for (const pattern of BAD_ENTITY_PATTERNS) {
      if (pattern.test(entity.full_name)) {
        invalidIds.push(entity.id);
        break;
      }
    }
  }
  
  console.log(`Found ${invalidIds.length} bad entities to remove.`);
  
  if (invalidIds.length > 0) {
    console.log('Sample entities to be removed:');
    invalidIds.slice(0, 20).forEach(id => {
      const entity = entities.find(e => e.id === id);
      if (entity) console.log(`  - ${entity.full_name}`);
    });
    
    const deleteEntityStmt = db.prepare('DELETE FROM entities WHERE id = ?');
    const deleteMentionsStmt = db.prepare('DELETE FROM entity_mentions WHERE entity_id = ?');
    
    const deleteTransaction = db.transaction((ids: number[]) => {
      for (const id of ids) {
        deleteMentionsStmt.run(id);
        deleteEntityStmt.run(id);
      }
    });
    
    deleteTransaction(invalidIds);
    console.log(`✓ Removed ${invalidIds.length} entities`);
  }
  
  const finalCount = db.prepare('SELECT COUNT(*) as count FROM entities').get().count;
  console.log(`✓ Final entity count: ${finalCount}`);
}

finalAggressiveCleanup().catch(console.error);
