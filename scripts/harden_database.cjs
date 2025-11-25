#!/usr/bin/env node

/**
 * Database Hardening Script
 * 
 * Ensures data integrity, consistency, and high quality by:
 * 1. Fixing orphaned records
 * 2. Ensuring referential integrity
 * 3. Optimizing indexes
 * 4. Validating data relationships
 */

const Database = require('better-sqlite3');
const fs = require('fs');

const DB_PATH = './epstein-archive.db';
const LOG_FILE = './hardening_log.txt';

class DatabaseHardener {
  constructor() {
    this.db = new Database(DB_PATH);
    this.log = [];
  }

  logMessage(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    console.log(logEntry);
    this.log.push(logEntry);
  }

  run() {
    this.logMessage('🛡️ Starting Database Hardening...\n');
    
    try {
      this.db.pragma('foreign_keys = OFF'); // Temporarily disable for fixes
      
      this.fixOrphanedEntityMentions();
      this.fixOrphanedDocumentEnrichment();
      this.fixOrphanedTimelineEvents();
      this.fixOrphanedBlackBookEntries();
      this.ensureReferentialIntegrity();
      this.optimizeDatabase();
      
      this.db.pragma('foreign_keys = ON');
      
      fs.writeFileSync(LOG_FILE, this.log.join('\n'));
      this.logMessage('\n✅ Database Hardening Complete!');
      
    } catch (error) {
      this.logMessage(`❌ Hardening Failed: ${error.message}`);
      throw error;
    } finally {
      this.db.close();
    }
  }

  fixOrphanedEntityMentions() {
    this.logMessage('🔧 Fixing orphaned entity mentions...');
    
    // Check for mentions pointing to non-existent entities
    const orphans = this.db.prepare(`
      SELECT COUNT(*) as count 
      FROM entity_mentions 
      WHERE entity_id NOT IN (SELECT id FROM entities)
    `).get().count;
    
    if (orphans > 0) {
      this.logMessage(`  Found ${orphans} orphaned mentions. Deleting...`);
      this.db.prepare(`
        DELETE FROM entity_mentions 
        WHERE entity_id NOT IN (SELECT id FROM entities)
      `).run();
      this.logMessage('  ✓ Deleted orphaned mentions');
    } else {
      this.logMessage('  ✓ No orphaned mentions found');
    }
  }

  fixOrphanedDocumentEnrichment() {
    this.logMessage('🔧 Fixing orphaned document enrichment...');
    
    const orphans = this.db.prepare(`
      SELECT COUNT(*) as count 
      FROM document_enrichment 
      WHERE document_id NOT IN (SELECT id FROM documents)
    `).get().count;
    
    if (orphans > 0) {
      this.logMessage(`  Found ${orphans} orphaned enrichment records. Deleting...`);
      this.db.prepare(`
        DELETE FROM document_enrichment 
        WHERE document_id NOT IN (SELECT id FROM documents)
      `).run();
      this.logMessage('  ✓ Deleted orphaned enrichment records');
    } else {
      this.logMessage('  ✓ No orphaned enrichment records found');
    }
  }

  fixOrphanedTimelineEvents() {
    this.logMessage('🔧 Fixing orphaned timeline events...');
    
    // Fix events with invalid people_involved JSON
    const events = this.db.prepare(`
      SELECT id, people_involved 
      FROM timeline_events 
      WHERE people_involved IS NOT NULL
    `).all();
    
    let fixedCount = 0;
    
    for (const event of events) {
      try {
        const peopleIds = JSON.parse(event.people_involved);
        if (!Array.isArray(peopleIds)) continue;
        
        const validIds = peopleIds.filter(id => {
          const exists = this.db.prepare('SELECT 1 FROM entities WHERE id = ?').get(id);
          return !!exists;
        });
        
        if (validIds.length !== peopleIds.length) {
          this.db.prepare(`
            UPDATE timeline_events 
            SET people_involved = ? 
            WHERE id = ?
          `).run(JSON.stringify(validIds), event.id);
          fixedCount++;
        }
      } catch (e) {
        // Invalid JSON, set to empty array
        this.db.prepare(`
          UPDATE timeline_events 
          SET people_involved = '[]' 
          WHERE id = ?
        `).run(event.id);
        fixedCount++;
      }
    }
    
    if (fixedCount > 0) {
      this.logMessage(`  ✓ Fixed ${fixedCount} timeline events with invalid entity references`);
    } else {
      this.logMessage('  ✓ No orphaned timeline event references found');
    }
  }

  fixOrphanedBlackBookEntries() {
    this.logMessage('🔧 Fixing orphaned Black Book entries...');
    
    const orphans = this.db.prepare(`
      SELECT COUNT(*) as count 
      FROM black_book_entries 
      WHERE person_id NOT IN (SELECT id FROM people)
    `).get().count;
    
    if (orphans > 0) {
      this.logMessage(`  Found ${orphans} orphaned Black Book entries. Deleting...`);
      this.db.prepare(`
        DELETE FROM black_book_entries 
        WHERE person_id NOT IN (SELECT id FROM people)
      `).run();
      this.logMessage('  ✓ Deleted orphaned Black Book entries');
    } else {
      this.logMessage('  ✓ No orphaned Black Book entries found');
    }
  }

  ensureReferentialIntegrity() {
    this.logMessage('🔗 Ensuring referential integrity...');
    
    // Check for people without corresponding entities (if they are separate tables)
    // Assuming 'people' and 'entities' might be redundant or linked. 
    // If they are separate, we ensure consistency.
    
    // Check for duplicate entities by name
    const duplicates = this.db.prepare(`
      SELECT full_name, COUNT(*) as count 
      FROM entities 
      GROUP BY full_name 
      HAVING count > 1
    `).all();
    
    if (duplicates.length > 0) {
      this.logMessage(`  Found ${duplicates.length} duplicate entity names. Consolidating...`);
      // Logic to consolidate duplicates would go here, but for hardening we just report
      // or perform safe consolidation if implemented.
      // For now, we log it as an issue to be addressed by the consolidation script.
      this.logMessage('  ⚠️ Duplicates found. Run consolidation script to resolve.');
    } else {
      this.logMessage('  ✓ No duplicate entity names found');
    }
  }

  optimizeDatabase() {
    this.logMessage('🚀 Optimizing database...');
    
    this.db.exec('VACUUM;');
    this.logMessage('  ✓ Database vacuumed');
    
    this.db.exec('ANALYZE;');
    this.logMessage('  ✓ Database analyzed for query optimization');
    
    this.db.exec('REINDEX;');
    this.logMessage('  ✓ Indexes rebuilt');
  }
}

if (require.main === module) {
  const hardener = new DatabaseHardener();
  hardener.run();
}

module.exports = DatabaseHardener;
