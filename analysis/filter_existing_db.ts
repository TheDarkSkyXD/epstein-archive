import { databaseService } from '../src/services/DatabaseService';

/**
 * HYPER-AGGRESSIVE ENTITY FILTER
 * Removes all invalid entities while preserving documents and valid entity_mentions
 */

// Technical/document artifacts
const TECHNICAL_ARTIFACTS = new Set([
  'ecf', 'pdf', 'doc', 'docx', 'txt', 'html', 'xml', 'jpg', 'png', 'gif',
  'http', 'https', 'www', 'com', 'org', 'net', 'edu', 'gov',
  'macintosh', 'windows', 'linux', 'ios', 'android',
  'subject', 'from', 'to', 'cc', 'bcc', 'sent', 'received',
  'floor', 'room', 'suite', 'building', 'street', 'avenue', 'road',
  'event', 'address', 'location', 'venue', 'place', 'number', 'message',
  'document', 'complaint', 'report', 'statement', 'note', 'memo', 'level',
  'years', 'months', 'days', 'ago', 'old', 'capital', 'income', 'forwarded'
]);

// Organizational markers
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

// Invalid patterns
const INVALID_PATTERNS = [
  /years?\s+(ago|old|later|earlier)/i,
  /months?\s+(ago|old|later|earlier)/i,
  /capital\s+(gain|loss|market)/i,
  /income\s+(statement|tax)/i,
  /forwarded\s+message/i,
  /^(if|the|a|an|as|so|do|et)\s+/i,
  /\s+(on|in)\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,
  /^et\s+(al|seq)$/i,
  /level\s+/i,
  /\s+(number|message|document|complaint)$/i,
  /^(typically|usually|generally|normally)\s+/i,
  /\s+(conducts|claims|argues|notes|states|suggests)$/i,
];

function isValidRealWorldEntity(name: string): boolean {
  const words = name.trim().split(/\s+/);
  const lowerWords = words.map(w => w.toLowerCase());
  
  // Check for technical artifacts
  for (const word of lowerWords) {
    if (TECHNICAL_ARTIFACTS.has(word)) {
      return false;
    }
  }
  
  // Check invalid patterns
  for (const pattern of INVALID_PATTERNS) {
    if (pattern.test(name)) {
      return false;
    }
  }
  
  // Must have at least 2 words
  if (words.length < 2) {
    return false;
  }
  
  // Check if it's an organization (has org markers)
  let hasOrgMarker = false;
  for (const word of lowerWords) {
    if (ORG_MARKERS.has(word)) {
      hasOrgMarker = true;
      break;
    }
  }
  
  if (hasOrgMarker) {
    return true; // Valid organization
  }
  
  // Otherwise, validate as a person name
  // Each word must start with capital letter and be alphabetic
  for (const word of words) {
    // Allow suffixes and particles
    if (/^(jr\.?|sr\.?|ii|iii|iv|v|de|van|von|der|den|del|della|di|da|le|la|el|al)$/i.test(word)) {
      continue;
    }
    
    // Must be capitalized and alphabetic
    if (!/^[A-Z][a-z]+(?:[-'][A-Z]?[a-z]+)*$/.test(word)) {
      return false;
    }
  }
  
  return true;
}

async function filterExistingDatabase() {
  console.log('Starting hyper-aggressive filtering of existing database...');
  
  const db = (databaseService as any).db;
  
  // Get all entities
  const entities = db.prepare('SELECT id, full_name FROM entities').all();
  console.log(`Analyzing ${entities.length} entities...`);

  const invalidEntityIds: number[] = [];
  let validCount = 0;

  for (const entity of entities) {
    if (!isValidRealWorldEntity(entity.full_name)) {
      invalidEntityIds.push(entity.id);
    } else {
      validCount++;
    }
  }

  console.log(`Found ${invalidEntityIds.length} invalid entities to remove.`);
  console.log(`Keeping ${validCount} valid entities.`);

  if (invalidEntityIds.length > 0) {
    console.log('Removing invalid entities and their mentions...');
    
    const deleteEntityStmt = db.prepare('DELETE FROM entities WHERE id = ?');
    const deleteMentionsStmt = db.prepare('DELETE FROM entity_mentions WHERE entity_id = ?');
    
    const deleteTransaction = db.transaction((ids: number[]) => {
      for (const id of ids) {
        deleteMentionsStmt.run(id);
        deleteEntityStmt.run(id);
      }
    });

    deleteTransaction(invalidEntityIds);
    console.log(`Successfully removed ${invalidEntityIds.length} invalid entities.`);
  }

  // Get final statistics
  const stats = await databaseService.getStatistics();
  console.log(`\nFinal statistics:`);
  console.log(`- Total entities: ${stats.totalEntities}`);
  console.log(`- Total documents: ${stats.totalDocuments}`);
  console.log(`- Total mentions: ${stats.totalMentions}`);
  
  // Show top 20 entities
  const topEntities = db.prepare(`
    SELECT full_name, spice_rating, mentions
    FROM entities
    ORDER BY spice_rating DESC, spice_score DESC
    LIMIT 20
  `).all();
  
  console.log(`\nTop 20 entities:`);
  topEntities.forEach((e: any, i: number) => {
    console.log(`${i+1}. ${e.full_name} (Spice: ${e.spice_rating}, Mentions: ${e.mentions})`);
  });
}

filterExistingDatabase().catch(console.error);
