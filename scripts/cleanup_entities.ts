import Database from 'better-sqlite3';

const DB_PATH = process.env.DB_PATH || 'epstein-archive.db';
const db = new Database(DB_PATH);

// Main ID for Jeffrey Epstein
// Main ID for Jeffrey Epstein
const JEFFREY_ID = 1;

// Target ID for Benjamin Netanyahu (highest mentions)
const NETANYAHU_ID = 12926;

const TO_DELETE_PATTERNS = [
  'Hi Jeffrey',
  'Hello Jeffrey',
  'Dear Jeffrey',
  'Hey Jeffrey',
  'The Jeffrey Epstein', // "The" is likely noise
  'About Jeffrey Epstein', // Topic, not person
  'For Jeffrey Epstein',
  'With Jeffrey Epstein',
  'With Jeffrey',
  'Unknown Sender',
  'Unknown Doctor',
  'Unknown Current Medications',
  'No Subject',
  'Unknown',
  'Despite Netanyahu',
  'Netanyahu Among',
  'The Netanyahu Problem Obama',
  'The Netanyahu',
  'And Netanyahu',
  'If Netanyahu',
  'Minister Benjamin Netanyahu Among',
  'Existential Threats Netanyahu',
  'Ahram Weekly Netanyahu',
  'Anthony Faiola Netanyahu',
];

const TO_MERGE_PATTERNS: { name: string; targetId: number }[] = [
  { name: 'Epstein Jeffrey', targetId: JEFFREY_ID },
  { name: 'Epstem Jeffrey', targetId: JEFFREY_ID },
  { name: 'Jenrey E. Masrein Jeffrey', targetId: JEFFREY_ID },
  { name: 'Chil Jeffrey', targetId: JEFFREY_ID },
  { name: 'Jeffrey Bateman', targetId: JEFFREY_ID },
  { name: 'Sex Offender Jeffrey', targetId: JEFFREY_ID },
  { name: 'Billionaire Jeffrey Epstein', targetId: JEFFREY_ID },
  { name: 'Jeffrey  We', targetId: JEFFREY_ID },
  { name: 'Jeffrey E. Epst', targetId: JEFFREY_ID },
  { name: 'Jeffrey Enstein', targetId: JEFFREY_ID },
  { name: 'Jeffrey Epstine', targetId: JEFFREY_ID },
  { name: 'Jeffrey Epslein', targetId: JEFFREY_ID },
  { name: 'Jeffrey Cpstein', targetId: JEFFREY_ID },
  { name: 'Jeffrey Dpstein', targetId: JEFFREY_ID },
  { name: 'Jeffrey Enctein', targetId: JEFFREY_ID },
  { name: 'Jeffrey Epstei', targetId: JEFFREY_ID },
  { name: 'Jeffrey Epstem', targetId: JEFFREY_ID },
  { name: 'Epstein Jeffrey Epstein', targetId: JEFFREY_ID },
  { name: 'Hi Jeffrey Epstei', targetId: JEFFREY_ID },
  { name: 'Jeffrey Cumstein', targetId: JEFFREY_ID },
  { name: 'Jeffrey Eps According', targetId: JEFFREY_ID },
  { name: 'Did Jeffrey Epstein', targetId: JEFFREY_ID },
  { name: 'Director Jeffrey Epstein', targetId: JEFFREY_ID },
  { name: 'Expand Jeffrey Epstein', targetId: JEFFREY_ID },
  { name: 'Fie Jeffrey Epstein', targetId: JEFFREY_ID },
  { name: 'Googled Jeffrey Epstein', targetId: JEFFREY_ID },
  { name: 'Ifrom Jeffrey Epstein', targetId: JEFFREY_ID },
  { name: 'Jto Jeffrey Epstein', targetId: JEFFREY_ID },
  { name: 'June Jeffrey Epstein', targetId: JEFFREY_ID },
  { name: 'Philanthropy Jeffrey Epstein', targetId: JEFFREY_ID },
  { name: 'Plaintiff Jeffrey Epstein', targetId: JEFFREY_ID },
  { name: 'Post Jeffrey Epstein', targetId: JEFFREY_ID },
  { name: 'Science Jeffrey Epstein', targetId: JEFFREY_ID },
  { name: 'Twas Jeffrey Epstein', targetId: JEFFREY_ID },
  { name: 'Watch Jeffrey Epstein', targetId: JEFFREY_ID },
  { name: 'When Jeffrey Epstein', targetId: JEFFREY_ID },
  { name: 'Whether Jeffrey Epstein', targetId: JEFFREY_ID },
  // Netanyahu Merges
  { name: 'Minister Benjamin Netanyahu', targetId: NETANYAHU_ID },
  { name: 'Bibi Netanyahu', targetId: NETANYAHU_ID },
  { name: 'Binyamin Netanyahu', targetId: NETANYAHU_ID },
  { name: 'Prime Minister Netanyahu', targetId: NETANYAHU_ID },
  { name: 'Israeli Netanyahu', targetId: NETANYAHU_ID },
  { name: 'Prime Minister Benjamin Netanyahu', targetId: NETANYAHU_ID },
  { name: 'Prime Minister Binyamin Netanyahu', targetId: NETANYAHU_ID },
  { name: 'Israeli Prime Minister Netanyahu', targetId: NETANYAHU_ID },
];

