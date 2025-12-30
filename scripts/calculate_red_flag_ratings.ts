import { getDb } from '../src/server/db/connection.js';

// Function to calculate missing red flag ratings based on existing data
function calculateMissingRedFlagRatings() {
  const db = getDb();
  
  console.log('Starting calculation of missing red flag ratings...');
  
  // Get all entities that have null red flag ratings but have mentions
  const entities = db.prepare(`
    SELECT id, full_name, mentions 
    FROM entities 
    WHERE red_flag_rating IS NULL OR red_flag_rating = 0
  `).all() as {id: number, full_name: string, mentions: number}[];
  
  console.log(`Found ${entities.length} entities with missing red flag ratings`);
  
  let updatedCount = 0;
  
  for (const entity of entities) {
    // Calculate red flag rating based on mentions and other factors
    // This is a simple algorithm - in reality, this would be more sophisticated
    let rating = 0;
    
    // Base rating on number of mentions
    if (entity.mentions > 100) {
      rating = 5; // High rating for many mentions
    } else if (entity.mentions > 50) {
      rating = 4;
    } else if (entity.mentions > 20) {
      rating = 3;
    } else if (entity.mentions > 5) {
      rating = 2;
    } else if (entity.mentions > 0) {
      rating = 1;
    }
    
    // Additional logic could consider:
    // - Types of documents mentioning the entity
    // - Context of mentions
    // - Connections to other high-rated entities
    // - Keywords in mentions
    
    // Update the entity with the calculated rating
    db.prepare('UPDATE entities SET red_flag_rating = ? WHERE id = ?').run(rating, entity.id);
    updatedCount++;
    
    if (updatedCount % 100 === 0) {
      console.log(`Updated ${updatedCount} entities...`);
    }
  }
  
  console.log(`Successfully updated ${updatedCount} entities with calculated red flag ratings`);
  
  // Also update any documents that might have missing red flag ratings
  console.log('Updating documents with calculated red flag ratings...');
  
  const documents = db.prepare(`
    SELECT id, content, file_name
    FROM documents
    WHERE red_flag_rating IS NULL OR red_flag_rating = 0
  `).all() as {id: number, content: string, file_name: string}[];
  
  let docUpdatedCount = 0;
  
  for (const doc of documents) {
    // Calculate document red flag rating based on content
    let docRating = 0;
    
    if (doc.content) {
      // Look for red flag keywords in the content
      const redFlagKeywords = [
        'confidential', 'secret', 'classified', 'under investigation',
        'lawsuit', 'court', 'arrest', 'charged', 'indictment', 'fraud',
        'illegal', 'suspicious', 'investigation', 'prosecution', 'warrant',
        'fbi', 'cia', 'nsa', 'surveillance', 'blackmail', 'trafficking',
        'underage', 'minor', 'sex', 'allegation', 'accused', 'guilty',
        'convicted', 'prison', 'jail', 'sentence', 'trial', 'verdict'
      ];
      
      let keywordCount = 0;
      const contentLower = doc.content.toLowerCase();
      
      for (const keyword of redFlagKeywords) {
        if (contentLower.includes(keyword.toLowerCase())) {
          keywordCount++;
        }
      }
      
      // Set rating based on keyword count
      if (keywordCount >= 5) {
        docRating = 5;
      } else if (keywordCount >= 3) {
        docRating = 4;
      } else if (keywordCount >= 2) {
        docRating = 3;
      } else if (keywordCount >= 1) {
        docRating = 2;
      }
    }
    
    // Update the document with the calculated rating
    db.prepare('UPDATE documents SET red_flag_rating = ? WHERE id = ?').run(docRating, doc.id);
    docUpdatedCount++;
    
    if (docUpdatedCount % 100 === 0) {
      console.log(`Updated ${docUpdatedCount} documents...`);
    }
  }
  
  console.log(`Successfully updated ${docUpdatedCount} documents with calculated red flag ratings`);
}

// Run the calculation
if (require.main === module) {
  try {
    calculateMissingRedFlagRatings();
    console.log('Red flag rating calculation completed successfully.');
  } catch (error) {
    console.error('Error during red flag rating calculation:', error);
  }
}

export { calculateMissingRedFlagRatings };