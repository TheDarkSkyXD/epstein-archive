import { DatabaseService } from '../src/services/DatabaseService';

/**
 * FINAL ULTRA-AGGRESSIVE CLEANUP
 * Remove the last remaining artifacts to achieve 100% human relevance
 */

// Specific artifacts that slipped through
const EXACT_ARTIFACTS = new Set([
  'Et Al',
  'Et Seq',
  'Unauthorized Use',
  'Control Number',
  'Printed Name',
  'Rws Document',
  'Level Agi',
  'Cognitive Synergy',
  'So Far',
  'So It',
  'Political Party',
  'Original Message',
  'Burnett Complaint',
  'Do Not Include Account Numbers',
  'West Palm Beach', // Location, not a person/org
  'Hong Kong', // Location
  'Klc Opco', // Unclear abbreviation
]);

// Patterns for remaining artifacts
const FINAL_ARTIFACT_PATTERNS = [
  /^et\s+(al|seq)$/i,
  /^so\s+(far|it|on|what|much)$/i,
  /^(unauthorized|printed|control|original)\s+/i,
  /\s+(number|message|document|complaint)$/i,
  /^(do|does|did)\s+not\s+/i,
  /^level\s+/i,
  /^cognitive\s+/i,
  /^political\s+party$/i,
  // Incomplete names (Jr/Sr without full name)
  /^[a-z]+\s+jr\s+[a-z]+$/i, // "Landon Jr Thomas" - should be "Landon Thomas Jr"
  // Names with "On" or "In" (likely date fragments)
  /\s+on\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,
  /\s+in\s+\d{4}$/i,
];

// Known valid entities that might match patterns (allowlist)
const PROTECTED_ENTITIES = new Set([
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
  'Steve Bannon',
  'Boris Nikolic',
  'Alan Turing',
  'George Mitchell',
  'Al Gore',
  'Michael Wolff',
  'Bill Gates',
  'Jean Luc Brunel',
  'Moon Jae',
  'Hosni Mubarak',
  'Landon Thomas',
  'Jeffrey Macdonald',
  'Bashar Al',
]);

function isFinalArtifact(name: string): boolean {
  // Protected entities
  if (PROTECTED_ENTITIES.has(name)) {
    return false;
  }
  
  // Exact match artifacts
  if (EXACT_ARTIFACTS.has(name)) {
    return true;
  }
  
  // Pattern match artifacts
  for (const pattern of FINAL_ARTIFACT_PATTERNS) {
    if (pattern.test(name)) {
      return true;
    }
  }
  
  return false;
}

async function finalUltraAggressiveCleanup() {
  console.log('Starting FINAL ULTRA-AGGRESSIVE cleanup...');
  
  const dbService = DatabaseService.getInstance();
  const db = (dbService as any).db;

  const entities = db.prepare('SELECT id, full_name FROM entities').all();
  console.log(`Analyzing ${entities.length} entities...`);

  const artifactEntities: any[] = [];

  for (const entity of entities) {
    if (isFinalArtifact(entity.full_name)) {
      artifactEntities.push(entity);
    }
  }

  console.log(`Found ${artifactEntities.length} final artifacts to remove.`);

  if (artifactEntities.length > 0) {
    console.log('Artifacts to be removed:');
    artifactEntities.forEach(e => console.log(`- ${e.full_name}`));

    const deleteStmt = db.prepare('DELETE FROM entities WHERE id = ?');
    const deleteMentionsStmt = db.prepare('DELETE FROM entity_mentions WHERE entity_id = ?');
    
    const deleteTransaction = db.transaction((entitiesToDelete: any[]) => {
      for (const entity of entitiesToDelete) {
        deleteMentionsStmt.run(entity.id);
        deleteStmt.run(entity.id);
      }
    });

    deleteTransaction(artifactEntities);
    console.log(`Successfully deleted ${artifactEntities.length} artifacts.`);
  } else {
    console.log('No artifacts found.');
  }
}

finalUltraAggressiveCleanup().catch(console.error);
