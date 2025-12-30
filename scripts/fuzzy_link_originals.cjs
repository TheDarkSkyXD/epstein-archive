
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const db = new Database('epstein-archive.db');
const ORIGINALS_DIR = 'data/originals';

// Recursively get all files in a directory
function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      arrayOfFiles.push(path.join(dirPath, file));
    }
  });

  return arrayOfFiles;
}

console.log('Building index of original files...');
const originalFiles = getAllFiles(ORIGINALS_DIR);
const originalFileMap = new Map();

originalFiles.forEach(file => {
    const basename = path.basename(file).toLowerCase();
    const nameWithoutExt = basename.slice(0, -path.extname(file).length);
    originalFileMap.set(nameWithoutExt, file);
});

console.log(`Found ${originalFileMap.size} unique original file basenames.`);

const documents = db.prepare("SELECT id, file_name, file_path, original_file_path FROM documents WHERE original_file_path IS NULL OR original_file_path = ''").all();
const updateStmt = db.prepare('UPDATE documents SET original_file_path = ? WHERE id = ?');

console.log(`Auditing ${documents.length} documents for fuzzy linking...`);

let linkedCount = 0;

db.transaction(() => {
    for (const doc of documents) {
        if (!doc.file_name) continue;
        
        let targetName = doc.file_name.toLowerCase();
        // Remove (OCR).txt and .txt
        targetName = targetName.replace(/\(ocr\)\.txt$/i, '').replace(/\.txt$/i, '').trim();
        
        // Exact match check
        let match = originalFileMap.get(targetName);
        
        // Pattern match check: "HOUSE_OVERSIGHT_010477" -> search for 010477
        if (!match && targetName.startsWith('house_oversight_')) {
            const num = targetName.replace('house_oversight_', '');
            // Look for any file containing that number
            for (const [name, path] of originalFileMap.entries()) {
                if (name.includes(num)) {
                    match = path;
                    break;
                }
            }
        }
        
        if (match) {
            updateStmt.run(match, doc.id);
            linkedCount++;
        }
    }
})();

console.log(`Successfully linked ${linkedCount} documents to originals.`);
db.close();
