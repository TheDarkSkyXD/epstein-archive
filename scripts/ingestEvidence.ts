#!/usr/bin/env tsx

/**
 * Evidence Ingestion Pipeline
 * 
 * Purpose: Ingest evidence files from /data directory into the database
 * with metadata extraction, type classification, and full-text indexing.
 * 
 * Processing:
 * 1. Recursively walks /data directory
 * 2. Classifies evidence by type using rule-based logic
 * 3. Extracts text content (preferring cleaned OCR)
 * 4. Extracts type-specific metadata
 * 5. Upserts to database (idempotent)
 * 6. Generates ingestion report
 */

import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import Database from 'better-sqlite3';
import { CompetitiveOCRService } from '../src/services/ocr/OCRService.js';
import { prettifyOCRText } from '../src/utils/prettifyOCR.js';

// Initialize OCR Service
const ocrService = new CompetitiveOCRService();

// Type definitions
type EvidenceType =
  | 'court_deposition'
  | 'court_filing'
  | 'contact_directory'
  | 'correspondence'
  | 'financial_record'
  | 'investigative_report'
  | 'testimony'
  | 'timeline_data'
  | 'media_scan'
  | 'evidence_list';

interface EvidenceRecord {
  evidenceType: EvidenceType;
  sourcePath: string;
  cleanedPath: string | null;
  originalFilename: string;
  mimeType: string;
  title: string;
  description: string;
  extractedText: string;
  createdAt: string | null;
  modifiedAt: string | null;
  redFlagRating: number;
  evidenceTags: string[]; // Will be JSON stringified
  metadataJson: Record<string, any>; // Type-specific metadata
  wordCount: number;
  fileSize: number;
  contentHash: string;
}

interface IngestionMetrics {
  filesProcessed: number;
  filesSkipped: number;
  filesErrored: number;
  evidenceByType: Record<EvidenceType, number>;
  errors: Array<{ file: string; error: string }>;
}

/**
 * Classify evidence type based on filename and path patterns
 */
function classifyEvidenceType(filePath: string, filename: string): EvidenceType {
  const filenameLower = filename.toLowerCase();
  const pathLower = filePath.toLowerCase();

  // Court deposition
  if (filenameLower.includes('deposition') || filenameLower.includes('exhibit')) {
    return 'court_deposition';
  }

  // Court filing
  if (filenameLower.includes('indictment') || filenameLower.includes('motion') || 
      filenameLower.includes('filing') || filenameLower.includes('trafficking')) {
    return 'court_filing';
  }

  // Contact directory
  if (filenameLower.includes('black book') || filenameLower.includes('birthday book') ||
      filenameLower.includes('contact')) {
    return 'contact_directory';
  }

  // Correspondence
  if (filenameLower.includes('email') || filenameLower.includes('message') ||
      filenameLower.includes('gmax')) {
    return 'correspondence';
  }

  // Financial record
  if (filePath.endsWith('.csv') || filePath.endsWith('.tsv') ||
      filenameLower.includes('flight') || filenameLower.includes('ledger') ||
      filenameLower.includes('cash') || pathLower.includes('/csv/')) {
    return 'financial_record';
  }

  // Investigative report
  if (filenameLower.match(/house oversight \d+/) || pathLower.includes('house oversight')) {
    return 'investigative_report';
  }

  // Testimony
  if (filenameLower.includes('testimony') || filenameLower.includes('testiomony')) {
    return 'testimony';
  }

  // Timeline data
  if (filenameLower.includes('timeline')) {
    return 'timeline_data';
  }

  // Evidence list
  if (filenameLower.includes('evidence list')) {
    return 'evidence_list';
  }

  // Media scan (images)
  const ext = path.extname(filename).toLowerCase();
  if (['.jpg', '.jpeg', '.png', '.tiff', '.gif', '.bmp'].includes(ext) ||
      pathLower.includes('/images/')) {
    return 'media_scan';
  }

  // Default to investigative_report for uncategorized text files
  return 'investigative_report';
}

/**
 * Extract text content from various file types
 */
