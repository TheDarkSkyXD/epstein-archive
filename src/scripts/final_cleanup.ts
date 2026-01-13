import { databaseService } from '../services/DatabaseService';
import { EntityNameService } from '../services/EntityNameService';

async function finalCleanup() {
  console.log('=== Starting Final Entity Cleanup ===\n');

  // Get all entities directly from DB to avoid pagination
  const entities = databaseService.prepare('SELECT id, full_name FROM entities').all() as any[];
  console.log(`Total entities before cleanup: ${entities.length}`);

  let invalidCount = 0;
  let deletedCount = 0;
  const invalidEntities: any[] = [];

  // Check each entity
  for (const entity of entities) {
    // Skip if it has a title (we assume titled entities are mostly valid, or at least we want to be careful)
    // Actually, we should re-validate even titled ones if the name part is invalid,
    // but our new rules catch "Watched Bret" which might have had a title extracted?
    // No, "Watched Bret" has title=null.

    // If it has a title, we should validate the *name* part.
    // But EntityNameService.isValidPersonName checks the whole string.
    // If we have a clean name in the DB, we should check that.
    // The DB has `full_name` (which might be "President Trump") and `name` (which isn't in the DB schema, it's in the API response).
    // The DB has `full_name`.
    // Wait, the consolidation script updated `full_name` to the clean name.
    // So `full_name` should be "Donald Trump", not "President Donald Trump".
    // So we can just validate `full_name`.

    const isValid = EntityNameService.isValidPersonName(entity.full_name);

    if (!isValid) {
      // Double check if it's a valid organization
      if (EntityNameService.isValidOrganizationName(entity.full_name)) {
        continue;
      }

      invalidCount++;
      invalidEntities.push(entity);
      // console.log(`Invalid: "${entity.full_name}"`);
    }
  }

  console.log(`\nFound ${invalidCount} invalid entities.`);

  if (invalidCount > 0) {
    console.log('Deleting invalid entities...');

    const deleteStmt = databaseService.prepare('DELETE FROM entities WHERE id = ?');

    databaseService.transaction(() => {
      for (const entity of invalidEntities) {
        deleteStmt.run(entity.id);
        deletedCount++;
        if (deletedCount % 1000 === 0) {
          process.stdout.write(`.`);
        }
      }
    })();

    console.log(`\n\n✅ Successfully deleted ${deletedCount} invalid entities.`);
  } else {
    console.log('No invalid entities found.');
  }

  // Final count
  const remaining = databaseService.prepare('SELECT COUNT(*) as count FROM entities').get() as any;
  console.log(`\nTotal entities remaining: ${remaining.count}`);
}

finalCleanup();
