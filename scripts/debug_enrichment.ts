import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '../epstein-archive.db');
const db = new Database(DB_PATH);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function debug() {
  const entity = db.prepare(`
    SELECT e.id, e.full_name as name, GROUP_CONCAT(DISTINCT d.content) as context_samples
    FROM entities e
    JOIN entity_mentions em ON e.id = em.entity_id
    JOIN documents d ON em.document_id = d.id
    WHERE e.full_name LIKE '%Clinton%'
    LIMIT 1
  `).get() as any;

  console.log('Entity:', entity.name);
  console.log('Context Length:', entity.context_samples?.length);
  console.log('Sample Context:', entity.context_samples?.substring(0, 200));

  const prompt = `Analyze the following entity in the context of the Jeffrey Epstein case.
    
    Entity Name: "${entity.name}"
    Context Snippets: "${entity.context_samples?.substring(0, 1000)}..."
    
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

  console.log('Raw Response:', response.choices[0].message.content);
}

debug();
