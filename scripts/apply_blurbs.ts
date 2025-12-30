
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DB_PATH = path.join(PROJECT_ROOT, 'epstein-archive-production.db');

const db = new Database(DB_PATH);

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

console.log('Applying Contextual Blurbs...');

const images = db.prepare(`
    SELECT i.id, i.description, a.name as albumName 
    FROM media_images i
    LEFT JOIN media_albums a ON i.album_id = a.id
`).all() as any[];

let updated = 0;

const updateStmt = db.prepare('UPDATE media_images SET description = ? WHERE id = ?');

for (const img of images) {
    let blurb = null;
    if (!img.albumName) continue;

    for (const [key, desc] of Object.entries(ALBUM_DESCRIPTIONS)) {
        if (img.albumName.includes(key)) {
            blurb = desc;
            break;
        }
    }

    if (blurb) {
        let currentDesc = img.description || '';
        
        // Avoid duplication
        if (currentDesc.includes(blurb)) continue;

        // Prepend blurb
        // If currentDesc exists (e.g. AI analysis), add space
        // If currentDesc is just AI, it usually starts with "AI Analysis:"
        
        let newDesc = blurb;
        if (currentDesc) {
            newDesc = `${blurb}\n\n${currentDesc}`;
        }

        updateStmt.run(newDesc, img.id);
        updated++;
    }
}

console.log(`Updated ${updated} images with contextual blurbs.`);
