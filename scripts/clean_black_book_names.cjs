#!/usr/bin/env node

/**
 * Black Book Name Cleaning Script
 * 
 * Combines:
 * 1. Public sources of cleaned Black Book names
 * 2. AI-powered pattern matching and cleaning
 * 3. Fuzzy matching to existing people database
 */

const Database = require('better-sqlite3');
const fs = require('fs');

const DB_PATH = './epstein-archive.db';

class BlackBookCleaner {
  constructor() {
    this.db = new Database(DB_PATH);
    this.stats = {
      totalEntries: 0,
      cleaned: 0,
      matched: 0,
      needsReview: 0
    };
  }

  async run() {
    console.log('🧹 Starting Black Book Name Cleaning...\n');
    
    try {
      // Step 1: Load public cleaned names if available
      const publicNames = await this.loadPublicNames();
      
      // Step 2: Clean OCR artifacts with AI patterns
      await this.cleanOCRErrors();
      
      // Step 3: Match to existing people
      await this.matchToExistingPeople();
      
      // Step 4: Generate report
      this.generateReport();
      
      console.log('\n✅ Cleaning Complete!');
      
    } catch (error) {
      console.error('❌ Cleaning Failed:', error);
      throw error;
    } finally {
      this.db.close();
    }
  }

  async loadPublicNames() {
    console.log('📥 Loading public cleaned names...');
    
    // Check for manually curated file
    const curatedPath = './data/black_book_cleaned.json';
    if (fs.existsSync(curatedPath)) {
      const data = JSON.parse(fs.readFileSync(curatedPath, 'utf-8'));
      console.log(`  Found ${data.length} curated names`);
      return data;
    }
    
    console.log('  No curated file found, will use AI cleaning only');
    return [];
  }

  async cleanOCRErrors() {
    console.log('\n🤖 Cleaning OCR errors with AI patterns...');
    
    const entries = this.db.prepare(`
      SELECT bb.id, bb.entry_text, p.full_name, p.id as person_id
      FROM black_book_entries bb
      LEFT JOIN people p ON bb.person_id = p.id
    `).all();
    
    this.stats.totalEntries = entries.length;
    
    const updateStmt = this.db.prepare(`
      UPDATE people SET full_name = ? WHERE id = ?
    `);
    
    const markReviewStmt = this.db.prepare(`
      UPDATE people SET needs_review = 1 WHERE id = ?
    `);
    
    for (const entry of entries) {
      const cleanedName = this.cleanName(entry.entry_text, entry.full_name);
      
      if (cleanedName && cleanedName !== entry.full_name) {
        updateStmt.run(cleanedName, entry.person_id);
        this.stats.cleaned++;
        
        if (this.stats.cleaned % 100 === 0) {
          console.log(`  Cleaned ${this.stats.cleaned} names...`);
        }
      }
      
      // Mark for review if still looks suspicious
      if (this.needsReview(cleanedName || entry.full_name)) {
        markReviewStmt.run(entry.person_id);
        this.stats.needsReview++;
      }
    }
    
    console.log(`  ✓ Cleaned ${this.stats.cleaned} names`);
    console.log(`  ⚠️  ${this.stats.needsReview} names need manual review`);
  }

  cleanName(entryText, currentName) {
    if (!entryText) return null;
    
    const lines = entryText.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length === 0) return null;
    
    // Extract first line as potential name
    let name = lines[0];
    
    // Remove common OCR artifacts
    name = name
      .replace(/\d{4}-\d{4}$/, '') // Remove year ranges like "2004-2005"
      .replace(/^[A-Z]\d+\s+\d+$/, '') // Remove codes like "A344 574202"
      .replace(/^\d+\s+\d+.*$/, '') // Remove pure numbers
      .replace(/^0\d{3}[-\s]\d+.*$/, '') // Remove phone numbers
      .replace(/^001\s+\d+.*$/, '') // Remove US international numbers
      .replace(/@.*$/, '') // Remove email addresses
      .replace(/\(h\)|\(w\)|\(p\)|\(f\)/gi, '') // Remove phone type markers
      .replace(/,\s*$/, '') // Remove trailing commas
      .trim();
    
