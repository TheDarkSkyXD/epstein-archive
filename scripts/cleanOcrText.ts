#!/usr/bin/env tsx

/**
 * OCR Text Cleaning and Normalization Pipeline
 * 
 * Purpose: Transform messy OCR output into clean, normalized, searchable text
 * while preserving document structure and original files.
 * 
 * Processing:
 * 1. Recursively walks /data/text directory
 * 2. Applies conservative mechanical fixes to OCR artifacts
 * 3. Writes cleaned text to parallel /data/ocr_clean/ structure
 * 4. Generates summary report with metrics
 */

import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';

interface CleaningMetrics {
  filesProcessed: number;
  filesSkipped: number;
  filesErrored: number;
  totalCharactersOriginal: number;
  totalCharactersCleaned: number;
  totalWordsAffected: number;
  errors: Array<{ file: string; error: string }>;
  warnings: Array<{ file: string; warning: string }>;
}

interface CleaningResult {
  cleanedText: string;
  charactersChanged: number;
  wordsAffected: number;
  changePercentage: number;
}

/**
 * Main cleaning function that applies all OCR fixes
 */
function cleanOcrText(text: string): CleaningResult {
  const originalLength = text.length;
  let cleanedText = text;
  let wordsAffected = 0;

  // 1. Fix OCR ligature errors
  cleanedText = cleanedText.replace(/ﬁ/g, 'fi');
  cleanedText = cleanedText.replace(/ﬂ/g, 'fl');
  cleanedText = cleanedText.replace(/ﬀ/g, 'ff');
  cleanedText = cleanedText.replace(/ﬃ/g, 'ffi');
  cleanedText = cleanedText.replace(/ﬄ/g, 'ffl');

  // 2. Fix broken hyphenation at line breaks
  // Pattern: word-\n followed by word continuation
  const hyphenationRegex = /(\w+)-\n(\w+)/g;
  cleanedText = cleanedText.replace(hyphenationRegex, (match, before, after) => {
    wordsAffected++;
    return before + after; // Rejoin the word
  });

  // 3. Normalize line endings to \n
  cleanedText = cleanedText.replace(/\r\n/g, '\n');
  cleanedText = cleanedText.replace(/\r/g, '\n');

  // 4. Reduce multiple spaces to single space (except at paragraph breaks)
  // Preserve paragraph breaks (2+ consecutive newlines)
  cleanedText = cleanedText.replace(/[ \t]+/g, ' '); // Multiple spaces/tabs to single space
  cleanedText = cleanedText.replace(/\n /g, '\n'); // Remove space after newline
  cleanedText = cleanedText.replace(/ \n/g, '\n'); // Remove space before newline

  // 5. Conservative rn → m replacement (only when word is clearly invalid)
  // This is risky, so we're very conservative
  // Only replace in common patterns like "govermnent" → "government"
  const commonRnMErrors: Record<string, string> = {
    'govermnent': 'government',
    'departmlent': 'department',
    'environmlent': 'environment',
    'instmment': 'instrument',
    'momey': 'money',
    'comrnittee': 'committee',
    'comrnunication': 'communication',
  };

  for (const [error, correction] of Object.entries(commonRnMErrors)) {
    const regex = new RegExp(`\\b${error}\\b`, 'gi');
    if (regex.test(cleanedText)) {
      cleanedText = cleanedText.replace(regex, correction);
      wordsAffected++;
    }
  }

  const charactersChanged = Math.abs(cleanedText.length - originalLength);
  const changePercentage = (charactersChanged / originalLength) * 100;

  return {
    cleanedText,
    charactersChanged,
    wordsAffected,
    changePercentage,
  };
}

/**
 * Read file with fallback encoding
 */
function readFileWithFallback(filePath: string): string | null {
  try {
    // Try UTF-8 first
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    try {
      // Fallback to Latin-1 (ISO-8859-1)
      return fs.readFileSync(filePath, 'latin1');
    } catch (fallbackError) {
      return null;
    }
  }
}

/**
 * Recursively walk directory and process files
 */
function walkDirectory(
  dir: string,
  baseDir: string,
  outputBaseDir: string,
  metrics: CleaningMetrics
): void {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Recursively process subdirectories
      walkDirectory(fullPath, baseDir, outputBaseDir, metrics);
    } else if (entry.isFile()) {
      // Process only .txt and .rtf files
      const ext = path.extname(entry.name).toLowerCase();
      if (ext === '.txt' || ext === '.rtf') {
        processFile(fullPath, baseDir, outputBaseDir, metrics);
      } else {
        metrics.filesSkipped++;
      }
    }
  }
}

/**
 * Process a single file
 */
