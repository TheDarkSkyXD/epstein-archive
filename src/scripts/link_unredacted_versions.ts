
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DB_PATH = process.env.DB_PATH || 'epstein-archive.db';

function linkUnredactedVersions() {
  console.log('🔗 Linking Unredacted Versions...');
  const db = new Database(DB_PATH);

  // 1. Reset links (for idempotency)
  db.prepare('UPDATE documents SET unredacted_version_id = NULL, is_unredacted_version = 0').run();

  // 2. Identify explicit "Unsealed" / "Unredacted" documents
  const unredactedDocs = db.prepare(`
    SELECT id, title, file_name, content 
    FROM documents 
    WHERE (title LIKE '%Unsealed%' OR title LIKE '%Unredacted%' OR file_name LIKE '%Unsealed%' OR file_name LIKE '%Unredacted%')
  `).all() as any[];

  console.log(`📋 Found ${unredactedDocs.length} explicitly unredacted documents.`);

  // Mark them as such
  const markUnredacted = db.prepare('UPDATE documents SET is_unredacted_version = 1 WHERE id = ?');
  let markedCount = 0;
  
  for (const doc of unredactedDocs) {
    markUnredacted.run(doc.id);
    markedCount++;
  }
  console.log(`✅ Marked ${markedCount} documents as unredacted versions.`);

  // 3. Find matches based on filename patterns
  // Pattern A: "Exhibit 1" matching "Exhibit 1 Unsealed"
  // Pattern B: "Epstein Flight Logs" matching "Epstein Flight Logs Unredacted"
  let linkedCount = 0;
  const updateLink = db.prepare('UPDATE documents SET unredacted_version_id = ? WHERE id = ?');
  
  for (const unredacted of unredactedDocs) {
    // Generate potential redacted filenames/titles
    // e.g. "Exhibit 1 Unsealed.pdf" -> "Exhibit 1.pdf"
    
    const baseName = unredacted.file_name
      .replace(/[\-_]Unsealed/i, '')
      .replace(/[\-_]Unredacted/i, '')
      .replace(/\.pdf$/i, '');
      
    // Search for the "Redacted" or "Base" version
    // We look for documents that contain the base name but are NOT the unredacted one
    const candidates = db.prepare(`
      SELECT id, title, file_name 
      FROM documents 
      WHERE LOWER(file_name) LIKE LOWER(?) 
      AND id != ? 
      AND (is_unredacted_version = 0 OR is_unredacted_version IS NULL)
    `).all(`%${baseName}%`, unredacted.id) as any[];

    // Heuristic: If we find a candidate that looks like the "Redacted" counterpart
    for (const candidate of candidates) {
        // Validation: Ensure the candidate is statistically smaller or has "Redacted" in name? 
        // Or just trust the naming convention match.
        
        // Check 1: Name Similarity
        // If unredacted is "Exhibit_1_Unsealed.pdf" and candidate is "Exhibit_1.pdf", specific match.
        
        console.log(`   🔗 Linking: [${candidate.file_name}] -> [${unredacted.file_name}]`);
        updateLink.run(unredacted.id, candidate.id);
        linkedCount++;
    }
  }

  console.log(`🎉 Linked ${linkedCount} redacted documents to their unredacted versions.`);
  db.close();
}

linkUnredactedVersions();
