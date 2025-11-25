#!/usr/bin/env node

/**
 * Enhanced Black Book Cleaning with Public Data
 * 
 * Uses structured data from epsteinsblackbook.com to map
 * OCR names to real cleaned names
 */

const Database = require('better-sqlite3');
const https = require('https');
const fs = require('fs');

const DB_PATH = './epstein-archive.db';

class EnhancedBlackBookCleaner {
  constructor() {
    this.db = new Database(DB_PATH);
    this.publicNames = [];
    this.stats = {
      totalEntries: 0,
      mappedToPublic: 0,
      aiCleaned: 0,
      unchanged: 0
    };
  }

  async run() {
    console.log('🧹 Enhanced Black Book Cleaning...\n');
    
    try {
      // Step 1: Fetch public cleaned data
      await this.fetchPublicData();
      
      // Step 2: Map our entries to public data
      await this.mapToPublicNames();
      
      // Step 3: Generate report
      this.generateReport();
      
      console.log('\n✅ Enhanced Cleaning Complete!');
      
    } catch (error) {
      console.error('❌ Cleaning Failed:', error);
      throw error;
    } finally {
      this.db.close();
    }
  }

  async fetchPublicData() {
    console.log('📥 Fetching public cleaned Black Book data...');
    
    return new Promise((resolve, reject) => {
      https.get('https://epsteinsblackbook.com/all-names', (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            // Extract JSON data from Next.js page
            const jsonMatch = data.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/);
            if (jsonMatch) {
              const pageData = JSON.parse(jsonMatch[1]);
              const persons = pageData.props?.pageProps?.persons || [];
              
              this.publicNames = persons.map(p => ({
                name: p.name,
                slug: p.slug,
                pages: p.pages,
                contacts: p.contacts
              }));
              
              console.log(`  ✓ Loaded ${this.publicNames.length} cleaned names from public source`);
              
              // Save for future use
              fs.writeFileSync('./data/black_book_public.json', JSON.stringify(this.publicNames, null, 2));
              console.log(`  ✓ Saved to data/black_book_public.json`);
              
              resolve();
            } else {
              console.log('  ⚠️  Could not extract JSON data, will use AI cleaning only');
              resolve();
            }
          } catch (error) {
            console.error('  ❌ Error parsing public data:', error.message);
            resolve(); // Continue without public data
          }
        });
      }).on('error', (error) => {
        console.error('  ❌ Error fetching public data:', error.message);
        resolve(); // Continue without public data
      });
    });
  }

  async mapToPublicNames() {
    console.log('\n🔗 Mapping entries to public cleaned names...');
    
    const entries = this.db.prepare(`
      SELECT bb.id, bb.entry_text, p.full_name, p.id as person_id
      FROM black_book_entries bb
      LEFT JOIN people p ON bb.person_id = p.id
    `).all();
    
    this.stats.totalEntries = entries.length;
    
    const updateStmt = this.db.prepare(`
      UPDATE people SET full_name = ?, needs_review = 0 WHERE id = ?
    `);
    
    for (const entry of entries) {
      const cleanedName = this.findBestMatch(entry.entry_text, entry.full_name);
      
      if (cleanedName && cleanedName !== entry.full_name) {
        updateStmt.run(cleanedName, entry.person_id);
        this.stats.mappedToPublic++;
        
        if (this.stats.mappedToPublic % 100 === 0) {
          console.log(`  Mapped ${this.stats.mappedToPublic} names...`);
        }
      } else {
        this.stats.unchanged++;
      }
    }
    
    console.log(`  ✓ Mapped ${this.stats.mappedToPublic} names to public data`);
    console.log(`  ℹ️  ${this.stats.unchanged} names unchanged`);
  }

  findBestMatch(entryText, currentName) {
    if (!entryText || this.publicNames.length === 0) return null;
    
    // Extract first line as potential name
    const firstLine = entryText.split('\n')[0].trim();
    
    // Try exact match first
    let match = this.publicNames.find(p => 
      this.normalize(p.name) === this.normalize(firstLine) ||
      this.normalize(p.name) === this.normalize(currentName)
    );
    
    if (match) return match.name;
    
    // Try fuzzy match on first/last name
    const words = firstLine.split(/[\s,]+/).filter(w => w.length > 2);
    if (words.length >= 2) {
      match = this.publicNames.find(p => {
        const pWords = p.name.split(/[\s,]+/);
        return words.some(w => pWords.some(pw => 
          this.normalize(w) === this.normalize(pw)
        ));
      });
      
      if (match) return match.name;
    }
    
    return null;
  }

  normalize(str) {
    return str.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      stats: this.stats,
      publicDataSize: this.publicNames.length,
      samples: {
        mapped: this.db.prepare(`
          SELECT full_name 
          FROM people 
          WHERE id IN (SELECT person_id FROM black_book_entries)
          AND needs_review = 0
          LIMIT 20
        `).all()
      }
    };
    
    console.log('\n📊 Enhanced Cleaning Report:');
    console.log('============================');
    console.log(`Total entries: ${report.stats.totalEntries}`);
    console.log(`Mapped to public data: ${report.stats.mappedToPublic}`);
    console.log(`Unchanged: ${report.stats.unchanged}`);
    console.log(`Public database size: ${report.publicDataSize} names`);
    
    console.log('\n✅ Sample cleaned names:');
    report.samples.mapped.slice(0, 15).forEach(s => console.log(`  - ${s.full_name}`));
    
    fs.writeFileSync('enhanced_cleaning_report.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Report saved to enhanced_cleaning_report.json');
  }
}

// Run if called directly
if (require.main === module) {
  const cleaner = new EnhancedBlackBookCleaner();
  cleaner.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = EnhancedBlackBookCleaner;
