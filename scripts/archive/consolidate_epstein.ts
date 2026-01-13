
import Database from 'better-sqlite3';

const DB_PATH = process.env.DB_PATH || 'epstein-archive.db';
const db = new Database(DB_PATH);

function consolidateEpstein() {
  console.log('🚀 Starting Jeffrey Epstein Entity Consolidation...');

  // 1. Identify Canonical Entity
  const canonicalName = 'Jeffrey Epstein';
  const canonical = db.prepare('SELECT id FROM entities WHERE full_name = ?').get(canonicalName) as { id: number };

  if (!canonical) {
    console.error('❌ CRITICAL: Canonical entity "Jeffrey Epstein" not found!');
    process.exit(1);
  }

  const canonicalId = canonical.id;
  console.log(`✅ Identified Canonical Entity: "${canonicalName}" (ID: ${canonicalId})`);

  // 2. Identify Duplicates
  // Find entities starting with "Jeffrey Epstein", excluding the canonical one
  const duplicates = db.prepare(`
    SELECT id, full_name 
    FROM entities 
    WHERE full_name LIKE 'Jeffrey Epstein%' 
    AND id != ?
  `).all(canonicalId) as { id: number; full_name: string }[];

  if (duplicates.length === 0) {
    console.log('✨ No duplicates found. System clean.');
    return;
  }

  console.log(`Found ${duplicates.length} duplicates to merge:`);
  duplicates.forEach(d => console.log(` - [${d.id}] "${d.full_name}"`));

  // 3. Merge Logic
  let totalMentionsMoved = 0;
  let totalRelationshipsMerged = 0;
  let totalMediaTagsMerged = 0;

  const moveMentions = db.prepare('UPDATE entity_mentions SET entity_id = ? WHERE entity_id = ?');
  const deleteEntity = db.prepare('DELETE FROM entities WHERE id = ?');

  // Transaction for safety
  const transaction = db.transaction(() => {
    for (const dup of duplicates) {
      console.log(`\nProcessing duplicate: [${dup.id}] "${dup.full_name}"...`);

      // A. Move Mentions (No unique constraint typically)
      const mentionsResult = moveMentions.run(canonicalId, dup.id);
      console.log(`  - Moved ${mentionsResult.changes} mentions`);
      totalMentionsMoved += mentionsResult.changes;

      // B. Move Media Tags (Handle Unique Constraint: media_item_id, entity_id)
      const mediaTags = db.prepare('SELECT media_item_id FROM media_item_people WHERE entity_id = ?').all(dup.id) as { media_item_id: number }[];
      let mediaMoved = 0;
      for (const mt of mediaTags) {
        try {
          db.prepare('UPDATE media_item_people SET entity_id = ? WHERE entity_id = ? AND media_item_id = ?').run(canonicalId, dup.id, mt.media_item_id);
          mediaMoved++;
        } catch (e: any) {
          if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            // Already tagged with canonical, just delete duplicate tag
            db.prepare('DELETE FROM media_item_people WHERE entity_id = ? AND media_item_id = ?').run(dup.id, mt.media_item_id);
          } else {
            console.warn(`  ! Error moving media tag: ${e.message}`);
          }
        }
      }
      console.log(`  - Moved ${mediaMoved} media tags`);
      totalMediaTagsMerged += mediaMoved;

      // C. Move Relationships (Handle Unique Constraint: source_entity_id, target_entity_id)
      // C1. Where dup is Source
      const relsAsSource = db.prepare('SELECT id, target_entity_id FROM entity_relationships WHERE source_entity_id = ?').all(dup.id) as { id: number, target_entity_id: number }[];
      for (const rel of relsAsSource) {
        if (rel.target_entity_id === canonicalId) {
            // Self-relationship created? Delete it.
            db.prepare('DELETE FROM entity_relationships WHERE id = ?').run(rel.id);
            continue;
        }
        try {
          db.prepare('UPDATE entity_relationships SET source_entity_id = ? WHERE id = ?').run(canonicalId, rel.id);
          totalRelationshipsMerged++;
        } catch (e: any) {
             if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                 // Conflict, relationship exists. Delete duplicate.
                 db.prepare('DELETE FROM entity_relationships WHERE id = ?').run(rel.id);
             }
        }
      }

      // C2. Where dup is Target
      const relsAsTarget = db.prepare('SELECT id, source_entity_id FROM entity_relationships WHERE target_entity_id = ?').all(dup.id) as { id: number, source_entity_id: number }[];
      for (const rel of relsAsTarget) {
         if (rel.source_entity_id === canonicalId) {
            // Self-relationship created? Delete it.
            db.prepare('DELETE FROM entity_relationships WHERE id = ?').run(rel.id);
            continue;
        }
        try {
          db.prepare('UPDATE entity_relationships SET target_entity_id = ? WHERE id = ?').run(canonicalId, rel.id);
          totalRelationshipsMerged++;
        } catch (e: any) {
            if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                db.prepare('DELETE FROM entity_relationships WHERE id = ?').run(rel.id);
            }
        }
      }
      console.log(`  - Merged relationships`);

      // D. Delete the Duplicate Entity
      deleteEntity.run(dup.id);
      console.log(`  - 🗑 Deleted entity [${dup.id}]`);
    }

    // E. Aggregated Recalculation (Optional but good practice)
    // Recalculate 'mentions' count for canonical
    const count = db.prepare('SELECT COUNT(*) as count FROM entity_mentions WHERE entity_id = ?').get(canonicalId) as { count: number };
    db.prepare('UPDATE entities SET mentions = ? WHERE id = ?').run(count.count, canonicalId);
    console.log(`\n✅ Updated canonical mentions count to: ${count.count}`);
  });

  // Execute the transaction
  transaction();

  console.log('\n============== SUMMARY ==============');
  console.log(`Entities Merged: ${duplicates.length}`);
  console.log(`Mentions Moved: ${totalMentionsMoved}`);
  console.log(`Relationships Merged: ${totalRelationshipsMerged}`);
  console.log(`Media Tags Merged: ${totalMediaTagsMerged}`);
  console.log('=====================================');
}

consolidateEpstein();
