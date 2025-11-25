#!/usr/bin/env node

/**
 * Focused Data Enhancement
 * Priority: Entity-Document Linking (critical for PersonCards)
 */

const Database = require('better-sqlite3');
const fs = require('fs');

const DB_PATH = './epstein-archive.db';

class FocusedEnhancer {
  constructor() {
    this.db = new Database(DB_PATH);
    this.db.pragma('journal_mode = WAL');
    this.stats = {
      relationshipsCreated: 0,
      duplicatesMerged: 0
    };
  }

  async run() {
    console.log('🚀 Starting Focused Data Enhancement...\n');
    
    try {
      // Priority 1: Entity-Document Linking (fixes PersonCard empty documents)
      console.log('🔗 Phase 1: Creating Entity-Document Links');
      await this.createEntityDocumentLinks();
      
      // Priority 2: Basic Consolidation
      console.log('\n📋 Phase 2: Basic Entity Consolidation');
      await this.consolidateObviousDuplicates();
      
      // Generate Report
      this.generateReport();
      
      console.log('\n✨ Enhancement Complete!');
      
    } catch (error) {
      console.error('❌ Enhancement Failed:', error);
      throw error;
    } finally {
      this.db.close();
    }
  }

  async createEntityDocumentLinks() {
    console.log('  Clearing existing links...');
    this.db.prepare('DELETE FROM entity_documents').run();
    
    console.log('  Building entity-document relationships...');
    
    // Direct insert from entity_mentions
    const result = this.db.prepare(`
      INSERT INTO entity_documents (entity_id, document_id, role_in_document, mention_count, context_snippets)
      SELECT 
        p.id as entity_id,
        em.document_id,
        'mentioned' as role_in_document,
        COUNT(*) as mention_count,
        json_group_array(SUBSTR(em.context_text, 1, 200)) as context_snippets
      FROM people p
      JOIN entity_mentions em ON p.entity_id = em.entity_id
      WHERE em.document_id IS NOT NULL
      GROUP BY p.id, em.document_id
    `).run();
    
    this.stats.relationshipsCreated = result.changes;
    console.log(`  ✓ Created ${result.changes.toLocaleString()} entity-document links`);
  }

  async consolidateObviousDuplicates() {
    console.log('  Finding exact name duplicates...');
    
    const duplicates = this.db.prepare(`
      SELECT 
        LOWER(TRIM(full_name)) as normalized,
        GROUP_CONCAT(id) as ids,
        COUNT(*) as count
      FROM people
      WHERE full_name IS NOT NULL AND full_name != ''
      GROUP BY normalized
      HAVING count > 1
      ORDER BY count DESC
      LIMIT 200
    `).all();
    
    console.log(`  Found ${duplicates.length} groups of exact duplicates`);
    
    let merged = 0;
    for (const group of duplicates) {
      const ids = group.ids.split(',').map(Number);
      this.mergeGroup(ids);
      merged += ids.length - 1;
    }
    
    this.stats.duplicatesMerged = merged;
    console.log(`  ✓ Merged ${merged} duplicate entities`);
  }

  mergeGroup(ids) {
    // Keep first, delete rest
    const primary = ids[0];
    const toDelete = ids.slice(1);
    
    // Update entity_mentions to point to primary
    for (const dupId of toDelete) {
      const dup = this.db.prepare('SELECT entity_id FROM people WHERE id = ?').get(dupId);
      if (dup && dup.entity_id) {
        const primaryEntity = this.db.prepare('SELECT entity_id FROM people WHERE id = ?').get(primary);
        if (primaryEntity && primaryEntity.entity_id) {
          this.db.prepare(`
            UPDATE entity_mentions 
            SET entity_id = ?
            WHERE entity_id = ?
          `).run(primaryEntity.entity_id, dup.entity_id);
        }
      }
      
      // Delete duplicate
      this.db.prepare('DELETE FROM people WHERE id = ?').run(dupId);
    }
    
    // Mark primary as consolidated
    this.db.prepare(`
      UPDATE people 
      SET is_consolidated = 1, quality_score = quality_score + 10
      WHERE id = ?
    `).run(primary);
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
        peopleWithDocuments: this.db.prepare('SELECT COUNT(DISTINCT entity_id) as count FROM entity_documents').get().count,
        consolidated: this.db.prepare('SELECT COUNT(*) as count FROM people WHERE is_consolidated = 1').get().count,
        peopleWithRoles: this.db.prepare('SELECT COUNT(*) as count FROM people WHERE primary_title IS NOT NULL AND primary_title != ""').get().count
      }
    };
    
    console.log('\n📊 Final Report:');
    console.log('================');
    console.log(`\nEnhancement Statistics:`);
    console.log(`  Entity-Document links created: ${report.stats.relationshipsCreated.toLocaleString()}`);
    console.log(`  Duplicates merged: ${report.stats.duplicatesMerged.toLocaleString()}`);
    
    console.log(`\nDatabase Totals:`);
    console.log(`  People: ${report.database.totalPeople.toLocaleString()}`);
    console.log(`  Documents: ${report.database.totalDocuments.toLocaleString()}`);
    console.log(`  Entity-Document Links: ${report.database.totalRelationships.toLocaleString()}`);
    console.log(`  Timeline Events: ${report.database.totalEvents.toLocaleString()}`);
    console.log(`  Black Book Entries: ${report.database.blackBookEntries.toLocaleString()}`);
    
    console.log(`\nQuality Metrics:`);
    console.log(`  People with documents: ${report.quality.peopleWithDocuments.toLocaleString()} (${Math.round(report.quality.peopleWithDocuments / report.database.totalPeople * 100)}%)`);
    console.log(`  Consolidated entities: ${report.quality.consolidated.toLocaleString()}`);
    console.log(`  People with roles: ${report.quality.peopleWithRoles.toLocaleString()}`);
    
    // Save report
    fs.writeFileSync('enhancement_report.json', JSON.stringify(report, null, 2));
    console.log(`\n📄 Report saved to enhancement_report.json`);
  }
}

// Run if called directly
if (require.main === module) {
  const enhancer = new FocusedEnhancer();
  enhancer.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = FocusedEnhancer;
