#!/usr/bin/env node

/**
 * Final Black Book Cleaning - Manual Approach
 * 
 * Since automated extraction failed, this script:
 * 1. Uses basic AI pattern cleaning
 * 2. Creates a review interface for manual correction
 * 3. Generates a clean export for the UI
 */

const Database = require('better-sqlite3');
const fs = require('fs');

const DB_PATH = './epstein-archive.db';

class FinalBlackBookCleaner {
  constructor() {
    this.db = new Database(DB_PATH);
    this.stats = {
      total: 0,
      cleaned: 0,
      needsReview: 0
    };
  }

  run() {
    console.log('🧹 Final Black Book Cleaning...\n');
    
    try {
      // Clean with improved AI patterns
      this.cleanWithPatterns();
      
      // Generate review file
      this.generateReviewFile();
      
      // Update database
      this.updateDatabase();
      
      // Generate report
      this.generateReport();
      
      console.log('\n✅ Cleaning Complete!');
      
    } catch (error) {
      console.error('❌ Error:', error);
      throw error;
    } finally {
      this.db.close();
    }
  }

  cleanWithPatterns() {
    console.log('🤖 Cleaning with improved AI patterns...\n');
    
    const entries = this.db.prepare(`
      SELECT bb.id, bb.entry_text, p.full_name, p.id as person_id
      FROM black_book_entries bb
      LEFT JOIN people p ON bb.person_id = p.id
    `).all();
    
    this.stats.total = entries.length;
    
    this.cleanedData = entries.map(entry => {
      const cleaned = this.smartClean(entry.entry_text);
      const needsReview = this.needsReview(cleaned);
      
      if (needsReview) {
        this.stats.needsReview++;
      } else {
        this.stats.cleaned++;
      }
      
      return {
        id: entry.id,
        person_id: entry.person_id,
        original: entry.full_name,
        cleaned: cleaned,
        entry_text: entry.entry_text,
        needs_review: needsReview
      };
    });
    
    console.log(`  ✓ Processed ${this.stats.total} entries`);
    console.log(`  ✓ ${this.stats.cleaned} look good`);
    console.log(`  ⚠️  ${this.stats.needsReview} need review`);
  }

  smartClean(entryText) {
    if (!entryText) return 'Unknown';
    
    const lines = entryText.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length === 0) return 'Unknown';
    
    let name = lines[0];
    
    // Remove common patterns
    name = name
      .replace(/\d{4}-\d{4}$/, '') // Year ranges
      .replace(/^[A-Z]\d+\s+\d+/, '') // Codes
      .replace(/^\d+\s+\d+.*$/, '') // Pure numbers
      .replace(/^0\d{3}[-\s]\d+.*$/, '') // Phone numbers
      .replace(/^001\s+\d+.*$/, '') // International numbers
      .replace(/@.*$/, '') // Emails
      .replace(/\(h\)|\(w\)|\(p\)|\(f\)/gi, '') // Phone markers
      .replace(/,\s*$/, '') // Trailing commas
      .trim();
    
    // Skip if clearly not a name
    if (this.isNotName(name)) {
      // Try second line
      if (lines.length > 1) {
        name = lines[1].trim();
      } else {
        return 'Unknown';
      }
    }
    
    // Normalize capitalization
    name = this.normalizeCase(name);
    
    // Final validation
    if (name.length < 2 || name.length > 60) {
      return 'Unknown';
    }
    
    return name;
  }

  isNotName(text) {
    if (!text || text.length < 2) return true;
    
    const notNamePatterns = [
      /^\d+$/,
      /^[A-Z]\d+/,
      /^\d{3}[-\s]\d/,
      /@/,
      /^(London|Paris|New York|Miami|Palm Beach|Street|Avenue|Road|Lane|PO Box|Email|Tel|Fax)/i,
    ];
    
    return notNamePatterns.some(p => p.test(text));
  }

  normalizeCase(name) {
    // Handle all caps or all lowercase
    if (name === name.toUpperCase() || name === name.toLowerCase()) {
      return name.split(/\s+/).map(word => {
        if (word.length <= 2) return word.toLowerCase();
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }).join(' ');
    }
    return name;
  }

  needsReview(name) {
    if (!name || name === 'Unknown') return true;
    
    const suspiciousPatterns = [
      /\d{3,}/,
      /@/,
      /^[A-Z]$/,
      /^\w{1,2}$/,
      /[^a-zA-Z\s\-\'\,\.\&]/,
    ];
    
    return suspiciousPatterns.some(p => p.test(name));
  }

  generateReviewFile() {
    console.log('\n📝 Generating review file...');
    
    const reviewData = {
      needsReview: this.cleanedData.filter(d => d.needs_review),
      cleaned: this.cleanedData.filter(d => !d.needs_review).slice(0, 50)
    };
    
    fs.writeFileSync('black_book_review.json', JSON.stringify(reviewData, null, 2));
    console.log(`  ✓ Saved to black_book_review.json`);
    console.log(`  ⚠️  ${reviewData.needsReview.length} entries need manual review`);
  }

  updateDatabase() {
    console.log('\n💾 Updating database...');
    
    const updateStmt = this.db.prepare(`
      UPDATE people 
      SET full_name = ?, needs_review = ?
      WHERE id = ?
    `);
    
    let updated = 0;
    for (const item of this.cleanedData) {
      if (item.cleaned !== item.original) {
        updateStmt.run(item.cleaned, item.needs_review ? 1 : 0, item.person_id);
        updated++;
      }
    }
    
    console.log(`  ✓ Updated ${updated} names in database`);
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      stats: this.stats,
      samples: {
        good: this.cleanedData.filter(d => !d.needs_review).slice(0, 20).map(d => d.cleaned),
        review: this.cleanedData.filter(d => d.needs_review).slice(0, 20).map(d => ({
          original: d.original,
          cleaned: d.cleaned,
          entry: d.entry_text.split('\n')[0]
        }))
      }
    };
    
    console.log('\n📊 Final Report:');
    console.log('================');
    console.log(`Total entries: ${report.stats.total}`);
    console.log(`Cleaned successfully: ${report.stats.cleaned}`);
    console.log(`Needs manual review: ${report.stats.needsReview}`);
    
    console.log('\n✅ Sample cleaned names:');
    report.samples.good.forEach(name => console.log(`  - ${name}`));
    
    console.log('\n⚠️  Sample names needing review:');
    report.samples.review.slice(0, 10).forEach(item => {
      console.log(`  - "${item.original}" → "${item.cleaned}" (from: ${item.entry})`);
    });
    
    fs.writeFileSync('black_book_final_report.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Full report saved to black_book_final_report.json');
  }
}

if (require.main === module) {
  const cleaner = new FinalBlackBookCleaner();
  cleaner.run();
}

module.exports = FinalBlackBookCleaner;