async function extractText(
  filePath: string,
  evidenceType: EvidenceType
): Promise<{ text: string; hasRedactions?: boolean; redactionRatio?: number }> {
  const ext = path.extname(filePath).toLowerCase();

  // For text files, prefer cleaned OCR if available
  if (ext === '.txt' || ext === '.rtf') {
    let content = '';
    const cleanedPath = filePath.replace('/data/text/', '/data/ocr_clean/text/');
    
    if (fs.existsSync(cleanedPath)) {
      content = fs.readFileSync(cleanedPath, 'utf-8');
    } else {
      // Fallback to original
      try {
        content = fs.readFileSync(filePath, 'utf-8');
      } catch {
        content = fs.readFileSync(filePath, 'latin1');
      }
    }
    
    // Apply normalization (ensure Trump/Entity fixes are applied even to existing text)
    // We use prettifyOCRText which now includes the entity normalization
    return { text: prettifyOCRText(content) };
  }

  // Use Competitive OCR Service for PDFs and Images
  if (['.pdf', '.jpg', '.jpeg', '.png', '.tiff', '.gif', '.bmp'].includes(ext)) {
    try {
      // Determine mime type
      const mimeTypes: Record<string, string> = {
        '.pdf': 'application/pdf',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.tiff': 'image/tiff',
        '.gif': 'image/gif',
        '.bmp': 'image/bmp',
      };
      const mimeType = mimeTypes[ext] || 'application/octet-stream';
      
      const result = await ocrService.process(filePath, mimeType);
      
      // If result is high quality, return it
      if (result.confidence > 0) {
        // Store redaction status in metadata via side-effect or return tuple?
        // extractText returns string. We need to pass metadata back.
        // We can attach it to a global or context? 
        // Or update extractText to return object?
        // Refactoring extractText is better.
        return { 
          text: result.text, 
          hasRedactions: result.hasRedactions,
          redactionRatio: result.redactionRatio
        };
      }
      
      console.warn(`OCR returned empty/low confidence for ${filePath}`);
    } catch (error) {
      console.warn(`OCR failed for ${filePath}: ${error}`);
    }
  }

  // For CSV/TSV, serialize first 100 rows
  if (ext === '.csv' || ext === '.tsv') {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').slice(0, 100);
      return { text: lines.join('\n') };
    } catch (error) {
      return { text: '' };
    }
  }

  // Fallback placeholder
  if (['.jpg', '.jpeg', '.png', '.tiff', '.gif', '.bmp'].includes(ext)) {
    return { text: `[Image file: ${path.basename(filePath)}] (OCR Failed)` };
  }

  return { text: '' };
}

/**
 * Extract type-specific metadata
 */
function extractMetadata(
  text: string,
  evidenceType: EvidenceType,
  filePath: string,
  extraMetadata: Record<string, any> = {}
): Record<string, any> {
  const metadata: Record<string, any> = { ...extraMetadata };

  switch (evidenceType) {
    case 'correspondence': {
      // Extract email headers
      const fromMatch = text.match(/From:\s*(.+)/i);
      const toMatch = text.match(/To:\s*(.+)/i);
      const subjectMatch = text.match(/Subject:\s*(.+)/i);
      const dateMatch = text.match(/Date:\s*(.+)/i);
      
      if (fromMatch) metadata.from = fromMatch[1].trim();
      if (toMatch) metadata.to = toMatch[1].trim();
      if (subjectMatch) metadata.subject = subjectMatch[1].trim();
      if (dateMatch) metadata.sentDate = dateMatch[1].trim();
      break;
    }

    case 'financial_record': {
      // For CSV files, extract column headers
      if (filePath.endsWith('.csv') || filePath.endsWith('.tsv')) {
        const lines = text.split('\n');
        if (lines.length > 0) {
          metadata.columnHeaders = lines[0];
          metadata.rowCount = lines.length - 1;
        }
      }
      break;
    }

    case 'court_deposition': {
      // Extract deponent and case info
      const deponentMatch = text.match(/Deposition of\s+([^\n]+)/i);
      const caseMatch = text.match(/Case No\.?\s*[:]\s*([^\n]+)/i);
      
      if (deponentMatch) metadata.deponent = deponentMatch[1].trim();
      if (caseMatch) metadata.caseIdentifier = caseMatch[1].trim();
      break;
    }

    case 'investigative_report': {
      // Extract House Oversight document ID
      const filenameMatch = path.basename(filePath).match(/HOUSE_OVERSIGHT_(\d+)/);
      if (filenameMatch) {
        metadata.documentId = filenameMatch[1];
      }
      break;
    }
  }

  // Common metadata
  metadata.lineCount = text.split('\n').length;
  metadata.paragraphCount = text.split('\n\n').length;

  return metadata;
}

/**
 * Calculate reading time estimate
 */
function estimateReadingTime(wordCount: number): string {
  const wordsPerMinute = 250;
  const minutes = Math.ceil(wordCount / wordsPerMinute);
  return `${minutes} min`;
}

/**
 * Generate title from filename
 */
