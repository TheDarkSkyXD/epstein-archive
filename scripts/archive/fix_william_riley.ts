import Database from 'better-sqlite3';

const DB_PATH = process.env.DB_PATH || 'epstein-archive.db';
const db = new Database(DB_PATH);

function fixWilliamRiley() {
  console.log('🚀 Starting William Riley Entity Separation...');

  // 1. Ensure Entities Exist
  
  // A. William Kyle Riley (Existing: 73359)
  const kyle = db.prepare('SELECT id FROM entities WHERE id = 73359').get() as { id: number } | undefined;
  if (!kyle) {
    console.warn('⚠️ William Kyle Riley (73359) not found. Checking by name...');
  } else {
    console.log('✅ Found William Kyle Riley (73359). Updating details...');
    // Note: using connections_summary as the description field
    db.prepare(`
      UPDATE entities 
      SET connections_summary = 'Adoptive father of Sascha Riley (William Sascha Riley/Manuel Sascha Barros). Pilot and Private Investigator. Often referred to as Bill Riley or Kyle Riley.',
          aliases = 'Bill Riley,Will Riley,Mr. William Riley,Kyle Riley,William K. Riley'
      WHERE id = 73359
    `).run();
  }

  // B. William H. Riley (The PI Partner)
  let hRileyId: number | bigint;
  const hRiley = db.prepare("SELECT id FROM entities WHERE full_name = 'William H. Riley'").get() as { id: number } | undefined;
  
  if (hRiley) {
    hRileyId = hRiley.id;
    console.log(`✅ Found existing William H. Riley (${hRileyId}).`);
  } else {
    // Note: using connections_summary as the description field
    const info = db.prepare(`
      INSERT INTO entities (full_name, primary_role, connections_summary, aliases, entity_type, red_flag_rating)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      'William H. Riley',
      'Private Investigator',
      'Private Investigator and business partner of Steve Kiraly. Firm: Kiraly & Riley.',
      'Bill Riley,Will Riley,William Riley',
      'Person',
      3
    );
    hRileyId = info.lastInsertRowid;
    console.log(`✨ Created William H. Riley (${hRileyId}).`);
  }

  // 2. Fetch Mentions to Process
  const targetIds = [73359, 87207];
  const mentions = db.prepare(`
    SELECT id, entity_id, mention_context, keyword, document_id 
    FROM entity_mentions 
    WHERE entity_id IN (${targetIds.join(',')})
  `).all() as any[];

  console.log(`Found ${mentions.length} mentions to analyze.`);

  let movedToH = 0;
  let movedToKyle = 0;
  let stayedSame = 0;
  let ambiguous = 0;

  const updateStmt = db.prepare('UPDATE entity_mentions SET entity_id = ? WHERE id = ?');

  for (const m of mentions) {
    const context = (m.mention_context || '').toLowerCase();
    const keyword = (m.keyword || '').toLowerCase(); 
    
    // Heuristics
    const isKiralyContext = context.includes('kiraly') || context.includes('kiralay') || context.includes('steve k') || keyword.includes('kiraly');
    const isKyleContext = context.includes('sascha') || context.includes('manuel') || context.includes('barros') || context.includes('pilot') || context.includes('aviation') || context.includes('kyle');
    
    // Logic
    let newEntityId = m.entity_id;

    if (isKiralyContext) {
      newEntityId = Number(hRileyId);
    } else if (isKyleContext) {
      newEntityId = 73359; // Force to Kyle
    } else {
      
      if (m.entity_id === 87207) {
        // If keyword mentions "William" or "Bill", probably H. Riley
        if (keyword.includes('william') || keyword.includes('bill')) {
           newEntityId = Number(hRileyId); 
        }
      }
    }

    // Apply Update
    if (newEntityId !== m.entity_id) {
      updateStmt.run(newEntityId, m.id);
      if (newEntityId === Number(hRileyId)) movedToH++;
      if (newEntityId === 73359) movedToKyle++;
    } else {
        stayedSame++;
        if (!isKyleContext && !isKiralyContext) ambiguous++;
    }
  }

  console.log('separation complete.');
  console.log(`Moved to William H. Riley: ${movedToH}`);
  console.log(`Moved to William Kyle Riley: ${movedToKyle}`);
  console.log(`Unchanged: ${stayedSame}`);
  console.log(`  (Ambiguous/Generic context: ${ambiguous})`);
}

fixWilliamRiley();
