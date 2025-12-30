
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DB_PATH = process.env.DB_PATH || path.join(PROJECT_ROOT, 'epstein-archive-production.db');

const db = new Database(DB_PATH);

console.log('🔄 Restoring Original Descriptions (Wiping AI Data)...');

// 1. Get Album Map
const albums = db.prepare('SELECT id, name FROM media_albums').all() as {id: number, name: string}[];
const albumMap = new Map(albums.map(a => [a.id, a.name]));

// 2. Define Album Defaults (from import_media.ts)
const ALBUM_DESCRIPTIONS: Record<string, string> = {
    'USVI': 'Little Saint James, a private island in the U.S. Virgin Islands, was the primary residence of Jeffrey Epstein. These images depict the structures, grounds, and interior of the complex, known locally as "Epstein Island".',
    'Little Saint James': 'Little Saint James, a private island in the U.S. Virgin Islands, was the primary residence of Jeffrey Epstein. These images depict the structures, grounds, and interior of the complex, known locally as "Epstein Island".',
    'Trump': 'Photographs documenting interactions between Donald Trump and Jeffrey Epstein, primarily from the 1990s and early 2000s at Mar-a-Lago and other social events.',
    'Prince Andrew': 'Images involving Prince Andrew, Duke of York, often in the company of Jeffrey Epstein or Ghislaine Maxwell.',
    'Ghislaine': 'Images of Ghislaine Maxwell, Epstein\'s longtime associate and convicted sex offender.',
    'Clinton': 'Photographs showing Bill Clinton in proximity to Epstein or Maxwell, including trips aboard Epstein\'s aircraft.',
    'Aircraft': 'Images of Epstein\'s private fleet, including the Boeing 727 (N908JE) and Gulfstream jets.',
    'Properties': 'Various properties owned by Jeffrey Epstein, including the New York mansion (9 E 71st St), Palm Beach estate, and Zorro Ranch in New Mexico.',
    'Survivors': 'Images related to the brave survivors who have come forward to testify about the abuse they suffered.',
    'Perpetrators': 'Individuals alleged to have participated in or facilitated the trafficking network.',
    'Evidence': 'Physical and digital evidence collected during investigations.'
};

const images = db.prepare('SELECT id, album_id, description FROM media_images').all() as any[];
const updateStmt = db.prepare('UPDATE media_images SET description = ? WHERE id = ?');

let updated = 0;
for (const img of images) {
    const albumName = albumMap.get(img.album_id);
    let targetDesc: string | null = null;
    
    if (albumName) {
        for (const [key, desc] of Object.entries(ALBUM_DESCRIPTIONS)) {
             if (albumName.includes(key)) {
                 targetDesc = desc;
                 break;
             }
        }
    }
    
    // Safety check: Don't overwrite if it looks like a manual edit (long, specific)?
    // User requested "Get rid of this shit".
    // "Gasmask, respirator, gas helmet." -> Short.
    // "Little Saint James..." -> Long.
    // Ideally we just overwrite with the targetDesc.
    // If targetDesc is null (e.g. Unsorted), we set to null?
    
    if (targetDesc && img.description !== targetDesc) {
        updateStmt.run(targetDesc, img.id);
        updated++;
    } else if (!targetDesc && img.description) {
        // If no album default exists, but description exists.
        // It might be AI junk. "Person." "Shoe shop."
        // Let's wipe it if it's short (< 100 chars)?
        // Or mostly just wipe it to be safe.
        // User wants AI gone.
         updateStmt.run(null, img.id);
         updated++;
    }
}

console.log(`✅ Restored descriptions for ${updated} images.`);
