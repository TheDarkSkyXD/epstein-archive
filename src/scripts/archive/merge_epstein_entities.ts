import { databaseService } from '../services/DatabaseService';

/**
 * Merge duplicate Jeffrey Epstein entities
 * Consolidates "Jeffrey Epstein Unauthorized", "Jeffrey E. Epstein", etc. into "Jeffrey Epstein"
 */
async function mergeEpsteinEntities() {
  console.log('🔍 Finding Jeffrey Epstein entity variants...');

  const db = (databaseService as any).db;

  // Find all Jeffrey Epstein variants
  const variants = db
    .prepare(
      `
    SELECT id, full_name, mentions, spice_rating, spice_score
    FROM entities
    WHERE full_name LIKE '%Jeffrey%Epstein%'
    OR full_name LIKE '%Epstein%Jeffrey%'
    ORDER BY mentions DESC
  `,
    )
    .all();

  console.log(`Found ${variants.length} Jeffrey Epstein variants:`);
  variants.forEach((v: any) => {
    console.log(
      `  - ${v.full_name} (ID: ${v.id}, Mentions: ${v.mentions}, Spice: ${v.spice_rating})`,
    );
  });

  if (variants.length === 0) {
    console.log('❌ No Jeffrey Epstein entities found');
    return;
  }

  // Find or create the canonical "Jeffrey Epstein" entity
  let canonicalEntity = variants.find((v: any) => v.full_name === 'Jeffrey Epstein');

  if (!canonicalEntity) {
    // Use the one with the most mentions as canonical
    canonicalEntity = variants[0];
    console.log(`\n📌 Using "${canonicalEntity.full_name}" as canonical entity`);

    // Rename it to "Jeffrey Epstein" if it's not already
    if (canonicalEntity.full_name !== 'Jeffrey Epstein') {
      db.prepare(
        `
        UPDATE entities
        SET full_name = 'Jeffrey Epstein'
        WHERE id = ?
      `,
      ).run(canonicalEntity.id);
      console.log(`   Renamed to "Jeffrey Epstein"`);
    }
  } else {
    console.log(
      `\n📌 Canonical entity: "${canonicalEntity.full_name}" (ID: ${canonicalEntity.id})`,
    );
  }

  const canonicalId = canonicalEntity.id;

  // Merge all other variants into the canonical one
  const duplicates = variants.filter((v: any) => v.id !== canonicalId);

  if (duplicates.length === 0) {
    console.log('✅ No duplicates to merge');
    return;
  }

  console.log(`\n🔄 Merging ${duplicates.length} duplicate(s) into canonical entity...`);

  let totalMentionsMerged = 0;

  for (const duplicate of duplicates) {
    console.log(`\n  Merging "${duplicate.full_name}" (ID: ${duplicate.id})...`);

    // Update entity_mentions to point to canonical entity
    const mentionsUpdated = db
      .prepare(
        `
      UPDATE entity_mentions
      SET entity_id = ?
      WHERE entity_id = ?
    `,
      )
      .run(canonicalId, duplicate.id);

    console.log(`    - Updated ${mentionsUpdated.changes} mention records`);
    totalMentionsMerged += mentionsUpdated.changes;

    // Update entity_evidence_types
    const evidenceUpdated = db
      .prepare(
        `
      INSERT OR IGNORE INTO entity_evidence_types (entity_id, evidence_type_id)
      SELECT ?, evidence_type_id
      FROM entity_evidence_types
      WHERE entity_id = ?
    `,
      )
      .run(canonicalId, duplicate.id);

    console.log(`    - Merged ${evidenceUpdated.changes} evidence type associations`);

    // Delete old evidence type associations
    db.prepare(
      `
      DELETE FROM entity_evidence_types
      WHERE entity_id = ?
    `,
    ).run(duplicate.id);

    // Update timeline events
    const timelineUpdated = db
      .prepare(
        `
      UPDATE timeline_events
      SET entity_id = ?
      WHERE entity_id = ?
    `,
      )
      .run(canonicalId, duplicate.id);

    if (timelineUpdated.changes > 0) {
      console.log(`    - Updated ${timelineUpdated.changes} timeline events`);
    }

    // Delete the duplicate entity
    db.prepare(
      `
      DELETE FROM entities
      WHERE id = ?
    `,
    ).run(duplicate.id);

    console.log(`    ✓ Deleted duplicate entity`);
  }

  // Recalculate mentions count for canonical entity
  const mentionCount = db
    .prepare(
      `
    SELECT COUNT(*) as count
    FROM entity_mentions
    WHERE entity_id = ?
  `,
    )
    .get(canonicalId);

  db.prepare(
    `
    UPDATE entities
    SET mentions = ?
    WHERE id = ?
  `,
  ).run(mentionCount.count, canonicalId);

  console.log(`\n✅ Merge complete!`);
  console.log(`   Total mentions merged: ${totalMentionsMerged}`);
  console.log(`   Final mention count for "Jeffrey Epstein": ${mentionCount.count}`);
  console.log(`   Deleted ${duplicates.length} duplicate entities`);

  // Show final entity
  const final = db
    .prepare(
      `
    SELECT *
    FROM entities
    WHERE id = ?
  `,
    )
    .get(canonicalId);

  console.log(`\n📊 Final "Jeffrey Epstein" entity:`);
  console.log(`   ID: ${final.id}`);
  console.log(`   Mentions: ${final.mentions}`);
  console.log(`   Spice Rating: ${final.spice_rating}`);
  console.log(`   Spice Score: ${final.spice_score}`);
  console.log(`   Likelihood: ${final.likelihood_level}`);
}

// Run the merge
mergeEpsteinEntities()
  .then(() => {
    console.log('\n✨ Entity merge completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error merging entities:', error);
    process.exit(1);
  });
