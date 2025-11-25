import fs from 'fs';
import path from 'path';
import { databaseService } from '../src/services/DatabaseService';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * COMPREHENSIVE DOCUMENT IMPORT WITH HYPER-AGGRESSIVE ENTITY FILTERING
 * 
 * This script will:
 * 1. Delete and recreate the database
 * 2. Import ALL documents from TEXT/, IMAGES/, DATA/, and NATIVES/ folders
 * 3. Extract entities using strict validation (only real people/organizations)
 * 4. Create entity_mentions linking entities to documents
 * 5. Build FTS indexes for full-text search
 */

const BASE_PATH = '/Users/veland/Downloads/Epstein Files/Epstein Estate Documents - Seventh Production';

// HYPER-AGGRESSIVE ENTITY VALIDATION (same as before)
const TECHNICAL_ARTIFACTS = new Set([
  'ecf', 'pdf', 'doc', 'docx', 'txt', 'html', 'xml', 'jpg', 'png', 'gif',
  'http', 'https', 'www', 'com', 'org', 'net', 'edu', 'gov',
  'macintosh', 'windows', 'linux', 'ios', 'android',
  'subject', 'from', 'to', 'cc', 'bcc', 'sent', 'received',
  'floor', 'room', 'suite', 'building', 'street', 'avenue', 'road',
  'event', 'address', 'location', 'venue', 'place', 'number', 'message',
  'document', 'complaint', 'report', 'statement', 'note', 'memo', 'level',
  'years', 'months', 'days', 'ago', 'old', 'capital', 'income', 'forwarded'
]);

const ORG_MARKERS = new Set([
  'inc', 'llc', 'ltd', 'plc', 'corp', 'corporation', 'company', 'co',
  'pty', 'gmbh', 'sa', 'ag', 'nv', 'bv', 'spa',
  'university', 'college', 'institute', 'school', 'academy',
  'council', 'commission', 'committee', 'board', 'authority',
  'agency', 'department', 'ministry', 'bureau', 'office',
  'bank', 'trust', 'fund', 'capital', 'partners', 'group',
  'foundation', 'association', 'society', 'union', 'league',
  'party', 'movement', 'coalition', 'alliance',
  'times', 'post', 'herald', 'news', 'journal', 'tribune', 'gazette',
  'broadcasting', 'media', 'press', 'publications'
]);

const INVALID_PATTERNS = [
  /years?\s+(ago|old|later|earlier)/i,
  /months?\s+(ago|old|later|earlier)/i,
  /capital\s+(gain|loss|market)/i,
  /income\s+(statement|tax)/i,
  /forwarded\s+message/i,
  /^(if|the|a|an|as|so|do|et)\s+/i,
  /\s+(on|in)\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,
  /^et\s+(al|seq)$/i,
  /level\s+/i,
  /\s+(number|message|document|complaint)$/i,
];

function isValidRealWorldEntity(name: string): boolean {
  const words = name.trim().split(/\s+/);
  const lowerWords = words.map(w => w.toLowerCase());
  
  for (const word of lowerWords) {
    if (TECHNICAL_ARTIFACTS.has(word)) return false;
  }
  
  for (const pattern of INVALID_PATTERNS) {
    if (pattern.test(name)) return false;
  }
  
  if (words.length < 2) return false;
  
  let hasOrgMarker = false;
  for (const word of lowerWords) {
    if (ORG_MARKERS.has(word)) {
      hasOrgMarker = true;
      break;
    }
  }
  
  if (hasOrgMarker) return true;
  
  for (const word of words) {
    if (/^(jr\.?|sr\.?|ii|iii|iv|v|de|van|von|der|den|del|della|di|da|le|la|el|al)$/i.test(word)) {
      continue;
    }
    if (!/^[A-Z][a-z]+(?:[-'][A-Z]?[a-z]+)*$/.test(word)) {
      return false;
    }
  }
  
  return true;
}

// Simple entity extraction (looks for capitalized words)
function extractEntities(text: string): string[] {
  const entities = new Set<string>();
  
  // Match sequences of 2-5 capitalized words
  const pattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,4})\b/g;
  let match;
  
  while ((match = pattern.exec(text)) !== null) {
    const entity = match[1].trim();
    if (isValidRealWorldEntity(entity)) {
      entities.add(entity);
    }
  }
  
  return Array.from(entities);
}

