import { DatabaseService } from '../src/services/DatabaseService';

/**
 * MAXIMUM AGGRESSIVE CLEANUP
 * Remove EVERYTHING that is not a real person or real organization
 * Goal: Dataset should be 100% humanly relevant
 */

// Comprehensive list of non-human-relevant patterns
const NON_HUMAN_PATTERNS = [
  // Time/date phrases
  /years?\s+(ago|old|later|earlier|before|after)/i,
  /months?\s+(ago|old|later|earlier)/i,
  /days?\s+(ago|old|later|earlier)/i,
  /decades?\s+ago/i,
  
  // Financial/accounting terms
  /capital\s+(gain|loss|market|asset)/i,
  /income\s+(statement|tax|report)/i,
  /balance\s+sheet/i,
  /cash\s+flow/i,
  /profit\s+(margin|loss)/i,
  /revenue\s+growth/i,
  /underlying\s+assets/i,
  /investment\s+strategy/i,
  /asset\s+class/i,
  
  // Legal/document terms
  /instructions\s+for/i,
  /forwarded\s+message/i,
  /incident\s+report/i,
  /case\s+number/i,
  /docket\s+number/i,
  /exhibit\s+[a-z0-9]/i,
  /attachment\s+[a-z0-9]/i,
  
  // Generic connecting phrases
  /^as\s+well\s+as$/i,
  /^as\s+long\s+as$/i,
  /^as\s+soon\s+as$/i,
  /^in\s+order\s+to$/i,
  /^according\s+to$/i,
  
  // Incomplete/fragment names
  /^[a-z]+\s+jr$/i,  // "Thomas Jr" without first name
  /^[a-z]+\s+sr$/i,
  /^jr\s+[a-z]+$/i,
  
  // Geographic locations (not organizations)
  /^hong\s+kong$/i,
  /^new\s+york$/i,
  /^los\s+angeles$/i,
  /^san\s+francisco$/i,
  
  // Document/file operations
  /^(fcpa|ecf|pdf|doc)\s+/i,
  /\s+(op|no|id|ref)$/i,
  
  // Generic business terms without proper names
  /^(underlying|forwarded|incident|instructions)/i,
];

// Additional word-level filters
const INVALID_WORDS = new Set([
  'years', 'months', 'days', 'ago', 'old', 'later', 'earlier',
  'capital', 'income', 'statement', 'drilldown', 'gain', 'loss',
  'forwarded', 'message', 'instructions', 'part', 'underlying',
  'assets', 'strategy', 'program', 'report', 'incident'
]);

// Known valid entities (allowlist for edge cases that might match patterns)
const VALID_ENTITIES = new Set([
  'Jeffrey Epstein',
  'Ghislaine Maxwell',
  'Donald Trump',
  'Bill Clinton',
  'Hillary Clinton',
  'Barack Obama',
  'Alan Dershowitz',
  'Virginia Roberts',
  'Leslie Wexner',
  'David Schoen',
  'Edward Snowden',
  'Kathy Ruemmler',
  'Jane Doe',
  'Merrill Lynch',
  'Ackrell Capital',
  'Investment Strategy Group',
  'New York Times',
]);

function isHumanRelevant(name: string): boolean {
  // Allowlist check first
  if (VALID_ENTITIES.has(name)) {
    return true;
  }
  
  // Check against all non-human patterns
  for (const pattern of NON_HUMAN_PATTERNS) {
    if (pattern.test(name)) {
      return false;
    }
  }
  
  // Check if name contains too many invalid words
  const words = name.toLowerCase().split(/\s+/);
  let invalidWordCount = 0;
  for (const word of words) {
    if (INVALID_WORDS.has(word)) {
      invalidWordCount++;
    }
  }
  
  // If more than 1 invalid word, reject
  if (invalidWordCount > 1) {
    return false;
  }
  
  // Additional checks for proper name structure
  const nameWords = name.split(/\s+/);
  
  // Single word names are suspicious unless in allowlist
  if (nameWords.length === 1) {
    return false;
  }
  
  // Names with all lowercase or all uppercase are suspicious
  if (name === name.toLowerCase() || name === name.toUpperCase()) {
    return false;
  }
  
  // Check for proper capitalization (each word should start with capital)
  for (const word of nameWords) {
    // Skip common suffixes and particles
    if (/^(jr\.?|sr\.?|ii|iii|iv|v|de|van|von|der|den|del|della|di|da|le|la|el|al|and|of|the)$/i.test(word)) {
      continue;
    }
    
    // Must start with capital letter
    if (!/^[A-Z]/.test(word)) {
      return false;
    }
  }
  
  return true;
}

async function maxAggressiveCleanup() {
  console.log('Starting MAXIMUM AGGRESSIVE cleanup for human relevance...');
  
  const dbService = DatabaseService.getInstance();
  const db = (dbService as any).db;

  const entities = db.prepare('SELECT id, full_name FROM entities').all();
  console.log(`Analyzing ${entities.length} entities...`);

  const invalidEntities: any[] = [];
  const reasons: Record<string, number> = {};

  for (const entity of entities) {
    if (!isHumanRelevant(entity.full_name)) {
      invalidEntities.push(entity);
      
      // Categorize reason
      let reason = 'Not human-relevant';
      const name = entity.full_name;
      
      if (/years?\s+(ago|old)/i.test(name)) reason = 'Time/date phrase';
      else if (/capital|income|statement/i.test(name)) reason = 'Financial term';
      else if (/forwarded|instructions|incident/i.test(name)) reason = 'Document term';
      else if (/^as\s+/i.test(name)) reason = 'Generic phrase';
      else if (name.split(/\s+/).length === 1) reason = 'Single word';
      
      reasons[reason] = (reasons[reason] || 0) + 1;
    }
  }

  console.log(`Found ${invalidEntities.length} non-human-relevant entities.`);
  console.log('Breakdown by reason:', reasons);

  if (invalidEntities.length > 0) {
    console.log('Sample entities to be removed:');
    invalidEntities.slice(0, 50).forEach(e => console.log(`- ${e.full_name}`));

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
    console.log('No non-human-relevant entities found.');
  }
}

maxAggressiveCleanup().catch(console.error);
