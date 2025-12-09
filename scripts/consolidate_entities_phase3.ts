import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../epstein-archive.db');
const BACKUP_DIR = path.join(__dirname, '../backups');
const AUDIT_LOG_PATH = path.join(__dirname, '../entity_consolidation_audit_phase3.json');

// Configuration
const DRY_RUN = process.argv.includes('--dry-run');

interface Entity {
  id: number;
  full_name: string;
  mentions: number;
  entity_type: string | null;
}

interface MergeCandidate {
  sourceId: number;
  sourceName: string;
  sourceMentions: number;
  targetId: number;
  targetName: string;
  targetMentions: number;
  confidence: number;
  reason: string;
  method: string;
}

interface AuditEntry {
  timestamp: string;
  sourceId: number;
  sourceName: string;
  targetId: number;
  targetName: string;
  mentionsTransferred: number;
  confidence: number;
  method: string;
}

const auditLog: AuditEntry[] = [];

// Common Nicknames Dictionary (Bidirectional mapping needed?)
// We map Nickname -> Formal Name.
// But we also need to check Formal -> Nickname if we want to find matches.
// Actually, we just need to know that {Bill, William} are equivalent.
const NICKNAMES: Record<string, string[]> = {
  'william': ['bill', 'billy', 'will', 'willy'],
  'robert': ['bob', 'bobby', 'rob', 'robby'],
  'james': ['jim', 'jimmy', 'jamie'],
  'john': ['jack', 'jackie', 'johnny'],
  'thomas': ['tom', 'tommy'],
  'richard': ['dick', 'rich', 'rick', 'ricky'],
  'elizabeth': ['liz', 'lizzie', 'beth', 'betty'],
  'jeffrey': ['jeff'],
  'jeffery': ['jeff'],
  'geoffrey': ['geoff'],
  'michael': ['mike', 'mikey'],
  'david': ['dave'],
  'daniel': ['dan', 'danny'],
  'christopher': ['chris'],
  'matthew': ['matt'],
  'andrew': ['andy'],
  'joseph': ['joe', 'joey'],
  'charles': ['charlie', 'chuck'],
  'anthony': ['tony'],
  'donald': ['don', 'donny'],
  'kenneth': ['ken', 'kenny'],
  'steven': ['steve'],
  'stephen': ['steve'],
  'edward': ['ed', 'eddie', 'ted', 'teddy'],
  'ronald': ['ron', 'ronnie'],
  'timothy': ['tim', 'timmy'],
  'joshua': ['josh'],
  'susan': ['sue', 'susie'],
  'margaret': ['maggie', 'peggy', 'meg'],
  'katherine': ['kathy', 'katie', 'kate'],
  'catherine': ['cathy', 'catie', 'cate'],
  'patricia': ['pat', 'patty', 'tricia'],
  'jennifer': ['jen', 'jenny'],
  'victoria': ['vicky', 'tori'],
  'rebecca': ['becky', 'becca'],
  'virginia': ['ginny'],
  'theodore': ['ted', 'teddy', 'theo'],
  'lawrence': ['larry'],
  'nicholas': ['nick'],
  'samuel': ['sam', 'sammy'],
  'benjamin': ['ben', 'benny'],
  'gregory': ['greg'],
  'alexander': ['alex', 'al'],
  'patrick': ['pat'],
  'deborah': ['deb', 'debbie'],
  'barbara': ['barb', 'barbie'],
  'judith': ['judy'],
  'kimberly': ['kim'],
  'pamela': ['pam'],
  'cynthia': ['cindy'],
  'sandra': ['sandy'],
  'kathleen': ['kathy'],
  'christine': ['chris', 'chrissy'],
  'janet': ['jan'],
  'carolyn': ['carol'],
  'nathan': ['nate'],
  'jonathan': ['jon'],
  'peter': ['pete'],
  'herbert': ['herb', 'herbie'],
  'frederick': ['fred', 'freddie'],
  'alfred': ['al', 'alfie'],
  'abraham': ['abe'],
  'leonard': ['len', 'lenny'],
  'vincent': ['vince', 'vinnie'],
  'philip': ['phil'],
  'francis': ['frank', 'frankie'],
  'franklin': ['frank'],
  'walter': ['walt', 'wally'],
  'douglas': ['doug'],
  'gerald': ['jerry'],
  'jerome': ['jerry'],
  'ghislaine': ['ghislane'] // Common typo/variation
};

