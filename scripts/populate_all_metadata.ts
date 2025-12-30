#!/usr/bin/env tsx
/**
 * Complete Data Population Script
 * 
 * Populates all missing metadata fields for documents and entities:
 * - source_collection: Derived from file paths
 * - credibility_score: Based on source reliability
 * - entity mentions counts: Calculated from entity_mentions table
 * - OCR metadata: Inferred where possible
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../epstein-archive-production.db');
const DRY_RUN = process.argv.includes('--dry-run');

// Source collection mapping based on file paths
const SOURCE_MAPPINGS: Array<{ pattern: RegExp; collection: string; credibility: number }> = [
  // Official Government Documents
  { pattern: /House.?Oversight/i, collection: 'House Oversight Committee', credibility: 0.95 },
  { pattern: /DOJ|Department.?of.?Justice/i, collection: 'Department of Justice', credibility: 0.95 },
  { pattern: /FBI/i, collection: 'FBI Files', credibility: 0.95 },
  { pattern: /SDNY|Southern.?District/i, collection: 'Southern District of NY', credibility: 0.95 },
  { pattern: /Palm.?Beach/i, collection: 'Palm Beach County', credibility: 0.9 },
  { pattern: /USVI|Virgin.?Islands/i, collection: 'US Virgin Islands', credibility: 0.9 },
  
  // Legal Proceedings
  { pattern: /deposition/i, collection: 'Legal Depositions', credibility: 0.85 },
  { pattern: /court|lawsuit|case/i, collection: 'Court Documents', credibility: 0.85 },
  { pattern: /indictment/i, collection: 'Indictments', credibility: 0.9 },
  { pattern: /affidavit/i, collection: 'Affidavits', credibility: 0.8 },
  { pattern: /testimony/i, collection: 'Witness Testimony', credibility: 0.8 },
  
  // Known Document Collections
  { pattern: /Giuffre/i, collection: 'Giuffre v. Maxwell', credibility: 0.85 },
  { pattern: /Maxwell/i, collection: 'Maxwell Case Files', credibility: 0.85 },
  { pattern: /Black.?Book/i, collection: 'Black Book', credibility: 0.7 },
  { pattern: /flight.?log/i, collection: 'Flight Logs', credibility: 0.9 },
  
  // Epstein Yahoo Emails (already tagged)
  { pattern: /Yahoo|email.*epstein/i, collection: 'Jeffrey Epstein Yahoo', credibility: 0.75 },
  { pattern: /Ehud.?Barak|Barak.?Email/i, collection: 'Ehud Barak Emails', credibility: 0.75 },
  
  // Media & Articles
  { pattern: /article|news|media/i, collection: 'Media Articles', credibility: 0.6 },
  { pattern: /photo|image|img/i, collection: 'Photographs', credibility: 0.7 },
  
  // OCR/Processed Documents
  { pattern: /ocr_clean|text\//i, collection: 'OCR Processed Documents', credibility: 0.7 },
  { pattern: /originals?/i, collection: 'Original Documents', credibility: 0.8 },
  
  // Fallback
  { pattern: /.*/, collection: 'Epstein Files Archive', credibility: 0.6 },
];

// Evidence type mapping based on file names and paths
const EVIDENCE_TYPE_MAPPINGS: Array<{ pattern: RegExp; type: string }> = [
  { pattern: /email/i, type: 'email' },
  { pattern: /flight.?log|passenger/i, type: 'flight_log' },
  { pattern: /deposition|testimony/i, type: 'testimony' },
  { pattern: /court|legal|lawsuit|case/i, type: 'legal' },
  { pattern: /financial|bank|transaction|wire/i, type: 'financial' },
  { pattern: /photo|image|jpg|png/i, type: 'photo' },
  { pattern: /article|news/i, type: 'article' },
  { pattern: /black.?book|address/i, type: 'black_book' },
  { pattern: /message|sms|text/i, type: 'message' },
];

interface DocumentRow {
  id: number;
  file_path: string;
  file_name: string;
  source_collection: string | null;
  credibility_score: number | null;
  evidence_type: string | null;
}

function determineSourceCollection(filePath: string, fileName: string): { collection: string; credibility: number } {
  const fullPath = `${filePath}/${fileName}`.toLowerCase();
  
  for (const mapping of SOURCE_MAPPINGS) {
    if (mapping.pattern.test(fullPath)) {
      return { collection: mapping.collection, credibility: mapping.credibility };
    }
  }
  
  return { collection: 'Epstein Files Archive', credibility: 0.6 };
}

function determineEvidenceType(filePath: string, fileName: string, currentType: string | null): string {
  if (currentType && currentType !== 'document' && currentType !== '') {
    return currentType; // Keep existing specific types
  }
  
  const fullPath = `${filePath}/${fileName}`.toLowerCase();
  
  for (const mapping of EVIDENCE_TYPE_MAPPINGS) {
    if (mapping.pattern.test(fullPath)) {
      return mapping.type;
    }
  }
  
  return currentType || 'document';
}

