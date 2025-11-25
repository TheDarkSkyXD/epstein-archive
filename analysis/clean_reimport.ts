import fs from 'fs';
import path from 'path';
import { databaseService } from '../src/services/DatabaseService';

/**
 * HYPER-AGGRESSIVE ENTITY VALIDATOR
 * Only allows real people and organizations to be imported
 */

// Technical/document artifacts
const TECHNICAL_ARTIFACTS = new Set([
  'ecf', 'pdf', 'doc', 'docx', 'txt', 'html', 'xml', 'jpg', 'png', 'gif',
  'http', 'https', 'www', 'com', 'org', 'net', 'edu', 'gov',
  'macintosh', 'windows', 'linux', 'ios', 'android',
  'subject', 'from', 'to', 'cc', 'bcc', 'sent', 'received',
  'floor', 'room', 'suite', 'building', 'street', 'avenue', 'road',
  'event', 'address', 'location', 'venue', 'place', 'number', 'message',
  'document', 'complaint', 'report', 'statement', 'note', 'memo'
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
  /^(if|the|a|an|as|so|do)\s+/i,
  /\s+(on|in)\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,
  /^et\s+(al|seq)$/i,
  /level\s+/i,
  /\s+(number|message|document)$/i,
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

async function cleanReimport() {
  console.log('Starting CLEAN RE-IMPORT with hyper-aggressive filtering...');
  
  const ANALYSIS_PATH = path.join(process.cwd(), 'analysis/comprehensive_people_analysis.json');
  
  if (!fs.existsSync(ANALYSIS_PATH)) {
    console.error(`Analysis file not found at: ${ANALYSIS_PATH}`);
    return;
  }

  console.log('Reading JSON file...');
  const rawData = fs.readFileSync(ANALYSIS_PATH, 'utf-8');
  const peopleData = JSON.parse(rawData);

  console.log(`Loaded analysis for ${Object.keys(peopleData).length} people.`);

  const entitiesToInsert: any[] = [];
  let validCount = 0;
  let invalidCount = 0;

  for (const [name, personData] of Object.entries(peopleData)) {
    const person = personData as any;
    const fullName = person.fullName || name;
    
    // Apply hyper-aggressive validation
    if (!isValidRealWorldEntity(fullName)) {
      invalidCount++;
      continue;
    }
    
    validCount++;
    
    // Transform to database format
    const entity: any = {
      fullName,
      primaryRole: (person.roles && person.roles.length > 0) ? person.roles[0] : 'Unknown',
      secondaryRoles: person.roles ? person.roles.slice(1) : [],
      likelihoodLevel: person.likelihood_score || 'LOW',
      mentions: person.mentions || 0,
      currentStatus: 'Unknown',
      connectionsSummary: person.connections ? person.connections.join(', ') : '',
      spiceRating: person.spice_rating || 0,
      spiceScore: person.spice_score || 0,
      evidenceTypes: person.evidence_types || [],
      fileReferences: person.files || []
    };

    entitiesToInsert.push(entity);
  }

  console.log(`Validation complete: ${validCount} valid entities, ${invalidCount} invalid entities filtered out.`);
  console.log(`Importing ${entitiesToInsert.length} entities...`);

  // Import entities using DatabaseService
  await databaseService.insertEntities(entitiesToInsert);

  console.log('Import complete!');
  
  // Get statistics
  const stats = await databaseService.getStatistics();
  console.log(`\nFinal statistics:`);
  console.log(`- Total entities: ${stats.totalEntities}`);
  console.log(`- Total documents: ${stats.totalDocuments}`);
  console.log(`- Total mentions: ${stats.totalMentions}`);
}

cleanReimport().catch(console.error);
