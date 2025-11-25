#!/usr/bin/env node

/**
 * Comprehensive Data Enhancement Pipeline
 * Optimized for large datasets (45K+ entities)
 * 
 * Phases:
 * 1. Entity consolidation (merge duplicates)
 * 2. Role/title extraction
 * 3. Entity-document linking
 * 4. Timeline enhancement
 * 5. Quality validation
 */

const Database = require('better-sqlite3');
const fs = require('fs');

const DB_PATH = './epstein-archive.db';
const BATCH_SIZE = 1000;

class ComprehensiveEnhancer {
  constructor() {
    this.db = new Database(DB_PATH);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.stats = {
      duplicatesMerged: 0,
      rolesExtracted: 0,
      relationshipsCreated: 0,
      eventsEnhanced: 0,
      qualityIssues: 0
    };
  }

  async run() {
    console.log('🚀 Starting Comprehensive Data Enhancement...\n');
    console.log('Dataset: 45,018 people, 2,330 documents, 1,417 Black Book entries\n');
    
    try {
      // Phase 1: Entity Consolidation
      console.log('📋 Phase 1: Entity Consolidation');
      await this.consolidateDuplicates();
      
      // Phase 2: Role & Title Extraction
      console.log('\n👤 Phase 2: Role & Title Extraction');
      await this.extractRolesAndTitles();
      
      // Phase 3: Entity-Document Linking
      console.log('\n🔗 Phase 3: Entity-Document Linking');
      await this.createEntityDocumentLinks();
      
      // Phase 4: Timeline Enhancement
      console.log('\n📅 Phase 4: Timeline Enhancement');
      await this.enhanceTimelineEvents();
      
      // Phase 5: Quality Validation
      console.log('\n✅ Phase 5: Quality Validation');
      await this.validateQuality();
      
      // Generate Report
      this.generateReport();
      
      console.log('\n✨ Enhancement Complete!');
      
    } catch (error) {
      console.error('❌ Enhancement Failed:', error);
      console.error(error.stack);
      throw error;
    } finally {
      this.db.close();
    }
  }

  async consolidateDuplicates() {
    console.log('  Finding duplicate entities...');
    
    // Group by normalized name
    const duplicates = this.db.prepare(`
      SELECT 
        LOWER(REPLACE(REPLACE(REPLACE(full_name, ',', ''), '.', ''), '  ', ' ')) as normalized,
        GROUP_CONCAT(id) as ids,
        COUNT(*) as count
      FROM people
      GROUP BY normalized
      HAVING count > 1
      ORDER BY count DESC
      LIMIT 500
    `).all();
    
    console.log(`  Found ${duplicates.length} groups of duplicates`);
    
    let merged = 0;
    for (const group of duplicates) {
      const ids = group.ids.split(',').map(Number);
      await this.mergeEntities(ids);
      merged += ids.length - 1;
      
      if (merged % 100 === 0) {
        console.log(`    Merged ${merged} duplicates...`);
      }
    }
    
    this.stats.duplicatesMerged = merged;
    console.log(`  ✓ Merged ${merged} duplicate entities`);
  }

  async mergeEntities(ids) {
    // Keep the one with highest quality score or most mentions
    const people = this.db.prepare(`
      SELECT p.*, 
             (SELECT COUNT(*) FROM entity_mentions em WHERE em.entity_id = p.entity_id) as mention_count
      FROM people p
      WHERE p.id IN (${ids.join(',')})
    `).all();
    
    const primary = people.reduce((best, current) => {
      if (!best) return current;
      if (current.quality_score > best.quality_score) return current;
      if (current.mention_count > best.mention_count) return current;
      return best;
    });
    
    const toMerge = people.filter(p => p.id !== primary.id);
    
    // Merge entity_mentions
    for (const dup of toMerge) {
      if (dup.entity_id) {
        this.db.prepare(`
          UPDATE entity_mentions 
          SET entity_id = ?
          WHERE entity_id = ?
        `).run(primary.entity_id, dup.entity_id);
      }
      
      // Delete duplicate
      this.db.prepare('DELETE FROM people WHERE id = ?').run(dup.id);
    }
    
    // Mark as consolidated
    this.db.prepare(`
      UPDATE people 
      SET is_consolidated = 1,
          quality_score = quality_score + 10
      WHERE id = ?
    `).run(primary.id);
    
    // Log consolidation
    this.db.prepare(`
      INSERT INTO data_quality_log (operation, entity_id, details)
      VALUES ('consolidation', ?, ?)
    `).run(primary.id, `Merged ${toMerge.length} duplicates`);
  }

