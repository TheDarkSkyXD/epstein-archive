import { DatabaseService } from '../src/services/DatabaseService';

const DB_PATH = process.cwd() + '/epstein-archive.db';

/**
 * Strict validation for real-world people and organizations
 * Based on LLM-inspired principles but implemented as deterministic rules
 */

// Technical/document artifacts that should never be entities
const TECHNICAL_ARTIFACTS = new Set([
  'ecf', 'pdf', 'doc', 'docx', 'txt', 'html', 'xml', 'jpg', 'png', 'gif',
  'http', 'https', 'www', 'com', 'org', 'net', 'edu', 'gov',
  'macintosh', 'windows', 'linux', 'ios', 'android',
  'subject', 'from', 'to', 'cc', 'bcc', 'sent', 'received',
  'floor', 'room', 'suite', 'building', 'street', 'avenue', 'road',
  'event', 'address', 'location', 'venue', 'place'
]);

// Organizational markers that indicate a real organization
const ORG_MARKERS = new Set([
  'inc', 'llc', 'ltd', 'plc', 'corp', 'corporation', 'company', 'co',
  'pty', 'gmbh', 'sa', 'ag', 'nv', 'bv', 'spa',
  'university', 'college', 'institute', 'school', 'academy',
  'council', 'commission', 'committee', 'board', 'authority',
  'agency', 'department', 'ministry', 'bureau', 'office',
  'bank', 'trust', 'fund', 'capital', 'partners', 'group',
  'foundation', 'association', 'society', 'union', 'league',
  'party', 'movement', 'coalition', 'alliance',
  'times', 'post', 'herald', 'news', 'journal', 'tribune', 'gazette',
  'broadcasting', 'media', 'press', 'publications'
]);

function isValidRealWorldPerson(name: string): boolean {
  const words = name.trim().split(/\s+/);
  const lowerWords = words.map(w => w.toLowerCase());
  
  // Must have at least 2 words (First Last)
  if (words.length < 2) {
    return false;
  }
  
  // Check for technical artifacts in any word
  for (const word of lowerWords) {
    if (TECHNICAL_ARTIFACTS.has(word)) {
      return false;
    }
  }
  
  // Each word must start with capital letter and be alphabetic
  for (const word of words) {
    // Allow common suffixes
    if (/^(Jr\.?|Sr\.?|II|III|IV|V)$/i.test(word)) continue;
    // Allow particles
    if (/^(de|van|von|der|den|del|della|di|da|le|la|el|al)$/i.test(word)) continue;
    
    // Must be capitalized and alphabetic (with hyphens/apostrophes ok)
    if (!/^[A-Z][a-z]+(?:[-'][A-Z]?[a-z]+)*$/.test(word)) {
      return false;
    }
  }
  
  // Reject if any word is a known bad word
  const badWords = new Set([
    'subject', 'from', 'sent', 'received', 'event', 'address',
    'floor', 'room', 'suite', 'pm', 'am', 'hd', 'inc', 'llc'
  ]);
  
  for (const word of lowerWords) {
    if (badWords.has(word)) {
      return false;
    }
  }
  
  return true;
}

function isValidRealWorldOrganization(name: string): boolean {
  const words = name.trim().split(/\s+/);
  const lowerWords = words.map(w => w.toLowerCase());
  
  // Must have at least one organizational marker
  let hasMarker = false;
  for (const word of lowerWords) {
    if (ORG_MARKERS.has(word)) {
      hasMarker = true;
      break;
    }
  }
  
  if (!hasMarker) {
    return false;
  }
  
  // Check for technical artifacts
  for (const word of lowerWords) {
    if (TECHNICAL_ARTIFACTS.has(word)) {
      return false;
    }
  }
  
  return true;
}

async function strictCleanup() {
  console.log('Starting strict real-world entity cleanup...');
  
  const dbService = DatabaseService.getInstance();
  const db = (dbService as any).db;

  const entities = db.prepare('SELECT id, full_name FROM entities').all();
  console.log(`Analyzing ${entities.length} entities...`);

  const invalidEntities: any[] = [];
  const reasons: Record<string, number> = {};

  for (const entity of entities) {
    const name = entity.full_name;
    const isValidPerson = isValidRealWorldPerson(name);
    const isValidOrg = isValidRealWorldOrganization(name);
    
    if (!isValidPerson && !isValidOrg) {
      invalidEntities.push(entity);
      
      // Categorize reason
      let reason = 'Not real-world person or org';
      if (name.split(/\s+/).length < 2) {
        reason = 'Single word name';
      } else if (name.split(/\s+/).some((w: string) => TECHNICAL_ARTIFACTS.has(w.toLowerCase()))) {
        reason = 'Contains technical artifact';
      } else if (!isValidPerson && !isValidOrg) {
        reason = 'No org markers and invalid person format';
      }
      
      reasons[reason] = (reasons[reason] || 0) + 1;
    }
  }

  console.log(`Found ${invalidEntities.length} invalid entities.`);
  console.log('Breakdown by reason:', reasons);

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

strictCleanup().catch(console.error);