import { isJunkEntity } from './filters/entityFilters.js';

const deleteEntity = (id: number) => {
  const safeRun = (sql: string, ...args: any[]) => {
    try {
      db.prepare(sql).run(...args);
    } catch (e) {
      // Ignore errors (e.g. table not found)
    }
  };

  // 1. Mentions
  safeRun('DELETE FROM entity_mentions WHERE entity_id = ?', id);

  // 2. Relationships
  safeRun(
    'DELETE FROM entity_relationships WHERE source_entity_id = ? OR target_entity_id = ?',
    id,
    id,
  );

  // 3. Evidence Types
  safeRun('DELETE FROM entity_evidence_types WHERE entity_id = ?', id);

  // 4. Media Items
  safeRun('UPDATE media_items SET entity_id = NULL WHERE entity_id = ?', id);

  // 5. Evidence Entity
  safeRun('DELETE FROM evidence_entity WHERE entity_id = ?', id);

  // 6. Media Item People
  safeRun('DELETE FROM media_item_people WHERE entity_id = ?', id);

  // 7. Black Book
  safeRun('DELETE FROM black_book_entries WHERE person_id = ?', id);

  // 8. Link Candidates
  safeRun('DELETE FROM entity_link_candidates WHERE candidate_entity_id = ?', id);

  // 9. Flight Passengers
  safeRun('UPDATE flight_passengers SET entity_id = NULL WHERE entity_id = ?', id);

  // 10. Properties
  safeRun(
    'UPDATE palm_beach_properties SET linked_entity_id = NULL WHERE linked_entity_id = ?',
    id,
  );

  // FINALLY delete entity
  safeRun('DELETE FROM entities WHERE id = ?', id);
};

const mergeEntity = (sourceId: number, targetId: number) => {
  const safeRun = (sql: string, ...args: any[]) => {
    try {
      db.prepare(sql).run(...args);
    } catch (e) {
      // Ignore
    }
  };

  // Helper to generic update with conflict ignore
  const safeUpdate = (table: string, col: string, src: number, tgt: number) => {
    try {
      db.prepare(`UPDATE OR IGNORE ${table} SET ${col} = ? WHERE ${col} = ?`).run(tgt, src);
      db.prepare(`DELETE FROM ${table} WHERE ${col} = ?`).run(src);
    } catch (e) {
      safeRun(`DELETE FROM ${table} WHERE ${col} = ?`, src);
    }
  };

  safeUpdate('entity_mentions', 'entity_id', sourceId, targetId);
  safeUpdate('evidence_entity', 'entity_id', sourceId, targetId);
  safeUpdate('media_item_people', 'entity_id', sourceId, targetId);
  safeUpdate('entity_evidence_types', 'entity_id', sourceId, targetId);

  safeRun(
    'UPDATE OR IGNORE entity_relationships SET source_entity_id = ? WHERE source_entity_id = ?',
    targetId,
    sourceId,
  );
  safeRun(
    'UPDATE OR IGNORE entity_relationships SET target_entity_id = ? WHERE target_entity_id = ?',
    targetId,
    sourceId,
  );

  safeRun('UPDATE flight_passengers SET entity_id = ? WHERE entity_id = ?', targetId, sourceId);
  safeRun(
    'UPDATE palm_beach_properties SET linked_entity_id = ? WHERE linked_entity_id = ?',
    targetId,
    sourceId,
  );

  // Delete source entity using the full delete logic
  deleteEntity(sourceId);
};

function main() {
  console.log('🧹 Cleaning up entities...');

  // 0. Retroactive Junk Scan using Updated Filters
  const allEntities = db.prepare('SELECT id, full_name FROM entities').all() as any[];
  console.log(`🔍 Scanning ${allEntities.length} entities for junk...`);

  let junkCount = 0;
  for (const entity of allEntities) {
    // Safety: Never delete Jeffrey Epstein
    if (entity.id === JEFFREY_ID) continue;

    if (isJunkEntity(entity.full_name)) {
      console.log(`   🗑️ Deleting junk: "${entity.full_name}" (ID: ${entity.id})`);
      deleteEntity(entity.id);
      junkCount++;
    }
  }
  console.log(`✨ Retroactive cleanup finished. Removed ${junkCount} junk entities.`);

  // 1. Delete Junk (Specific Patterns)
  const _deleteStmt = db.prepare('DELETE FROM entities WHERE full_name = ?');
  const checkStmt = db.prepare('SELECT id FROM entities WHERE full_name = ?');

  for (const name of TO_DELETE_PATTERNS) {
    const row = checkStmt.get(name) as { id: number } | undefined;
    if (row) {
      console.log(`Deleting junk entity: ${name} (ID: ${row.id})`);
      deleteEntity(row.id);
    }
  }

  // 2. Merge Duplicates
  for (const item of TO_MERGE_PATTERNS) {
    const row = checkStmt.get(item.name) as { id: number } | undefined;
    if (row && row.id !== item.targetId) {
      console.log(`Merging ${item.name} (ID: ${row.id}) into Target ID: ${item.targetId}`);
      try {
        mergeEntity(row.id, item.targetId);
        console.log(`  Merged successfully.`);
      } catch (e: any) {
        console.error(`  Failed to merge ${item.name}:`, e.message);
      }
    }
  }

  console.log('Done.');
}

main();
