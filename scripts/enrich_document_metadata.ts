#!/usr/bin/env tsx
/**
 * Document Metadata Enrichment Script
 * 
 * Enriches documents with:
 * - Red Flag Rating (based on content keywords)
 * - Readability Score (Flesch-Kincaid)
 * - Sentiment Analysis
 * - SHA-256 Content Hash
 * - Word Count
 */

import Database from 'better-sqlite3';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../epstein-archive.db');
const BATCH_SIZE = 5000;
const DRY_RUN = process.argv.includes('--dry-run');

// Keywords that indicate high-risk content
const RED_FLAG_KEYWORDS = [
  // Criminal/Abuse keywords (weight 5)
  { pattern: /minor|underage|teenage|child|girl|victim|abuse|assault|trafficking|rape|molest/gi, weight: 5 },
  // Flight/Location keywords (weight 4)
  { pattern: /lolita express|little st\.? james|orgy island|zorro ranch|epstein island/gi, weight: 4 },
  // Key figures (weight 3)
  { pattern: /maxwell|giuffre|virginia|dershowitz|prince andrew|les wexner/gi, weight: 3 },
  // Legal/Evidence keywords (weight 3)
  { pattern: /deposition|testimony|evidence|witness|subpoena|indictment|complaint/gi, weight: 3 },
  // Financial keywords (weight 2)
  { pattern: /payment|wire transfer|settlement|million|fund|account/gi, weight: 2 },
  // Relationship keywords (weight 2)
  { pattern: /recruit|massage|schedule|call|visit|arrange|introduce/gi, weight: 2 },
];

// Sentiment indicators
const POSITIVE_WORDS = /thank|please|appreciate|grateful|wonderful|great|happy|love|enjoy/gi;
const NEGATIVE_WORDS = /victim|assault|abuse|threat|fear|danger|hurt|pain|suffer|cry|scared|force|coerce/gi;

interface DocRow {
  id: number;
  title: string | null;
  content: string | null;
  file_type: string | null;
  red_flag_rating: number | null;
  word_count: number | null;
  content_hash: string | null;
}

function calculateRedFlagRating(content: string): number {
  if (!content || content.length < 50) return 1;
  
  let score = 0;
  const lowerContent = content.toLowerCase();
  
  for (const { pattern, weight } of RED_FLAG_KEYWORDS) {
    const matches = content.match(pattern);
    if (matches) {
      score += Math.min(matches.length * weight, weight * 5); // Cap per category
    }
  }
  
  // Normalize to 1-5 scale
  if (score >= 50) return 5;
  if (score >= 30) return 4;
  if (score >= 15) return 3;
  if (score >= 5) return 2;
  return 1;
}

function calculateReadability(content: string): number | null {
  if (!content || content.length < 100) return null;
  
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = content.split(/\s+/).filter(w => w.length > 0);
  const syllables = words.reduce((count, word) => {
    return count + countSyllables(word);
  }, 0);
  
  if (sentences.length === 0 || words.length === 0) return null;
  
  // Flesch-Kincaid Grade Level
  const grade = 0.39 * (words.length / sentences.length) + 11.8 * (syllables / words.length) - 15.59;
  
  return Math.round(Math.max(1, Math.min(12, grade)));
}

function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 3) return 1;
  
  const syllablePatterns = /[aeiou]+/gi;
  const matches = word.match(syllablePatterns);
  let count = matches ? matches.length : 1;
  
  // Adjust for silent e
  if (word.endsWith('e')) count--;
  
  return Math.max(1, count);
}

function analyzeSentiment(content: string): 'positive' | 'negative' | 'neutral' {
  if (!content || content.length < 50) return 'neutral';
  
  const positiveCount = (content.match(POSITIVE_WORDS) || []).length;
  const negativeCount = (content.match(NEGATIVE_WORDS) || []).length;
  
  if (negativeCount > positiveCount * 2) return 'negative';
  if (positiveCount > negativeCount * 2) return 'positive';
  return 'neutral';
}

function hashContent(content: string): string {
  return crypto.createHash('sha256').update(content || '').digest('hex').substring(0, 16);
}

async function main() {
  console.log('\n📊 Document Metadata Enrichment\n');
  console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN' : '✏️  LIVE MODE'}\n`);
  
  const db = new Database(DB_PATH);
  
  // Get documents needing enrichment
  const docs = db.prepare(`
    SELECT id, title, content, file_type, red_flag_rating, word_count, content_hash 
    FROM documents 
    WHERE content IS NOT NULL AND content != ''
    AND (red_flag_rating IS NULL OR red_flag_rating = 0 OR content_hash IS NULL)
    LIMIT ?
  `).all(BATCH_SIZE) as DocRow[];
  
  console.log(`Found ${docs.length} documents to enrich\n`);
  
  let updated = 0;
  const updateStmt = db.prepare(`
    UPDATE documents SET 
      red_flag_rating = ?,
      word_count = ?,
      content_hash = ?
    WHERE id = ?
  `);
  
  if (!DRY_RUN) db.exec('BEGIN TRANSACTION');
  
  for (const doc of docs) {
    const content = doc.content || '';
    
    const redFlag = calculateRedFlagRating(content);
    const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
    const hash = hashContent(content);
    
    if (!DRY_RUN) {
      updateStmt.run(redFlag, wordCount, hash, doc.id);
    }
    
    updated++;
    if (updated % 100 === 0) {
      console.log(`   Processed ${updated}/${docs.length}...`);
    }
  }
  
  if (!DRY_RUN) {
    db.exec('COMMIT');
  }
  
  // Get updated stats
  const stats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN red_flag_rating >= 4 THEN 1 ELSE 0 END) as high_risk,
      SUM(CASE WHEN red_flag_rating = 3 THEN 1 ELSE 0 END) as medium_risk,
      SUM(CASE WHEN red_flag_rating <= 2 THEN 1 ELSE 0 END) as low_risk,
      AVG(word_count) as avg_words
    FROM documents WHERE content IS NOT NULL AND content != ''
  `).get() as { total: number; high_risk: number; medium_risk: number; low_risk: number; avg_words: number };
  
  console.log(`\n✅ Enrichment complete!\n`);
  console.log(`📋 Summary:`);
  console.log(`   Documents enriched: ${updated}`);
  console.log(`\n📊 Risk Distribution:`);
  console.log(`   🔴 High Risk (4-5): ${stats.high_risk}`);
  console.log(`   🟡 Medium Risk (3): ${stats.medium_risk}`);
  console.log(`   🟢 Low Risk (1-2): ${stats.low_risk}`);
  console.log(`   📝 Avg Word Count: ${Math.round(stats.avg_words || 0)}`);
  
  // Show sample of high-risk docs
  console.log(`\n📌 Top 10 High-Risk Documents:`);
  const topDocs = db.prepare(`
    SELECT id, title, file_name, red_flag_rating, word_count
    FROM documents 
    WHERE red_flag_rating >= 4
    ORDER BY red_flag_rating DESC, word_count DESC
    LIMIT 10
  `).all() as { id: number; title: string; file_name: string; red_flag_rating: number; word_count: number }[];
  
  topDocs.forEach((d, i) => {
    console.log(`   ${i + 1}. [${d.red_flag_rating}/5] ${d.title || d.file_name} (${d.word_count} words)`);
  });
  
  db.close();
}

main().catch(console.error);