function generateTitle(filename: string, evidenceType: EvidenceType): string {
  // Remove extension
  let title = filename.replace(/\.[^/.]+$/, '');
  
  // Special handling for House Oversight files
  if (title.match(/HOUSE_OVERSIGHT_\d+/)) {
    const id = title.match(/\d+/)?.[0];
    return `House Oversight Document ${id}`;
  }

  // Replace underscores and hyphens with spaces
  title = title.replace(/[_-]/g, ' ');
  
  // Title case
  title = title.replace(/\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase();
  });

  return title;
}

/**
 * Calculate content hash for idempotency using streams (memory efficient)
 */
async function calculateHash(sourcePath: string, stats: fs.Stats): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    // Include metadata in hash
    hash.update(`${sourcePath}:${stats.mtimeMs}:${stats.size}`);
    
    const stream = fs.createReadStream(sourcePath);
    
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (err) => reject(err));
  });
}

/**
 * Process a single file
 */
async function processFile(
  filePath: string,
  db: Database.Database,
  metrics: IngestionMetrics
): Promise<void> {
  try {
    // Get file stats
    const stats = fs.statSync(filePath);
    const filename = path.basename(filePath);
    
    // Calculate hash
    const contentHash = await calculateHash(filePath, stats);
    
    // Classify evidence type
    const evidenceType = classifyEvidenceType(filePath, filename);
    
    // Extract text
    const extractionResult = await extractText(filePath, evidenceType);
    const extractedText = extractionResult.text;
    
    // Calculate word count
    const wordCount = extractedText.split(/\s+/).filter(w => w.length > 0).length;
    
    // Extract metadata
    const metadata = extractMetadata(extractedText, evidenceType, filePath, {
      hasRedactions: extractionResult.hasRedactions || false,
      redactionRatio: extractionResult.redactionRatio || 0
    });
    metadata.readingTime = estimateReadingTime(wordCount);
    
    // Generate title
    const title = generateTitle(filename, evidenceType);
    
    // Determine cleaned path
    const cleanedPath = filePath.includes('/data/text/')
      ? filePath.replace('/data/text/', '/data/ocr_clean/text/')
      : null;
    
    // Determine MIME type
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.txt': 'text/plain',
      '.rtf': 'text/rtf',
      '.pdf': 'application/pdf',
      '.csv': 'text/csv',
      '.tsv': 'text/tab-separated-values',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
    };
    const mimeType = mimeTypes[ext] || 'application/octet-stream';

    // Build evidence record
    const record: EvidenceRecord = {
      evidenceType,
      sourcePath: filePath,
      cleanedPath: cleanedPath && fs.existsSync(cleanedPath) ? cleanedPath : null,
      originalFilename: filename,
      mimeType,
      title,
      description: `${evidenceType.replace(/_/g, ' ')} from ${path.dirname(filePath)}`,
      extractedText: extractedText.substring(0, 1000000), // Limit to 1MB
      createdAt: stats.birthtime.toISOString(),
      modifiedAt: stats.mtime.toISOString(),
      redFlagRating: 0, // Default, will be updated later
      evidenceTags: [],
      metadataJson: metadata,
      wordCount,
      fileSize: stats.size,
      contentHash,
    };

    // Check if already ingested
    const existing = db.prepare('SELECT id FROM documents WHERE content_hash = ?').get(contentHash) as { id: number } | undefined;
    
    if (existing) {
      console.log(`  ↻ Updating (Re-ingestion): ${filename}`);
      // Update existing record with improved OCR/Metadata
      const updateStmt = db.prepare(`
        UPDATE documents SET
          evidence_type = @evidenceType,
          original_file_path = @sourcePath,
          file_path = @filePath,
          file_name = @originalFilename,
          file_type = @fileType,
          title = @title,
          content = @extractedText,
          metadata_json = @metadataJson,
          word_count = @wordCount,
          file_size = @fileSize,
          content_hash = @contentHash
        WHERE id = @id
      `);
      
      updateStmt.run({
        ...record,
        id: existing.id,
        filePath: record.cleanedPath || record.sourcePath, // Prefer cleaned path if available
        fileType: record.mimeType.split('/')[1] || 'unknown',
        metadataJson: JSON.stringify(record.metadataJson)
      });
      
      metrics.filesProcessed++;
      return;
    }

    // Insert into database
    const stmt = db.prepare(`
      INSERT INTO documents (
        evidence_type,
        original_file_path,
        file_path,
        file_name,
        file_type,
        title,
        content,
        created_at,
        metadata_json,
        word_count,
        file_size,
        content_hash,
        red_flag_rating
      ) VALUES (
        @evidenceType,
        @sourcePath,
        @filePath,
        @originalFilename,
        @fileType,
        @title,
        @extractedText,
        @createdAt,
        @metadataJson,
        @wordCount,
        @fileSize,
        @contentHash,
        @redFlagRating
      )
    `);

    stmt.run({
      ...record,
      filePath: record.cleanedPath || record.sourcePath,
      fileType: record.mimeType.split('/')[1] || 'unknown',
      metadataJson: JSON.stringify(record.metadataJson)
    });

    metrics.filesProcessed++;
    metrics.evidenceByType[evidenceType]++;
    console.log(`  ✓ Ingested as ${evidenceType}: ${filename} (${wordCount} words)`);

  } catch (error) {
    metrics.filesErrored++;
    metrics.errors.push({
      file: filePath,
      error: String(error),
    });
    console.error(`  ✗ Error processing: ${error}`);
  }
}

