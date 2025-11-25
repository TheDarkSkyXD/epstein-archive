import { databaseService } from '../src/services/DatabaseService';
import { TitleExtractor, TitleExtractionResult } from '../src/services/TitleExtractor';
import { EntityNameService } from '../src/services/EntityNameService';
import * as fs from 'fs';
import * as path from 'path';

interface EntityRecord {
  id: string;
  full_name: string;
  primary_role: string | null;
  secondary_roles: string | null;
  likelihood_level: string | null;
  mentions: number;
  current_status: string | null;
  connections_summary: string | null;
  spice_rating: number;
  spice_score: number;
}

interface ConsolidationPlan {
  cleanName: string;
  primaryEntity: EntityRecord;
  duplicates: EntityRecord[];
  title: string | null;
  titleVariants: string[];
  totalMentions: number;
}

async function extractTitlesAndConsolidate(dryRun: boolean = true) {
  console.log('=== Title Extraction & Entity Consolidation ===\n');
  console.log(`Mode: ${dryRun ? '🔍 DRY RUN (no changes will be made)' : '⚠️  LIVE RUN (database will be modified)'}\n`);

  const reportDir = path.join(process.cwd(), 'consolidation_reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  try {
    // Step 1: Fetch all entities
    console.log('Step 1: Fetching all entities...');
    const batchSize = 1000;
    let offset = 0;
    const allEntities: EntityRecord[] = [];

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const result = await databaseService.getEntities(
        Math.floor(offset / batchSize) + 1,
        batchSize
      );

      if (result.entities.length === 0) break;

      for (const entity of result.entities) {
        allEntities.push({
          id: entity.id,
          full_name: entity.fullName,
          primary_role: entity.primaryRole,
          secondary_roles: entity.secondaryRoles ? JSON.stringify(entity.secondaryRoles) : null,
          likelihood_level: entity.likelihoodLevel,
          mentions: entity.mentions,
          current_status: entity.currentStatus,
          connections_summary: entity.connectionsSummary,
          spice_rating: entity.spiceRating,
          spice_score: entity.spiceScore
        });
      }

      offset += batchSize;
      if (offset % 10000 === 0) {
        console.log(`  Fetched ${offset} entities...`);
      }

      if (result.entities.length < batchSize) break;
    }

    console.log(`✅ Fetched ${allEntities.length} entities\n`);

    // Step 2: Extract titles from all entities
    console.log('Step 2: Extracting titles...');
    const extractionResults = new Map<string, TitleExtractionResult>();
    const invalidEntities: string[] = [];

    for (const entity of allEntities) {
      const result = TitleExtractor.extract(entity.full_name);
      if (result) {
        extractionResults.set(entity.id, result);
      } else {
        invalidEntities.push(entity.id);
      }
    }

    const stats = TitleExtractor.getExtractionStats(extractionResults);
    console.log(`✅ Extraction complete:`);
    console.log(`  - Valid entities: ${extractionResults.size}`);
    console.log(`  - Invalid entities: ${invalidEntities.length}`);
    console.log(`  - With title: ${stats.withTitle}`);
    console.log(`  - Without title: ${stats.withoutTitle}`);
    console.log(`  - By role:`, stats.byRole);
    console.log(`  - Avg confidence: ${(stats.avgConfidence * 100).toFixed(2)}%\n`);

    // Step 3: Group by clean name
    console.log('Step 3: Grouping entities by clean name...');
    const groups = new Map<string, EntityRecord[]>();

    for (const entity of allEntities) {
      const extraction = extractionResults.get(entity.id);
      if (!extraction) continue;  // Skip invalid entities

      const cleanNameLower = extraction.cleanName.toLowerCase();
      if (!groups.has(cleanNameLower)) {
        groups.set(cleanNameLower, []);
      }
      groups.get(cleanNameLower)!.push(entity);
    }

    console.log(`✅ Grouped into ${groups.size} unique entities\n`);

    // Step 4: Create consolidation plan
    console.log('Step 4: Creating consolidation plan...');
    const consolidationPlans: ConsolidationPlan[] = [];
    let duplicateCount = 0;

    for (const [cleanName, duplicates] of groups) {
      if (duplicates.length > 1) {
        duplicateCount += duplicates.length - 1;

        // Select primary entity (prefer one without title in original name)
        const primary = duplicates.reduce((best, current) => {
          // Prefer entity with more mentions
          if (current.mentions > best.mentions) return current;
          if (current.mentions < best.mentions) return best;
          
          // Prefer entity without title in name
          const bestHasTitle = best.full_name.toLowerCase() !== cleanName;
          const currentHasTitle = current.full_name.toLowerCase() !== cleanName;
          if (!currentHasTitle && bestHasTitle) return current;
          if (currentHasTitle && !bestHasTitle) return best;
          
          // Prefer longer name (more complete)
          if (current.full_name.length > best.full_name.length) return current;
          
          return best;
        });

        // Collect all titles
        const titleVariants: string[] = [];
        for (const dup of duplicates) {
          const extraction = extractionResults.get(dup.id);
          if (extraction?.title) {
            titleVariants.push(extraction.title);
          }
        }

        const uniqueTitles = Array.from(new Set(titleVariants));
        const totalMentions = duplicates.reduce((sum, dup) => sum + dup.mentions, 0);

        consolidationPlans.push({
          cleanName,
          primaryEntity: primary,
          duplicates: duplicates.filter(d => d.id !== primary.id),
          title: uniqueTitles[0] || null,
          titleVariants: uniqueTitles,
          totalMentions
        });
      }
    }

    console.log(`✅ Consolidation plan created:`);
    console.log(`  - Entities with duplicates: ${consolidationPlans.length}`);
    console.log(`  - Total duplicates to merge: ${duplicateCount}\n`);

    // Step 5: Generate report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(reportDir, `consolidation_plan_${timestamp}.json`);
    
    const report = {
      timestamp: new Date().toISOString(),
      dryRun,
      stats: {
        totalEntities: allEntities.length,
        validEntities: extractionResults.size,
        invalidEntities: invalidEntities.length,
        uniqueEntities: groups.size,
        entitiesToConsolidate: consolidationPlans.length,
        duplicatesToRemove: duplicateCount,
        extractionStats: stats
      },
      consolidationPlans: consolidationPlans.slice(0, 100),  // Sample
      invalidEntityIds: invalidEntities.slice(0, 100)  // Sample
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Report saved to: ${reportPath}\n`);

    // Step 6: Execute consolidation (if not dry run)
    if (!dryRun) {
      console.log('Step 6: Executing consolidation...\n');
      
      let consolidatedCount = 0;
      let mentionsMerged = 0;
      let evidenceMerged = 0;
      let entitiesDeleted = 0;

      // Process each consolidation plan
      for (const plan of consolidationPlans) {
        const primaryId = plan.primaryEntity.id;
        const extraction = extractionResults.get(primaryId)!;

        try {
          // Update primary entity with clean name, title, and role
          const updateQuery = `
            UPDATE entities 
            SET full_name = ?,
                title = ?,
                role = ?,
                title_variants = ?,
                mentions = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `;
          
          databaseService.prepare(updateQuery).run(
            extraction.cleanName,
            plan.title,
            extraction.role,
            JSON.stringify(plan.titleVariants),
            plan.totalMentions,
            primaryId
          );

          // Merge mentions from duplicates to primary
          for (const duplicate of plan.duplicates) {
            // Update entity_mentions to point to primary entity
            const updateMentionsQuery = `
              UPDATE entity_mentions 
              SET entity_id = ?
              WHERE entity_id = ?
            `;
            const mentionsResult = databaseService.prepare(updateMentionsQuery).run(primaryId, duplicate.id);
            mentionsMerged += mentionsResult.changes || 0;

            // Merge evidence types (avoid duplicates)
            const evidenceQuery = `
              INSERT OR IGNORE INTO entity_evidence_types (entity_id, evidence_type_id)
              SELECT ?, evidence_type_id
              FROM entity_evidence_types
              WHERE entity_id = ?
            `;
            const evidenceResult = databaseService.prepare(evidenceQuery).run(primaryId, duplicate.id);
            evidenceMerged += evidenceResult.changes || 0;

            // Delete duplicate entity's evidence links
            databaseService.prepare('DELETE FROM entity_evidence_types WHERE entity_id = ?').run(duplicate.id);

            // Delete duplicate entity
            databaseService.prepare('DELETE FROM entities WHERE id = ?').run(duplicate.id);
            entitiesDeleted++;
          }

          consolidatedCount++;
          
          if (consolidatedCount % 50 === 0) {
            console.log(`  Consolidated ${consolidatedCount}/${consolidationPlans.length} entities...`);
          }
        } catch (error) {
          console.error(`  ❌ Error consolidating "${plan.cleanName}":`, error);
        }
      }

      console.log(`✅ Consolidation complete:`);
      console.log(`  - Entities consolidated: ${consolidatedCount}`);
      console.log(`  - Mentions merged: ${mentionsMerged}`);
      console.log(`  - Evidence links merged: ${evidenceMerged}`);
      console.log(`  - Duplicate entities deleted: ${entitiesDeleted}\n`);

      // Step 7: Delete invalid entities
      console.log('Step 7: Deleting invalid entities...\n');
      
      let invalidDeleted = 0;
      for (const invalidId of invalidEntities) {
        try {
          // Delete mentions
          databaseService.prepare('DELETE FROM entity_mentions WHERE entity_id = ?').run(invalidId);
          
          // Delete evidence links
          databaseService.prepare('DELETE FROM entity_evidence_types WHERE entity_id = ?').run(invalidId);
          
          // Delete entity
          databaseService.prepare('DELETE FROM entities WHERE id = ?').run(invalidId);
          invalidDeleted++;

          if (invalidDeleted % 1000 === 0) {
            console.log(`  Deleted ${invalidDeleted}/${invalidEntities.length} invalid entities...`);
          }
        } catch (error) {
          console.error(`  ❌ Error deleting invalid entity ${invalidId}:`, error);
        }
      }

      console.log(`✅ Invalid entities deleted: ${invalidDeleted}\n`);

      // Step 8: Get final stats
      const finalStats = await databaseService.getStatistics();
      console.log('=== Final Statistics ===');
      console.log(`Total entities: ${finalStats.totalEntities}`);
      console.log(`Total documents: ${finalStats.totalDocuments}`);
      console.log(`Total mentions: ${finalStats.totalMentions}\n`);

      console.log('✅ Consolidation execution complete!\n');
    } else {
      console.log('✅ Dry run complete - no changes made\n');
      console.log('Review the consolidation plan and run with --execute to apply changes\n');
    }

    // Print sample consolidations
    console.log('=== Sample Consolidations (First 10) ===\n');
    for (const plan of consolidationPlans.slice(0, 10)) {
      console.log(`📋 "${plan.cleanName}"`);
      console.log(`   Primary: "${plan.primaryEntity.full_name}" (${plan.primaryEntity.mentions} mentions)`);
      console.log(`   Duplicates: ${plan.duplicates.map(d => `"${d.full_name}"`).join(', ')}`);
      console.log(`   Title: ${plan.title || 'none'}`);
      console.log(`   Title variants: ${plan.titleVariants.join(', ') || 'none'}`);
      console.log(`   Total mentions: ${plan.totalMentions}\n`);
    }

    console.log('=== Summary ===');
    console.log(`Total entities: ${allEntities.length}`);
    console.log(`After consolidation: ${groups.size} (${((1 - groups.size / allEntities.length) * 100).toFixed(2)}% reduction)`);
    console.log(`Invalid entities to delete: ${invalidEntities.length}`);
    console.log(`Final entity count: ${groups.size - invalidEntities.length}\n`);

  } catch (error) {
    console.error('❌ Error during consolidation:', error);
    process.exit(1);
  }
}

// Parse execution mode from environment variable
const dryRun = process.env.EXECUTE !== 'true';

if (dryRun) {
  console.log('💡 Running in DRY RUN mode. Set EXECUTE=true to apply changes.\n');
} else {
  console.log('⚠️  EXECUTING CONSOLIDATION - Database will be modified!\n');
}

extractTitlesAndConsolidate(dryRun);

