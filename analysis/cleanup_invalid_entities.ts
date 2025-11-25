import { databaseService } from '../src/services/DatabaseService';
import * as fs from 'fs';
import * as path from 'path';

interface ValidationResult {
  id: string;
  name: string;
  isValid: boolean;
  reason?: string;
}

async function createBackup(): Promise<string> {
  const backupDir = path.join(process.cwd(), 'database_backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dbPath = path.join(process.cwd(), 'epstein-archive.db');
  const backupPath = path.join(backupDir, `epstein-archive_backup_${timestamp}.db`);

  console.log(`Creating database backup...`);
  fs.copyFileSync(dbPath, backupPath);
  console.log(`✅ Backup created: ${backupPath}`);

  return backupPath;
}

async function deleteEntitiesInBatches(entityIds: string[], batchSize: number = 100): Promise<void> {
  console.log(`\nDeleting ${entityIds.length} entities in batches of ${batchSize}...`);

  for (let i = 0; i < entityIds.length; i += batchSize) {
    const batch = entityIds.slice(i, i + batchSize);
    const placeholders = batch.map(() => '?').join(',');

    try {
      // Delete from entity_mentions first (foreign key constraint)
      const deleteMentionsQuery = `DELETE FROM entity_mentions WHERE entity_id IN (${placeholders})`;
      databaseService.prepare(deleteMentionsQuery).run(...batch);

      // Delete from entity_evidence_types
      const deleteEvidenceQuery = `DELETE FROM entity_evidence_types WHERE entity_id IN (${placeholders})`;
      databaseService.prepare(deleteEvidenceQuery).run(...batch);

      // Delete from entities
      const deleteEntitiesQuery = `DELETE FROM entities WHERE id IN (${placeholders})`;
      databaseService.prepare(deleteEntitiesQuery).run(...batch);

      console.log(`Deleted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(entityIds.length / batchSize)} (${i + batch.length}/${entityIds.length} entities)`);
    } catch (error) {
      console.error(`Error deleting batch starting at index ${i}:`, error);
      throw error;
    }
  }

  console.log(`✅ Successfully deleted ${entityIds.length} entities`);
}

async function getEntityStats(): Promise<{
  totalEntities: number;
  totalDocuments: number;
  totalMentions: number;
}> {
  const stats = await databaseService.getStatistics();
  return {
    totalEntities: stats.totalEntities,
    totalDocuments: stats.totalDocuments,
    totalMentions: stats.totalMentions
  };
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: npx tsx analysis/cleanup_invalid_entities.ts <invalid_entities_json_path>');
    console.error('Example: npx tsx analysis/cleanup_invalid_entities.ts validation_reports/invalid_entities_2025-01-19.json');
    process.exit(1);
  }

  const invalidEntitiesPath = args[0];

  if (!fs.existsSync(invalidEntitiesPath)) {
    console.error(`Error: File not found: ${invalidEntitiesPath}`);
    process.exit(1);
  }

  console.log('=== Entity Cleanup Script ===\n');

  // Load invalid entities
  console.log(`Loading invalid entities from: ${invalidEntitiesPath}`);
  const invalidEntities: ValidationResult[] = JSON.parse(fs.readFileSync(invalidEntitiesPath, 'utf-8'));
  console.log(`Loaded ${invalidEntities.length} invalid entities`);

  // Get current stats
  console.log('\n=== Current Database Stats ===');
  const statsBefore = await getEntityStats();
  console.log(`Total Entities: ${statsBefore.totalEntities.toLocaleString()}`);
  console.log(`Total Documents: ${statsBefore.totalDocuments.toLocaleString()}`);
  console.log(`Total Mentions: ${statsBefore.totalMentions.toLocaleString()}`);

  // Show sample of entities to be deleted
  console.log('\n=== Sample Entities to be Deleted (First 20) ===');
  invalidEntities.slice(0, 20).forEach((entity, index) => {
    console.log(`${index + 1}. "${entity.name}" - ${entity.reason}`);
  });

  // Confirmation prompt
  console.log(`\n⚠️  WARNING: This will delete ${invalidEntities.length} entities from the database.`);
  console.log('This action cannot be undone (except by restoring from backup).');
  console.log('\nTo proceed, you must:');
  console.log('1. Review the sample entities above');
  console.log('2. Ensure you have reviewed the validation report');
  console.log('3. Run this script with the --confirm flag');

  if (!args.includes('--confirm')) {
    console.log('\n❌ Cleanup cancelled. Add --confirm flag to proceed.');
    console.log(`\nCommand to run:`);
    console.log(`npx tsx analysis/cleanup_invalid_entities.ts ${invalidEntitiesPath} --confirm`);
    process.exit(0);
  }

  try {
    // Create backup
    const backupPath = await createBackup();

    // Delete entities
    const entityIds = invalidEntities.map(e => e.id);
    await deleteEntitiesInBatches(entityIds);

    // Get new stats
    console.log('\n=== Updated Database Stats ===');
    const statsAfter = await getEntityStats();
    console.log(`Total Entities: ${statsAfter.totalEntities.toLocaleString()} (was ${statsBefore.totalEntities.toLocaleString()})`);
    console.log(`Total Documents: ${statsAfter.totalDocuments.toLocaleString()} (was ${statsBefore.totalDocuments.toLocaleString()})`);
    console.log(`Total Mentions: ${statsAfter.totalMentions.toLocaleString()} (was ${statsBefore.totalMentions.toLocaleString()})`);

    const entitiesDeleted = statsBefore.totalEntities - statsAfter.totalEntities;
    const mentionsDeleted = statsBefore.totalMentions - statsAfter.totalMentions;

    console.log('\n=== Cleanup Summary ===');
    console.log(`✅ Entities deleted: ${entitiesDeleted.toLocaleString()}`);
    console.log(`✅ Mentions deleted: ${mentionsDeleted.toLocaleString()}`);
    console.log(`✅ Reduction: ${((entitiesDeleted / statsBefore.totalEntities) * 100).toFixed(2)}%`);
    console.log(`\n✅ Backup saved to: ${backupPath}`);
    console.log('\n✅ Cleanup completed successfully!');

  } catch (error) {
    console.error('\n❌ Error during cleanup:', error);
    console.error('\nThe database may be in an inconsistent state.');
    console.error('Restore from backup if needed.');
    process.exit(1);
  }
}

main();