  async extractRolesAndTitles() {
    console.log('  Extracting roles from entity mentions...');
    
    const batch = this.db.prepare(`
      SELECT DISTINCT p.id, p.full_name, em.context_text
      FROM people p
      JOIN entity_mentions em ON p.entity_id = em.entity_id
      WHERE (p.primary_title IS NULL OR p.primary_title = '')
      AND em.context_text IS NOT NULL
      AND em.context_text != ''
      LIMIT ?
    `);
    
    const update = this.db.prepare(`
      UPDATE people 
      SET primary_title = ?, primary_role = ?, quality_score = quality_score + 5
      WHERE id = ?
    `);
    
    let processed = 0;
    let extracted = 0;
    
    while (true) {
      const people = batch.all(BATCH_SIZE);
      if (people.length === 0) break;
      
      for (const person of people) {
        const { title, role } = this.extractRoleFromContext(person.full_name, person.context_text);
        
        if (title || role) {
          update.run(title, role, person.id);
          extracted++;
        }
        
        processed++;
      }
      
      console.log(`    Processed ${processed} people, extracted ${extracted} roles...`);
    }
    
    this.stats.rolesExtracted = extracted;
    console.log(`  ✓ Extracted ${extracted} roles/titles`);
  }

  extractRoleFromContext(name, context) {
    if (!context) return { title: null, role: null };
    
    // Common title patterns
    const titlePatterns = [
      { pattern: /\b(President|CEO|CFO|COO|CTO|Chairman|Director|Manager|Executive|Attorney|Lawyer|Dr\.|Professor|Senator|Representative|Governor|Ambassador|Prince|Princess|Duke|Duchess|Lord|Lady|Sir|Dame)\b/i, type: 'title' },
      { pattern: new RegExp(`${name},?\\s+(President|CEO|Attorney|Director|Manager)`, 'i'), type: 'title_after_name' },
      { pattern: /(President|CEO|Attorney|Director|Manager)\\s+${name}/i, type: 'title_before_name' }
    ];
    
    for (const { pattern, type } of titlePatterns) {
      const match = context.match(pattern);
      if (match) {
        const title = match[1];
        return {
          title: title,
          role: this.categorizeRole(title)
        };
      }
    }
    
    return { title: null, role: null };
  }

  categorizeRole(title) {
    const categories = {
      'Political': ['President', 'Senator', 'Representative', 'Governor', 'Ambassador'],
      'Legal': ['Attorney', 'Lawyer', 'Judge'],
      'Business': ['CEO', 'CFO', 'COO', 'CTO', 'Chairman', 'Director', 'Manager', 'Executive'],
      'Academic': ['Professor', 'Dr.', 'Dean'],
      'Royalty': ['Prince', 'Princess', 'Duke', 'Duchess', 'Lord', 'Lady', 'Sir', 'Dame']
    };
    
    for (const [category, titles] of Object.entries(categories)) {
      if (titles.some(t => title.toLowerCase().includes(t.toLowerCase()))) {
        return category;
      }
    }
    
    return 'Other';
  }

