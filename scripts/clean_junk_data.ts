import { getDb } from '../src/server/db/connection.js';

// Function to identify and remove junk entities
function cleanJunkEntities() {
  const db = getDb();
  
  console.log('Starting junk data cleanup...');
  
  // Identify and remove entities with invalid names (junk data/extraction artifacts)
  const invalidNamesPattern = [
    'On %',
    'And %', 
    'The %',
    'Although %',
    'Actually %',
    'Mr %',
    'Ms %',
    'Dr %',
    'However %',
    'But %',
    'If %',
    'When %',
    'Then %',
    'So %',
    'Yet %',
    'Or %',
    'As %',
    'At %',
    'In %',
    'To %',
    'For %',
    'Of %',
    'With %',
    'By %',
    'About %',
    'Into %',
    'Through %',
    'During %',
    'Before %',
    'After %',
    'Above %',
    'Below %',
    'Between %',
    'Among %',
    'Within %',
    'Without %',
    'Under %',
    'Over %',
    'Near %',
    'Since %',
    'Until %',
    'Against %',
    'Among %',
    'Throughout %',
    'Despite %',
    'Throughout %',
    'Upon %',
    'Besides %',
    'Beyond %',
    'Inside %',
    'Outside %'
  ];
  
  // Build query to identify junk entities
  let deleteQuery = 'DELETE FROM entities WHERE ';
  const conditions: string[] = [];
  const params: string[] = [];
  
  // Add pattern conditions
  for (const pattern of invalidNamesPattern) {
    conditions.push(`full_name LIKE ?`);
    params.push(pattern);
  }
  
  // Add length condition (names with 2 characters or less)
  conditions.push(`LENGTH(full_name) <= 2`);
  
  // Combine all conditions
  deleteQuery += conditions.join(' OR ');
  
  console.log('Cleaning junk entities...');
  console.log('Delete query:', deleteQuery);
  
  const result = db.prepare(deleteQuery).run(...params);
  console.log(`Removed ${result.changes} junk entities`);
  
  // Also remove entities with names that are just numbers or single characters
  const numericResult = db.prepare(`
    DELETE FROM entities 
    WHERE LENGTH(full_name) = 1
    OR (LENGTH(full_name) = 2 AND full_name GLOB '[0-9][0-9]')
  `).run();
  
  console.log(`Removed ${numericResult.changes} numeric/single character entities`);
  
  // Clean up any remaining orphaned entity mentions after entity deletion
  const orphanCleanup = db.prepare(`
    DELETE FROM entity_mentions 
    WHERE entity_id NOT IN (SELECT id FROM entities)
  `).run();
  
  console.log(`Cleaned up ${orphanCleanup.changes} orphaned entity mentions`);
  
  console.log('Junk data cleanup completed.');
}

// Function to validate entity names during creation
function validateEntityName(name: string): boolean {
  if (!name || typeof name !== 'string') {
    return false;
  }
  
  // Trim whitespace
  const trimmedName = name.trim();
  
  // Check length
  if (trimmedName.length <= 2) {
    return false;
  }
  
  // Check if it starts with common English words that indicate junk data
  const junkPatterns = [
    /^On\s/i,
    /^And\s/i,
    /^The\s/i,
    /^Although\s/i,
    /^Actually\s/i,
    /^However\s/i,
    /^But\s/i,
    /^If\s/i,
    /^When\s/i,
    /^Then\s/i,
    /^So\s/i,
    /^Yet\s/i,
    /^Or\s/i,
    /^As\s/i,
    /^At\s/i,
    /^In\s/i,
    /^To\s/i,
    /^For\s/i,
    /^Of\s/i,
    /^With\s/i,
    /^By\s/i,
    /^About\s/i,
    /^Into\s/i,
    /^Through\s/i,
    /^During\s/i,
    /^Before\s/i,
    /^After\s/i,
    /^Above\s/i,
    /^Below\s/i,
    /^Between\s/i,
    /^Among\s/i,
    /^Within\s/i,
    /^Without\s/i,
    /^Under\s/i,
    /^Over\s/i,
    /^Near\s/i,
    /^Since\s/i,
    /^Until\s/i,
    /^Against\s/i,
    /^Throughout\s/i,
    /^Despite\s/i,
    /^Upon\s/i,
    /^Besides\s/i,
    /^Beyond\s/i,
    /^Inside\s/i,
    /^Outside\s/i,
    /^[0-9]+$/,
    /^[A-Z]$/,
    /^[a-z]$/
  ];
  
  for (const pattern of junkPatterns) {
    if (pattern.test(trimmedName)) {
      return false;
    }
  }
  
  return true;
}

// Function to clean existing data and validate it
function validateAndCleanExistingData() {
  const db = getDb();
  
  console.log('Validating and cleaning existing data...');
  
  // Get all entities
  const entities = db.prepare('SELECT id, full_name FROM entities').all() as {id: number, full_name: string}[];
  
  let cleanedCount = 0;
  
  for (const entity of entities) {
    if (!validateEntityName(entity.full_name)) {
      // Delete invalid entity
      db.prepare('DELETE FROM entities WHERE id = ?').run(entity.id);
      cleanedCount++;
      
      // Clean up any references to this entity
      db.prepare('DELETE FROM entity_mentions WHERE entity_id = ?').run(entity.id);
      db.prepare('DELETE FROM timeline_events WHERE entity_id = ?').run(entity.id);
    }
  }
  
  console.log(`Cleaned ${cleanedCount} invalid entities`);
  
  // Clean up any remaining orphaned records
  const orphanCleanup = db.prepare(`
    DELETE FROM entity_mentions 
    WHERE entity_id NOT IN (SELECT id FROM entities)
    OR document_id NOT IN (SELECT id FROM documents)
  `).run();
  
  console.log(`Cleaned up ${orphanCleanup.changes} orphaned entity mentions`);
}

// Run the cleanup
if (require.main === module) {
  try {
    validateAndCleanExistingData();
    cleanJunkEntities();
    console.log('Data cleanup completed successfully.');
  } catch (error) {
    console.error('Error during data cleanup:', error);
  }
}

export { validateEntityName, validateAndCleanExistingData, cleanJunkEntities };