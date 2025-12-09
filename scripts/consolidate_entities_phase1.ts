import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../epstein-archive.db');
const BACKUP_DIR = path.join(__dirname, '../backups');
const AUDIT_LOG_PATH = path.join(__dirname, '../entity_consolidation_audit.json');

// Configuration
const DRY_RUN = process.argv.includes('--dry-run');
const CONFIDENCE_THRESHOLD = 95;

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

console.log('🔄 Entity Consolidation - Phase 1: Safe Auto-Merge\n');
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
  const backupPath = path.join(BACKUP_DIR, `epstein-archive-${timestamp}.db`);
  
  console.log('📦 Creating database backup...');
  fs.copyFileSync(DB_PATH, backupPath);
  console.log(`   ✓ Backup created: ${backupPath}\n`);
}

// Levenshtein distance for typo detection
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[len1][len2];
}

// Normalize name for comparison
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '');
}

// Check if name is a reordering (e.g., "Epstein Jeffrey" vs "Jeffrey Epstein")
function isNameReordering(name1: string, name2: string): boolean {
  const words1 = normalizeName(name1).split(' ').sort();
  const words2 = normalizeName(name2).split(' ').sort();
  
  if (words1.length !== words2.length || words1.length < 2) return false;
  
  return words1.every((word, i) => word === words2[i]);
}

