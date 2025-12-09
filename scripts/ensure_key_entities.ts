import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'epstein-archive.db');

// List of key entities to ensure exist
const KEY_ENTITIES = [
  'Steve Bannon',
  'Donald Trump',
  'Bill Clinton',
  'Hillary Clinton',
  'Jeffrey Epstein',
  'Ghislaine Maxwell',
  'Prince Andrew',
  'Alan Dershowitz',
  'Bill Gates',
  'Jeff Bezos',
  'Elon Musk',
  'Mark Zuckerberg',
  'Tim Cook',
  'Satya Nadella',
  'Sergey Brin',
  'Larry Page',
  'Steve Jobs',
  'Warren Buffett',
  'Charlie Munger',
  'Michael Bloomberg',
  'Jamie Dimon',
  'Lloyd Blankfein',
  'Ken Griffin',
  'Les Wexner',
  'Ehud Barak',
  'Leon Black',
  'Glenn Dubin',
  'Thomas Pritzker',
  'Mortimer Zuckerman',
  'George Mitchell',
  'Bill Richardson'
];

async function ensureKeyEntities() {
  console.log('Starting key entity verification...');
  
  if (!fs.existsSync(DB_PATH)) {
    console.error('Database not found:', DB_PATH);
    process.exit(1);
  }

  const db = new Database(DB_PATH);

  try {
    // Inspect schema
    const columns = db.prepare('PRAGMA table_info(entities)').all() as any[];
    const columnNames = columns.map(c => c.name);
    console.log('Entities table columns:', columnNames.join(', '));

    const hasEntityType = columnNames.includes('entity_type');
    const hasType = columnNames.includes('type');
    const hasSpiceRating = columnNames.includes('spice_rating');
    const hasRedFlagRating = columnNames.includes('red_flag_rating');

    // Check if people table exists
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='people'").get();
    const hasPeopleTable = !!tables;
    console.log('Has people table:', hasPeopleTable);

    // Prepare statements
    const checkEntity = db.prepare('SELECT id FROM entities WHERE full_name LIKE ?');
    
    // Build dynamic insert statement
    let insertFields = ['full_name', 'mentions', 'created_at', 'updated_at'];
    let insertPlaceholders = ['?', '?', '?', '?'];
    
    if (hasEntityType) { insertFields.push('entity_type'); insertPlaceholders.push('?'); }
    else if (hasType) { insertFields.push('type'); insertPlaceholders.push('?'); }
    
    if (hasRedFlagRating) { insertFields.push('red_flag_rating'); insertPlaceholders.push('?'); }
    else if (hasSpiceRating) { insertFields.push('spice_rating'); insertPlaceholders.push('?'); }

    const insertSql = `INSERT INTO entities (${insertFields.join(', ')}) VALUES (${insertPlaceholders.join(', ')})`;
    const insertEntity = db.prepare(insertSql);

    const searchDocuments = db.prepare('SELECT id, content FROM documents WHERE content LIKE ? LIMIT 1');
    const countMentions = db.prepare('SELECT COUNT(*) as count FROM documents WHERE content LIKE ?');

    let addedCount = 0;

    for (const name of KEY_ENTITIES) {
      // Check if entity exists (case-insensitive)
      const existing = checkEntity.get(`%${name}%`) as { id: number } | undefined;
      
      if (existing) {
        console.log(`✅ Entity "${name}" already exists (ID: ${existing.id}).`);
        
        // Fix specific bad data for Steve Bannon
        if (name === 'Steve Bannon') {
             const details = db.prepare('SELECT * FROM entities WHERE id = ?').get(existing.id) as any;
             console.log('   Details:', details.full_name);
             
             if (details.full_name === 'And Steve Bannon') {
                 console.log('   ⚠️ Found bad name "And Steve Bannon". Renaming to "Steve Bannon"...');
                 db.prepare('UPDATE entities SET full_name = ? WHERE id = ?').run('Steve Bannon', existing.id);
                 console.log('   ✨ Renamed successfully.');
             }
        }
        continue;
      }

      console.log(`⚠️ Entity "${name}" missing. Searching documents...`);

      // Search in documents
      const docMatch = searchDocuments.get(`%${name}%`);

      if (docMatch) {
        console.log(`  Found "${name}" in documents. Creating entity...`);
        
        // Count total mentions
        const mentionCountResult = countMentions.get(`%${name}%`) as any;
        const mentionCount = mentionCountResult ? mentionCountResult.count : 0;

        const now = new Date().toISOString();
        
        // Prepare values
        const values = [name, mentionCount, now, now];
        if (hasEntityType || hasType) values.push('PERSON');
        if (hasRedFlagRating || hasSpiceRating) values.push(0);

        // Create Entity
        const result = insertEntity.run(...values);
        const entityId = result.lastInsertRowid;

        console.log(`  ✨ Created entity "${name}" (ID: ${entityId}) with ${mentionCount} mentions.`);
        addedCount++;
      } else {
        console.log(`  ❌ "${name}" not found in any documents.`);
      }
    }

    console.log('-----------------------------------');
    console.log(`Verification complete. Added ${addedCount} new entities.`);

  } catch (error) {
    console.error('Error ensuring key entities:', error);
  } finally {
    db.close();
  }
}

ensureKeyEntities();
