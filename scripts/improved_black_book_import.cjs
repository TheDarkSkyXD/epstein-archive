#!/usr/bin/env node

/**
 * Improved Black Book Import Script
 * 
 * Parses Jeffrey Epstein's Black Book with robust OCR error handling
 * to extract names, phone numbers, addresses, and emails
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = './epstein-archive.db';
const BLACK_BOOK_PATH = path.join(__dirname, '../data/text/Jeffrey Epstein\'s Black Book (OCR).txt');

class ImprovedBlackBookImporter {
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
    console.log('📖 Starting Improved Black Book Import...\n');
    
    try {
      // Create table if it doesn't exist
      console.log('🔧 Ensuring black_book_entries table exists...');
      this.db.prepare(`
        CREATE TABLE IF NOT EXISTS black_book_entries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          person_id INTEGER,
          entry_text TEXT,
          phone_numbers TEXT DEFAULT '[]',
          addresses TEXT DEFAULT '[]',
          email_addresses TEXT DEFAULT '[]',
          notes TEXT
        )
      `).run();
      
      // Clear existing entries
      console.log('🗑️  Clearing existing Black Book entries...');
      this.db.prepare('DELETE FROM black_book_entries').run();
      
      const content = fs.readFileSync(BLACK_BOOK_PATH, 'utf-8');
      const entries = this.parseBlackBook(content);
      
      console.log(`Found ${entries.length} entries in Black Book\n`);
      
      for (const entry of entries) {
        this.processEntry(entry);
        this.stats.entriesProcessed++;
        
        if (this.stats.entriesProcessed % 100 === 0) {
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
    let lineBuffer = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines but they may signal entry end
      if (!line) {
        if (lineBuffer.length > 0 && currentEntry) {
          // Process accumulated lines
          this.extractContactInfo(currentEntry, lineBuffer);
          lineBuffer = [];
        }
        continue;
      }
      
      // Skip header lines (year, page markers, etc)
      if (/^(P\.B\.|2004|2005|A\d+|Page\s*\d+|\d{4}-\d{4})$/i.test(line)) continue;
      if (line.length < 3) continue;
      
      // Detect new entry - a name line
      if (this.looksLikeName(line, lines[i-1], lines[i+1])) {
        // Save previous entry
        if (currentEntry) {
          this.extractContactInfo(currentEntry, lineBuffer);
          entries.push(currentEntry);
        }
        
        currentEntry = {
          name: this.cleanName(line),
          phones: [],
          addresses: [],
          emails: [],
          rawLines: [line]
        };
        lineBuffer = [];
      } else if (currentEntry) {
        // Add line to current entry
        currentEntry.rawLines.push(line);
        lineBuffer.push(line);
      }
    }
    
    // Add final entry
    if (currentEntry) {
      this.extractContactInfo(currentEntry, lineBuffer);
      entries.push(currentEntry);
    }
    
    return entries;
  }

  looksLikeName(line, prevLine, nextLine) {
    // Skip if line is too short or too long
    if (line.length < 3 || line.length > 80) return false;
    
    // Skip if it's clearly a phone number line
    if (this.isPhoneLine(line)) return false;
    
    // Skip if it's an email
    if (/@/.test(line) && !line.includes(',')) return false;
    
    // Skip if it's clearly an address line (starts with number)
    if (/^\d+\s+(E|W|N|S)\s+\d+/.test(line)) return false;
    if (/^\d+\s+(Street|St|Avenue|Ave|Road|Rd)/i.test(line)) return false;
    
    // Skip common organization prefixes that aren't names
    if (/^(Tel|Fax|Email|Mail|Address|Phone|Cell|Mobile|Office|Home|Work):/i.test(line)) return false;
    
    // Names typically:
    // - Start with capital letter
    // - May contain comma (Last, First) or ampersand (John & Jane)
    // - Often followed by phone/address lines
    
    const startsWithCapital = /^[A-Z]/.test(line);
    const hasNamePattern = /^[A-Za-z][a-z]+(,?\s+[A-Za-z&]+)*$/.test(line) ||
                          /^[A-Za-z]+ [A-Za-z]+(,?\s+[A-Za-z&]+)*$/.test(line) ||
                          /^[A-Za-z]+,\s*[A-Za-z]+/.test(line) ||
                          /^[A-Za-z]+ & [A-Za-z]+/.test(line);
    
    // Check if next line looks like contact info (supports this being a name)
    const nextIsContact = nextLine && (
      this.isPhoneLine(nextLine) || 
      this.looksLikeAddress(nextLine) ||
      /@/.test(nextLine)
    );
    
    return startsWithCapital && (hasNamePattern || nextIsContact);
  }

  isPhoneLine(line) {
    // OCR'd phone patterns
    const phonePatterns = [
      /^\d{3}[\s\-]?\d{3}[\s\-]?\d{4}/, // 212 555 1234
      /^0\d{2,4}[\s\-]?\d{3,4}[\s\-]?\d{3,4}/, // UK: 0207 123 4567
      /^00\d/, // International 001, 0044
      /^\+\d/, // +44, +1
      /^\(\d{3}\)/, // (212)
      /^Tel|^Fax|^Phone|^Cell|^Mobile/i,
    ];
    return phonePatterns.some(p => p.test(line));
  }

  cleanName(name) {
    return name
      .replace(/\s*&\s*/g, ' & ')
      .replace(/,\s*$/, '')
      .replace(/\s+/g, ' ')
      .replace(/[^a-zA-Z\s,&'.-]/g, '') // Remove OCR artifacts
      .trim();
  }

  extractContactInfo(entry, lines) {
    const allText = [...entry.rawLines, ...lines].join('\n');
    
    // Extract phones with flexible patterns for OCR errors
    const phonePatterns = [
      /(\d{3}[\s\-\.]*\d{3}[\s\-\.]*\d{4})/g, // US: 212-555-1234 or 212 555 1234
      /(0\d{2,4}[\s\-\.]*\d{3,4}[\s\-\.]*\d{3,4})/g, // UK: 0207-123-4567
      /(00\d[\s\-\.]*\d{1,3}[\s\-\.]*\d{3,4}[\s\-\.]*\d{3,4})/g, // Intl: 001 212 555 1234
      /(\+\d{1,3}[\s\-\.]*\d{1,4}[\s\-\.]*\d{3,4}[\s\-\.]*\d{3,4})/g, // +44 20 7123 4567
    ];
    
    for (const pattern of phonePatterns) {
      const matches = allText.matchAll(pattern);
      for (const match of matches) {
        const phone = match[1].replace(/\s+/g, ' ').trim();
        if (phone.length >= 7 && !entry.phones.includes(phone)) {
          entry.phones.push(phone);
        }
      }
    }
    
    // Extract emails
    const emailPattern = /([a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
    const emailMatches = allText.matchAll(emailPattern);
    for (const match of emailMatches) {
      const email = match[1].toLowerCase();
      if (!entry.emails.includes(email)) {
        entry.emails.push(email);
      }
    }
    
    // Extract addresses - lines with street indicators, cities, or postal codes
    for (const line of [...entry.rawLines, ...lines]) {
      if (this.looksLikeAddress(line) && !entry.addresses.includes(line)) {
        entry.addresses.push(line);
      }
    }
  }

  looksLikeAddress(line) {
    const addressPatterns = [
      /\d+\s+(E|W|N|S)\s+\d+/i, // 67 E 81 St
      /\d+\s+(Street|St|Avenue|Ave|Road|Rd|Lane|Ln|Drive|Dr|Blvd|Way|Place|Pl|Court|Ct)/i,
      /\b(New York|NY|London|Paris|Miami|Palm Beach|Manhattan|Brooklyn|Los Angeles|LA)\b/i,
      /\b[A-Z]{2}\s*\d{5}(-\d{4})?\b/, // US ZIP
      /\b[A-Z]{1,2}\d{1,2}\s*\d[A-Z]{2}\b/i, // UK postal: W1K 7AA
      /\bPO\s*Box\s*\d+/i,
      /\d+\s+Park\s+Ave/i,
      /\d+\s+Fifth\s+Ave/i,
    ];
    return addressPatterns.some(p => p.test(line));
  }

  processEntry(entry) {
    const cleanedName = this.cleanName(entry.name);
    if (!cleanedName || cleanedName.length < 2) return;
    
    // Try to match existing person
    const existingPerson = this.findMatchingPerson(cleanedName);
    
    let personId;
    if (existingPerson) {
      personId = existingPerson.id;
      this.stats.peopleMatched++;
    } else {
      // Create new person in entities table
      try {
        const result = this.db.prepare(`
          INSERT INTO entities (name, type, mentions_count)
          VALUES (?, 'Person', 0)
        `).run(cleanedName);
        personId = result.lastInsertRowid;
        this.stats.peopleCreated++;
      } catch (e) {
        // Entity may already exist
        const existing = this.db.prepare(`SELECT id FROM entities WHERE name = ?`).get(cleanedName);
        if (existing) {
          personId = existing.id;
          this.stats.peopleMatched++;
        } else {
          console.error(`Failed to create entity for ${cleanedName}:`, e.message);
          return;
        }
      }
    }
    
    // Insert Black Book entry
    try {
      this.db.prepare(`
        INSERT INTO black_book_entries (person_id, entry_text, phone_numbers, addresses, email_addresses, notes)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        personId,
        entry.rawLines.join('\n'),
        JSON.stringify(entry.phones),
        JSON.stringify(entry.addresses),
        JSON.stringify(entry.emails),
        `From Black Book - ${entry.phones.length} phones, ${entry.addresses.length} addresses, ${entry.emails.length} emails`
      );
      
      this.stats.phoneNumbersExtracted += entry.phones.length;
      this.stats.addressesExtracted += entry.addresses.length;
      this.stats.emailsExtracted += entry.emails.length;
    } catch (e) {
      console.error(`Failed to insert entry for ${cleanedName}:`, e.message);
    }
  }

  findMatchingPerson(name) {
    const normalized = name.toLowerCase().replace(/[^a-z\s]/g, '').trim();
    
    // Try exact match
    let person = this.db.prepare(`
      SELECT id, name FROM entities 
      WHERE type = 'Person' AND LOWER(REPLACE(name, ',', '')) = ?
      LIMIT 1
    `).get(normalized);
    
    if (person) return person;
    
    // Try fuzzy match
    const parts = normalized.split(/\s+/);
    if (parts.length >= 2) {
      const firstName = parts[0];
      const lastName = parts[parts.length - 1];
      
      person = this.db.prepare(`
        SELECT id, name FROM entities
        WHERE type = 'Person' 
        AND LOWER(name) LIKE ? AND LOWER(name) LIKE ?
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

// Run
if (require.main === module) {
  const importer = new ImprovedBlackBookImporter();
  importer.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = ImprovedBlackBookImporter;