// Optimized findMergeCandidates using Multi-Pass Strategy
function findMergeCandidates(entities: Entity[]): MergeCandidate[] {
  const candidates: MergeCandidate[] = [];
  const processed = new Set<string>(); // Track pairs we've already added
  const mergedIds = new Set<number>(); // Track IDs that are being merged to avoid chaining issues in one pass

  console.log('🔍 Analyzing entities for duplicates (Optimized Multi-Pass)...\n');

  // Helper to add candidate safely
  const addCandidate = (e1: Entity, e2: Entity, conf: number, reason: string, method: string) => {
    // Always merge into the one with more mentions
    const [source, target] = e1.mentions >= e2.mentions ? [e2, e1] : [e1, e2];
    
    // Create a unique key for this pair to avoid duplicates
    const pairKey = `${source.id}-${target.id}`;
    if (processed.has(pairKey)) return;
    
    // Avoid merging the same source multiple times in one batch if possible, 
    // or chaining (A->B, B->C). For simplicity in this script, we'll allow it 
    // but the execution phase handles it by checking if entity exists.
    
    candidates.push({
      sourceId: source.id,
      sourceName: source.full_name,
      sourceMentions: source.mentions,
      targetId: target.id,
      targetName: target.full_name,
      targetMentions: target.mentions,
      confidence: conf,
      reason,
      method
    });
    processed.add(pairKey);
  };

  // --- PASS 1: Exact Normalized Match ---
  console.log('   Pass 1: Exact Normalized Match...');
  const exactGroups = new Map<string, Entity[]>();
  
  for (const entity of entities) {
    const norm = normalizeName(entity.full_name);
    if (norm.length < 3) continue; // Skip very short names
    if (!exactGroups.has(norm)) exactGroups.set(norm, []);
    exactGroups.get(norm)!.push(entity);
  }

  for (const [key, group] of exactGroups.entries()) {
    if (group.length > 1) {
      // Sort by mentions desc
      group.sort((a, b) => b.mentions - a.mentions);
      const target = group[0];
      for (let i = 1; i < group.length; i++) {
        addCandidate(group[i], target, 100, 'Exact match (case-insensitive)', 'exact_match');
      }
    }
  }

  // --- PASS 2: Token Sort Match (Name Reordering) ---
  console.log('   Pass 2: Name Reordering Match...');
  const tokenGroups = new Map<string, Entity[]>();

  for (const entity of entities) {
    const norm = normalizeName(entity.full_name);
    if (norm.length < 3) continue;
    // Sort tokens: "epstein jeffrey" -> "epstein jeffrey", "jeffrey epstein" -> "epstein jeffrey"
    const tokenKey = norm.split(' ').sort().join(' ');
    if (!tokenGroups.has(tokenKey)) tokenGroups.set(tokenKey, []);
    tokenGroups.get(tokenKey)!.push(entity);
  }

  for (const [key, group] of tokenGroups.entries()) {
    if (group.length > 1) {
      group.sort((a, b) => b.mentions - a.mentions);
      const target = group[0];
      for (let i = 1; i < group.length; i++) {
        // Check if we already caught this in Pass 1
        // (Pass 1 is a subset of Pass 2, so usually yes, but logic handles duplicates)
        addCandidate(group[i], target, 98, 'Name word order variation', 'name_reordering');
      }
    }
  }

  // --- PASS 3: Sliding Window Fuzzy Match ---
  console.log('   Pass 3: Sliding Window Fuzzy Match (Typos)...');
  
  const STOPWORDS = new Set(['with', 'when', 'what', 'where', 'that', 'this', 'from', 'into', 'over', 'under', 'after', 'before']);

  // Sort entities by normalized name
  const sortedEntities = [...entities].sort((a, b) => {
    return normalizeName(a.full_name).localeCompare(normalizeName(b.full_name));
  });

  const WINDOW_SIZE = 20;

  for (let i = 0; i < sortedEntities.length; i++) {
    const e1 = sortedEntities[i];
    const norm1 = normalizeName(e1.full_name);
    
    // Safety: Skip if starts with stopword (likely extraction artifact)
    const firstWord = norm1.split(' ')[0];
    if (STOPWORDS.has(firstWord)) continue;

    // Safety: Skip short names for fuzzy match
    if (norm1.length < 6) continue; 

    for (let j = 1; j <= WINDOW_SIZE; j++) {
      if (i + j >= sortedEntities.length) break;
      
      const e2 = sortedEntities[i + j];
      const norm2 = normalizeName(e2.full_name);
      
      // Safety: Skip if starts with stopword
      if (STOPWORDS.has(norm2.split(' ')[0])) continue;

      // Safety: Require first letter match for fuzzy matching
      // (Typos rarely affect the first letter of a name)
      if (norm1[0] !== norm2[0]) continue;
      
      // Quick length check
      if (Math.abs(norm1.length - norm2.length) > 2) continue;

      // Check Levenshtein
      const dist = levenshteinDistance(norm1, norm2);
      
      // Strict Rules:
      // Length < 8: Exact match only (handled by Pass 1)
      // Length 8-15: Max distance 1
      // Length > 15: Max distance 2
      let isMatch = false;
      
      if (norm1.length >= 8 && norm1.length <= 15 && dist === 1) isMatch = true;
      if (norm1.length > 15 && dist <= 2) isMatch = true;

      if (isMatch) {
        const confidence = 100 - (dist * 2.5);
        addCandidate(e1, e2, confidence, `Typo detected (edit distance: ${dist})`, 'typo_correction');
      }
    }
  }

  return candidates;
}

