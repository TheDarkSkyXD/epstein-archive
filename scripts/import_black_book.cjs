#!/usr/bin/env node

/**
 * Black Book Import Script
 * 
 * Parses and imports Jeffrey Epstein's Black Book into the database
 * with high-quality entity matching and consolidation
 */

const Database = require('better-sqlite3');
const fs = require('fs');

const DB_PATH = './epstein-archive.db';
const BLACK_BOOK_PATH = '/Users/veland/Downloads/Epstein Files/Epstein Estate Documents - Seventh Production/Jeffrey Epstein\'s Black Book (OCR).txt';

class BlackBookImporter {
  constructor() {
    this.db = new Database(DB_PATH);
    this.stats = {
      entriesProcessed: 0,
      peopleCreated: 0,
      peopleMatched: 0,
      phoneNumbersExtracted: 0,
      addressesExtracted: 0,
      emailsExtracted: 0
    };
  }

  async run() {
    console.log('📖 Starting Black Book Import...\n');
    
    try {
      const content = fs.readFileSync(BLACK_BOOK_PATH, 'utf-8');
      const entries = this.parseBlackBook(content);
      
      console.log(`Found ${entries.length} entries in Black Book`);
      
      for (const entry of entries) {
        await this.processEntry(entry);
        this.stats.entriesProcessed++;
        
        if (this.stats.entriesProcessed % 50 === 0) {
          console.log(`  Processed ${this.stats.entriesProcessed}/${entries.length} entries...`);
        }
      }
      
      this.printStats();
      console.log('\n✅ Black Book Import Complete!');
      
    } catch (error) {
      console.error('❌ Import Failed:', error);
      throw error;
    } finally {
      this.db.close();
    }
  }

  parseBlackBook(content) {
    const entries = [];
    const lines = content.split('\n');
    let currentEntry = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines
      if (!line) continue;
      
      // Detect new entry (name at start of line, often with &)
      if (this.looksLikeName(line)) {
        if (currentEntry) {
          entries.push(currentEntry);
        }
        currentEntry = {
          name: this.cleanName(line),
          phones: [],
          addresses: [],
          emails: [],
          rawText: line
        };
      } else if (currentEntry) {
        // Add to current entry
        currentEntry.rawText += '\n' + line;
        
        // Extract phone numbers
        const phones = this.extractPhones(line);
        currentEntry.phones.push(...phones);
        
        // Extract emails
        const emails = this.extractEmails(line);
        currentEntry.emails.push(...emails);
        
        // Extract addresses (lines with street numbers, cities)
        if (this.looksLikeAddress(line)) {
          currentEntry.addresses.push(line);
        }
      }
    }
    
    // Add last entry
    if (currentEntry) {
      entries.push(currentEntry);
    }
    
