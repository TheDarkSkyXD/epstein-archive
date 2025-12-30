#!/usr/bin/env tsx
/**
 * Fix Original Document Links
 * 
 * This script:
 * 1. Fixes local macOS paths to server-relative paths
 * 2. Links OCR text documents to their original PDF files
 * 3. Populates original_file_path for text documents
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../epstein-archive.db');
const DRY_RUN = process.argv.includes('--dry-run');

const LOCAL_PATH_PREFIX = '/Users/veland/Downloads/Epstein Files/';

async function main() {
  console.log('\n🔗 Fix Original Document Links\n');
  console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN' : '✏️  LIVE MODE'}\n`);
  
  const db = new Database(DB_PATH);
  
  let stats = {
    pathsFixed: 0,
    pdfsLinked: 0,
    originalPathsSet: 0
  };
  
  try {
    if (!DRY_RUN) db.exec('BEGIN TRANSACTION');
    
    // Step 1: Fix local macOS paths to relative paths
    console.log('📁 Step 1: Fixing local paths...');
    const localPathDocs = db.prepare(`
      SELECT id, file_path FROM documents 
      WHERE file_path LIKE '/Users/%' OR file_path LIKE '/home/%'
    `).all() as { id: number; file_path: string }[];
    
    console.log(`   Found ${localPathDocs.length} docs with local paths`);
    
    for (const doc of localPathDocs) {
      let newPath = doc.file_path;
      
      // Remove local prefix
      if (newPath.startsWith(LOCAL_PATH_PREFIX)) {
        newPath = newPath.substring(LOCAL_PATH_PREFIX.length);
      } else if (newPath.includes('/data/')) {
        // Extract from /data/ onwards
        const dataIndex = newPath.indexOf('/data/');
        newPath = newPath.substring(dataIndex + 1); // Remove leading /
      }
      
      if (newPath !== doc.file_path && !DRY_RUN) {
        db.prepare('UPDATE documents SET file_path = ? WHERE id = ?').run(newPath, doc.id);
        stats.pathsFixed++;
      }
    }
    console.log(`   ✓ Fixed ${stats.pathsFixed} paths`);
    
    // Step 2: Build a map of PDF files by base name
    console.log('\n📄 Step 2: Building PDF lookup...');
    const pdfDocs = db.prepare(`
      SELECT id, file_name, file_path FROM documents 
      WHERE file_type = 'pdf' AND file_path LIKE 'data/originals/%'
    `).all() as { id: number; file_name: string; file_path: string }[];
    
    const pdfMap = new Map<string, { id: number; path: string }>();
    for (const pdf of pdfDocs) {
      // Create lookup by base name (without extension)
      const baseName = pdf.file_name.replace(/\.pdf$/i, '').toLowerCase();
      pdfMap.set(baseName, { id: pdf.id, path: pdf.file_path });
    }
    console.log(`   Found ${pdfMap.size} PDFs in data/originals/`);
    
    // Step 3: Link text/OCR documents to their original PDFs
    console.log('\n🔗 Step 3: Linking OCR texts to PDFs...');
    const textDocs = db.prepare(`
      SELECT id, file_name, file_path FROM documents 
      WHERE (file_type = 'txt' OR file_type = 'plain' OR file_type = 'rtf')
      AND (original_file_id IS NULL)
    `).all() as { id: number; file_name: string; file_path: string }[];
    
    console.log(`   Found ${textDocs.length} text docs without original links`);
    
    for (const doc of textDocs) {
      // Try to match by base name
      const baseName = doc.file_name
        .replace(/\.txt$/i, '')
        .replace(/\.rtf$/i, '')
        .replace(/\s*\(OCR\)$/i, '')
        .replace(/\s*\(ocr\)$/i, '')
        .toLowerCase()
        .trim();
      
      const match = pdfMap.get(baseName);
      if (match) {
        if (!DRY_RUN) {
          db.prepare(`
            UPDATE documents 
            SET original_file_id = ?, original_file_path = ? 
            WHERE id = ?
          `).run(match.id, match.path, doc.id);
        }
        stats.pdfsLinked++;
      }
    }
    console.log(`   ✓ Linked ${stats.pdfsLinked} text docs to PDFs`);
    
    // Step 4: For PDFs, set original_file_path to their own path
    console.log('\n📝 Step 4: Setting original_file_path for PDFs...');
    if (!DRY_RUN) {
      const result = db.prepare(`
        UPDATE documents 
        SET original_file_path = file_path 
        WHERE file_type = 'pdf' AND (original_file_path IS NULL OR original_file_path = '')
      `).run();
      stats.originalPathsSet = result.changes;
    }
    console.log(`   ✓ Set paths for ${stats.originalPathsSet} PDFs`);
    
    if (!DRY_RUN) {
      db.exec('COMMIT');
      console.log('\n✅ Changes committed');
    } else {
      console.log('\n🔍 DRY RUN - No changes made');
    }
    
    // Show summary
    console.log('\n📊 Summary:');
    console.log(`   Paths fixed: ${stats.pathsFixed}`);
    console.log(`   Text docs linked to PDFs: ${stats.pdfsLinked}`);
    console.log(`   PDFs with original_file_path: ${stats.originalPathsSet}`);
    
    // Show sample of linked docs
    console.log('\n📌 Sample Linked Documents:');
    const samples = db.prepare(`
      SELECT d.id, d.file_name, d.file_type, p.file_name as pdf_name
      FROM documents d
      JOIN documents p ON d.original_file_id = p.id
      LIMIT 5
    `).all() as { id: number; file_name: string; file_type: string; pdf_name: string }[];
    
    samples.forEach(s => {
      console.log(`   ${s.file_name} (${s.file_type}) → ${s.pdf_name}`);
    });
    
  } catch (error) {
    if (!DRY_RUN) db.exec('ROLLBACK');
    throw error;
  } finally {
    db.close();
  }
}

main().catch(console.error);
