import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../epstein-archive.db');
const BACKUP_DIR = path.join(__dirname, '../backups');
const AUDIT_LOG_PATH = path.join(__dirname, '../entity_consolidation_audit_phase2.json');

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

console.log('🔄 Entity Consolidation - Phase 2: Titles & Prefixes\n');
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
  const backupPath = path.join(BACKUP_DIR, `epstein-archive-phase2-${timestamp}.db`);
  
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

// Phase 2: Find Candidates based on Prefixes
function findMergeCandidates(entities: Entity[]): MergeCandidate[] {
  const candidates: MergeCandidate[] = [];
  const processed = new Set<string>();
  
  // Map normalized names to entities for fast lookup
  // If multiple entities have same normalized name, pick the one with most mentions
  const nameMap = new Map<string, Entity>();
  
  for (const entity of entities) {
    const norm = normalizeName(entity.full_name);
    if (!nameMap.has(norm) || entity.mentions > nameMap.get(norm)!.mentions) {
      nameMap.set(norm, entity);
    }
  }

  const PREFIXES = [
    'mr', 'mrs', 'ms', 'dr', 'prof', 'hon', 'sir', 'madam', 'lord', 'lady', 
    'prince', 'princess', 'president', 'senator', 'governor', 'secretary', 
    'judge', 'attorney', 'agent', 'officer', 'detective', 'colonel', 'general',
    'major', 'captain', 'lieutenant', 'sgt', 'sergeant', 'rev', 'reverend',
    'rep', 'representative', 'congressman', 'congresswoman',
    // International / Noble / Religious
    'sheikh', 'sheik', 'king', 'queen', 'baron', 'baroness', 'count', 'countess',
    'duke', 'duchess', 'emir', 'sultan', 'prime minister', 'minister', 'ambassador',
    'chancellor', 'premier', 'father', 'sister', 'brother', 'rabbi', 'imam',
    'bishop', 'cardinal', 'pope', 'his highness', 'her highness', 'his majesty',
    'her majesty', 'crown prince', 'deputy'
  ];

  console.log('🔍 Analyzing entities for Title/Prefix matches...\n');

  for (const entity of entities) {
    const normName = normalizeName(entity.full_name);
    const parts = normName.split(' ');
    
    if (parts.length < 2) continue; // Skip single words

    const firstWord = parts[0];
    
    if (PREFIXES.includes(firstWord)) {
      // Strip prefix
      const strippedParts = parts.slice(1);
      const strippedName = strippedParts.join(' ');
      
      // Safety Rule: Stripped name must have at least 2 words
      // "President Bill Clinton" -> "Bill Clinton" (OK)
      // "Mr Epstein" -> "Epstein" (SKIP - too ambiguous)
      if (strippedParts.length < 2) continue;

      // Check if stripped name exists in our map
      if (nameMap.has(strippedName)) {
        const target = nameMap.get(strippedName)!;
        
        // Don't merge into self (shouldn't happen if IDs differ)
        if (target.id === entity.id) continue;

        // Always merge Source (With Prefix) -> Target (Without Prefix)
        // e.g. "President Clinton" -> "Bill Clinton" ?? No, "President Bill Clinton" -> "Bill Clinton"
        // Wait, if "President Clinton" -> "Clinton". "Clinton" has 1 word. Skipped.
        
        // So we are merging "Title FullName" -> "FullName".
        // This is safe.
        
        const pairKey = `${entity.id}-${target.id}`;
        if (processed.has(pairKey)) continue;

        candidates.push({
          sourceId: entity.id,
          sourceName: entity.full_name,
          sourceMentions: entity.mentions,
          targetId: target.id,
          targetName: target.full_name,
          targetMentions: target.mentions,
          confidence: 90, // High confidence for exact substring match with title
          reason: `Prefix stripping: "${firstWord}" removed`,
          method: 'prefix_stripping'
        });
        processed.add(pairKey);
      }
    }
  }

  return candidates;
}

// Execute merge (Robust version from Phase 1)
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
      console.log('   No title/prefix duplicates found!\n');
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
