import Database from 'better-sqlite3';
import path from 'path';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const DB_PATH = path.join(__dirname, '../epstein-archive.db');
const db = new Database(DB_PATH);

// Initialize OpenAI (will need API key)
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
}) : null;

console.log('🚀 Starting Comprehensive Document Enrichment...\n');

// Configuration
const BATCH_SIZE = 10; // Process 10 documents at a time
const DRY_RUN = process.argv.includes('--dry-run');

if (DRY_RUN) {
  console.log('⚠️  DRY RUN MODE - No changes will be made\n');
}

if (!openai) {
  console.log('⚠️  No OpenAI API key found. Will skip AI-based enrichment.');
  console.log('   Set OPENAI_API_KEY in .env to enable Red Flag rating assignment.\n');
}

// Get documents that need enrichment
const documentsNeedingEnrichment = db.prepare(`
  SELECT id, file_name, content, title, red_flag_rating
  FROM documents
  WHERE red_flag_rating IS NULL
  LIMIT ?
`).all(DRY_RUN ? 5 : 2314) as Array<{
  id: number;
  file_name: string;
  content: string;
  title: string;
  red_flag_rating: number | null;
}>;

console.log(`📊 Found ${documentsNeedingEnrichment.length} documents needing Red Flag ratings\n`);

// Function to assign Red Flag rating using AI
async function assignRedFlagRating(document: typeof documentsNeedingEnrichment[0]): Promise<number> {
  if (!openai) {
    // Fallback: assign based on simple heuristics
    const content = document.content?.toLowerCase() || '';
    const incriminatingTerms = [
      'testimony', 'deposition', 'allegation', 'victim', 'minor',
      'trafficking', 'abuse', 'assault', 'illegal', 'criminal'
    ];
    
    const matches = incriminatingTerms.filter(term => content.includes(term)).length;
    return Math.min(5, Math.max(1, Math.ceil(matches / 2)));
  }

  try {
    const prompt = `Analyze this document and assign a Red Flag rating from 1-5 based on how incriminating or significant it is for an investigation into Jeffrey Epstein's activities.

Rating scale:
1 = Minor/routine (general correspondence, administrative)
2 = Somewhat relevant (mentions of associates, travel)
3 = Significant (financial records, witness statements)
4 = Highly incriminating (victim testimony, illegal activities)
5 = Critical evidence (direct proof of crimes, key testimony)

Document Title: ${document.title}
Document Content (first 1000 chars): ${document.content?.substring(0, 1000) || 'No content'}

Respond with ONLY a number 1-5.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 10
    });

    const rating = parseInt(response.choices[0].message.content?.trim() || '1');
    return Math.min(5, Math.max(1, rating));
  } catch (error) {
    console.error(`   ⚠️  Error getting AI rating for ${document.file_name}:`, error);
    return 1; // Default to lowest rating on error
  }
}

// Main enrichment process
async function enrichDocuments() {
  const updateStmt = db.prepare(`
    UPDATE documents
    SET red_flag_rating = ?
    WHERE id = ?
  `);

  let processed = 0;
  let errors = 0;

  for (let i = 0; i < documentsNeedingEnrichment.length; i += BATCH_SIZE) {
    const batch = documentsNeedingEnrichment.slice(i, i + BATCH_SIZE);
    
    console.log(`\n📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(documentsNeedingEnrichment.length / BATCH_SIZE)}`);
    
    for (const doc of batch) {
      try {
        const rating = await assignRedFlagRating(doc);
        
        if (!DRY_RUN) {
          updateStmt.run(rating, doc.id);
        }
        
        console.log(`   ✅ ${doc.file_name}: Red Flag ${rating}/5`);
        processed++;
      } catch (error) {
        console.error(`   ❌ Error processing ${doc.file_name}:`, error);
        errors++;
      }
    }
    
    // Rate limiting: wait 1 second between batches if using AI
    if (openai && i + BATCH_SIZE < documentsNeedingEnrichment.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`\n✅ Enrichment Complete!`);
  console.log(`   Processed: ${processed} documents`);
  console.log(`   Errors: ${errors}`);
  
  if (!DRY_RUN) {
    // Verify results
    const stats = db.prepare(`
      SELECT red_flag_rating, COUNT(*) as count
      FROM documents
      WHERE red_flag_rating IS NOT NULL
      GROUP BY red_flag_rating
      ORDER BY red_flag_rating
    `).all() as Array<{ red_flag_rating: number; count: number }>;
    
    console.log(`\n📊 Red Flag Distribution:`);
    stats.forEach(stat => {
      console.log(`   ${'🚩'.repeat(stat.red_flag_rating)} (${stat.red_flag_rating}): ${stat.count} documents`);
    });
  }
}

// Run enrichment
enrichDocuments()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