// Flatten to a map where key = name, value = canonical group ID
// e.g. 'bill' -> 'william', 'william' -> 'william'
const nameGroups = new Map<string, string>();

Object.entries(NICKNAMES).forEach(([formal, nicks]) => {
  nameGroups.set(formal, formal);
  nicks.forEach(nick => nameGroups.set(nick, formal));
});

console.log('🔄 Entity Consolidation - Phase 3: Nicknames\n');
console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN (no changes will be made)' : '✏️  LIVE MODE (changes will be applied)'}\n`);

// Create backup
function createBackup() {
  if (DRY_RUN) {
    console.log('📦 Skipping backup (dry-run mode)\n');
    return;
  }
  
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(BACKUP_DIR, `epstein-archive-phase3-${timestamp}.db`);
  
  console.log('📦 Creating database backup...');
  fs.copyFileSync(DB_PATH, backupPath);
  console.log(`   ✓ Backup created: ${backupPath}\n`);
}

// Normalize name for comparison
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '');
}

function findMergeCandidates(entities: Entity[]): MergeCandidate[] {
  const candidates: MergeCandidate[] = [];
  const processed = new Set<string>();
  
  // Map "Surname" -> List of Entities
  // This allows us to quickly find "Clinton"s to compare "Bill" and "William".
  const surnameMap = new Map<string, Entity[]>();
  
  for (const entity of entities) {
    const norm = normalizeName(entity.full_name);
    const parts = norm.split(' ');
    if (parts.length < 2) continue;
    
    const surname = parts[parts.length - 1];
    if (!surnameMap.has(surname)) surnameMap.set(surname, []);
    surnameMap.get(surname)!.push(entity);
  }

  console.log('🔍 Analyzing entities for Nickname matches...\n');

  for (const entity of entities) {
    const norm = normalizeName(entity.full_name);
    const parts = norm.split(' ');
    if (parts.length < 2) continue;

    const firstName = parts[0];
    const surname = parts[parts.length - 1];
    
    // Check if first name is in our nickname groups
    if (nameGroups.has(firstName)) {
      const canonical = nameGroups.get(firstName)!;
      
      // Look for other entities with same surname
      const potentialMatches = surnameMap.get(surname) || [];
      
      for (const other of potentialMatches) {
        if (other.id === entity.id) continue;
        
        const otherNorm = normalizeName(other.full_name);
        const otherParts = otherNorm.split(' ');
        if (otherParts.length < 2) continue;
        
        const otherFirstName = otherParts[0];
        
        // Check if other first name is in SAME group
        if (nameGroups.get(otherFirstName) === canonical) {
          // Match found! (e.g. Bill Clinton vs William Clinton)
          
          // Verify middle names?
          // If one has middle name and other doesn't: "William Jefferson Clinton" vs "Bill Clinton"
          // We should be careful.
          // If both have middle names and they differ: "William Jefferson Clinton" vs "Bill Rodham Clinton" -> NO MATCH.
          
          // Logic:
          // 1. Strip First Name.
          // 2. Compare remaining parts.
          //    If remaining parts match exactly: "Clinton" == "Clinton". OK.
          //    If one is substring of other? "Jefferson Clinton" vs "Clinton".
          //    "Bill Clinton" (Clinton) vs "William Jefferson Clinton" (Jefferson Clinton).
          //    If we allow this, we merge Bill -> William.
          
          // Strict Rule for Phase 3:
          // Require remaining parts to be IDENTICAL or one is subset of other?
          // Let's start with IDENTICAL remaining parts (Surname match only if no middle name).
          // Actually, "Bill Clinton" and "William Clinton" -> Remaining is "Clinton". Identical.
          // "Bill Gates" and "William Gates" -> Remaining "Gates". Identical.
          
          const rest1 = parts.slice(1).join(' ');
          const rest2 = otherParts.slice(1).join(' ');
          
          if (rest1 === rest2) {
             // Exact match on rest of name
             // Merge into the one with more mentions
             const [source, target] = entity.mentions >= other.mentions ? [other, entity] : [entity, other];
             
             const pairKey = `${source.id}-${target.id}`;
             if (processed.has(pairKey)) continue;
             
             candidates.push({
               sourceId: source.id,
               sourceName: source.full_name,
               sourceMentions: source.mentions,
               targetId: target.id,
               targetName: target.full_name,
               targetMentions: target.mentions,
               confidence: 85, // Good confidence
               reason: `Nickname match: ${firstName} ~ ${otherFirstName}`,
               method: 'nickname_resolution'
             });
             processed.add(pairKey);
          }
        }
      }
    }
  }

  return candidates;
}

