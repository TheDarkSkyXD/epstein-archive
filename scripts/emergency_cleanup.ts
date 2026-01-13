
import Database from 'better-sqlite3';

const DB_PATH = process.env.DB_PATH || 'epstein-archive.db';
const db = new Database(DB_PATH);

const JUNK_TERMS_EXACT = [
  'Of The', 'In The', 'For The', 'To Be', 'At The', 'Up To', 'One Of', 'The New', 
  'The Following', 'All The', 'If You', 'To The', 'On The', 'By The', 'And The',
  'From The', 'With The', 'As A', 'To A', 'Is A', 'Was A', 'For A',
  'Street', 'Property', 'Number', 'Office', 'Company', 'Line', 'Page', 
  'Privacy Policy', 'Table Of Contents', 'Exhibit', 'Plaintiff', 'Defendant',
  'Federal Law', 'State Law', 'United States', 'Federal Court', 
  'Search Completed Place', 'Looking For', 'Sex Offender', 'People Are',
  'To Scale', 'To Change', 'To Close', 'To Set', 'Street New',
  'He Is', 'You For', 'Out To', 'Received From', 'Update Profile', 'Additional Information', 'Law Enforcement', 'Law Enforcement Officer',
  'Interest Checking', 'Users Only', 'Ending Balance', 'Statement Period', 'Premises Known', 'See Attachments', 'Property Received', 'Seized File', 'Street Address', 
  'Period Account Number', 'Our Online Banking', 'With Online Banking', 'Interest Paid Year', 'Account Number', 'Date Of Birth',
  'Wedresday July', 'Stesday July', 'Little Saint', 'Honorable Ruth Milor', 'Ruth Mier', 'Ruth Milor' // These look like specific artifacts in this dataset
];

const JUNK_STARTS_WITH = [
  'To ', 'For ', 'If ', 'And ', 'But ', 'Or ', 'Nor ', 'So ', 'Yet ', 
  'The ', 'A ', 'An ', 'In ', 'On ', 'At ', 'By ', 'From ', 
  'That ', 'This ', 'These ', 'Those ', 'There ', 'Here ', 'When ', 'Where ', 'Why ', 'How ', 'What ', 'Who ', 'Which '
];

function emergencyCleanup() {
  console.log('🚨 Starting Emergency Data Cleanup...');
  
  // 1. Delete Exact Junk Matches
  const deleteList = [...JUNK_TERMS_EXACT];
  
  // 2. Scan for "Stars With" Junk
  const allEntities = db.prepare('SELECT id, full_name, mentions FROM entities').all() as {id: number, full_name: string, mentions: number}[];
  const junkIds: number[] = [];
  
  for (const ent of allEntities) {
      if (JUNK_TERMS_EXACT.includes(ent.full_name)) {
          junkIds.push(ent.id);
          continue;
      }
      
      const name = ent.full_name;
      // Heuristic: "To [Verb]" or "The [Noun]" where noun is generic
      // If it starts with a junk prefix AND is short (< 15 chars) or low mentions?
      // Actually, be aggressive. Real names rarely start with "To " or "If ".
      // Exception: "The Edge" (U2), "The Rock".
      // But in this dataset, "To Scale", "To Change" are definitely junk.
      
      // Check Prefix
      const hasJunkPrefix = JUNK_STARTS_WITH.some(prefix => name.startsWith(prefix));
      if (hasJunkPrefix) {
          // Safety: Don't delete if it looks like a real specific thing?
          // "The New York Times" -> "The New" prefix matches. 
          // "The New" is in exact list.
          // "The New York Times" should NOT be deleted.
          
          // Refined Heuristic:
          // Delete if 2 words only and prefix is common preposition/article
          // e.g. "To Scale" (2 words), "In The" (2 words).
          if (name.split(' ').length <= 2) {
             junkIds.push(ent.id);
          }
      }
      
      // Delete "Jeffrey Epstein [Suffix]" where Suffix isn't meaningful nickname
      if (name.startsWith('Jeffrey Epstein ') && name !== 'Jeffrey Epstein') {
          // Merge these!
          // We'll handle merge in next step.
      }
  }
  
  console.log(`🗑 Found ${junkIds.length} generic junk entities to delete.`);

  const deleteStmt = db.prepare('DELETE FROM entities WHERE id = ?');
  const deleteMentions = db.prepare('DELETE FROM entity_mentions WHERE entity_id = ?');
  const deleteRels = db.prepare('DELETE FROM entity_relationships WHERE source_entity_id = ? OR target_entity_id = ?');
  
  db.transaction(() => {
      for (const id of junkIds) {
          deleteMentions.run(id);
          deleteRels.run(id, id);
          deleteStmt.run(id);
      }
  })();
  
  // 3. Merge Epstein Variants
  console.log('🔄 Merging Jeffrey Epstein variants...');
  const epsteinId = db.prepare("SELECT id FROM entities WHERE full_name = 'Jeffrey Epstein'").get() as {id: number} | undefined;
  
  if (epsteinId) {
      const variants = db.prepare(`SELECT id, full_name FROM entities WHERE full_name LIKE 'Jeffrey Epstein %'`).all() as {id: number, full_name: string}[];
      let merged = 0;
      for (const v of variants) {
          console.log(`   Merging ${v.full_name} -> Jeffrey Epstein`);
          db.prepare('UPDATE entity_mentions SET entity_id = ? WHERE entity_id = ?').run(epsteinId.id, v.id);
          db.prepare('DELETE FROM entities WHERE id = ?').run(v.id);
          merged++;
      }
      // Update count
      const count = db.prepare('SELECT COUNT(*) as c FROM entity_mentions WHERE entity_id = ?').get(epsteinId.id) as {c: number};
      db.prepare('UPDATE entities SET mentions = ? WHERE id = ?').run(count.c, epsteinId.id);
      console.log(`   Merged ${merged} variants.`);
  }

  // 4. Create "Document Count" view or verify it? 
  // User says "0 docs". 
  // This likely means the frontend is looking for a document count but getting 0.
  // We should compute the mentions properly.
  // Let's recalculate mentions for top 100 REAL entities
  const remainingTop = db.prepare('SELECT id FROM entities ORDER BY mentions DESC LIMIT 100').all() as {id: number}[];
  for (const row of remainingTop) {
       const count = db.prepare('SELECT COUNT(*) as c FROM entity_mentions WHERE entity_id = ?').get(row.id) as {c: number};
       db.prepare('UPDATE entities SET mentions = ? WHERE id = ?').run(count.c, row.id);
  }
}

emergencyCleanup();
