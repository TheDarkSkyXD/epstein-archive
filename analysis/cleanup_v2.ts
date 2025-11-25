import { DatabaseService } from '../src/services/DatabaseService';
import { EntityNameService } from '../src/services/EntityNameService';
import { join } from 'path';

const DB_PATH = join(process.cwd(), 'epstein-archive.db');

async function cleanupInvalidEntities() {
  console.log('Starting cleanup of invalid entities (Round 2)...');
  
  const dbService = DatabaseService.getInstance();
  const db = (dbService as any).db; // Access underlying db instance

  // Get all entities
  const entities = db.prepare('SELECT id, full_name FROM entities').all();
  console.log(`Analyzing ${entities.length} entities...`);

  const invalidEntities: any[] = [];
  const invalidReasons: Record<string, number> = {};

  for (const entity of entities) {
    if (!EntityNameService.isValidEntity(entity.full_name)) {
      invalidEntities.push(entity);
      
      // Try to guess reason for stats
      const name = entity.full_name;
      const firstWord = name.split(' ')[0].toLowerCase();
      const lastWord = name.split(' ').pop()?.toLowerCase() || '';
      
      let reason = 'Unknown';
      if ((EntityNameService as any).COMMON_VERBS.has(firstWord)) reason = 'Starts with Verb';
      else if ((EntityNameService as any).ADVERBS.has(firstWord)) reason = 'Starts with Adverb';
      else if ((EntityNameService as any).COMMON_VERBS.has(lastWord)) reason = 'Ends with Verb';
      else if ((EntityNameService as any).PREPOSITIONS.has(firstWord)) reason = 'Starts with Preposition';
      else reason = 'Other Rule';
      
      invalidReasons[reason] = (invalidReasons[reason] || 0) + 1;
    }
  }

  console.log(`Found ${invalidEntities.length} invalid entities.`);
  console.log('Breakdown by reason:', invalidReasons);

  if (invalidEntities.length > 0) {
    console.log('Sample invalid entities:');
    invalidEntities.slice(0, 20).forEach(e => console.log(`- ${e.full_name}`));

    // Delete them
    const deleteStmt = db.prepare('DELETE FROM entities WHERE id = ?');
    const deleteMentionsStmt = db.prepare('DELETE FROM entity_mentions WHERE entity_id = ?');
    
    const deleteTransaction = db.transaction((entitiesToDelete: any[]) => {
      for (const entity of entitiesToDelete) {
        deleteMentionsStmt.run(entity.id);
        deleteStmt.run(entity.id);
      }
    });

    deleteTransaction(invalidEntities);
    console.log(`Successfully deleted ${invalidEntities.length} entities and their mentions.`);
  } else {
    console.log('No invalid entities found.');
  }
}

cleanupInvalidEntities().catch(console.error);
