import { databaseService } from '../services/DatabaseService';
import { fileURLToPath } from 'url';
import { join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);

async function restoreEntityData() {
  console.log('Starting entity data restoration...');

  try {
    // 1. Read source data
    const jsonPath = join(process.cwd(), 'public', 'data', 'people.json');
    console.log(`Reading source data from ${jsonPath}`);
    const fileContent = readFileSync(jsonPath, 'utf-8');
    const sourceEntities = JSON.parse(fileContent);
    console.log(`Found ${sourceEntities.length} entities in source JSON`);

    // 2. Prepare database statements
    const db = databaseService.getDatabase();

    // Check if mentions column exists, if not trying to update it will fail
    try {
      db.prepare('SELECT mentions FROM entities LIMIT 1').get();
    } catch (e) {
      console.error(
        'Column "mentions" does not exist in entities table. Please run migration/alter table first.',
      );
      process.exit(1);
    }

    const updateEntity = db.prepare(`
      UPDATE entities 
      SET 
        mentions = @mentions,
        red_flag_rating = @redFlagRating,
        role = COALESCE(role, @role),
        risk_factor = COALESCE(risk_factor, @riskFactor)
      WHERE name = @name
    `);

    // 3. Process updates
    let updatedCount = 0;
    let notFoundCount = 0;

    const transaction = db.transaction((entities) => {
      for (const source of entities) {
        // Map JSON fields to DB fields
        // Source JSON keys: fullName, mentions, likelihoodLevel, etc.
        // Some might be capitalized in inconsistencies, but usually standard in people.json

        const name = source.fullName || source.name;
        if (!name) continue;

        // Calculate red flag rating if missing (simple heuristic based on mentions if not present)
        let rating = 0;
        if (source.daily_mentions_count > 100 || source.mentions > 1000) rating = 5;
        else if (source.mentions > 500) rating = 4;
        else if (source.mentions > 100) rating = 3;
        else if (source.mentions > 50) rating = 2;
        else if (source.mentions > 10) rating = 1;

        // Use existing if available
        if (source.spiceRating !== undefined) rating = source.spiceRating;
        if (source.redFlagRating !== undefined) rating = source.redFlagRating;

        // Mentions
        const mentions = source.mentions || 0;

        const result = updateEntity.run({
          mentions: mentions,
          redFlagRating: rating,
          role: source.primaryRole || source.role || 'Mentioned',
          riskFactor: source.spiceScore || 0,
          name: name,
        });

        if (result.changes > 0) {
          updatedCount++;
        } else {
          notFoundCount++;
          if (notFoundCount < 5) {
            console.log(`No match for: ${name}`);
          }
        }
      }
    });

    console.log('Executing updates transaction...');
    transaction(sourceEntities);

    console.log('Restoration complete.');
    console.log(`Updated: ${updatedCount}`);
    console.log(`Not matched in DB: ${notFoundCount}`);

    // Verify
    const stats = await databaseService.getStatistics();
    console.log('New Database Stats:', stats);
  } catch (error) {
    console.error('Restoration failed:', error);
    process.exit(1);
  }
}

// Always run
console.log('Script loaded. Calling restoreEntityData...');
restoreEntityData()
  .then(() => {
    console.log('Done.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
