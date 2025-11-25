#!/usr/bin/env node

/**
 * Data Quality Enhancement Script
 * 
 * Enhances existing documents from "Epstein Estate Documents - Seventh Production" with:
 * - Human-readable titles
 * - Entity consolidation
 * - Role/title extraction
 * - Relational document linking
 * - Timeline event generation
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = './epstein-archive.db';
const LOG_FILE = './enhancement_log.txt';

class DataEnhancementPipeline {
  constructor() {
    this.db = new Database(DB_PATH);
    this.stats = {
      documentsProcessed: 0,
      titlesGenerated: 0,
      entitiesConsolidated: 0,
      rolesExtracted: 0,
      relationshipsCreated: 0,
      eventsCreated: 0
    };
    this.log = [];
  }

  logMessage(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    console.log(logEntry);
    this.log.push(logEntry);
  }

  async run() {
    this.logMessage('🚀 Starting Data Enhancement Pipeline...\n');
    
    try {
      // Phase 1: Generate Human-Readable Titles
      this.logMessage('📝 Phase 1: Generating human-readable titles...');
      await this.generateDocumentTitles();
      
      // Phase 2: Consolidate Duplicate Entities
      this.logMessage('\n🔄 Phase 2: Consolidating duplicate entities...');
      await this.consolidateEntities();
      
      // Phase 3: Extract Roles and Titles
      this.logMessage('\n👤 Phase 3: Extracting roles and titles...');
      await this.extractRolesAndTitles();
      
      // Phase 4: Create Entity-Document Relationships
      this.logMessage('\n🔗 Phase 4: Creating entity-document relationships...');
      await this.linkEntitiesToDocuments();
      
      // Phase 5: Generate Timeline Events
      this.logMessage('\n📅 Phase 5: Generating timeline events...');
      await this.generateTimelineEvents();
      
      // Phase 6: Validate Data Quality
      this.logMessage('\n✅ Phase 6: Validating data quality...');
      await this.validateDataQuality();
      
      // Save log
      fs.writeFileSync(LOG_FILE, this.log.join('\n'));
      
      this.logMessage('\n✨ Enhancement Complete!');
      this.printStats();
      
    } catch (error) {
      this.logMessage(`❌ Enhancement Failed: ${error.message}`);
      this.logMessage(error.stack);
      throw error;
    } finally {
      this.db.close();
    }
  }

  async generateDocumentTitles() {
    const documents = this.db.prepare(`
      SELECT id, file_name, content, evidence_type, date_created
      FROM documents
      WHERE title IS NULL OR title = ''
      LIMIT 100
    `).all();

    this.logMessage(`Found ${documents.length} documents needing titles`);

    const updateStmt = this.db.prepare(`
      UPDATE documents 
      SET title = ? 
      WHERE id = ?
    `);

    for (const doc of documents) {
      const title = this.generateTitle(doc);
      updateStmt.run(title, doc.id);
      this.stats.titlesGenerated++;
      
      if (this.stats.titlesGenerated % 10 === 0) {
        this.logMessage(`  Generated ${this.stats.titlesGenerated} titles...`);
      }
    }

    this.logMessage(`✓ Generated ${this.stats.titlesGenerated} titles`);
  }

  generateTitle(doc) {
    const { file_name, content, evidence_type, date_created } = doc;
    
    // Extract first meaningful line or paragraph
    const lines = (content || '').split('\n').filter(l => l.trim().length > 10);
    const firstLine = lines[0] || '';
    
    // Check for document type indicators
    if (content && content.includes('From:') && content.includes('To:')) {
      const subject = this.extractEmailSubject(content);
      const from = this.extractSender(content);
      return `Email: ${subject} (from ${from}) (${file_name})`;
    }
    
    if (content && (content.includes('DEPOSITION') || content.includes('Q:') && content.includes('A:'))) {
      const deponent = this.extractDeponent(content);
      return `Deposition: ${deponent} (${file_name})`;
    }
    
    if (file_name.includes('FLIGHT') || content && content.includes('PASSENGER')) {
      return `Flight Log (${file_name})`;
    }
    
    // Extract keywords from first paragraph
    const keywords = this.extractKeywords(firstLine, 5);
    if (keywords.length > 0) {
      return `${keywords.join(', ')} (${file_name})`;
    }
    
    // Fallback: use filename with better formatting
    return `Document: ${file_name.replace(/[_-]/g, ' ').replace(/\.txt$/, '')}`;
  }

  extractEmailSubject(content) {
    const match = content.match(/Subject:\s*(.+)/i);
    return match ? match[1].trim().substring(0, 50) : 'No Subject';
  }

  extractSender(content) {
    const match = content.match(/From:\s*(.+)/i);
    if (match) {
      const sender = match[1].trim();
      // Extract just the name, not email
      const nameMatch = sender.match(/([A-Z][a-z]+\s+[A-Z][a-z]+)/);
      return nameMatch ? nameMatch[1] : sender.substring(0, 30);
    }
    return 'Unknown';
  }

  extractDeponent(content) {
    const match = content.match(/DEPOSITION OF\s+([A-Z\s]+)/i);
    if (match) {
      return match[1].trim().substring(0, 40);
    }
    // Try to find name near beginning
    const nameMatch = content.match(/([A-Z][a-z]+\s+[A-Z][a-z]+)/);
    return nameMatch ? nameMatch[1] : 'Unknown';
  }

  extractKeywords(text, count = 5) {
    // Remove common words and extract meaningful terms
    const commonWords = new Set(['the', 'and', 'for', 'with', 'from', 'that', 'this', 'have', 'was', 'were', 'been', 'has']);
    const words = text
      .toLowerCase()
      .replace(/[^a-z\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3 && !commonWords.has(w));
    
    // Get unique words
    const unique = [...new Set(words)];
    return unique.slice(0, count);
  }

  async consolidateEntities() {
    // Find potential duplicates based on normalized names
    const people = this.db.prepare(`
      SELECT id, name, mentions, files
      FROM people
      ORDER BY name
    `).all();

    this.logMessage(`Analyzing ${people.length} entities for duplicates...`);

    const groups = {};
    for (const person of people) {
      const normalized = this.normalizeName(person.name);
      if (!groups[normalized]) {
        groups[normalized] = [];
      }
      groups[normalized].push(person);
    }

    const duplicateGroups = Object.values(groups).filter(g => g.length > 1);
    this.logMessage(`Found ${duplicateGroups.length} groups of potential duplicates`);

    for (const group of duplicateGroups) {
      await this.mergeEntities(group);
      this.stats.entitiesConsolidated += group.length - 1;
    }

    this.logMessage(`✓ Consolidated ${this.stats.entitiesConsolidated} duplicate entities`);
  }

  normalizeName(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async mergeEntities(duplicates) {
    // Keep the one with most mentions as primary
    const primary = duplicates.reduce((a, b) => a.mentions > b.mentions ? a : b);
    const toMerge = duplicates.filter(d => d.id !== primary.id);

    this.logMessage(`  Merging ${toMerge.length} duplicates into "${primary.name}"`);

    const updateMentions = this.db.prepare(`
      UPDATE entity_mentions 
      SET entity_id = ? 
      WHERE entity_id = ?
    `);

    const deletePerson = this.db.prepare(`
      DELETE FROM people WHERE id = ?
    `);

    for (const dup of toMerge) {
      updateMentions.run(primary.id, dup.id);
      deletePerson.run(dup.id);
    }

    // Recalculate stats for primary
    const stats = this.db.prepare(`
      SELECT 
        COUNT(DISTINCT document_id) as file_count,
        COUNT(*) as mention_count
      FROM entity_mentions
      WHERE entity_id = ?
    `).get(primary.id);

    this.db.prepare(`
      UPDATE people 
      SET mentions = ?, files = ?
      WHERE id = ?
    `).run(stats.mention_count, stats.file_count, primary.id);
  }

  async extractRolesAndTitles() {
    const people = this.db.prepare(`
      SELECT p.id, p.name, em.context_text
      FROM people p
      JOIN entity_mentions em ON p.id = em.entity_id
      WHERE (p.title IS NULL OR p.title = '')
      AND em.context_text IS NOT NULL
      LIMIT 500
    `).all();

    this.logMessage(`Extracting roles for ${people.length} entities...`);

    const updateStmt = this.db.prepare(`
      UPDATE people 
      SET title = ?, role = ?
      WHERE id = ?
    `);

    const processed = new Set();

    for (const person of people) {
      if (processed.has(person.id)) continue;
      
      const { title, role } = this.extractRoleFromContext(person.name, person.context_text);
      
      if (title || role) {
        updateStmt.run(title, role, person.id);
        this.stats.rolesExtracted++;
        processed.add(person.id);
      }
    }

    this.logMessage(`✓ Extracted ${this.stats.rolesExtracted} roles/titles`);
  }

  extractRoleFromContext(name, context) {
    if (!context) return { title: null, role: null };

    // Patterns like "John Doe, CEO of XYZ"
    const pattern1 = new RegExp(`${name},\\s*([^,\\.]+)`, 'i');
    const match1 = context.match(pattern1);
    if (match1) {
      const extracted = match1[1].trim();
      return {
        title: this.extractTitle(extracted),
        role: extracted.substring(0, 100)
      };
    }

    // Patterns like "President John Doe"
    const pattern2 = new RegExp(`(President|CEO|Attorney|Dr\\.|Senator|Representative|Director)\\s+${name}`, 'i');
    const match2 = context.match(pattern2);
    if (match2) {
      return {
        title: match2[1],
        role: match2[1]
      };
    }

    return { title: null, role: null };
  }

  extractTitle(text) {
    const titles = ['President', 'CEO', 'CFO', 'Attorney', 'Dr.', 'Senator', 'Representative', 'Director', 'Manager', 'Executive'];
    for (const title of titles) {
      if (text.toLowerCase().includes(title.toLowerCase())) {
        return title;
      }
    }
    return text.split(' ')[0]; // First word as title
  }

  async linkEntitiesToDocuments() {
    this.logMessage('Creating entity-document relationships...');

    // Clear existing relationships
    this.db.prepare('DELETE FROM entity_documents').run();

    const entities = this.db.prepare(`
      SELECT DISTINCT em.entity_id, em.document_id, em.context_text
      FROM entity_mentions em
    `).all();

    this.logMessage(`Processing ${entities.length} entity-document pairs...`);

    const insertStmt = this.db.prepare(`
      INSERT OR IGNORE INTO entity_documents (entity_id, document_id, role_in_document, mention_count, context_snippets)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const link of entities) {
      const role = this.determineRoleInDocument(link);
      const contextSnippets = JSON.stringify([link.context_text]);
      
      insertStmt.run(
        link.entity_id,
        link.document_id,
        role,
        1,
        contextSnippets
      );
      
      this.stats.relationshipsCreated++;
    }

    this.logMessage(`✓ Created ${this.stats.relationshipsCreated} entity-document relationships`);
  }

  determineRoleInDocument(link) {
    // Simple role determination based on context
    const context = (link.context_text || '').toLowerCase();
    
    if (context.includes('from:')) return 'sender';
    if (context.includes('to:')) return 'recipient';
    if (context.includes('deposition')) return 'deponent';
    if (context.includes('passenger')) return 'passenger';
    if (context.includes('witness')) return 'witness';
    
    return 'mentioned';
  }

  async generateTimelineEvents() {
    this.logMessage('Generating timeline events from documents...');

    // Clear existing events
    this.db.prepare('DELETE FROM timeline_events').run();

    const documents = this.db.prepare(`
      SELECT id, file_name, content, date_created, evidence_type
      FROM documents
      WHERE date_created IS NOT NULL
      LIMIT 200
    `).all();

    this.logMessage(`Processing ${documents.length} documents for events...`);

    const insertStmt = this.db.prepare(`
      INSERT INTO timeline_events (event_date, event_type, title, description, source_document_ids, significance_score)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const doc of documents) {
      const event = this.extractEvent(doc);
      if (event) {
        insertStmt.run(
          event.date,
          event.type,
          event.title,
          event.description,
          JSON.stringify([doc.id]),
          event.significance
        );
        this.stats.eventsCreated++;
      }
    }

    this.logMessage(`✓ Generated ${this.stats.eventsCreated} timeline events`);
  }

  extractEvent(doc) {
    const { file_name, content, date_created, evidence_type } = doc;
    
    if (!date_created) return null;

    let type = 'communication';
    let title = file_name;
    let description = '';
    let significance = 5;

    if (content) {
      if (content.includes('FLIGHT') || content.includes('PASSENGER')) {
        type = 'travel';
        title = `Flight Record`;
        significance = 7;
      } else if (content.includes('DEPOSITION')) {
        type = 'legal';
        title = `Legal Deposition`;
        significance = 8;
      } else if (content.includes('From:') && content.includes('To:')) {
        type = 'communication';
        const subject = this.extractEmailSubject(content);
        title = `Email: ${subject}`;
        significance = 6;
      }

      description = content.substring(0, 200);
    }

    return {
      date: date_created,
      type,
      title,
      description,
      significance
    };
  }

  async validateDataQuality() {
    const validation = {
      totalDocuments: 0,
      documentsWithTitles: 0,
      totalEntities: 0,
      entitiesWithRoles: 0,
      totalRelationships: 0,
      totalEvents: 0
    };

    validation.totalDocuments = this.db.prepare('SELECT COUNT(*) as count FROM documents').get().count;
    validation.documentsWithTitles = this.db.prepare('SELECT COUNT(*) as count FROM documents WHERE title IS NOT NULL AND title != ""').get().count;
    validation.totalEntities = this.db.prepare('SELECT COUNT(*) as count FROM people').get().count;
    validation.entitiesWithRoles = this.db.prepare('SELECT COUNT(*) as count FROM people WHERE title IS NOT NULL AND title != ""').get().count;
    validation.totalRelationships = this.db.prepare('SELECT COUNT(*) as count FROM entity_documents').get().count;
    validation.totalEvents = this.db.prepare('SELECT COUNT(*) as count FROM timeline_events').get().count;

    this.logMessage('\n📊 Data Quality Metrics:');
    this.logMessage(`  Documents: ${validation.totalDocuments}`);
    this.logMessage(`  Documents with titles: ${validation.documentsWithTitles} (${Math.round(validation.documentsWithTitles / validation.totalDocuments * 100)}%)`);
    this.logMessage(`  Entities: ${validation.totalEntities}`);
    this.logMessage(`  Entities with roles: ${validation.entitiesWithRoles} (${Math.round(validation.entitiesWithRoles / validation.totalEntities * 100)}%)`);
    this.logMessage(`  Entity-Document relationships: ${validation.totalRelationships}`);
    this.logMessage(`  Timeline events: ${validation.totalEvents}`);
  }

  printStats() {
    this.logMessage('\n📈 Enhancement Statistics:');
    this.logMessage(`  Titles generated: ${this.stats.titlesGenerated}`);
    this.logMessage(`  Entities consolidated: ${this.stats.entitiesConsolidated}`);
    this.logMessage(`  Roles extracted: ${this.stats.rolesExtracted}`);
    this.logMessage(`  Relationships created: ${this.stats.relationshipsCreated}`);
    this.logMessage(`  Events created: ${this.stats.eventsCreated}`);
  }
}

// Run if called directly
if (require.main === module) {
  const pipeline = new DataEnhancementPipeline();
  pipeline.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = DataEnhancementPipeline;
