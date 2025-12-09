#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// Mapping of text files to their corresponding PDF originals
const FILE_MAPPING = {
  'Birthday Book The First Fifty Years.txt': 'Jeffrey Epstein\'s Black Book.pdf',
  'Jeffrey Epstein\'s Black Book (OCR).txt': 'Jeffrey Epstein\'s Black Book.pdf',
  'Virgina Gieuffre Deposition exhbit-6 (ocr).txt': 'exhbit-6.pdf',
  'Virigina Giueffre Deposition exhibit-1 (OCR).txt': 'exhibit-1.pdf',
  'jeffery_epstein_records_4_2 (OCR).txt': 'jeffery_epstein_records_4_2.pdf',
  'katie-johnson-testimony-2016-Nov-5.txt': 'katie-johnson.pdf'
};

// Database path
const DB_PATH = path.join(process.cwd(), 'epstein-archive.db');

function main() {
  console.log('🔍 Linking textual versions to original PDF files...\n');
  
  const db = new Database(DB_PATH);
  
  try {
    // Get all documents that match our text files
    const textDocumentsStmt = db.prepare(`
      SELECT id, file_name, file_path, title 
      FROM documents 
      WHERE file_path LIKE '%/data/text/%' 
      AND (file_name LIKE '%Black Book%' 
           OR file_name LIKE '%exhbit-6%' 
           OR file_name LIKE '%exhibit-1%' 
           OR file_name LIKE '%jeffery_epstein_records%'
           OR file_name LIKE '%katie-johnson%')
    `);
    
    const textDocuments = textDocumentsStmt.all();
    console.log(`📄 Found ${textDocuments.length} text documents to link\n`);
    
    // Get all existing media items to avoid duplicates
    const existingMediaStmt = db.prepare('SELECT document_id, file_path FROM media_items');
    const existingMedia = existingMediaStmt.all();
    const existingMediaPaths = new Set(existingMedia.map(m => m.file_path));
    const existingMediaDocIds = new Set(existingMedia.map(m => m.document_id));
    
    // Process each text document
    for (const doc of textDocuments) {
      const textFileName = doc.file_name;
      const originalPdfName = FILE_MAPPING[textFileName];
      
      if (!originalPdfName) {
        console.log(`⚠️  No mapping found for: ${textFileName}`);
        continue;
      }
      
      // Construct the path to the original PDF
      const originalPath = path.join('/Users/veland/Downloads/Epstein Files/data/originals', originalPdfName);
      
      // Check if file exists
      if (!fs.existsSync(originalPath)) {
        console.log(`❌ Original file not found: ${originalPath}`);
        continue;
      }
      
      // Skip if already linked
      if (existingMediaDocIds.has(doc.id) || existingMediaPaths.has(originalPath)) {
        console.log(`🔗 Already linked: ${textFileName} → ${originalPdfName}`);
        continue;
      }
      
      // Get file stats for metadata
      const stats = fs.statSync(originalPath);
      
      // Insert media item linking the text document to the original PDF
      const insertStmt = db.prepare(`
        INSERT INTO media_items (
          entity_id, document_id, file_path, file_type, title, description,
          verification_status, spice_rating, metadata_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `);
      
      // Try to find associated entity for this document
      const entityStmt = db.prepare(`
        SELECT entity_id 
        FROM entity_mentions 
        WHERE document_id = ? 
        LIMIT 1
      `);
      
      const entityResult = entityStmt.get(doc.id);
      const entityId = entityResult ? entityResult.entity_id : null;
      
      // Extract metadata
      const metadata = {
        fileSize: stats.size,
        originalFileName: originalPdfName,
        textFileName: textFileName,
        linkedAt: new Date().toISOString()
      };
      
      const result = insertStmt.run(
        entityId, // entity_id
        doc.id, // document_id
        originalPath, // file_path
        'application/pdf', // file_type
        originalPdfName.replace('.pdf', ''), // title
        `Original PDF version of ${textFileName}`, // description
        'verified', // verification_status
        5, // spice_rating (highest)
        JSON.stringify(metadata), // metadata_json
      );
      
      console.log(`✅ Linked: ${textFileName} → ${originalPdfName} (Media ID: ${result.lastInsertRowid})`);
    }
    
    // Also add any PDF originals that aren't linked to text files
    const originalsDir = '/Users/veland/Downloads/Epstein Files/data/originals';
    const originalFiles = fs.readdirSync(originalsDir).filter(f => f.endsWith('.pdf'));
    
    console.log(`\n📂 Processing ${originalFiles.length} PDF originals...\n`);
    
    for (const pdfFile of originalFiles) {
      const pdfPath = path.join(originalsDir, pdfFile);
      
      // Skip if already in media_items
      if (existingMediaPaths.has(pdfPath)) {
        console.log(`🔗 Already exists: ${pdfFile}`);
        continue;
      }
      
      // Get file stats
      const stats = fs.statSync(pdfPath);
      
      // Insert as standalone media item
      const insertStmt = db.prepare(`
        INSERT INTO media_items (
          entity_id, document_id, file_path, file_type, title, description,
          verification_status, spice_rating, metadata_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `);
      
      const metadata = {
        fileSize: stats.size,
        originalFileName: pdfFile,
        linkedAt: new Date().toISOString()
      };
      
      const result = insertStmt.run(
        null, // entity_id (no specific entity)
        null, // document_id (no linked document)
        pdfPath, // file_path
        'application/pdf', // file_type
        pdfFile.replace('.pdf', ''), // title
        `Original PDF document: ${pdfFile}`, // description
        'verified', // verification_status
        4, // spice_rating
        JSON.stringify(metadata), // metadata_json
      );
      
      console.log(`✅ Added standalone: ${pdfFile} (Media ID: ${result.lastInsertRowid})`);
    }
    
    console.log('\n✅ Linking complete!\n');
    
  } catch (error) {
    console.error('❌ Error linking files:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

main();