  async createEntityDocumentLinks() {
    console.log('  Creating entity-document relationships...');
    
    // Clear existing (we'll rebuild)
    this.db.prepare('DELETE FROM entity_documents').run();
    
    const links = this.db.prepare(`
      SELECT 
        p.id as person_id,
        em.document_id,
        em.context_text,
        COUNT(*) as mention_count
      FROM people p
      JOIN entity_mentions em ON p.entity_id = em.entity_id
      GROUP BY p.id, em.document_id
    `).all();
    
    console.log(`  Found ${links.length} entity-document pairs`);
    
    const insert = this.db.prepare(`
      INSERT INTO entity_documents (entity_id, document_id, role_in_document, mention_count, context_snippets)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const insertMany = this.db.transaction((links) => {
      for (const link of links) {
        insert.run(
          link.person_id,
          link.document_id,
          'mentioned', // Could be enhanced with role detection
          link.mention_count,
          JSON.stringify([link.context_text])
        );
      }
    });
    
    insertMany(links);
    
    this.stats.relationshipsCreated = links.length;
    console.log(`  ✓ Created ${links.length} entity-document relationships`);
  }

  async enhanceTimelineEvents() {
    console.log('  Enhancing timeline events...');
    
    // Update existing events with better titles
    const events = this.db.prepare(`
      SELECT id, event_type, title, description, event_date
      FROM timeline_events
      WHERE title LIKE '%DOC%' OR title LIKE '%EPSTEIN%'
      LIMIT 500
    `).all();
    
    const update = this.db.prepare(`
      UPDATE timeline_events
      SET title = ?, significance_score = ?
      WHERE id = ?
    `);
    
    let enhanced = 0;
    for (const event of events) {
      const newTitle = this.generateEventTitle(event);
      const significance = this.calculateSignificance(event);
      
      if (newTitle !== event.title) {
        update.run(newTitle, significance, event.id);
        enhanced++;
      }
    }
    
    this.stats.eventsEnhanced = enhanced;
    console.log(`  ✓ Enhanced ${enhanced} timeline events`);
  }

  generateEventTitle(event) {
    const { event_type, description, event_date } = event;
    
    // Extract key information from description
    if (event_type === 'travel' && description) {
      const match = description.match(/flight|passenger|travel/i);
      if (match) return `Flight Record - ${event_date}`;
    }
    
    if (event_type === 'legal' && description) {
      return `Legal Document - ${event_date}`;
    }
    
    if (event_type === 'communication' && description) {
      return `Communication - ${event_date}`;
    }
    
    return `Event - ${event_date}`;
  }

  calculateSignificance(event) {
    let score = 5; // Base score
    
    // Increase for certain types
    if (event.event_type === 'legal') score += 3;
    if (event.event_type === 'travel') score += 2;
    
    // Increase if description mentions key terms
    if (event.description) {
      const keywords = ['deposition', 'flight', 'testimony', 'agreement', 'contract'];
      for (const keyword of keywords) {
        if (event.description.toLowerCase().includes(keyword)) {
          score += 1;
        }
      }
    }
    
    return Math.min(score, 10);
  }

  async validateQuality() {
    console.log('  Running quality checks...');
    
    const checks = {
      peopleWithoutDocuments: this.db.prepare(`
        SELECT COUNT(*) as count
        FROM people p
        LEFT JOIN entity_documents ed ON p.id = ed.entity_id
        WHERE ed.id IS NULL
      `).get().count,
      
      peopleWithoutRoles: this.db.prepare(`
        SELECT COUNT(*) as count
        FROM people
        WHERE (primary_title IS NULL OR primary_title = '')
        AND entity_id IS NOT NULL
      `).get().count,
      
      documentsWithoutEntities: this.db.prepare(`
        SELECT COUNT(*) as count
        FROM documents d
        LEFT JOIN entity_documents ed ON d.id = ed.document_id
        WHERE ed.id IS NULL
      `).get().count
    };
    
    console.log(`\n  Quality Metrics:`);
    console.log(`    People without documents: ${checks.peopleWithoutDocuments}`);
    console.log(`    People without roles: ${checks.peopleWithoutRoles}`);
    console.log(`    Documents without entities: ${checks.documentsWithoutEntities}`);
    
    this.stats.qualityIssues = checks.peopleWithoutDocuments + checks.peopleWithoutRoles + checks.documentsWithoutEntities;
    
    // Mark people needing review
    this.db.prepare(`
      UPDATE people
      SET needs_review = 1
      WHERE id IN (
        SELECT p.id
        FROM people p
        LEFT JOIN entity_documents ed ON p.id = ed.entity_id
        WHERE ed.id IS NULL
      )
    `).run();
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      stats: this.stats,
      database: {
        totalPeople: this.db.prepare('SELECT COUNT(*) as count FROM people').get().count,
        totalDocuments: this.db.prepare('SELECT COUNT(*) as count FROM documents').get().count,
        totalRelationships: this.db.prepare('SELECT COUNT(*) as count FROM entity_documents').get().count,
        totalEvents: this.db.prepare('SELECT COUNT(*) as count FROM timeline_events').get().count,
        blackBookEntries: this.db.prepare('SELECT COUNT(*) as count FROM black_book_entries').get().count
      },
      quality: {
        peopleWithRoles: this.db.prepare('SELECT COUNT(*) as count FROM people WHERE primary_title IS NOT NULL AND primary_title != ""').get().count,
        peopleWithDocuments: this.db.prepare('SELECT COUNT(DISTINCT entity_id) as count FROM entity_documents').get().count,
        consolidated: this.db.prepare('SELECT COUNT(*) as count FROM people WHERE is_consolidated = 1').get().count
      }
    };
    
    console.log('\n📊 Final Report:');
    console.log('================');
    console.log(`\nEnhancement Statistics:`);
    console.log(`  Duplicates merged: ${report.stats.duplicatesMerged}`);
    console.log(`  Roles extracted: ${report.stats.rolesExtracted}`);
    console.log(`  Relationships created: ${report.stats.relationshipsCreated}`);
    console.log(`  Events enhanced: ${report.stats.eventsEnhanced}`);
    
    console.log(`\nDatabase Totals:`);
    console.log(`  People: ${report.database.totalPeople.toLocaleString()}`);
    console.log(`  Documents: ${report.database.totalDocuments.toLocaleString()}`);
    console.log(`  Entity-Document Links: ${report.database.totalRelationships.toLocaleString()}`);
    console.log(`  Timeline Events: ${report.database.totalEvents.toLocaleString()}`);
    console.log(`  Black Book Entries: ${report.database.blackBookEntries.toLocaleString()}`);
    
    console.log(`\nQuality Metrics:`);
    console.log(`  People with roles: ${report.quality.peopleWithRoles.toLocaleString()} (${Math.round(report.quality.peopleWithRoles / report.database.totalPeople * 100)}%)`);
    console.log(`  People with documents: ${report.quality.peopleWithDocuments.toLocaleString()} (${Math.round(report.quality.peopleWithDocuments / report.database.totalPeople * 100)}%)`);
    console.log(`  Consolidated entities: ${report.quality.consolidated.toLocaleString()}`);
    
    // Save report
    fs.writeFileSync('enhancement_report.json', JSON.stringify(report, null, 2));
    console.log(`\n📄 Report saved to enhancement_report.json`);
  }
}

// Run if called directly
if (require.main === module) {
  const enhancer = new ComprehensiveEnhancer();
  enhancer.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = ComprehensiveEnhancer;
