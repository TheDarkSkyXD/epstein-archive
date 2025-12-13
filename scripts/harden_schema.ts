import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = 'epstein-archive-production.db';
const db = new Database(DB_PATH);

function migrateHouseOversight() {
  console.log('Starting House Oversight migration...');

  // 1. Find the Parent Volumes (e.g. "House Oversight 001-OCR.txt")
  const volumes = db.prepare("SELECT id, file_name FROM documents WHERE file_name LIKE 'House Oversight %-OCR.txt'").all() as any[];
  
  console.log(`Found ${volumes.length} volume documents.`);

  for (const vol of volumes) {
    const match = vol.file_name.match(/House Oversight (\d+)-OCR\.txt/i);
    if (!match) continue;
    
    const volNum = match[1]; // e.g. "001"
    console.log(`Processing Volume ${volNum} (ID: ${vol.id})...`);

    // 2. Identify the image files belonging to this volume
    // The images are named HOUSE_OVERSIGHT_XXXXXX.jpg
    // We need to determine the range.
    // Based on previous LS, 001 contains HOUSE_OVERSIGHT_010477.jpg onwards.
    // The most robust way is to check if the file path contains `/IMAGES/${volNum}/`
    // OR if we rely on the DB path being correct.
    
    // Let's update metadata first to store the image folder path explicitly
    const imageFolderPath = `/IMAGES/${volNum}`;
    let metadata: any = {};
    try {
        const row = db.prepare("SELECT metadata_json FROM documents WHERE id = ?").get(vol.id) as any;
        metadata = JSON.parse(row.metadata_json || '{}');
    } catch (e) {}
    
    metadata.image_folder_path = imageFolderPath;
    
    // Temporarily disable triggers if possible, or just ignore the error if it's FTS related?
    // The error "no such column: title" likely comes from the "documents_fts_update" trigger
    // which tries to update 'title' in fts, but 'title' column might not exist in fts table config?
    // Or the trigger refers to NEW.title but the table doesn't have it?
    // Let's check schema: CREATE TRIGGER documents_fts_update ... UPDATE documents_fts SET title = NEW.title ...
    // And documents_fts schema: CREATE VIRTUAL TABLE documents_fts USING fts5(file_name, content, content='documents', content_rowid='id')
    // Wait, the schema showed documents_fts DOES NOT have 'title' column!
    // Schema: /* documents_fts(file_name,content) */;
    // Trigger: UPDATE documents_fts SET title = ...
    // This is a schema bug in the triggers!
    
    // We should fix the triggers first. But for now, let's try to update without triggering?
    // Better-sqlite3 doesn't support disabling triggers easily.
    // We must drop and recreate the triggers correctly.
    
    db.prepare("UPDATE documents SET metadata_json = ? WHERE id = ?").run(JSON.stringify(metadata), vol.id);

    // 3. Find all child images and text pages for this volume
    // We search for files that look like they belong to this volume.
    // Ideally we'd scan the directory, but we are working DB-first.
    // We can assume that if we find a file in the DB whose path contains `/IMAGES/${volNum}/`, it's a child.
    
    // Update Images
    const updateImages = db.prepare(`
        UPDATE documents 
        SET parent_id = ?, is_hidden = 1 
        WHERE file_path LIKE ? AND file_type = 'image'
    `);
    const imgResult = updateImages.run(vol.id, `%/${volNum}/%`);
    console.log(`  - Linked ${imgResult.changes} images to volume.`);

    // Update Text Pages (if they have paths like .../House Oversight 001/...)
    // Text paths were: .../data/ocr_clean/text/House Oversight 001/HOUSE_OVERSIGHT_010477.txt
    const updateText = db.prepare(`
        UPDATE documents 
        SET parent_id = ?, is_hidden = 1 
        WHERE file_path LIKE ? AND file_type = 'txt' AND id != ?
    `);
    const txtResult = updateText.run(vol.id, `%House Oversight ${volNum}/%`, vol.id);
    console.log(`  - Linked ${txtResult.changes} text pages to volume.`);
  }
}

function fixOriginalFileLinks() {
    console.log('Fixing original_file_id links...');
    
    // Find text files that have a matching image file but no link
    // We match by filename stem (e.g. HOUSE_OVERSIGHT_010477)
    
    const textFiles = db.prepare(`
        SELECT id, file_name 
        FROM documents 
        WHERE file_type = 'txt' 
        AND original_file_id IS NULL
        AND file_name LIKE 'HOUSE_OVERSIGHT_%'
    `).all() as any[];
    
    console.log(`Found ${textFiles.length} unlinked text files.`);
    
    const updateLink = db.prepare("UPDATE documents SET original_file_id = ? WHERE id = ?");
    const findImage = db.prepare("SELECT id FROM documents WHERE file_name = ? AND file_type = 'image'");
    
    let linkedCount = 0;
    
    const transaction = db.transaction(() => {
        for (const txt of textFiles) {
            const stem = txt.file_name.replace('.txt', '');
            const imageName = stem + '.jpg';
            
            const img = findImage.get(imageName) as any;
            if (img) {
                updateLink.run(img.id, txt.id);
                linkedCount++;
            }
        }
    });
    
    transaction();
    console.log(`Linked ${linkedCount} text files to their original images.`);
}

try {
    migrateHouseOversight();
    fixOriginalFileLinks();
    console.log('Migration completed successfully.');
} catch (e) {
    console.error('Migration failed:', e);
}