/**
 * Recursively walk directory
 */
async function walkDirectory(
  dir: string,
  db: Database.Database,
  metrics: IngestionMetrics,
  excludeDirs: string[] = ['ocr_clean', 'public', 'node_modules', '.git']
): Promise<void> {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Skip excluded directories
      if (excludeDirs.includes(entry.name)) {
        console.log(`Skipping directory: ${entry.name}`);
        continue;
      }
      await walkDirectory(fullPath, db, metrics, excludeDirs);
    } else if (entry.isFile()) {
      console.log(`Processing: ${path.relative(dir, fullPath)}`);
      await processFile(fullPath, db, metrics);
    }
  }
}

/**
 * Generate ingestion report
 */
function generateReport(metrics: IngestionMetrics, outputPath: string, db: Database.Database): void {
  // Query database for totals
  const totalEvidence = db.prepare('SELECT COUNT(*) as count FROM evidence').get() as { count: number };
  const totalWords = db.prepare('SELECT SUM(word_count) as sum FROM evidence').get() as { sum: number };
  
  const report = {
    timestamp: new Date().toISOString(),
    ingestion: {
      filesProcessed: metrics.filesProcessed,
      filesSkipped: metrics.filesSkipped,
      filesErrored: metrics.filesErrored,
    },
    evidenceByType: metrics.evidenceByType,
    database: {
      totalEvidenceRecords: totalEvidence.count,
      totalWords: totalWords.sum || 0,
    },
    errors: metrics.errors,
  };

  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf-8');
  
  console.log(`\n📊 Ingestion Summary:`);
  console.log(`   Files processed: ${report.ingestion.filesProcessed}`);
  console.log(`   Files skipped: ${report.ingestion.filesSkipped}`);
  console.log(`   Files errored: ${report.ingestion.filesErrored}`);
  console.log(`   Total evidence in DB: ${report.database.totalEvidenceRecords}`);
  console.log(`   Total words: ${report.database.totalWords.toLocaleString()}`);
  console.log(`\n   Evidence by type:`);
  for (const [type, count] of Object.entries(report.evidenceByType)) {
    if (count > 0) {
      console.log(`     ${type}: ${count}`);
    }
  }
  console.log(`\n📄 Full report saved to: ${outputPath}`);
}

/**
 * Main execution
 */
async function main() {
  const workspaceRoot = '/Users/veland/Downloads/Epstein Files';
  const dataDir = path.join(workspaceRoot, 'epstein-archive', 'data');
  const dbPath = path.join(workspaceRoot, 'epstein-archive', 'epstein-archive.db');
  const reportPath = path.join(workspaceRoot, 'epstein-archive', 'data', 'ingestion_report_full.json');

  console.log('📂 Evidence Ingestion Pipeline');
  console.log('━'.repeat(50));
  console.log(`Data directory: ${dataDir}`);
  console.log(`Database: ${dbPath}`);
  console.log('━'.repeat(50));
  console.log();

  // Check if database exists
  if (!fs.existsSync(dbPath)) {
    console.error(`❌ Database does not exist: ${dbPath}`);
    console.error(`   Run schema creation first`);
    process.exit(1);
  }

  // Open database
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL'); // Enable WAL for better concurrency

  // Initialize metrics
  const metrics: IngestionMetrics = {
    filesProcessed: 0,
    filesSkipped: 0,
    filesErrored: 0,
    evidenceByType: {
      court_deposition: 0,
      court_filing: 0,
      contact_directory: 0,
      correspondence: 0,
      financial_record: 0,
      investigative_report: 0,
      testimony: 0,
      timeline_data: 0,
      media_scan: 0,
      evidence_list: 0,
    },
    errors: [],
  };

  // Process all files
  const startTime = Date.now();
  await walkDirectory(dataDir, db, metrics);
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  console.log();
  console.log('━'.repeat(50));
  console.log(`✅ Ingestion complete in ${duration}s`);
  console.log();

  // Generate report
  generateReport(metrics, reportPath, db);

  // Close database
  db.close();
}

// Run main function
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