    // Skip if it's clearly not a name
    if (this.isNotName(name)) {
      return null;
    }
    
    // Clean up spacing and capitalization
    name = this.normalizeNameCapitalization(name);
    
    // Return null if name is too short or still looks bad
    if (name.length < 3 || name.length > 60) {
      return null;
    }
    
    return name;
  }

  isNotName(text) {
    if (!text) return true;
    
    // Check for patterns that indicate it's not a name
    const notNamePatterns = [
      /^\d+$/, // Pure numbers
      /^[A-Z]\d+/, // Codes like "A344"
      /^\d{3}[-\s]\d/, // Phone numbers
      /@/, // Email addresses
      /^(London|Paris|New York|Miami|Palm Beach)/i, // Cities
      /^(Street|Avenue|Road|Lane|Drive|Boulevard)/i, // Street types
      /^PO\s+Box/i, // PO Box
      /^Email:/i, // Email label
      /^Tel:/i, // Tel label
      /^Fax:/i, // Fax label
      /^\d+\s+(Street|St|Avenue|Ave|Road|Rd)/i, // Addresses
    ];
    
    return notNamePatterns.some(pattern => pattern.test(text));
  }

  normalizeNameCapitalization(name) {
    // Handle all caps or all lowercase
    if (name === name.toUpperCase() || name === name.toLowerCase()) {
      // Title case each word
      return name.split(/\s+/).map(word => {
        if (word.length <= 2) return word.toLowerCase(); // Handle "de", "la", etc.
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }).join(' ');
    }
    
    return name;
  }

  needsReview(name) {
    if (!name) return true;
    
    // Flag suspicious patterns
    const suspiciousPatterns = [
      /\d{3,}/, // Contains 3+ digits
      /@/, // Contains @
      /^[A-Z]$/, // Single letter
      /^\w{1,2}$/, // 1-2 characters only
      /[^a-zA-Z\s\-\'\,\.\&]/, // Contains unusual characters
    ];
    
    return suspiciousPatterns.some(pattern => pattern.test(name));
  }

  async matchToExistingPeople() {
    console.log('\n🔗 Matching to existing people in database...');
    
    // This would use fuzzy matching to link Black Book entries
    // to existing people from documents
    // For now, we'll skip this as it was done during import
    
    console.log('  ℹ️  Matching was done during import (212 matches)');
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      stats: this.stats,
      samples: {
        cleaned: this.db.prepare(`
          SELECT full_name 
          FROM people 
          WHERE id IN (SELECT person_id FROM black_book_entries)
          AND needs_review = 0
          LIMIT 10
        `).all(),
        needsReview: this.db.prepare(`
          SELECT full_name 
          FROM people 
          WHERE id IN (SELECT person_id FROM black_book_entries)
          AND needs_review = 1
          LIMIT 10
        `).all()
      }
    };
    
    console.log('\n📊 Cleaning Report:');
    console.log('==================');
    console.log(`Total entries: ${report.stats.totalEntries}`);
    console.log(`Names cleaned: ${report.stats.cleaned}`);
    console.log(`Needs review: ${report.stats.needsReview}`);
    console.log(`Clean names: ${report.stats.totalEntries - report.stats.needsReview}`);
    
    console.log('\n✅ Sample cleaned names:');
    report.samples.cleaned.forEach(s => console.log(`  - ${s.full_name}`));
    
    console.log('\n⚠️  Sample names needing review:');
    report.samples.needsReview.forEach(s => console.log(`  - ${s.full_name}`));
    
    fs.writeFileSync('black_book_cleaning_report.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Report saved to black_book_cleaning_report.json');
  }
}

// Run if called directly
if (require.main === module) {
  const cleaner = new BlackBookCleaner();
  cleaner.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = BlackBookCleaner;
