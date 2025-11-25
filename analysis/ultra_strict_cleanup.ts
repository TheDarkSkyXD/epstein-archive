import { DatabaseService } from '../src/services/DatabaseService';

/**
 * Ultra-strict final cleanup
 * Remove anything that doesn't look like a real person or organization
 */

// Patterns that indicate NOT a real entity
const INVALID_PATTERNS = [
  // Starts with "if", "the", "a", "an"
  /^(if|the|a|an)\s/i,
  // Contains "expert" without being a proper org
  /expert/i,
  // Contains "information" without being a proper org
  /information/i,
  // Contains "member" without being a proper org
  /member/i,
  // Two-word names where second word is all caps (likely abbreviations/codes)
  /^[A-Z][a-z]+\s[A-Z]{2,}$/,
  // Contains "criminal", "civil", "case" (legal terms, not entities)
  /(criminal|civil|case|court|judge|jury)\s/i,
  // Contains "turnaround", "consider", "expert" (descriptive phrases)
  /(turnaround|consider|expert|specialist|consultant)\s/i,
];

// Known valid organizations (allowlist for edge cases)
const VALID_ORGS = new Set([
  'Merrill Lynch',
  'Ackrell Capital',
  'Jane Doe', // Legal placeholder name, but commonly used
]);

function isDefinitelyInvalid(name: string): boolean {
  // Check against invalid patterns
  for (const pattern of INVALID_PATTERNS) {
    if (pattern.test(name)) {
      return true;
    }
  }
  
  // Check if it's in the valid orgs allowlist
  if (VALID_ORGS.has(name)) {
    return false;
  }
  
  // Two-word names where both words are capitalized but second is very short
  // E.g., "If So", "Usa Inc" (without proper org markers)
  const words = name.split(/\s+/);
  if (words.length === 2) {
    const [first, second] = words.map(w => w.toLowerCase());
    
    // Common invalid two-word patterns
    const invalidTwoWord = new Set([
      'if so', 'if not', 'if you', 'if we',
      'usa inc', 'the nsa', 'the fbi', 'the cia',
      'pm subject', 'am subject', 're subject',
      'floor new', 'room new', 'suite new'
    ]);
    
    if (invalidTwoWord.has(`${first} ${second}`)) {
      return true;
    }
  }
  
  return false;
}

async function ultraStrictCleanup() {
  console.log('Starting ultra-strict final cleanup...');
  
  const dbService = DatabaseService.getInstance();
  const db = (dbService as any).db;

  const entities = db.prepare('SELECT id, full_name FROM entities').all();
  console.log(`Analyzing ${entities.length} entities...`);

  const invalidEntities: any[] = [];

  for (const entity of entities) {
    if (isDefinitelyInvalid(entity.full_name)) {
      invalidEntities.push(entity);
    }
  }

  console.log(`Found ${invalidEntities.length} invalid entities.`);

  if (invalidEntities.length > 0) {
    console.log('Sample invalid entities:');
    invalidEntities.slice(0, 30).forEach(e => console.log(`- ${e.full_name}`));

    const deleteStmt = db.prepare('DELETE FROM entities WHERE id = ?');
    const deleteMentionsStmt = db.prepare('DELETE FROM entity_mentions WHERE entity_id = ?');
    
    const deleteTransaction = db.transaction((entitiesToDelete: any[]) => {
      for (const entity of entitiesToDelete) {
        deleteMentionsStmt.run(entity.id);
        deleteStmt.run(entity.id);
      }
    });

    deleteTransaction(invalidEntities);
    console.log(`Successfully deleted ${invalidEntities.length} entities and their mentions.`);
  } else {
    console.log('No invalid entities found.');
  }
}

ultraStrictCleanup().catch(console.error);
