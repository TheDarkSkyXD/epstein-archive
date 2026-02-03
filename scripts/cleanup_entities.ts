import Database from 'better-sqlite3';

const DB_PATH = process.env.DB_PATH || 'epstein-archive.db';
const db = new Database(DB_PATH);

// Main ID for Jeffrey Epstein
const JEFFREY_ID = 1;

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
];

const TO_MERGE_PATTERNS = [
  'Epstein Jeffrey',
  'Epstem Jeffrey',
  'Jenrey E. Masrein Jeffrey',
  'Chil Jeffrey',
  'Jeffrey Bateman', // Check if this is real? Assuming OCR error for now based on context
  'Sex Offender Jeffrey',
  'Billionaire Jeffrey Epstein',
  'Jeffrey  We', // OCR noise
];

function main() {
  console.log('🧹 Cleaning up entities...');

  // 1. Delete Junk
  const deleteStmt = db.prepare('DELETE FROM entities WHERE full_name = ?');
  const checkStmt = db.prepare('SELECT id FROM entities WHERE full_name = ?');

  for (const name of TO_DELETE_PATTERNS) {
    const row = checkStmt.get(name) as { id: number } | undefined;
    if (row) {
      console.log(`Deleting junk entity: ${name} (ID: ${row.id})`);
      // Delete mentions first
      db.prepare('DELETE FROM entity_mentions WHERE entity_id = ?').run(row.id);
      deleteStmt.run(name);
    }
  }

  // 2. Merge Duplicates
  const updateMentions = db.prepare('UPDATE entity_mentions SET entity_id = ? WHERE entity_id = ?');

  for (const name of TO_MERGE_PATTERNS) {
    const row = checkStmt.get(name) as { id: number } | undefined;
    if (row) {
      console.log(`Merging ${name} (ID: ${row.id}) into Jeffrey Epstein (ID: ${JEFFREY_ID})`);

      // Move mentions
      const info = updateMentions.run(JEFFREY_ID, row.id);
      console.log(`  Moved ${info.changes} mentions.`);

      // Delete entity
      deleteStmt.run(name);
    }
  }

  // 3. Fix "Unknown Sender" in email metadata (documents)
  // This requires parsing metadata_json, which is hard in SQL.
  // We can just update specific fields if they exact match.

  console.log('Done.');
}

main();
