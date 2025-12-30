#!/usr/bin/env tsx
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../epstein-archive.db');
const DRY_RUN = process.argv.includes('--dry-run');
const BATCH_SIZE = 500;

function main() {
  const db = new Database(DB_PATH);
  
  console.log(`\n🚩 Calculating Entity Red Flag Ratings\n`);
  console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN' : '✏️  LIVE MODE'}\n`);

  // 1. Get entities with missing ratings but having mentions
  const entities = db.prepare(`
    SELECT e.id, e.full_name
    FROM entities e
    JOIN entity_mentions em ON e.id = em.entity_id
    WHERE e.red_flag_rating IS NULL
    GROUP BY e.id
  `).all() as { id: number; full_name: string }[];

  console.log(`Found ${entities.length} entities with missing ratings and existing mentions.\n`);

  if (entities.length === 0) {
    console.log("No entities need rating calculation.");
    db.close();
    return;
  }

  const updateStmt = db.prepare(`
    UPDATE entities 
    SET red_flag_rating = ?, 
        red_flag_score = ?,
        red_flag_description = ?
    WHERE id = ?
  `);

  let updatedCount = 0;

  db.transaction(() => {
    for (const entity of entities) {
      // Get document ratings for this entity
      const docRatings = db.prepare(`
        SELECT d.red_flag_rating
        FROM documents d
        JOIN entity_mentions em ON d.id = em.document_id
        WHERE em.entity_id = ? AND d.red_flag_rating IS NOT NULL
      `).all(entity.id) as { red_flag_rating: number }[];

      if (docRatings.length === 0) continue;

      const ratings = docRatings.map(r => r.red_flag_rating);
      const maxRating = Math.max(...ratings);
      const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      
      // Calculate score based on frequency and intensity
      // Higher density of high-flag documents yields higher score
      const highFlagCount = ratings.filter(r => r >= 4).length;
      const score = Math.round((maxRating * 10) + (avgRating * 5) + (highFlagCount * 2));
      
      const description = `Level ${maxRating} significance based on ${docRatings.length} documented mentions.`;

      if (!DRY_RUN) {
        updateStmt.run(maxRating, score, description, entity.id);
      }
      
      updatedCount++;
      if (updatedCount % 1000 === 0) {
        console.log(`...processed ${updatedCount} entities`);
      }
    }
  })();

  console.log(`\n✅ ${DRY_RUN ? 'Simulated' : 'Updated'} ${updatedCount} entities.`);
  
  // Show a few examples
  if (updatedCount > 0) {
    const examples = db.prepare(`
      SELECT full_name, red_flag_rating, red_flag_score, red_flag_description
      FROM entities
      WHERE red_flag_rating IS NOT NULL
      ORDER BY red_flag_score DESC
      LIMIT 10
    `).all();
    
    console.log('\n📊 Top 10 Red Flag Entities (after update):');
    console.table(examples);
  }

  db.close();
}

main();