    return entries;
  }

  looksLikeName(line) {
    // Names often have capital letters, commas, &
    // Avoid lines that are clearly phone numbers or addresses
    if (/^\d/.test(line)) return false; // Starts with digit
    if (/^0\d{3}/.test(line)) return false; // UK phone
    if (/^001/.test(line)) return false; // US phone
    if (/@/.test(line)) return false; // Email
    
    // Likely a name if it has capital letters and is short
    return /^[A-Z]/.test(line) && line.length < 60 && !line.includes('Email:');
  }

  cleanName(name) {
    return name
      .replace(/\s*\&\s*/g, ' & ') // Normalize ampersands
      .replace(/,\s*$/, '') // Remove trailing comma
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  extractPhones(line) {
    const phones = [];
    
    // Match various phone formats
    const patterns = [
      /\b(\d{3}[\s-]?\d{3}[\s-]?\d{4})\b/g, // US: 212-555-1234
      /\b(001\s?\d{3}\s?\d{3}\s?\d{4})\b/g, // International US
      /\b(0\d{3}[\s-]?\d{3}[\s-]?\d{4})\b/g, // UK: 0207-123-4567
      /\b(\+\d{1,3}\s?\d{1,4}\s?\d{1,4}\s?\d{1,4})\b/g, // International: +44 20 1234 5678
    ];
    
    for (const pattern of patterns) {
      const matches = line.matchAll(pattern);
      for (const match of matches) {
        phones.push(match[1].replace(/\s+/g, ' ').trim());
      }
    }
    
    return phones;
  }

  extractEmails(line) {
    const emails = [];
    const pattern = /\b([a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g;
    const matches = line.matchAll(pattern);
    
    for (const match of matches) {
      emails.push(match[1].toLowerCase());
    }
    
    return emails;
  }

  looksLikeAddress(line) {
    // Addresses often have street numbers, street names, cities
    const addressIndicators = [
      /\d+\s+(Street|St|Avenue|Ave|Road|Rd|Lane|Ln|Drive|Dr|Boulevard|Blvd|Way|Place|Court|Ct)/i,
      /\b(New York|London|Paris|Rome|Miami|Palm Beach|Manhattan)\b/i,
      /\b[A-Z]{2}\s?\d{5}\b/, // US ZIP
      /\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b/, // Canadian postal
    ];
    
    return addressIndicators.some(pattern => pattern.test(line));
  }

  async processEntry(entry) {
    // Try to match existing person
    const existingPerson = this.findMatchingPerson(entry.name);
    
    let personId;
    if (existingPerson) {
      personId = existingPerson.id;
      this.stats.peopleMatched++;
      
      // Update with Black Book data
      this.db.prepare(`
        UPDATE people 
        SET data_source = 'black_book,seventh_production'
        WHERE id = ?
      `).run(personId);
      
    } else {
      // Create new person
      const result = this.db.prepare(`
        INSERT INTO people (full_name, data_source, quality_score)
        VALUES (?, 'black_book', 50)
      `).run(entry.name);
      
      personId = result.lastInsertRowid;
      this.stats.peopleCreated++;
    }
    
    // Insert Black Book entry
    this.db.prepare(`
      INSERT INTO black_book_entries (person_id, entry_text, phone_numbers, addresses, email_addresses)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      personId,
      entry.rawText,
      JSON.stringify(entry.phones),
      JSON.stringify(entry.addresses),
      JSON.stringify(entry.emails)
    );
    
    this.stats.phoneNumbersExtracted += entry.phones.length;
    this.stats.addressesExtracted += entry.addresses.length;
    this.stats.emailsExtracted += entry.emails.length;
  }

  findMatchingPerson(name) {
    // Normalize name for matching
    const normalized = name.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    
    // Try exact match first
    let person = this.db.prepare(`
      SELECT id, full_name 
      FROM people 
      WHERE LOWER(REPLACE(REPLACE(full_name, ',', ''), '.', '')) = ?
      LIMIT 1
    `).get(normalized);
    
    if (person) return person;
    
    // Try fuzzy match (first and last name)
    const parts = normalized.split(/\s+/);
    if (parts.length >= 2) {
      const firstName = parts[0];
      const lastName = parts[parts.length - 1];
      
      person = this.db.prepare(`
        SELECT id, full_name
        FROM people
        WHERE LOWER(full_name) LIKE ? AND LOWER(full_name) LIKE ?
        LIMIT 1
      `).get(`%${firstName}%`, `%${lastName}%`);
    }
    
    return person;
  }

  printStats() {
    console.log('\n📊 Import Statistics:');
    console.log(`  Entries processed: ${this.stats.entriesProcessed}`);
    console.log(`  New people created: ${this.stats.peopleCreated}`);
    console.log(`  Existing people matched: ${this.stats.peopleMatched}`);
    console.log(`  Phone numbers extracted: ${this.stats.phoneNumbersExtracted}`);
    console.log(`  Addresses extracted: ${this.stats.addressesExtracted}`);
    console.log(`  Emails extracted: ${this.stats.emailsExtracted}`);
  }
}

// Run if called directly
if (require.main === module) {
  const importer = new BlackBookImporter();
  importer.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = BlackBookImporter;
