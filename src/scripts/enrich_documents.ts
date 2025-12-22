#!/usr/bin/env tsx
/**
 * Document Enrichment Script
 * 
 * This script:
 * 1. Links OCR documents with their original PDFs
 * 2. Enriches metadata (evidence types, file paths)
 * 3. Recomputes entity mentions in documents
 * 4. Updates relationships based on co-mentions
 */

import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

const DB_PATH = './epstein-archive.db';
const ORIGINALS_DIR = './data/originals';
const OCR_DIR = './data/ocr_clean/text';
const TEXT_DIR = './data/text';

console.log('📄 Document Enrichment Script');
console.log('=============================\n');

// Open database
const db = new Database(DB_PATH);

// ============================================
// 1. Link OCR Documents with Original PDFs
// ============================================
console.log('🔗 Phase 1: Linking OCR documents with originals...\n');

// Get all original PDFs
const originalPdfs = fs.existsSync(ORIGINALS_DIR) 
  ? fs.readdirSync(ORIGINALS_DIR).filter(f => f.endsWith('.pdf'))
  : [];

console.log(`Found ${originalPdfs.length} original PDFs in ${ORIGINALS_DIR}`);

// Create mapping from OCR filename patterns to original files
const ocrToOriginalMap: Record<string, string> = {
  "Jeffrey Epstein's Black Book (OCR).txt": "Jeffrey Epstein's Black Book.pdf",
  "Birthday Book The First Fifty Years.txt": "Birthday Book The First Fifty Years.pdf",
  "Evidence List (OCR).txt": "Evidence List.pdf",
  "Virginia Gieuffre Deposition exhbit-6 (ocr).txt": "exhbit-6.pdf",
  "Virigina Giueffre Deposition exhibit-1 (OCR).txt": "exhibit-1.pdf",
  "jeffery_epstein_records_4_2 (OCR).txt": "jeffery_epstein_records_4_2.pdf",
  "katie-johnson-testimony-2016-Nov-5.txt": "katie-johnson.pdf",
};

// Update file_path for documents that have originals
let linkedCount = 0;
const updateFilePath = db.prepare(`
  UPDATE documents 
  SET file_path = ?
  WHERE title LIKE ?
  AND (file_path IS NULL OR file_path = '')
`);

for (const [ocrPattern, pdfName] of Object.entries(ocrToOriginalMap)) {
  const fullPath = path.join(ORIGINALS_DIR, pdfName);
  if (fs.existsSync(fullPath)) {
    const baseName = ocrPattern.replace(/\.(txt|rtf)$/i, '');
    const result = updateFilePath.run(fullPath, `%${baseName}%`);
    if (result.changes > 0) {
      console.log(`  ✓ Linked "${baseName}" → ${pdfName}`);
      linkedCount += result.changes;
    }
  }
}
console.log(`\nLinked ${linkedCount} documents with originals.\n`);

// ============================================
// 2. Enrich Evidence Types Based on Content
// ============================================
console.log('📋 Phase 2: Enriching evidence types...\n');

