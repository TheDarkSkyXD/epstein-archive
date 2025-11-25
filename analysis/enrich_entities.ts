import { databaseService } from '../src/services/DatabaseService';
import { peopleData } from '../src/data/peopleData';
import { EntityNameService } from '../src/services/EntityNameService';

async function enrichEntities() {
  console.log('=== Starting Entity Enrichment ===\n');

  const people = Object.values(peopleData);
  console.log(`Loaded ${people.length} records from peopleData.ts`);

  try {
    // Fetch all entities from DB to build a lookup map
    console.log('Fetching all DB entities for lookup...');
    const allDbEntities = databaseService.prepare('SELECT id, full_name, mentions, spice_rating, spice_score, likelihood_level FROM entities').all() as any[];
    
    const dbMap = new Map<string, any>();
    for (const e of allDbEntities) {
      dbMap.set(e.full_name.toLowerCase(), e);
    }
    console.log(`Mapped ${dbMap.size} DB entities.\n`);

    let updatedCount = 0;
    let skippedCount = 0;
    let notFoundCount = 0;

    console.log('Processing records...');
    
    const updateStmt = databaseService.prepare(`
      UPDATE entities 
      SET spice_rating = ?, 
          spice_score = ?, 
          likelihood_level = ?, 
          mentions = ?,
          updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);

    for (const person of people) {
      if (!person.name) continue;

      const cleanName = person.name.trim();
      let targetEntity = dbMap.get(cleanName.toLowerCase());

      if (!targetEntity) {
        // Try partial match (e.g. "President Donald Trump" -> "Donald Trump")
        // This is O(N) but acceptable for small peopleData set
        for (const [dbName, entity] of dbMap.entries()) {
          if (cleanName.toLowerCase().includes(dbName) || dbName.includes(cleanName.toLowerCase())) {
            // Verify it's a reasonable match (length difference shouldn't be too huge unless it's a title)
            // and length > 3 to avoid matching "Al" to "Al Gore" if "Al" exists as a noise entity
            if (dbName.length > 3) {
              targetEntity = entity;
              break;
            }
          }
        }
      }

      if (targetEntity) {
        let needsUpdate = false;
        
        // Prepare new values, defaulting to existing if no better data
        let newSpiceRating = targetEntity.spice_rating || 0;
        let newSpiceScore = targetEntity.spice_score || 0;
        let newLikelihood = targetEntity.likelihood_level;
        let newMentions = targetEntity.mentions;

        // Update spice rating if provided and higher (or if current is null/0)
        if (person.spice_rating !== undefined && person.spice_rating > newSpiceRating) {
          newSpiceRating = person.spice_rating;
          needsUpdate = true;
        }

        // Update spice score if provided and higher
        if (person.spice_score !== undefined && person.spice_score > newSpiceScore) {
          newSpiceScore = person.spice_score;
          needsUpdate = true;
        }

        // Update likelihood if provided (prioritize peopleData as it's curated)
        if (person.likelihood_score && person.likelihood_score !== newLikelihood) {
          newLikelihood = person.likelihood_score;
          needsUpdate = true;
        }

        // Update mentions if provided and higher
        if (person.mentions && person.mentions > newMentions) {
          newMentions = person.mentions;
          needsUpdate = true;
        }

        if (needsUpdate) {
          try {
            updateStmt.run(newSpiceRating, newSpiceScore, newLikelihood, newMentions, targetEntity.id);
            updatedCount++;
            if (updatedCount % 50 === 0) process.stdout.write('.');
          } catch (e) {
            console.error(`\nError updating ${person.name}:`, e);
          }
        } else {
          skippedCount++;
        }
      } else {
        notFoundCount++;
        // Optional: Log missing entities if needed
        // console.log(`Not found: ${person.name}`);
      }
    }

    console.log('\n\n=== Enrichment Complete ===');
    console.log(`Updated: ${updatedCount}`);
    console.log(`Skipped (no changes needed): ${skippedCount}`);
    console.log(`Not Found in DB: ${notFoundCount}`);
    console.log(`Total Processed: ${people.length}`);

  } catch (error) {
    console.error('Fatal error during enrichment:', error);
    process.exit(1);
  }
}

enrichEntities();