// Execute merge (Robust version from Phase 1/2)
function executeMerge(db: Database.Database, candidate: MergeCandidate): boolean {
  try {
    const transaction = db.transaction(() => {
      // Helper to handle simple updates
      const updateSimple = (table: string, col: string, srcId: number, tgtId: number) => {
        // console.log(`      Updating ${table}...`);
        db.prepare(`UPDATE ${table} SET ${col} = ? WHERE ${col} = ?`).run(tgtId, srcId);
      };

      // Helper to handle updates with potential unique constraint conflicts
      const updateOrDelete = (table: string, entityCol: string, uniqueCol: string | undefined, srcId: number, tgtId: number) => {
        // console.log(`      Updating ${table}...`);
        if (!uniqueCol) {
          try {
            db.prepare(`UPDATE ${table} SET ${entityCol} = ? WHERE ${entityCol} = ?`).run(tgtId, srcId);
          } catch (e: any) {
            if (e.code === 'SQLITE_CONSTRAINT_UNIQUE' || e.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
              db.prepare(`DELETE FROM ${table} WHERE ${entityCol} = ?`).run(srcId);
            } else {
              throw e;
            }
          }
          return;
        }

        const rows = db.prepare(`SELECT ${uniqueCol} FROM ${table} WHERE ${entityCol} = ?`).all(srcId) as any[];
        const updateStmt = db.prepare(`UPDATE OR IGNORE ${table} SET ${entityCol} = ? WHERE ${entityCol} = ? AND ${uniqueCol} = ?`);
        const deleteStmt = db.prepare(`DELETE FROM ${table} WHERE ${entityCol} = ? AND ${uniqueCol} = ?`);

        for (const row of rows) {
          const result = updateStmt.run(tgtId, srcId, row[uniqueCol]);
          if (result.changes === 0) {
            deleteStmt.run(srcId, row[uniqueCol]);
          }
        }
      };

      // 1. Update entity_mentions (References entities.id)
      updateOrDelete('entity_mentions', 'entity_id', 'document_id', candidate.sourceId, candidate.targetId);

      // 2. Update media_items (References entities.id)
      updateSimple('media_items', 'entity_id', candidate.sourceId, candidate.targetId);

      // 3. Update organizations (References entities.id)
      updateOrDelete('organizations', 'entity_id', undefined, candidate.sourceId, candidate.targetId);

      // 4. Update entity_evidence_types (References entities.id)
      try {
        updateOrDelete('entity_evidence_types', 'entity_id', 'evidence_type_id', candidate.sourceId, candidate.targetId);
      } catch (e) {}

      // 5. Handle PEOPLE table and dependent tables (entity_documents, black_book_entries)
      const sourcePerson = db.prepare('SELECT id FROM people WHERE entity_id = ?').get(candidate.sourceId) as {id: number} | undefined;
      const targetPerson = db.prepare('SELECT id FROM people WHERE entity_id = ?').get(candidate.targetId) as {id: number} | undefined;

      if (sourcePerson) {
        if (targetPerson) {
          // Both exist: Merge Source Person -> Target Person
          updateOrDelete('entity_documents', 'entity_id', 'document_id', sourcePerson.id, targetPerson.id);
          db.prepare('UPDATE black_book_entries SET person_id = ? WHERE person_id = ?').run(targetPerson.id, sourcePerson.id);
          db.prepare('DELETE FROM people WHERE id = ?').run(sourcePerson.id);
        } else {
          // Only Source exists: Re-point Source Person to Target Entity
          db.prepare('UPDATE people SET entity_id = ? WHERE id = ?').run(candidate.targetId, sourcePerson.id);
        }
      }

      // 6. Update target entity's mention count
      const updateTarget = db.prepare(`
        UPDATE entities 
        SET mentions = mentions + ?
        WHERE id = ?
      `);
      updateTarget.run(candidate.sourceMentions, candidate.targetId);

      // 7. Delete source entity
      const deleteSource = db.prepare(`
        DELETE FROM entities 
        WHERE id = ?
      `);
      deleteSource.run(candidate.sourceId);

      // Log to audit trail
      auditLog.push({
        timestamp: new Date().toISOString(),
        sourceId: candidate.sourceId,
        sourceName: candidate.sourceName,
        targetId: candidate.targetId,
        targetName: candidate.targetName,
        mentionsTransferred: candidate.sourceMentions,
        confidence: candidate.confidence,
        method: candidate.method
      });
    });

    transaction();
    return true;
  } catch (error: any) {
    console.log(`   ✗ Error merging ${candidate.sourceName} → ${candidate.targetName}: ${error.message}`);
    if (error.code) console.log(`     Code: ${error.code}`);
    return false;
  }
}

