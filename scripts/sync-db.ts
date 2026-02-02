import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { existsSync } from 'fs';

// ============================================
// CONFIGURATION
// ============================================

const ARGS = process.argv.slice(2);
const SOURCE_DB = ARGS.find((a) => a.startsWith('--source='))?.split('=')[1];
const TARGET_DB = ARGS.find((a) => a.startsWith('--target='))?.split('=')[1];
const DRY_RUN = ARGS.includes('--dry-run');

if (!SOURCE_DB || !TARGET_DB) {
  console.error('Usage: tsx scripts/sync-db.ts --source=prod.db --target=local.db [--dry-run]');
  process.exit(1);
}

if (!existsSync(SOURCE_DB)) {
  console.error(`❌ Source DB not found: ${SOURCE_DB}`);
  process.exit(1);
}

if (!existsSync(TARGET_DB)) {
  console.error(`❌ Target DB not found: ${TARGET_DB}`);
  process.exit(1);
}

console.log(`🔄 SYNC-DB: Merging [${SOURCE_DB}] -> [${TARGET_DB}]`);
if (DRY_RUN) console.log('   (DRY RUN MODE: No changes will be written)');

// ============================================
// SYNC LOGIC
// ============================================

async function main() {
  const source = await open({
    filename: SOURCE_DB!,
    driver: sqlite3.Database,
    mode: sqlite3.OPEN_READONLY,
  });
  const target = await open({ filename: TARGET_DB!, driver: sqlite3.Database });

  // ID Mappings (Source ID -> Target ID)
  // Needed because we generate new IDs in target to avoid collisions
  const entityIdMap = new Map<number, number>();
  const documentIdMap = new Map<number, number>();

  try {
    // 1. Sync Documents
    // Key: file_path (Unique)
    console.log('\n📄 Syncing Documents...');
    const sDocs = await source.all('SELECT * FROM documents');

    // Pre-fetch existing target docs to minimize queries
    const tDocs = await target.all('SELECT id, file_path, content_hash FROM documents');
    const tDocMap = new Map<string, any>(tDocs.map((d) => [d.file_path, d]));

    let newDocs = 0;
    let skippedDocs = 0;

    for (const doc of sDocs) {
      const existing = tDocMap.get(doc.file_path);

      if (existing) {
        documentIdMap.set(doc.id, existing.id);

        // Hash Check: Update if content has changed (and hash is available)
        if (
          doc.content_hash &&
          existing.content_hash &&
          doc.content_hash !== existing.content_hash
        ) {
          if (!DRY_RUN) {
            // Perform Update
            // We keep the ID but update everything else
            const { id, ...data } = doc;
            const cols = Object.keys(data)
              .map((k) => `${k} = ?`)
              .join(', ');
            const vals = [...Object.values(data), existing.id];

            await target.run(`UPDATE documents SET ${cols} WHERE id = ?`, vals);
          }
          console.log(`     * Updated doc ${doc.id} (Hash mismatch)`);
        } else {
          skippedDocs++;
        }
      } else {
        if (!DRY_RUN) {
          // Insert (excluding ID)
          const { id, ...data } = doc;
          const cols = Object.keys(data).join(', ');
          const vals = Object.values(data);
          const placeholders = vals.map(() => '?').join(', ');

          const res = await target.run(
            `INSERT INTO documents (${cols}) VALUES (${placeholders})`,
            vals,
          );
          documentIdMap.set(doc.id, res.lastID!);
        }
        newDocs++;
      }
    }
    console.log(`   + Added ${newDocs} documents`);
    console.log(`   - Skipped ${skippedDocs} existing`);

    // 2. Sync Entities
    // Key: full_name (Unique-ish, we assume canonical names)
    console.log('\n👥 Syncing Entities...');
    const sEntities = await source.all('SELECT * FROM entities');
    const tEntities = await target.all('SELECT id, full_name FROM entities');
    const tEntityMap = new Map<string, number>(
      tEntities.map((e) => [e.full_name.toLowerCase(), e.id]),
    );

    let newEntities = 0;
    let mappedEntities = 0;

    for (const entity of sEntities) {
      const lowerName = entity.full_name.toLowerCase();
      const existingId = tEntityMap.get(lowerName);

      if (existingId) {
        entityIdMap.set(entity.id, existingId);
        mappedEntities++;
      } else {
        if (!DRY_RUN) {
          const { id, ...data } = entity;
          // Handle potentially missing columns in older schemas if any?
          // Assuming schemas are identical for now.
          const cols = Object.keys(data).join(', ');
          const vals = Object.values(data);
          const placeholders = vals.map(() => '?').join(', ');

          const res = await target.run(
            `INSERT INTO entities (${cols}) VALUES (${placeholders})`,
            vals,
          );
          entityIdMap.set(entity.id, res.lastID!);
          tEntityMap.set(lowerName, res.lastID!); // Add to map for subsequent self-references if any
        }
        newEntities++;
      }
    }
    console.log(`   + Added ${newEntities} entities`);
    console.log(`   = Mapped ${mappedEntities} shared entities`);

    // 3. Sync Entity Relationships
    // Depends on Entity ID Map
    console.log('\n🔗 Syncing Relationships...');
    const sRels = await source.all('SELECT * FROM entity_relationships');
    let newRels = 0;

    // Check existing rels to avoid duplicates
    // Generating a composite key for fast lookup: "src-tgt-type"
    const tRels = await target.all(
      'SELECT source_entity_id, target_entity_id, relationship_type FROM entity_relationships',
    );
    const tRelSet = new Set(
      tRels.map((r) => `${r.source_entity_id}-${r.target_entity_id}-${r.relationship_type}`),
    );

    for (const rel of sRels) {
      const newSourceId = entityIdMap.get(rel.source_entity_id);
      const newTargetId = entityIdMap.get(rel.target_entity_id);

      if (newSourceId && newTargetId) {
        const key = `${newSourceId}-${newTargetId}-${rel.relationship_type}`;

        if (!tRelSet.has(key)) {
          if (!DRY_RUN) {
            const { id, source_entity_id, target_entity_id, ...data } = rel;
            const cols = ['source_entity_id', 'target_entity_id', ...Object.keys(data)].join(', ');
            const vals = [newSourceId, newTargetId, ...Object.values(data)];
            const placeholders = vals.map(() => '?').join(', ');

            await target.run(
              `INSERT INTO entity_relationships (${cols}) VALUES (${placeholders})`,
              vals,
            );
          }
          newRels++;
        }
      }
    }
    console.log(`   + Added ${newRels} relationships`);

    // 4. Sync Mentions (Optional / Heavy)
    // Depends on Document ID Map AND Entity ID Map
    // To keep this script fast, we'll sync simple mentions if the table exists
    // (Assuming 'entity_mentions' table)
    console.log('\n💬 Syncing Mentions...');

    // Check if table exists
    const hasMentions = await target.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='entity_mentions'",
    );

    if (hasMentions) {
      const sMentions = await source.all('SELECT * FROM entity_mentions');
      let newMentions = 0;

      // Naively insert valid ones. Duplicates might be hard to detect perfectly without a hash or ID.
      // We'll rely on the Fact that we only insert if we have a valid Doc Map and Entity Map match
      // AND if the mention isn't suspiciously identical (same doc, same entity, same context).

      // Pre-load target signature: "docId-entId-context"
      const tMentions = await target.all(
        'SELECT document_id, entity_id, mention_context FROM entity_mentions',
      );
      // Use a simple hash set for existing mentions
      const tMenSet = new Set(
        tMentions.map(
          (m) => `${m.document_id}-${m.entity_id}-${(m.mention_context || '').substring(0, 20)}`,
        ),
      );

      for (const m of sMentions) {
        const newDocId = documentIdMap.get(m.document_id);
        const newEntityId = entityIdMap.get(m.entity_id);

        if (newDocId && newEntityId) {
          const sig = `${newDocId}-${newEntityId}-${(m.mention_context || '').substring(0, 20)}`;

          if (!tMenSet.has(sig)) {
            if (!DRY_RUN) {
              const { id, document_id, entity_id, ...data } = m;
              const cols = ['document_id', 'entity_id', ...Object.keys(data)].join(', ');
              const vals = [newDocId, newEntityId, ...Object.values(data)];
              const placeholders = vals.map(() => '?').join(', ');

              await target.run(
                `INSERT INTO entity_mentions (${cols}) VALUES (${placeholders})`,
                vals,
              );
            }
            newMentions++;
          }
        }
      }
      console.log(`   + Added ${newMentions} mentions`);
    } else {
      console.log('   (Skipped - table not found)');
    }

    console.log('\n✅ Sync Completed Successfully.');
  } catch (e) {
    console.error('\n❌ Sync Failed:', e);
    process.exit(1);
  } finally {
    await source.close();
    await target.close();
  }
}

main();
