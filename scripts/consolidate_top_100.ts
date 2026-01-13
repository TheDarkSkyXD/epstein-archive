
import Database from 'better-sqlite3';

const DB_PATH = process.env.DB_PATH || 'epstein-archive.db';
const db = new Database(DB_PATH);

// Common Nicknames Map (Symmetric)
const NICKNAMES: Record<string, string[]> = {
  'william': ['bill', 'billy', 'will'],
  'robert': ['bob', 'bobby', 'rob'],
  'james': ['jim', 'jimmy'],
  'thomas': ['tom', 'tommy'],
  'richard': ['dick', 'rick', 'richie'],
  'jeffrey': ['jeff'],
  'steven': ['steve'],
  'stephen': ['steve'],
  'michael': ['mike', 'mikey'],
  'alexander': ['alex', 'al'],
  'david': ['dave'],
  'joseph': ['joe', 'joey'],
  'virginia': ['ginny', 'ginnie'],
  'ghislaine': ['gmax'], // specialized
  'leslie': ['les'],
  'alan': ['al'],
  'donald': ['don', 'donny'],
};

function getVariations(fullName: string): string[] {
    const parts = fullName.toLowerCase().split(/\s+/);
    if (parts.length < 2) return [fullName.toLowerCase()];

    const first = parts[0];
    const last = parts[parts.length - 1];
    
    const variations = [fullName.toLowerCase()];
    
    // Check nicknames for first name
    if (NICKNAMES[first]) {
        for (const nick of NICKNAMES[first]) {
            variations.push(`${nick} ${last}`);
            // Also handle middle initials if present? keep simple for now
        }
    }
    // Reverse check: if input is "Bill Gates", check "William"
    for (const [formal, nicks] of Object.entries(NICKNAMES)) {
        if (nicks.includes(first)) {
            variations.push(`${formal} ${last}`);
        }
    }
    
    return variations;
}

// Jaro-Winkler / Levenshtein Distance Helper
function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) == a.charAt(j - 1)) matrix[i][j] = matrix[i - 1][j - 1];
      else matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
    }
  }
  return matrix[b.length][a.length];
}

function consolidateTopEntities() {
  console.log('🚀 Consolidating Top 100 Entities (Fuzzy + Nicknames)...');

  // 1. Get Top 100
  const topEntities = db.prepare(`
    SELECT id, full_name, mentions 
    FROM entities 
    WHERE entity_type = 'Person' 
    ORDER BY mentions DESC 
    LIMIT 100
  `).all() as { id: number, full_name: string, mentions: number }[];

  let totalMerged = 0;
  let totalMoved = 0;

  const moveMentions = db.prepare('UPDATE entity_mentions SET entity_id = ? WHERE entity_id = ?');
  const deleteEntity = db.prepare('DELETE FROM entities WHERE id = ?');

  // Pre-fetch all person entities to scan against (avoid N query)
  const allPersons = db.prepare("SELECT id, full_name FROM entities WHERE entity_type = 'Person'").all() as { id: number, full_name: string }[];
  
  // Quick Existence Check Helper
  const exists = db.prepare('SELECT 1 FROM entities WHERE id = ?');

  db.transaction(() => {
      for (const target of topEntities) {
          // 0. Verify Target Still Exists (wasn't merged into someone else already)
          if (!exists.get(target.id)) continue;

          // 0.1 Filter Junk from Top List (e.g. "Of The", "In The")
          const targetNameRaw = target.full_name;
          if (targetNameRaw.length < 4) continue; 
          if (['The', 'Of', 'In', 'To', 'And'].some(w => targetNameRaw.includes(w) && targetNameRaw.length < 8)) continue;

          const targetName = targetNameRaw.toLowerCase();
          const targetVars = getVariations(targetNameRaw);
          
          // Find candidates
          const candidates = allPersons.filter(p => {
              if (p.id === target.id) return false;
              
              // Verify candidate still exists (might have been merged in previous iteration)
              // We can't query DB inside filter efficiently. 
              // Instead, we'll try/catch the merge or check before merging.
              // But "allPersons" is a static snapshot. 
              // Let's filter candidates inside the loop.
              return true;
          }).filter(p => {
              const pName = p.full_name.toLowerCase();
              
              // 1. Name Variation Match
              if (targetVars.includes(pName)) return true;
              
              // 2. Fuzzy Match
              if (Math.abs(pName.length - targetName.length) > 3) return false;
              const dist = levenshtein(pName, targetName);
              if (targetName.length > 5 && dist <= 2) return true;
              if (targetName.length > 10 && dist <= 3) return true;
              return false;
          });

          if (candidates.length > 0) {
              console.log(`\n🔹 Processing: ${target.full_name} (${target.mentions})`);
              for (const cand of candidates) {
                  // Double check candidate existence before action
                  if (!exists.get(cand.id)) continue;

                  console.log(`   Merging duplicate: ${cand.full_name} (${cand.id}) -> ${target.full_name}`);
                  
                  try {
                      // Merge Logic
                      const mentionsRes = moveMentions.run(target.id, cand.id);
                      totalMoved += mentionsRes.changes;
                      
                      // Merge Relationships
                      db.prepare('UPDATE OR IGNORE entity_relationships SET source_entity_id = ? WHERE source_entity_id = ?').run(target.id, cand.id);
                      db.prepare('UPDATE OR IGNORE entity_relationships SET target_entity_id = ? WHERE target_entity_id = ?').run(target.id, cand.id);

                      deleteEntity.run(cand.id);
                      totalMerged++;
                  } catch (e: any) {
                      console.warn(`   ! Merge failed for ${cand.id}: ${e.message}`);
                  }
              }
              
              // Update target count
              const newCount = db.prepare('SELECT COUNT(*) as c FROM entity_mentions WHERE entity_id = ?').get(target.id) as {c: number};
              db.prepare('UPDATE entities SET mentions = ? WHERE id = ?').run(newCount.c, target.id);
          }
      }
  })();

  console.log(`\n============== REPORT ==============`);
  console.log(`Top Entities Checked: 100`);
  console.log(`Duplicates Merged: ${totalMerged}`);
  console.log(`Mentions Moved: ${totalMoved}`);
  console.log(`====================================`);
}

consolidateTopEntities();