function main() {
  const db = new Database(DB_PATH);
  
  console.log(`\n📊 Complete Data Population Script\n`);
  console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN' : '✏️  LIVE MODE'}\n`);
  
  // Get current stats
  const stats = {
    docsWithoutSource: db.prepare("SELECT COUNT(*) as c FROM documents WHERE source_collection IS NULL OR source_collection = ''").get() as { c: number },
    docsWithoutCredibility: db.prepare("SELECT COUNT(*) as c FROM documents WHERE credibility_score IS NULL").get() as { c: number },
    entitiesWithoutMentions: db.prepare("SELECT COUNT(*) as c FROM entities WHERE mentions IS NULL OR mentions = 0").get() as { c: number },
  };
  
  console.log('📈 Current Data Gaps:');
  console.log(`   Documents without source_collection: ${stats.docsWithoutSource.c}`);
  console.log(`   Documents without credibility_score: ${stats.docsWithoutCredibility.c}`);
  console.log(`   Entities without mentions: ${stats.entitiesWithoutMentions.c}`);
  console.log('');
  
  // ========== STEP 1: Populate source_collection and credibility_score ==========
  console.log('🔄 Step 1: Populating source_collection and credibility_score...');
  
  const docsToUpdate = db.prepare(`
    SELECT id, file_path, file_name, source_collection, credibility_score, evidence_type
    FROM documents
    WHERE source_collection IS NULL OR source_collection = '' OR credibility_score IS NULL
  `).all() as DocumentRow[];
  
  console.log(`   Found ${docsToUpdate.length} documents to update`);
  
  if (!DRY_RUN && docsToUpdate.length > 0) {
    const updateStmt = db.prepare(`
      UPDATE documents 
      SET source_collection = @source_collection,
          credibility_score = @credibility_score,
          evidence_type = @evidence_type
      WHERE id = @id
    `);
    
    db.exec('BEGIN TRANSACTION');
    try {
      let updated = 0;
      const collectionCounts: Record<string, number> = {};
      
      for (const doc of docsToUpdate) {
        const { collection, credibility } = determineSourceCollection(doc.file_path, doc.file_name);
        const evidenceType = determineEvidenceType(doc.file_path, doc.file_name, doc.evidence_type);
        
        updateStmt.run({
          id: doc.id,
          source_collection: doc.source_collection || collection,
          credibility_score: doc.credibility_score ?? credibility,
          evidence_type: evidenceType
        });
        
        collectionCounts[collection] = (collectionCounts[collection] || 0) + 1;
        updated++;
        
        if (updated % 10000 === 0) {
          console.log(`   Updated ${updated}/${docsToUpdate.length}...`);
        }
      }
      
      db.exec('COMMIT');
      console.log(`   ✅ Updated ${updated} documents\n`);
      
      console.log('   📊 Collection Distribution:');
      Object.entries(collectionCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([name, count]) => console.log(`      ${name}: ${count}`));
      console.log('');
      
    } catch (error) {
      db.exec('ROLLBACK');
      console.error('   ❌ Error:', error);
      throw error;
    }
  }
  
  // ========== STEP 2: Update entity mention counts ==========
  console.log('🔄 Step 2: Updating entity mention counts...');
  
  if (!DRY_RUN) {
    const updateMentions = db.prepare(`
      UPDATE entities 
      SET mentions = (
        SELECT COUNT(*) FROM entity_mentions WHERE entity_id = entities.id
      )
      WHERE mentions IS NULL OR mentions = 0
    `);
    
    const result = updateMentions.run();
    console.log(`   ✅ Updated ${result.changes} entity mention counts\n`);
  }
  
  // ========== STEP 3: Calculate document_count for entities ==========
  console.log('🔄 Step 3: Setting document_count for entities...');
  
  if (!DRY_RUN) {
    const updateDocCount = db.prepare(`
      UPDATE entities 
      SET document_count = (
        SELECT COUNT(DISTINCT em.document_id) 
        FROM entity_mentions em 
        WHERE em.entity_id = entities.id
      )
      WHERE document_count IS NULL OR document_count = 0
    `);
    
    const result = updateDocCount.run();
    console.log(`   ✅ Updated ${result.changes} entity document counts\n`);
  }
  
  // ========== STEP 4: Mark OCR-processed documents ==========
  console.log('🔄 Step 4: Marking OCR-processed documents...');
  
  if (!DRY_RUN) {
    // Mark documents from ocr_clean as OCR processed
    const markOcr = db.prepare(`
      UPDATE documents 
      SET ocr_engine = 'tesseract',
          ocr_quality_score = 0.75
      WHERE ocr_engine IS NULL 
        AND (file_path LIKE '%ocr_clean%' OR file_path LIKE '%/text/%')
        AND file_type IN ('txt', 'text', 'rtf')
    `);
    
    const result = markOcr.run();
    console.log(`   ✅ Marked ${result.changes} documents as OCR processed\n`);
  }
  
  // ========== FINAL STATS ==========
  console.log('📊 Final Statistics:');
  
  const finalStats = {
    docsWithSource: db.prepare("SELECT COUNT(*) as c FROM documents WHERE source_collection IS NOT NULL AND source_collection != ''").get() as { c: number },
    docsWithCredibility: db.prepare("SELECT COUNT(*) as c FROM documents WHERE credibility_score IS NOT NULL").get() as { c: number },
    entitiesWithMentions: db.prepare("SELECT COUNT(*) as c FROM entities WHERE mentions > 0").get() as { c: number },
    totalDocs: db.prepare("SELECT COUNT(*) as c FROM documents").get() as { c: number },
  };
  
  console.log(`   Documents with source_collection: ${finalStats.docsWithSource.c}/${finalStats.totalDocs.c} (${Math.round(finalStats.docsWithSource.c / finalStats.totalDocs.c * 100)}%)`);
  console.log(`   Documents with credibility_score: ${finalStats.docsWithCredibility.c}/${finalStats.totalDocs.c} (${Math.round(finalStats.docsWithCredibility.c / finalStats.totalDocs.c * 100)}%)`);
  console.log(`   Entities with mention counts: ${finalStats.entitiesWithMentions.c}`);
  
  if (DRY_RUN) {
    console.log(`\n📋 Dry run complete. Run without --dry-run to apply changes.`);
  } else {
    console.log(`\n✅ Data population complete!`);
  }
  
  db.close();
}

main();
