import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '../epstein-archive.db');
const db = new Database(DB_PATH);

// Initialize OpenAI
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
}) : null;

console.log('🚀 Starting Key Entity Enrichment...\n');

// Get top entities by mentions that have 'Unknown' role
const entitiesToEnrich = db.prepare(`
  SELECT e.id, e.full_name as name, GROUP_CONCAT(DISTINCT d.content) as context_samples
  FROM entities e
  JOIN entity_mentions em ON e.id = em.entity_id
  JOIN documents d ON em.document_id = d.id
  WHERE e.primary_role = 'Unknown' OR e.primary_role IS NULL
  GROUP BY e.id
  ORDER BY COUNT(em.id) DESC
  LIMIT 200
`).all() as Array<{ id: number; name: string; context_samples: string }>;

console.log(`📊 Found ${entitiesToEnrich.length} key entities to enrich\n`);

async function enrichEntity(entity: typeof entitiesToEnrich[0]) {
  if (!openai) return null;

  // Truncate context to avoid token limits
  const context = (entity.context_samples || '').substring(0, 1000);

  try {
    const prompt = `Analyze the following entity in the context of the Jeffrey Epstein case.
    
    Entity Name: "${entity.name}"
    Context Snippets: "${context}..."
    
    Determine their Primary Role and Title.
    
    Roles: 'Associate', 'Victim', 'Employee', 'Politician', 'Celebrity', 'Lawyer', 'Pilot', 'Recruiter', 'Family', 'Other'
    
    Return JSON format: {"role": "String", "title": "String"}
    Example: {"role": "Pilot", "title": "Chief Pilot for Epstein"}
    `;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return result;
  } catch (error) {
    console.error(`Error enriching ${entity.name}:`, error);
    return null;
  }
}

async function run() {
  const updateStmt = db.prepare('UPDATE entities SET primary_role = ?, title = ? WHERE id = ?');
  
  let processed = 0;
  for (const entity of entitiesToEnrich) {
    console.log(`🔍 Analyzing: ${entity.name}...`);
    const data = await enrichEntity(entity);
    
    if (data && data.role) {
      updateStmt.run(data.role, data.title || null, entity.id);
      console.log(`   ✅ Set: ${data.role} - ${data.title}`);
      processed++;
    } else {
      console.log(`   ⚠️ Could not determine role`);
    }
    
    // Rate limit
    if (openai) await new Promise(r => setTimeout(r, 500));
  }
  
  console.log(`\n🎉 Enriched ${processed} entities!`);
}

run();
