
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DB_PATH = process.env.DB_PATH || path.join(PROJECT_ROOT, 'epstein-archive-production.db');

const db = new Database(DB_PATH);

console.log('🗑️  Purging AI Analysis Data from Descriptions...');

// Get all images with AI Analysis in description
// We look for the standard prefix we added: "AI Analysis:"
// Or parts of it if we modified it in fix_titles.
// fix_titles.ts stripped the prefix "AI Analysis:" in some cases and left "Scene appears to be..."
// We need to be aggressive. 

const rows = db.prepare(`
    SELECT id, description 
    FROM media_images 
    WHERE description LIKE '%AI Analysis:%' 
       OR description LIKE '%Scene appears to be%'
       OR description LIKE '%Detected objects:%'
`).all() as any[];

console.log(`Found ${rows.length} images with AI metadata.`);

const updateStmt = db.prepare('UPDATE media_images SET description = ? WHERE id = ?');

let updated = 0;
for (const row of rows) {
    let desc = row.description;
    
    // logic to strip the AI part.
    // In analyze_media_ai.ts: newDesc = cleanOriginal ? `${cleanOriginal} ${aiBlurb}` : aiBlurb;
    // So the AI part is at the end.
    
    // Pattern 1: "AI Analysis:..."
    const aiIndex = desc.indexOf('AI Analysis:');
    if (aiIndex !== -1) {
        desc = desc.substring(0, aiIndex).trim();
    }
    
    // Pattern 2: "Scene appears to be..." (if fix_titles processed it)
    const sceneIndex = desc.indexOf('Scene appears to be');
    if (sceneIndex !== -1) {
        desc = desc.substring(0, sceneIndex).trim();
    }
    
    // Pattern 3: "Detected objects:" (fallback)
    const detIndex = desc.indexOf('Detected objects:');
    if (detIndex !== -1) {
        desc = desc.substring(0, detIndex).trim();
    }

    if (desc !== row.description) {
        // If desc is empty string now, ensure we set it to null or empty
        if (desc === '') desc = null; // or keep empty string? DB schema allows null?
        
        updateStmt.run(desc, row.id);
        updated++;
    }
}

console.log(`✅ purged AI data from ${updated} images.`);