const evidenceTypePatterns = [
  { type: 'email', patterns: ['From:', 'To:', 'Subject:', 'Sent:', '@', '.msg', '.eml'] },
  { type: 'deposition', patterns: ['DEPOSITION', 'EXAMINATION', 'Q.', 'A.', 'WITNESS', 'OATH', 'sworn'] },
  { type: 'legal', patterns: ['COURT', 'PLAINTIFF', 'DEFENDANT', 'EXHIBIT', 'MOTION', 'ORDER', 'CASE NO', 'v.', 'vs.'] },
  { type: 'financial', patterns: ['$', 'WIRE', 'TRANSFER', 'ACCOUNT', 'BALANCE', 'CREDIT', 'DEBIT', 'INVOICE', 'PAYMENT'] },
  { type: 'photo', patterns: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', 'PHOTOGRAPH', 'IMAGE'] },
  { type: 'article', patterns: ['NEWS', 'ARTICLE', 'PUBLISHED', 'REPORTER', 'JOURNALIST', 'MEDIA'] },
];

// Get documents without evidence type or with 'document' type
const docsToEnrich = db.prepare(`
  SELECT id, title, content, file_type 
  FROM documents 
  WHERE evidence_type IS NULL OR evidence_type = '' OR evidence_type = 'document'
`).all() as any[];

console.log(`Analyzing ${docsToEnrich.length} documents for evidence type...`);

const updateEvidenceType = db.prepare(`UPDATE documents SET evidence_type = ? WHERE id = ?`);

let typeUpdates = { email: 0, deposition: 0, legal: 0, financial: 0, photo: 0, article: 0 };

for (const doc of docsToEnrich) {
  const fullText = `${doc.title || ''} ${doc.content || ''}`.toUpperCase();
  const fileType = (doc.file_type || '').toLowerCase();
  
  // Check for image by file type first
  if (/jpe?g|png|gif|bmp|webp/i.test(fileType)) {
    updateEvidenceType.run('photo', doc.id);
    typeUpdates.photo++;
    continue;
  }
  
  // Check for CSV/Excel by file type
  if (/csv|xls|xlsx/i.test(fileType)) {
    updateEvidenceType.run('financial', doc.id);
    typeUpdates.financial++;
    continue;
  }
  
  // Score each evidence type by pattern matches
  let bestType = 'document';
  let bestScore = 0;
  
  for (const { type, patterns } of evidenceTypePatterns) {
    const score = patterns.reduce((sum, p) => 
      sum + (fullText.includes(p.toUpperCase()) ? 1 : 0), 0
    );
    if (score > bestScore) {
      bestScore = score;
      bestType = type;
    }
  }
  
  // Only update if we have a meaningful match (score >= 2)
  if (bestScore >= 2 && bestType !== 'document') {
    updateEvidenceType.run(bestType, doc.id);
    typeUpdates[bestType as keyof typeof typeUpdates]++;
  }
}

console.log('  Evidence type updates:');
for (const [type, count] of Object.entries(typeUpdates)) {
  if (count > 0) console.log(`    ${type}: ${count}`);
}
console.log();

// ============================================
// 3. Recompute Entity Mentions in Documents
// ============================================
console.log('👥 Phase 3: Computing entity mentions in documents...\n');

// Get all entities (just name, no aliases column exists)
const entities = db.prepare(`
  SELECT id, name 
  FROM entities 
  WHERE name NOT LIKE '%Unknown%'
`).all() as any[];

console.log(`Processing mentions for ${entities.length} entities...`);

// Get all documents
const allDocs = db.prepare(`SELECT id, content FROM documents WHERE content IS NOT NULL`).all() as any[];
console.log(`Scanning ${allDocs.length} documents...`);

// Build entity search patterns (just use name since no aliases)
const entityPatterns = entities.map(e => ({
  id: e.id, 
  name: e.name, 
  patterns: [e.name.toLowerCase()]
}));

// Count mentions per entity
const mentionCounts: Record<string, number> = {};
const entityDocuments: Record<string, Set<string>> = {};

for (const doc of allDocs) {
  const content = (doc.content || '').toLowerCase();
  for (const entity of entityPatterns) {
    const found = entity.patterns.some(p => content.includes(p));
    if (found) {
      mentionCounts[entity.id] = (mentionCounts[entity.id] || 0) + 1;
      if (!entityDocuments[entity.id]) entityDocuments[entity.id] = new Set();
      entityDocuments[entity.id].add(doc.id);
    }
  }
}

// Note: mentions_count column doesn't exist, so we skip updating it
// The data is still computed for relationship building
console.log(`Computed mentions for ${Object.keys(mentionCounts).length} entities.\n`);

// ============================================
// 4. Compute Co-mention Relationships
// ============================================
console.log('🔗 Phase 4: Computing entity relationships from co-mentions...\n');

// Find pairs of entities mentioned in the same documents
const relationships: Map<string, { source: string, target: string, strength: number, docIds: Set<string> }> = new Map();

for (const doc of allDocs) {
  const content = (doc.content || '').toLowerCase();
  const mentionedEntities: string[] = [];
  
  for (const entity of entityPatterns) {
    if (entity.patterns.some(p => content.includes(p))) {
      mentionedEntities.push(entity.id);
    }
  }
  
  // Create relationships between all co-mentioned entities
  for (let i = 0; i < mentionedEntities.length; i++) {
    for (let j = i + 1; j < mentionedEntities.length; j++) {
      const source = mentionedEntities[i];
      const target = mentionedEntities[j];
      const key = source < target ? `${source}-${target}` : `${target}-${source}`;
      
      if (!relationships.has(key)) {
        relationships.set(key, { 
          source: source < target ? source : target, 
          target: source < target ? target : source, 
          strength: 0, 
          docIds: new Set() 
        });
      }
      const rel = relationships.get(key)!;
      rel.strength++;
      rel.docIds.add(doc.id);
    }
  }
}

console.log(`Found ${relationships.size} entity relationships from co-mentions.`);

// Filter to keep only significant relationships (strength >= 2)
const significantRels = [...relationships.values()].filter(r => r.strength >= 2);
console.log(`${significantRels.length} relationships have strength >= 2.`);

// Insert or update relationships (limit to top 10K to avoid too many inserts)
const topRels = significantRels.sort((a, b) => b.strength - a.strength).slice(0, 10000);
console.log(`Inserting top ${topRels.length} relationships...`);

const insertRelationship = db.prepare(`
  INSERT OR REPLACE INTO entity_relationships (source_id, target_id, type, weight, confidence)
  VALUES (?, ?, 'co_mention', ?, 1.0)
`);

let relInserts = 0;
for (const rel of topRels) {
  try {
    insertRelationship.run(
      rel.source,
      rel.target,
      rel.strength
    );
    relInserts++;
  } catch (e) {
    // Skip if foreign key constraint fails
  }
}

console.log(`Inserted/updated ${relInserts} relationships.\n`);

// ============================================
// 5. Summary Statistics
// ============================================
console.log('📊 Final Statistics');
console.log('==================\n');

const stats = {
  totalDocs: (db.prepare(`SELECT COUNT(*) as c FROM documents`).get() as any).c,
  withFilePath: (db.prepare(`SELECT COUNT(*) as c FROM documents WHERE file_path IS NOT NULL AND file_path != ''`).get() as any).c,
  byEvidenceType: db.prepare(`
    SELECT evidence_type, COUNT(*) as count 
    FROM documents 
    GROUP BY evidence_type 
    ORDER BY count DESC
  `).all() as any[],
  totalEntities: (db.prepare(`SELECT COUNT(*) as c FROM entities`).get() as any).c,
  entitiesWithMentions: Object.keys(mentionCounts).length,  // Use computed data instead of DB column
  totalRelationships: (db.prepare(`SELECT COUNT(*) as c FROM entity_relationships`).get() as any).c,
};

console.log(`Documents: ${stats.totalDocs}`);
console.log(`  With file path: ${stats.withFilePath}`);
console.log(`  By evidence type:`);
for (const row of stats.byEvidenceType) {
  console.log(`    ${row.evidence_type || 'unclassified'}: ${row.count}`);
}
console.log();
console.log(`Entities: ${stats.totalEntities}`);
console.log(`  With mentions: ${stats.entitiesWithMentions}`);
console.log(`Relationships: ${stats.totalRelationships}`);


// ============================================
// 6. Aggressive Entity Consolidation (Standardized)
// ============================================
console.log('🧹 Phase 6: Running Aggressive Entity Consolidation...');

try {
  const { execSync } = require('child_process');
  const scriptPath = path.resolve('./scripts/aggressive_entity_consolidation.ts');
  
  console.log(`   Executing: ${scriptPath}`);
  const output = execSync(`npx tsx "${scriptPath}"`, { stdio: 'inherit' });
  
  console.log('   ✓ Aggressive consolidation complete.');
} catch (error: any) {
  console.error('   ❌ Error running aggressive consolidation:', error.message);
  // Don't fail the whole script, just log error
}

db.close();
console.log('\n✅ Enrichment complete!');