// Execute merge
// Execute merge
function executeMerge(db: Database.Database, candidate: MergeCandidate): boolean {
  try {
    const transaction = db.transaction(() => {
      // Helper to handle simple updates
      const updateSimple = (table: string, col: string, srcId: number, tgtId: number) => {
        console.log(`      Updating ${table}...`);
        db.prepare(`UPDATE ${table} SET ${col} = ? WHERE ${col} = ?`).run(tgtId, srcId);
      };

      // Helper to handle updates with potential unique constraint conflicts
      const updateOrDelete = (table: string, entityCol: string, uniqueCol: string | undefined, srcId: number, tgtId: number) => {
        console.log(`      Updating ${table}...`);
        if (!uniqueCol) {
          try {
            db.prepare(`UPDATE ${table} SET ${entityCol} = ? WHERE ${entityCol} = ?`).run(tgtId, srcId);
          } catch (e: any) {
            if (e.code === 'SQLITE_CONSTRAINT_UNIQUE' || e.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
              console.log(`      Conflict in ${table} for ${entityCol}=${srcId}, deleting source row.`);
              db.prepare(`DELETE FROM ${table} WHERE ${entityCol} = ?`).run(srcId);
            } else {
              console.log(`      Error updating ${table} (Simple): ${e.message}`);
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
            console.log(`      Conflict in ${table} for ${entityCol}=${srcId} and ${uniqueCol}=${row[uniqueCol]}, deleting source row.`);
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
      } catch (e) {
        console.log(`      Error updating entity_evidence_types (might be expected for non-person entities): ${e}`);
      }

      // 5. Handle PEOPLE table and dependent tables (entity_documents, black_book_entries)
      // These reference people.id!
      const sourcePerson = db.prepare('SELECT id FROM people WHERE entity_id = ?').get(candidate.sourceId) as {id: number} | undefined;
      const targetPerson = db.prepare('SELECT id FROM people WHERE entity_id = ?').get(candidate.targetId) as {id: number} | undefined;

      if (sourcePerson) {
        console.log(`      Source entity ${candidate.sourceId} is linked to person ${sourcePerson.id}.`);
        if (targetPerson) {
          console.log(`      Target entity ${candidate.targetId} is linked to person ${targetPerson.id}. Merging person records.`);
          // Both exist: Merge Source Person -> Target Person
          
          // Update entity_documents (References people.id)
          updateOrDelete('entity_documents', 'entity_id', 'document_id', sourcePerson.id, targetPerson.id);
          
          // Update black_book_entries (References people.id)
          console.log(`      Updating black_book_entries for person ${sourcePerson.id} to ${targetPerson.id}...`);
          db.prepare('UPDATE black_book_entries SET person_id = ? WHERE person_id = ?').run(targetPerson.id, sourcePerson.id);
          
          // Delete Source Person
          console.log(`      Deleting source person ${sourcePerson.id}...`);
          db.prepare('DELETE FROM people WHERE id = ?').run(sourcePerson.id);
        } else {
          console.log(`      Target entity ${candidate.targetId} has no person record. Re-pointing source person ${sourcePerson.id} to target entity.`);
          // Only Source exists: Re-point Source Person to Target Entity
          // entity_documents and black_book_entries still point to sourcePerson.id, which is fine!
          // We just change the link from Person -> Entity
          db.prepare('UPDATE people SET entity_id = ? WHERE id = ?').run(candidate.targetId, sourcePerson.id);
        }
      } else {
        console.log(`      Source entity ${candidate.sourceId} is not linked to a person record.`);
      }

      // 6. Update target entity's mention count
      console.log(`      Updating target entity ${candidate.targetId} mention count by adding ${candidate.sourceMentions}...`);
      const updateTarget = db.prepare(`
        UPDATE entities 
        SET mentions = mentions + ?
        WHERE id = ?
      `);
      updateTarget.run(candidate.sourceMentions, candidate.targetId);

      // 7. Delete source entity
      console.log(`      Deleting source entity ${candidate.sourceId}...`);
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
      console.log('   No duplicates found! Database is clean.\n');
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
    
    // Sort by confidence DESC to prioritize best matches
    candidates.sort((a, b) => b.confidence - a.confidence);

    for (const candidate of candidates) {
      // If source is already merged, skip
      if (redirects.has(candidate.sourceId)) {
        console.log(`   Skipping ${candidate.sourceName} (already merged into ${redirects.get(candidate.sourceId)})`);
        continue;
      }

      // Resolve target if it was already merged
      let targetId = candidate.targetId;
      let targetName = candidate.targetName;
      
      // Trace the chain: B->C, C->D => B->D
      const visited = new Set<number>();
      while (redirects.has(targetId)) {
        if (visited.has(targetId)) break; // Cycle detected
        visited.add(targetId);
        targetId = redirects.get(targetId)!;
        // We don't easily have the name of the new target here without lookup, 
        // but for execution we only need ID. Name is for logging.
      }

      if (candidate.sourceId === targetId) {
        console.log(`   Skipping circular merge ${candidate.sourceName} -> ${targetName} -> ... -> ${candidate.sourceName}`);
        continue;
      }

      // Update candidate
      candidate.targetId = targetId;
      // Note: targetName might be stale if redirected, but ID is correct.
      
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