// Main execution
async function main() {
  createBackup();

  const db = new Database(DB_PATH);

  try {
    // Get all entities
    console.log('📊 Loading entities from database...');
    const entities = db.prepare(`
      SELECT id, full_name, mentions, entity_type
      FROM entities
      WHERE entity_type = 'Person'
      ORDER BY mentions DESC
    `).all() as Entity[];

    console.log(`   Found ${entities.length} person entities\n`);

    // Find merge candidates
    const candidates = findMergeCandidates(entities);

    console.log(`\n📋 Found ${candidates.length} merge candidates:\n`);

    if (candidates.length === 0) {
      console.log('   No nickname duplicates found!\n');
      return;
    }

    // Display candidates
    let totalMentionsToMerge = 0;
    candidates.forEach((candidate, index) => {
      console.log(`${index + 1}. [${candidate.confidence}%] ${candidate.sourceName} (${candidate.sourceMentions}) → ${candidate.targetName} (${candidate.targetMentions})`);
      console.log(`   Reason: ${candidate.reason}\n`);
      totalMentionsToMerge += candidate.sourceMentions;
    });

    console.log(`\n📈 Summary:`);
    console.log(`   Entities to merge: ${candidates.length}`);
    console.log(`   Total mentions to consolidate: ${totalMentionsToMerge}`);
    console.log(`   Estimated entity reduction: ${((candidates.length / entities.length) * 100).toFixed(2)}%\n`);

    if (DRY_RUN) {
      console.log('🔍 DRY RUN MODE - No changes made');
      console.log('   Run without --dry-run flag to apply these merges\n');
      return;
    }

    // Resolve chains and filter duplicates
    console.log('🔗 Resolving merge chains...');
    const redirects = new Map<number, number>();
    const finalCandidates: MergeCandidate[] = [];
    
    candidates.sort((a, b) => b.confidence - a.confidence);

    for (const candidate of candidates) {
      if (redirects.has(candidate.sourceId)) continue;

      let targetId = candidate.targetId;
      const visited = new Set<number>();
      while (redirects.has(targetId)) {
        if (visited.has(targetId)) break;
        visited.add(targetId);
        targetId = redirects.get(targetId)!;
      }

      if (candidate.sourceId === targetId) continue;

      candidate.targetId = targetId;
      finalCandidates.push(candidate);
      redirects.set(candidate.sourceId, targetId);
    }
    
    console.log(`   Reduced candidates from ${candidates.length} to ${finalCandidates.length} after chain resolution.\n`);

    // Execute merges
    console.log('✏️  Executing merges...\n');
    let successCount = 0;
    let failCount = 0;

    for (const candidate of finalCandidates) {
      const success = executeMerge(db, candidate);
      if (success) {
        successCount++;
        console.log(`   ✓ Merged: ${candidate.sourceName} → ${candidate.targetName} (ID: ${candidate.targetId})`);
      } else {
        failCount++;
      }
    }

    // Save audit log
    fs.writeFileSync(AUDIT_LOG_PATH, JSON.stringify(auditLog, null, 2));

    console.log(`\n✅ Consolidation Complete!`);
    console.log(`   Successful merges: ${successCount}`);
    console.log(`   Failed merges: ${failCount}`);
    console.log(`   Audit log saved: ${AUDIT_LOG_PATH}\n`);

    // Verify results
    const newCount = db.prepare("SELECT COUNT(*) as count FROM entities WHERE entity_type = 'Person'").get() as { count: number };
    console.log(`📊 Final Statistics:`);
    console.log(`   Person entities before: ${entities.length}`);
    console.log(`   Person entities after: ${newCount.count}`);
    console.log(`   Reduction: ${entities.length - newCount.count} (${(((entities.length - newCount.count) / entities.length) * 100).toFixed(2)}%)\n`);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    db.close();
  }
}

// Run
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
