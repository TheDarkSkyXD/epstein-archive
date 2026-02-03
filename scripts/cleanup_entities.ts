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
  'Anthony Faiola Netanyahu'
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
  // Netanyahu Merges
  { name: 'Minister Benjamin Netanyahu', targetId: NETANYAHU_ID },
  { name: 'Bibi Netanyahu', targetId: NETANYAHU_ID },
  { name: 'Binyamin Netanyahu', targetId: NETANYAHU_ID },
  { name: 'Prime Minister Netanyahu', targetId: NETANYAHU_ID },
  { name: 'Israeli Netanyahu', targetId: NETANYAHU_ID },
  { name: 'Prime Minister Benjamin Netanyahu', targetId: NETANYAHU_ID },
  { name: 'Prime Minister Binyamin Netanyahu', targetId: NETANYAHU_ID },
  { name: 'Israeli Prime Minister Netanyahu', targetId: NETANYAHU_ID }
];

function main() {
  console.log('🧹 Cleaning up entities...');

  // 1. Delete Junk
  const deleteStmt = db.prepare('DELETE FROM entities WHERE full_name = ?');
  const checkStmt = db.prepare('SELECT id FROM entities WHERE full_name = ?');

  // Pre-statements for dependencies
  // We need to handle ALL tables referencing entities to avoid FK errors
  // Tables: entity_mentions, entity_relationships, entity_evidence_types, media_items, 
  // evidence_entity, media_people, black_book_entries, media_item_people, 
  // entity_link_candidates, flight_passengers, palm_beach_properties, resolution_candidates

  const deleteEntity = (id: number) => {
    // 1. Mentions
    db.prepare('DELETE FROM entity_mentions WHERE entity_id = ?').run(id);

    // 2. Relationships
    db.prepare('DELETE FROM entity_relationships WHERE source_entity_id = ? OR target_entity_id = ?').run(id, id);

    // 3. Evidence Types
    db.prepare('DELETE FROM entity_evidence_types WHERE entity_id = ?').run(id);

    // 4. Media Items
    db.prepare('UPDATE media_items SET entity_id = NULL WHERE entity_id = ?').run(id);

    // 5. Evidence Entity
    db.prepare('DELETE FROM evidence_entity WHERE entity_id = ?').run(id);

    // 6. Media People
    db.prepare('DELETE FROM media_people WHERE entity_id = ?').run(id);

    // 7. Black Book (Cascade usually on but manual is safer)
    db.prepare('DELETE FROM black_book_entries WHERE person_id = ?').run(id);

    // 8. Media Item People
    db.prepare('DELETE FROM media_item_people WHERE entity_id = ?').run(id);

    // 9. Link Candidates
    db.prepare('DELETE FROM entity_link_candidates WHERE candidate_entity_id = ?').run(id);

    // 10. Flight Passengers
    db.prepare('UPDATE flight_passengers SET entity_id = NULL WHERE entity_id = ?').run(id);

    // 11. Properties
    db.prepare('UPDATE palm_beach_properties SET linked_entity_id = NULL WHERE linked_entity_id = ?').run(id);

    // 12. Resolution Candidates
    db.prepare('DELETE FROM resolution_candidates WHERE left_entity_id = ? OR right_entity_id = ?').run(id, id);

    // FINALLY delete entity
    db.prepare('DELETE FROM entities WHERE id = ?').run(id);
  };

  const mergeEntity = (sourceId: number, targetId: number) => {
    // Helper to generic update with conflict ignore
    const safeUpdate = (table: string, col: string, src: number, tgt: number) => {
      try {
        db.prepare(`UPDATE OR IGNORE ${table} SET ${col} = ? WHERE ${col} = ?`).run(tgt, src);
        // Delete leftovers (if they were ignored due to unique constraint, it means target already had that record)
        db.prepare(`DELETE FROM ${table} WHERE ${col} = ?`).run(src);
      } catch (e) {
        // Fallback delete
        db.prepare(`DELETE FROM ${table} WHERE ${col} = ?`).run(src);
      }
    };

    safeUpdate('entity_mentions', 'entity_id', sourceId, targetId);
    safeUpdate('evidence_entity', 'entity_id', sourceId, targetId);
    safeUpdate('media_people', 'entity_id', sourceId, targetId);
    safeUpdate('media_item_people', 'entity_id', sourceId, targetId);
    safeUpdate('entity_evidence_types', 'entity_id', sourceId, targetId);

    // Relationships are trickier (source/target)
    try {
      db.prepare('UPDATE OR IGNORE entity_relationships SET source_entity_id = ? WHERE source_entity_id = ?').run(targetId, sourceId);
      db.prepare('DELETE FROM entity_relationships WHERE source_entity_id = ?').run(sourceId);

      db.prepare('UPDATE OR IGNORE entity_relationships SET target_entity_id = ? WHERE target_entity_id = ?').run(targetId, sourceId);
      db.prepare('DELETE FROM entity_relationships WHERE target_entity_id = ?').run(sourceId);
    } catch (e) { }

    // Others like flight passengers, properties can just be updated (no unique constraint usually)
    db.prepare('UPDATE flight_passengers SET entity_id = ? WHERE entity_id = ?').run(targetId, sourceId);
    db.prepare('UPDATE palm_beach_properties SET linked_entity_id = ? WHERE linked_entity_id = ?').run(targetId, sourceId);

    // Clean up resolution candidates
    db.prepare('DELETE FROM resolution_candidates WHERE left_entity_id = ? OR right_entity_id = ?').run(sourceId, sourceId);

    // Delete source entity using the full delete logic (to catch anything missed)
    deleteEntity(sourceId);
  };

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
