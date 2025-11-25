import { databaseService } from '../src/services/DatabaseService';

/**
 * AGGRESSIVE POST-IMPORT CLEANUP
 * Remove location names, streets, and other invalid entities that slipped through
 */

// Location/place names to remove
const LOCATION_PATTERNS = [
  /^(times|coney|plaza|lafayette|palm|west|east|north|south)\s+(square|island|hotel|beach|park|street|avenue|road|way|place)/i,
  /^new\s+(york|mexico|jersey|hampshire|orleans)/i,
  /\s+(city|county|state|district|court|department|police|sheriff|office|stockade)$/i,
  /^(el|la|le)\s+[a-z]+\s+(way|street|avenue|road|place)/i,
  /\s+police\s+department$/i,
  /\s+county\s+sheriff$/i,
  /\s+high\s+school$/i,
  /\s+affidavit$/i,
  /^district\s+southern\s+court$/i,
  /^aerial\s+photos$/i,
  /^special\s+management$/i,
  /^photo\s+taken$/i,
  /^property\s+tours/i,
  /^monthly\s+goals$/i,
  /\s+inc$/i, // "Inc" without company name
  /^ps\s+office$/i,
  /^means$/i,
  /^entity\s+name$/i,
  /^died\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,
  /^should\s+/i,
  /^what\s+purpose$/i,
  /^laughing\s+it\s+off$/i,
  /^insurable\s+replacement\s+cost$/i,
  /^federal\s+reserve\s+act$/i,
];

// Generic business/organization terms without proper names
const GENERIC_ORG_PATTERNS = [
  /^trump\s+model$/i, // "Trump Model" without context
  /^secret\s+angels$/i,
  /^splash\s+news$/i,
  /^sipa\s+press$/i,
  /^davidoff\s+studios$/i,
];

async function aggressivePostImportCleanup() {
  console.log('='.repeat(80));
  console.log('AGGRESSIVE POST-IMPORT CLEANUP');
  console.log('='.repeat(80));
  
  const db = (databaseService as any).db;
  
  // Get all entities
  const entities = db.prepare('SELECT id, full_name FROM entities').all();
  console.log(`\nAnalyzing ${entities.length} entities...`);
  
  const invalidIds: number[] = [];
  const reasons: Record<string, number> = {};
  
  for (const entity of entities) {
    const name = entity.full_name;
    let isInvalid = false;
    let reason = '';
    
    // Check location patterns
    for (const pattern of LOCATION_PATTERNS) {
      if (pattern.test(name)) {
        isInvalid = true;
        reason = 'Location/place name';
        break;
      }
    }
    
    // Check generic org patterns
    if (!isInvalid) {
      for (const pattern of GENERIC_ORG_PATTERNS) {
        if (pattern.test(name)) {
          isInvalid = true;
          reason = 'Generic organization term';
          break;
        }
      }
    }
    
    if (isInvalid) {
      invalidIds.push(entity.id);
      reasons[reason] = (reasons[reason] || 0) + 1;
    }
  }
  
  console.log(`\nFound ${invalidIds.length} invalid entities to remove.`);
  console.log('Breakdown by reason:', reasons);
  
  if (invalidIds.length > 0) {
    console.log('\nSample entities to be removed:');
    const sampleIds = invalidIds.slice(0, 30);
    for (const id of sampleIds) {
      const entity = entities.find(e => e.id === id);
      if (entity) console.log(`  - ${entity.full_name}`);
    }
    
    console.log('\nRemoving invalid entities...');
    const deleteEntityStmt = db.prepare('DELETE FROM entities WHERE id = ?');
    const deleteMentionsStmt = db.prepare('DELETE FROM entity_mentions WHERE entity_id = ?');
    
    const deleteTransaction = db.transaction((ids: number[]) => {
      for (const id of ids) {
        deleteMentionsStmt.run(id);
        deleteEntityStmt.run(id);
      }
    });
    
    deleteTransaction(invalidIds);
    console.log(`✓ Removed ${invalidIds.length} invalid entities`);
  }
  
  // Get final count
  const finalCount = db.prepare('SELECT COUNT(*) as count FROM entities').get().count;
  console.log(`\n✓ Final entity count: ${finalCount}`);
  
  console.log('\n' + '='.repeat(80));
  console.log('CLEANUP COMPLETE');
  console.log('='.repeat(80));
}

aggressivePostImportCleanup().catch(console.error);