function processFile(
  filePath: string,
  baseDir: string,
  outputBaseDir: string,
  metrics: CleaningMetrics
): void {
  console.log(`Processing: ${path.relative(baseDir, filePath)}`);

  // Read file content
  const content = readFileWithFallback(filePath);

  if (content === null) {
    metrics.filesErrored++;
    metrics.errors.push({
      file: filePath,
      error: 'Failed to decode file with UTF-8 or Latin-1',
    });
    console.warn(`  ⚠ Failed to decode file`);
    return;
  }

  // Skip binary or non-text files (basic check)
  if (content.includes('\0') || content.length === 0) {
    metrics.filesSkipped++;
    metrics.warnings.push({
      file: filePath,
      warning: 'File appears to be binary or empty',
    });
    console.warn(`  ⚠ Skipping binary or empty file`);
    return;
  }

  // Clean the text
  const result = cleanOcrText(content);

  // Update metrics
  metrics.totalCharactersOriginal += content.length;
  metrics.totalCharactersCleaned += result.cleanedText.length;
  metrics.totalWordsAffected += result.wordsAffected;

  // Flag files with > 10% character change for manual review
  if (result.changePercentage > 10) {
    metrics.warnings.push({
      file: filePath,
      warning: `High change percentage: ${result.changePercentage.toFixed(2)}%`,
    });
    console.warn(`  ⚠ High change percentage: ${result.changePercentage.toFixed(2)}%`);
  }

  // Determine output path
  const relativePath = path.relative(baseDir, filePath);
  const outputPath = path.join(outputBaseDir, relativePath);
  const outputDir = path.dirname(outputPath);

  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write cleaned text
  try {
    fs.writeFileSync(outputPath, result.cleanedText, 'utf-8');
    metrics.filesProcessed++;
    console.log(`  ✓ Cleaned (${result.charactersChanged} chars changed, ${result.wordsAffected} words affected)`);
  } catch (error) {
    metrics.filesErrored++;
    metrics.errors.push({
      file: filePath,
      error: `Failed to write output: ${error}`,
    });
    console.error(`  ✗ Failed to write output: ${error}`);
  }
}

/**
 * Generate summary report
 */
function generateReport(metrics: CleaningMetrics, outputPath: string): void {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      filesProcessed: metrics.filesProcessed,
      filesSkipped: metrics.filesSkipped,
      filesErrored: metrics.filesErrored,
      totalFiles: metrics.filesProcessed + metrics.filesSkipped + metrics.filesErrored,
    },
    statistics: {
      totalCharactersOriginal: metrics.totalCharactersOriginal,
      totalCharactersCleaned: metrics.totalCharactersCleaned,
      charactersDifference: metrics.totalCharactersCleaned - metrics.totalCharactersOriginal,
      changePercentage: ((Math.abs(metrics.totalCharactersCleaned - metrics.totalCharactersOriginal) / metrics.totalCharactersOriginal) * 100).toFixed(2) + '%',
      totalWordsAffected: metrics.totalWordsAffected,
    },
    errors: metrics.errors,
    warnings: metrics.warnings,
  };

  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`\n📊 Summary Report:`);
  console.log(`   Files processed: ${report.summary.filesProcessed}`);
  console.log(`   Files skipped: ${report.summary.filesSkipped}`);
  console.log(`   Files errored: ${report.summary.filesErrored}`);
  console.log(`   Total change: ${report.statistics.changePercentage}`);
  console.log(`   Words affected: ${report.statistics.totalWordsAffected}`);
  console.log(`   Errors: ${report.errors.length}`);
  console.log(`   Warnings: ${report.warnings.length}`);
  console.log(`\n📄 Full report saved to: ${outputPath}`);
}

/**
 * Main execution
 */
function main() {
  const workspaceRoot = '/Users/veland/Downloads/Epstein Files';
  const inputBaseDir = path.join(workspaceRoot, 'data', 'text');
  const outputBaseDir = path.join(workspaceRoot, 'data', 'ocr_clean', 'text');
  const reportPath = path.join(workspaceRoot, 'data', 'ocr_clean', 'cleaning_report.json');

  console.log('🧹 OCR Text Cleaning Pipeline');
  console.log('━'.repeat(50));
  console.log(`Input directory: ${inputBaseDir}`);
  console.log(`Output directory: ${outputBaseDir}`);
  console.log('━'.repeat(50));
  console.log();

  // Check if input directory exists
  if (!fs.existsSync(inputBaseDir)) {
    console.error(`❌ Input directory does not exist: ${inputBaseDir}`);
    process.exit(1);
  }

  // Create output base directory
  if (!fs.existsSync(outputBaseDir)) {
    fs.mkdirSync(outputBaseDir, { recursive: true });
  }

  // Initialize metrics
  const metrics: CleaningMetrics = {
    filesProcessed: 0,
    filesSkipped: 0,
    filesErrored: 0,
    totalCharactersOriginal: 0,
    totalCharactersCleaned: 0,
    totalWordsAffected: 0,
    errors: [],
    warnings: [],
  };

  // Process all files
  const startTime = Date.now();
  walkDirectory(inputBaseDir, inputBaseDir, outputBaseDir, metrics);
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  console.log();
  console.log('━'.repeat(50));
  console.log(`✅ Processing complete in ${duration}s`);
  console.log();

  // Generate report
  generateReport(metrics, reportPath);
}

// Run if executed directly (ES module check)
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { cleanOcrText, CleaningMetrics, CleaningResult };
