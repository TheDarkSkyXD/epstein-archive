import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../epstein-archive.db');
const db = new Database(DB_PATH);

console.log('🚀 Starting Direct Document Enrichment...\n');

// Get all documents needing Red Flag ratings
const documents = db.prepare(`
  SELECT id, file_name, content, title, file_type
  FROM documents
  WHERE red_flag_rating IS NULL
`).all() as Array<{
  id: number;
  file_name: string;
  content: string;
  title: string;
  file_type: string;
}>;

console.log(`📊 Found ${documents.length} documents needing Red Flag ratings\n`);

// Function to analyze and assign Red Flag rating
function assignRedFlagRating(doc: typeof documents[0]): number {
  const content = (doc.content || '').toLowerCase();
  const title = (doc.title || doc.file_name || '').toLowerCase();
  const fileName = (doc.file_name || '').toLowerCase();
  
  // Critical evidence indicators (5 flags)
  const criticalTerms = [
    'victim testimony', 'sexual abuse', 'minor', 'underage', 'trafficking',
    'rape', 'assault', 'molestation', 'exploitation', 'coercion'
  ];
  
  // Highly incriminating (4 flags)
  const highTerms = [
    'deposition', 'testimony', 'witness statement', 'criminal', 'illegal',
    'allegation', 'complaint', 'lawsuit', 'indictment', 'prosecution'
  ];
  
  // Significant evidence (3 flags)
  const significantTerms = [
    'flight log', 'passenger', 'travel', 'island', 'little st james',
    'financial', 'payment', 'transaction', 'wire transfer', 'account'
  ];
  
  // Relevant (2 flags)
  const relevantTerms = [
    'email', 'correspondence', 'meeting', 'schedule', 'appointment',
    'contact', 'phone', 'address', 'associate', 'relationship'
  ];
  
  // Check for critical evidence
  if (criticalTerms.some(term => content.includes(term) || title.includes(term))) {
    return 5;
  }
  
  // Check for highly incriminating
  if (highTerms.some(term => content.includes(term) || title.includes(term))) {
    return 4;
  }
  
  // Check for significant evidence
  if (significantTerms.some(term => content.includes(term) || title.includes(term))) {
    return 3;
  }
  
  // Check for relevant documents
  if (relevantTerms.some(term => content.includes(term) || title.includes(term))) {
    return 2;
  }
  
  // File type based rating
  if (fileName.includes('deposition') || fileName.includes('testimony')) return 4;
  if (fileName.includes('flight') || fileName.includes('log')) return 3;
  if (fileName.includes('email') || fileName.includes('correspondence')) return 2;
  
  // Default to minor relevance
  return 1;
}

// Update documents with Red Flag ratings
const updateStmt = db.prepare(`
  UPDATE documents
  SET red_flag_rating = ?
  WHERE id = ?
`);

const transaction = db.transaction((docs: typeof documents) => {
  let stats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  
  for (const doc of docs) {
    const rating = assignRedFlagRating(doc);
    updateStmt.run(rating, doc.id);
    stats[rating as keyof typeof stats]++;
    
    if (docs.indexOf(doc) % 100 === 0) {
      console.log(`   Processed ${docs.indexOf(doc)}/${docs.length} documents...`);
    }
  }
  
  return stats;
});

console.log('📝 Assigning Red Flag ratings...\n');
const stats = transaction(documents);

console.log('\n✅ Enrichment Complete!\n');
console.log('📊 Red Flag Distribution:');
console.log(`   🚩 (1): ${stats[1]} documents - Minor/Routine`);
console.log(`   🚩🚩 (2): ${stats[2]} documents - Relevant`);
console.log(`   🚩🚩🚩 (3): ${stats[3]} documents - Significant`);
console.log(`   🚩🚩🚩🚩 (4): ${stats[4]} documents - Highly Incriminating`);
console.log(`   🚩🚩🚩🚩🚩 (5): ${stats[5]} documents - Critical Evidence`);

// Verify
const total = db.prepare(`
  SELECT COUNT(*) as count FROM documents WHERE red_flag_rating IS NOT NULL
`).get() as { count: number };

console.log(`\n✅ Total documents with Red Flag ratings: ${total.count}/2330`);

db.close();