async function importDocuments() {
  console.log('='.repeat(80));
  console.log('COMPREHENSIVE DOCUMENT IMPORT WITH HYPER-AGGRESSIVE FILTERING');
  console.log('='.repeat(80));
  
  // Step 1: Recreate database
  console.log('\n[1/5] Recreating database...');
  const db = (databaseService as any).db;
  
  // Initialize fresh database
  await databaseService.initializeDatabase();
  console.log('✓ Database recreated');
  
  // Step 2: Collect all document files
  console.log('\n[2/5] Collecting document files...');
  const textFiles = await collectFiles(path.join(BASE_PATH, 'TEXT'), ['.txt']);
  const ocrFiles = await collectFiles(path.join(BASE_PATH, 'IMAGES'), ['-OCR.txt']);
  
  console.log(`✓ Found ${textFiles.length} text files`);
  console.log(`✓ Found ${ocrFiles.length} OCR files`);
  
  const allFiles = [...textFiles, ...ocrFiles];
  console.log(`✓ Total: ${allFiles.length} documents to process`);
  
  // Step 3: Process documents
  console.log('\n[3/5] Processing documents and extracting entities...');
  const entityMap = new Map<string, Set<number>>(); // entity name -> document IDs
  let processedCount = 0;
  
  for (const filePath of allFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const fileName = path.basename(filePath);
      const fileSize = fs.statSync(filePath).size;
      
      // Insert document
      const result = db.prepare(`
        INSERT INTO documents (file_name, file_path, file_type, file_size, content, word_count)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(fileName, filePath, 'text', fileSize, content, content.split(/\s+/).length);
      
      const documentId = result.lastInsertRowid as number;
      
      // Extract entities
      const entities = extractEntities(content);
      for (const entity of entities) {
        if (!entityMap.has(entity)) {
          entityMap.set(entity, new Set());
        }
        entityMap.get(entity)!.add(documentId);
      }
      
      processedCount++;
      if (processedCount % 100 === 0) {
        console.log(`  Processed ${processedCount}/${allFiles.length} documents...`);
      }
    } catch (error) {
      console.warn(`  Warning: Failed to process ${filePath}:`, error);
    }
  }
  
  console.log(`✓ Processed ${processedCount} documents`);
  console.log(`✓ Found ${entityMap.size} unique entities`);
  
  // Step 4: Insert entities and create mentions
  console.log('\n[4/5] Inserting entities and creating mentions...');
  let entityCount = 0;
  let mentionCount = 0;
  
  for (const [entityName, documentIds] of entityMap.entries()) {
    // Insert entity
    const result = db.prepare(`
      INSERT INTO entities (full_name, primary_role, mentions, spice_rating, spice_score, likelihood_level)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(entityName, 'Unknown', documentIds.size, 0, 0, 'MEDIUM');
    
    const entityId = result.lastInsertRowid as number;
    
    // Create mentions
    for (const documentId of documentIds) {
      db.prepare(`
        INSERT INTO entity_mentions (entity_id, document_id, mention_context)
        VALUES (?, ?, ?)
      `).run(entityId, documentId, `Mentioned in document`);
      mentionCount++;
    }
    
    entityCount++;
    if (entityCount % 100 === 0) {
      console.log(`  Inserted ${entityCount}/${entityMap.size} entities...`);
    }
  }
  
  console.log(`✓ Inserted ${entityCount} entities`);
  console.log(`✓ Created ${mentionCount} entity-document mentions`);
  
  // Step 5: Build FTS indexes
  console.log('\n[5/5] Building full-text search indexes...');
  db.exec(`INSERT INTO entities_fts(entities_fts) VALUES('rebuild')`);
  db.exec(`INSERT INTO documents_fts(documents_fts) VALUES('rebuild')`);
  console.log('✓ FTS indexes built');
  
  // Final statistics
  const stats = await databaseService.getStatistics();
  console.log('\n' + '='.repeat(80));
  console.log('IMPORT COMPLETE');
  console.log('='.repeat(80));
  console.log(`Total Entities: ${stats.totalEntities}`);
  console.log(`Total Documents: ${stats.totalDocuments}`);
  console.log(`Total Mentions: ${stats.totalMentions}`);
  console.log('='.repeat(80));
}

async function collectFiles(dir: string, extensions: string[]): Promise<string[]> {
  const files: string[] = [];
  
  function walk(directory: string) {
    const items = fs.readdirSync(directory);
    for (const item of items) {
      const fullPath = path.join(directory, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        walk(fullPath);
      } else {
        const matchesExtension = extensions.some(ext => item.endsWith(ext));
        if (matchesExtension) {
          files.push(fullPath);
        }
      }
    }
  }
  
  if (fs.existsSync(dir)) {
    walk(dir);
  }
  
  return files;
}

// Run import
importDocuments().catch(console.error);
