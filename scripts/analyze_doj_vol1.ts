
import Database from 'better-sqlite3';
import path from 'path';

const workspaceRoot = '/Users/veland/Downloads/Epstein Files';
const dbPath = path.join(workspaceRoot, 'epstein-archive', 'epstein-archive.db');
const db = new Database(dbPath);

console.log('🔍 Analyzing DOJ VOL00001 Data...');

// 1. Count Total Documents in this batch
// We can filter by source_path containing "DOJ VOL00001"
const totalDocs = db.prepare(`
  SELECT COUNT(*) as count 
  FROM evidence 
  WHERE source_path LIKE '%DOJ VOL00001%'
`).get() as { count: number };

console.log(`\n📄 Total Documents Found: ${totalDocs.count}`);

// 2. Redaction Statistics
const redactionStats = db.prepare(`
  SELECT 
    COUNT(*) as count,
    AVG(json_extract(metadata_json, '$.redactionRatio')) as avgRatio,
    MAX(json_extract(metadata_json, '$.redactionRatio')) as maxRatio
  FROM evidence 
  WHERE source_path LIKE '%DOJ VOL00001%'
  AND json_extract(metadata_json, '$.hasRedactions') = 1
`).get() as { count: number, avgRatio: number, maxRatio: number };

console.log(`\n█ Redaction Analysis:`);
console.log(`   - Documents with Redactions: ${redactionStats.count} (${((redactionStats.count / totalDocs.count) * 100).toFixed(1)}%)`);
console.log(`   - Average Redaction Ratio: ${(redactionStats.avgRatio * 100).toFixed(2)}%`);
console.log(`   - Max Redaction Ratio: ${(redactionStats.maxRatio * 100).toFixed(2)}%`);

// 3. Search for "Trump" (Normalized)
const trumpMentions = db.prepare(`
  SELECT title, original_filename, extracted_text 
  FROM evidence 
  WHERE source_path LIKE '%DOJ VOL00001%' 
  AND extracted_text LIKE '%Trump%'
`).all() as { title: string, original_filename: string, extracted_text: string }[];

console.log(`\n👤 "Trump" Mentions (Normalized): ${trumpMentions.length}`);
trumpMentions.slice(0, 5).forEach(doc => {
  console.log(`   - [${doc.original_filename}]: ...${doc.extracted_text.substring(doc.extracted_text.indexOf('Trump') - 50, doc.extracted_text.indexOf('Trump') + 50).replace(/\n/g, ' ')}...`);
});

// 4. Other Key Entities
const entities = ['Epstein', 'Maxwell', 'Clinton', 'Prince Andrew', 'Wexner'];
console.log(`\n👥 Other Key Entities:`);
for (const entity of entities) {
  const count = db.prepare(`
    SELECT COUNT(*) as count 
    FROM evidence 
    WHERE source_path LIKE '%DOJ VOL00001%' 
    AND extracted_text LIKE ?
  `).get(`%${entity}%`) as { count: number };
  console.log(`   - ${entity}: ${count.count}`);
}

// 5. High Redaction Examples
const heavilyRedacted = db.prepare(`
  SELECT original_filename, json_extract(metadata_json, '$.redactionRatio') as ratio
  FROM evidence
  WHERE source_path LIKE '%DOJ VOL00001%'
  ORDER BY ratio DESC
  LIMIT 5
`).all() as { original_filename: string, ratio: number }[];

console.log(`\n██ Heaviest Redactions:`);
heavilyRedacted.forEach(doc => {
  console.log(`   - ${doc.original_filename}: ${(doc.ratio * 100).toFixed(1)}%`);
});

// 6. Potential Full Redactions (Empty Text)
const emptyText = db.prepare(`
  SELECT COUNT(*) as count 
  FROM evidence 
  WHERE source_path LIKE '%DOJ VOL00001%'
  AND (extracted_text IS NULL OR length(trim(extracted_text)) = 0)
`).get() as { count: number };

console.log(`\n⬛ Potential Full Redactions (Empty Text): ${emptyText.count} (${((emptyText.count / totalDocs.count) * 100).toFixed(1)}%)`);

db.close();
