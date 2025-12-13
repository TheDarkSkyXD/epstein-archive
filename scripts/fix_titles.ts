
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DB_PATH = path.join(PROJECT_ROOT, 'epstein-archive-production.db');

const db = new Database(DB_PATH);

console.log('Refining AI Titles & Descriptions...');

const BLACKLIST_PHRASES = [
  'Shoe shop, shoe-shop, shoe store',
  'Tobacco shop, tobacconist shop, tobacconist',
  'Confectionery, confectionery shop, candy store',
  'Person',
  'Groom, bridegroom',
  'Hoopskirt, crinoline',
  'Vestment',
  'Dungeness crab, Cancer magister',
  'Apiary, bee house',
  'Plunger, plumber\'s helper',
  'Pickelhaube', // Random specific helmet often hallucinated
  'Web site, website, internet site, site'
];

// Select ALL images to check against blacklist (safer)
// or check for AI style punctuation "Scene..." or "Detected objects..." OR the blacklist via SQL? 
// SQL LIKE with OR is messy for many phrases. Let's just grab them all - 238 isn't many.
const images = db.prepare(`SELECT id, title, description FROM media_images WHERE description IS NOT NULL`).all() as any[];

const updateStmt = db.prepare('UPDATE media_images SET title = ?, description = ? WHERE id = ?');

let updated = 0;
for (const img of images) {
    let desc = img.description;
    let title = img.title;
    
    // 1. Clean Description to Natural Language
    // Remove robotic prefixes
    let cleanDesc = desc
        .replace(/AI Analysis:\s*/g, '')
        .replace(/Scene appears to be\s*/g, '')
        .replace(/Scene:\s*/g, '')
        .replace(/Detected objects:\s*/g, '')
        .replace(/Detected objects:\s*/g, '')
        .trim();

    // Filter Blacklist Phrases
    for (const phrase of BLACKLIST_PHRASES) {
        const regex = new RegExp(phrase.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
        cleanDesc = cleanDesc.replace(regex, '');
    }

    // Prepare cleanup of punctuation left behind (e.g. "..")
    cleanDesc = cleanDesc
        .replace(/\.\s*\./g, '.') // double dots
        .replace(/^\.\s*/, '')    // leading dot
        .replace(/\s+/, ' ')      // multiple spaces
        .trim();
    
    if (cleanDesc === '.') cleanDesc = '';
    
    // Fix capitalization for sentences
    // "seashore. boat, person." -> "Seashore. Boat, person."
    cleanDesc = cleanDesc.replace(/(^\w|\.\s+\w)/g, (letter: string) => letter.toUpperCase());

    // Update description to cleaned version
    desc = cleanDesc;

    // 2. Extract Scene for Title
    // Now desc starts with the Scene name usually.
    // e.g. "Seashore. Boat..."
    // Match up to first dot or comma
    const match = desc.match(/^([^.,]+)/);
    let newTitleCandidate = match ? match[1].trim() : null;

    if (newTitleCandidate) {
        newTitleCandidate = newTitleCandidate.charAt(0).toUpperCase() + newTitleCandidate.slice(1);
        
        const isUSVI = title.startsWith('Little Saint James');
        // Check for generic titles (including UUIDs which are lengthy alphanumeric, or simple IMG/Photo)
        const isGeneric = /^(IMG|DSC|DJI|image|picture)/i.test(title) || 
                          /Photo \d+$/.test(title) ||
                          title.length > 30 && !title.includes(' '); // UUID-like

        if (!isUSVI && isGeneric) {
             title = newTitleCandidate;
        }
    }
    
    if (title !== img.title || desc !== img.description) {
        updateStmt.run(title, desc, img.id);
        updated++;
    }
}

console.log(`Updated ${updated} images with refined metadata.`);
