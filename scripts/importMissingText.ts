import fs from 'fs';
import path from 'path';
import { DatabaseService } from '../src/services/DatabaseService';
import crypto from 'crypto';

const DATA_DIR = path.resolve(process.cwd(), '../data/text');
const dbService = DatabaseService.getInstance();
const db = dbService.getDatabase();

async function importMissingFiles() {
  console.log(`Scanning ${DATA_DIR} for missing files...`);
  
  if (!fs.existsSync(DATA_DIR)) {
    console.error(`Directory not found: ${DATA_DIR}`);
    return;
  }

  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.txt') || f.endsWith('.rtf'));
  console.log(`Found ${files.length} files.`);

  let importedCount = 0;

  const insertStmt = db.prepare(`
    INSERT INTO documents (
      file_name, title, file_path, file_type, file_size, 
      date_created, date_modified, content, metadata_json, 
      word_count, spice_rating, content_hash, evidence_type
    ) VALUES (
      @file_name, @title, @file_path, @file_type, @file_size, 
      @date_created, @date_modified, @content, @metadata_json, 
      @word_count, @spice_rating, @content_hash, @evidence_type
    )
  `);

  const checkStmt = db.prepare('SELECT id FROM documents WHERE title = ? OR file_name = ?');

  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    const stats = fs.statSync(filePath);
    
    // Check if already exists
    const existing = checkStmt.get(file, file);
    if (existing) {
      console.log(`Skipping ${file} (already exists)`);
      continue;
    }

    console.log(`Importing ${file}...`);
    const content = fs.readFileSync(filePath, 'utf-8');
    const wordCount = content.split(/\s+/).length;
    const contentHash = crypto.createHash('md5').update(content).digest('hex');

    try {
      insertStmt.run({
        file_name: file,
        title: file,
        file_path: filePath,
        file_type: path.extname(file).substring(1),
        file_size: stats.size,
        date_created: stats.birthtime.toISOString(),
        date_modified: stats.mtime.toISOString(),
        content: content,
        metadata_json: JSON.stringify({
          category: 'Key Document',
          original_filename: file,
          import_source: 'manual_script'
        }),
        word_count: wordCount,
        spice_rating: 1,
        content_hash: contentHash,
        evidence_type: 'document'
      });
      importedCount++;
    } catch (err) {
      console.error(`Failed to import ${file}:`, err);
    }
  }

  console.log(`Import complete. Imported ${importedCount} new files.`);
  
  // Verify Birthday Book specifically
  const bb = db.prepare("SELECT id, title FROM documents WHERE title LIKE '%Birthday Book%'").get();
  if (bb) {
    console.log(`✅ Verified: Birthday Book is in database (ID: ${(bb as any).id})`);
  } else {
    console.error(`❌ Warning: Birthday Book still not found in database!`);
  }
}

importMissingFiles().catch(console.error);
