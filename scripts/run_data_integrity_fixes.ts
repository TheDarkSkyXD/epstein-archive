import { getDb } from '../src/server/db/connection.js';
import { cleanJunkEntities, validateAndCleanExistingData } from './clean_junk_data.js';
import { calculateMissingRedFlagRatings } from './calculate_red_flag_ratings.js';

// Function to run all data integrity fixes
async function runDataIntegrityFixes() {
  console.log('Starting data integrity fixes...');
  
  try {
    // 1. Validate and clean existing data
    console.log('Step 1: Validating and cleaning existing data...');
    validateAndCleanExistingData();
    
    // 2. Clean junk entities
    console.log('Step 2: Cleaning junk entities...');
    cleanJunkEntities();
    
    // 3. Calculate missing red flag ratings
    console.log('Step 3: Calculating missing red flag ratings...');
    calculateMissingRedFlagRatings();
    
    // 4. Apply database schema fixes
    console.log('Step 4: Applying database schema fixes...');
    const db = getDb();
    
    // Run the migration SQL files
    // Note: In a real implementation, we'd read and execute the SQL files
    // For now, we'll execute the essential schema changes directly
    
    // Add red_flag_rating column to entities if it doesn't exist
    try {
      db.prepare("ALTER TABLE entities ADD COLUMN red_flag_rating INTEGER DEFAULT 0 CHECK(red_flag_rating >= 0 AND red_flag_rating <= 5);").run();
      console.log('Added red_flag_rating column to entities table');
    } catch (e) {
      // Column might already exist, which is fine
      console.log('red_flag_rating column already exists in entities table');
    }
    
    // Add red_flag_description column to entities if it doesn't exist
    try {
      db.prepare("ALTER TABLE entities ADD COLUMN red_flag_description TEXT;").run();
      console.log('Added red_flag_description column to entities table');
    } catch (e) {
      // Column might already exist, which is fine
      console.log('red_flag_description column already exists in entities table');
    }
    
    // Add red_flag_rating column to documents if it doesn't exist
    try {
      db.prepare("ALTER TABLE documents ADD COLUMN red_flag_rating INTEGER DEFAULT 0 CHECK(red_flag_rating >= 0 AND red_flag_rating <= 5);").run();
      console.log('Added red_flag_rating column to documents table');
    } catch (e) {
      // Column might already exist, which is fine
      console.log('red_flag_rating column already exists in documents table');
    }
    
    // Add evidence_type column to documents if it doesn't exist
    try {
      db.prepare("ALTER TABLE documents ADD COLUMN evidence_type TEXT;").run();
      console.log('Added evidence_type column to documents table');
    } catch (e) {
      // Column might already exist, which is fine
      console.log('evidence_type column already exists in documents table');
    }
    
    // Clean up any remaining orphaned entity mentions
    console.log('Step 5: Cleaning up orphaned entity mentions...');
    const orphanCleanup = db.prepare(`
      DELETE FROM entity_mentions 
      WHERE entity_id NOT IN (SELECT id FROM entities)
         OR document_id NOT IN (SELECT id FROM documents)
    `).run();
    
    console.log(`Cleaned up ${orphanCleanup.changes} orphaned entity mentions`);
    
    // Update any existing spice_rating values to red_flag_rating if red_flag_rating is still 0
    console.log('Step 6: Updating existing spice ratings to red flag ratings...');
    const ratingUpdate = db.prepare(`
      UPDATE entities 
      SET red_flag_rating = spice_rating 
      WHERE red_flag_rating = 0 AND spice_rating IS NOT NULL
    `).run();
    
    console.log(`Updated ${ratingUpdate.changes} entities with spice rating values`);
    
    // Add proper indexes for performance
    console.log('Step 7: Adding performance indexes...');
    try {
      db.prepare('CREATE INDEX IF NOT EXISTS idx_entities_red_flag_rating ON entities(red_flag_rating DESC);').run();
      db.prepare('CREATE INDEX IF NOT EXISTS idx_documents_red_flag_rating ON documents(red_flag_rating DESC);').run();
      db.prepare('CREATE INDEX IF NOT EXISTS idx_documents_evidence_type ON documents(evidence_type);').run();
      db.prepare('CREATE INDEX IF NOT EXISTS idx_entity_mentions_entity ON entity_mentions(entity_id);').run();
      db.prepare('CREATE INDEX IF NOT EXISTS idx_entity_mentions_document ON entity_mentions(document_id);').run();
      console.log('Added performance indexes');
    } catch (e) {
      console.error('Error adding indexes:', e);
    }
    
    console.log('All data integrity fixes completed successfully!');
    
  } catch (error) {
    console.error('Error during data integrity fixes:', error);
    throw error;
  }
}

// Run the data integrity fixes
if (require.main === module) {
  runDataIntegrityFixes()
    .then(() => {
      console.log('Data integrity fixes completed successfully.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Data integrity fixes failed:', error);
      process.exit(1);
    });
}

export { runDataIntegrityFixes };