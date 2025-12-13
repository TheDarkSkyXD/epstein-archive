#!/usr/bin/env tsx
/**
 * Smart Entity Consolidation & Cleanup
 * 
 * 1. Merges specific known duplicates (e.g. Steve Bannon variants)
 * 2. Scans database for case-insensitive duplicates and merges them
 * 3. Prioritizes "Known Entities" casing and metadata
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../epstein-archive-production.db');
const DRY_RUN = process.argv.includes('--dry-run');

// High priority forced merges
const FORCED_MERGES = [
  {
    target: 'Stephen K. Bannon',
    role: 'Political Advisor', 
    primary_role: 'Political Advisor',
    title: 'Former White House Strategist',
    sources: [
      'Steve Bannon', 
      'Stephen Bannon', 
      'Mr. Bannon', 
      'Bannon Steve', 
      'S. Bannon',
      'President Bannon',
      'Steve Bannon Was',
      'Steve Bannon White',
      'Bannon Trump',
      'Maybe Steve Bannon'
    ]
  },
  {
    target: 'Donald Trump',
    sources: ['Trump Donald', 'D. Trump', 'President Trump', 'Donald J. Trump', 'Donald J Trump']
  },
  {
    target: 'Bill Clinton',
    sources: ['Clinton Bill', 'William Clinton', 'President Clinton', 'William J. Clinton']
  },
  {
    target: 'Hillary Clinton',
    sources: ['Clinton Hillary', 'H. Clinton', 'Secretary Clinton']
  },
  {
    target: 'Jeffrey Epstein',
    sources: ['Epstein Jeffrey', 'J. Epstein', 'Jeff Epstein', 'Mr. Epstein']
  },
   {
    target: 'Ghislaine Maxwell',
    sources: ['G. Maxwell', 'Maxwell Ghislaine', 'Ms. Maxwell']
  },
   {
    target: 'Virginia Giuffre',
    sources: ['Virginia Roberts', 'Virginia Roberts Giuffre', 'Ms. Giuffre', 'Ms. Roberts']
  }
];

// Load known entities for casing authority
const KNOWN_CASING = new Set([
  'Leonardo DiCaprio', 'McDonough', 'MacKenzie', 'DeGeneres', 'McCain', 'McConnell',
  'McDonald', 'McKinsey', 'MacDonald', 'iPad', 'iPhone', 'eBay', 'PayPal',
  'YouTube', 'LinkedIn', 'WhatsApp', 'FedEx', 'JetBlue', 'PowerPoint',
  'HarperCollins', 'McGraw-Hill', 'Mercedes-Benz', 'Coca-Cola', 'Wal-Mart',
  'BestBuy', 'PlayStation', 'GameStop', 'MasterCard', 'Visa', 'AmericanExpress'
]);

// Add all forced merge targets to known casing
FORCED_MERGES.forEach(m => KNOWN_CASING.add(m.target));

let stats = {
  mergedGroups: 0,
  entitiesRemoved: 0,
  mentionsMoved: 0,
  verifyDiff: 0
};

function consolidateEntities(db: Database.Database) {
  console.log('\n🔄 Smart Entity Consolidation\n');
  console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN' : '✏️  LIVE MODE'}\n`);

  // 1. Execute Forced Merges
  console.log('--- Phase 1: Forced Merges ---\n');
  const findEntity = db.prepare('SELECT id, full_name, mentions FROM entities WHERE full_name = ? COLLATE NOCASE');
  const insertEntity = db.prepare('INSERT INTO entities (full_name, role, primary_role, title, mentions, entity_type) VALUES (?, ?, ?, ?, 0, \'Person\')');
  
  for (const merge of FORCED_MERGES) {
    let targetId: number | bigint;
    let target = findEntity.get(merge.target) as any;
    
    // Ensure target exists
    if (!target) {
      console.log(`Creating target entity: ${merge.target}`);
      if (!DRY_RUN) {
        const info = insertEntity.run(merge.target, merge.role || 'Unknown', merge.primary_role || 'Unknown', merge.title || '');
        targetId = info.lastInsertRowid;
      } else {
        targetId = 0; // dummy
      }
    } else {
      targetId = target.id;
      // Update role/title if provided and better
      if (merge.role && !DRY_RUN) {
         db.prepare('UPDATE entities SET role = ?, primary_role = ?, title = ? WHERE id = ?')
           .run(merge.role, merge.primary_role, merge.title, targetId);
      }
    }

    // Merge sources
    for (const sourceName of merge.sources) {
       mergeEntities(db, targetId, sourceName, merge.target);
    }
  }

  // 2. Discover and Merge Case-Insensitive Duplicates
  console.log('\n--- Phase 2: Case-Insensitive Deduplication ---\n');
  
  // Get all entities to process in memory (faster than self-join for 46k)
  const allEntities = db.prepare('SELECT id, full_name, mentions FROM entities').all() as any[];
  
  // Group by normalized name
  const groups = new Map<string, any[]>();
  
  for (const ent of allEntities) {
    const normalized = ent.full_name.toLowerCase().trim().replace(/\s+/g, ' ');
    if (!groups.has(normalized)) {
      groups.set(normalized, []);
    }
    groups.get(normalized)!.push(ent);
  }
  
  // Process groups with > 1 entity
  for (const [key, entities] of groups.entries()) {
    if (entities.length < 2) continue;
    
    // Sort to find the best target
    // 1. Is in KNOWN_CASING?
    // 2. Has most mentions?
    // 3. Has mixed case (checking for uppercased/lowercased junk)?
    entities.sort((a, b) => {
      const aKnown = KNOWN_CASING.has(a.full_name);
      const bKnown = KNOWN_CASING.has(b.full_name);
      if (aKnown && !bKnown) return -1;
      if (!aKnown && bKnown) return 1;
      
      const aMentions = a.mentions || 0;
      const bMentions = b.mentions || 0;
      if (aMentions !== bMentions) return bMentions - aMentions; // Descending mentions warning: wait this puts highest first
      
      // Heuristic: Mixed case > All Upper > All Lower
      const aScore = getCasingScore(a.full_name);
      const bScore = getCasingScore(b.full_name);
      return bScore - aScore;
    });
    
    const target = entities[0];
    const duplicates = entities.slice(1);
    
    console.log(`Merging into "${target.full_name}" (${target.mentions || 0}):`);
    for (const dup of duplicates) {
      console.log(`  - "${dup.full_name}" (${dup.mentions || 0})`);
      mergeEntities(db, target.id, dup.full_name, target.full_name, dup.id);
    }
    stats.mergedGroups++;
  }
  
  // 3. Fix Entity Counts
  console.log('\n--- Phase 3: Recalculating Counts ---\n');
  if (!DRY_RUN) {
    db.prepare(`
        UPDATE entities 
        SET mentions = (
            SELECT COUNT(*) 
            FROM entity_mentions 
            WHERE entity_mentions.entity_id = entities.id
        )
    `).run();
  }
}

function mergeEntities(db: Database.Database, targetId: number | bigint, sourceName: string, targetName: string, sourceIdParam?: number | bigint) {
   let sourceId = sourceIdParam;
   
   if (!sourceId) {
       const source = db.prepare('SELECT id, mentions FROM entities WHERE full_name = ?').get(sourceName) as any;
       if (!source) return;
       sourceId = source.id;
   }
   
   // Don't merge self
   if (sourceId === targetId) return;

   if (!DRY_RUN) {
     try {
       // Move mentions
       const result = db.prepare('UPDATE entity_mentions SET entity_id = ? WHERE entity_id = ?').run(targetId, sourceId);
       stats.mentionsMoved += result.changes;
       
       // Move relationships
        db.prepare(`UPDATE OR IGNORE entity_relationships SET source_entity_id = ? WHERE source_entity_id = ?`).run(targetId, sourceId);
        db.prepare(`UPDATE OR IGNORE entity_relationships SET target_entity_id = ? WHERE target_entity_id = ?`).run(targetId, sourceId);
        
        // Cleanup old entity
        db.prepare('DELETE FROM entity_evidence_types WHERE entity_id = ?').run(sourceId);
        db.prepare('DELETE FROM entity_relationships WHERE source_entity_id = ? OR target_entity_id = ?').run(sourceId, sourceId);
        db.prepare('DELETE FROM entities WHERE id = ?').run(sourceId);
        
        stats.entitiesRemoved++;
     } catch (err) {
       console.error(`Error merging ${sourceName} -> ${targetName}:`, err);
     }
   }
}

function getCasingScore(str: string): number {
  if (str === str.toLowerCase()) return 0; // all lower
  if (str === str.toUpperCase()) return 1; // all upper
  return 2; // mixed case
}


function dropFTS(db: Database.Database) {
  console.log('dropping FTS tables...');
  db.exec(`
    DROP TRIGGER IF EXISTS entities_fts_insert;
    DROP TRIGGER IF EXISTS entities_fts_update;
    DROP TRIGGER IF EXISTS entities_fts_delete;
    DROP TABLE IF EXISTS entities_fts;
    DROP TABLE IF EXISTS entities_fts_data;
    DROP TABLE IF EXISTS entities_fts_idx;
    DROP TABLE IF EXISTS entities_fts_content;
    DROP TABLE IF EXISTS entities_fts_docsize;
    DROP TABLE IF EXISTS entities_fts_config;
  `);
}

function rebuildFTS(db: Database.Database) {
  console.log('rebuilding FTS tables...');
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS entities_fts USING fts5(
      name,
      role,
      title,
      content='entities',
      content_rowid='id'
    );
    
    INSERT INTO entities_fts(rowid, name, role, title)
    SELECT id, full_name, role, title FROM entities;

    CREATE TRIGGER entities_fts_insert AFTER INSERT ON entities BEGIN
      INSERT INTO entities_fts(rowid, name, role, title) VALUES (new.id, new.full_name, new.role, new.title);
    END;
    CREATE TRIGGER entities_fts_delete AFTER DELETE ON entities BEGIN
      INSERT INTO entities_fts(entities_fts, rowid, name, role, title) VALUES('delete', old.id, old.full_name, old.role, old.title);
    END;
    CREATE TRIGGER entities_fts_update AFTER UPDATE ON entities BEGIN
      INSERT INTO entities_fts(entities_fts, rowid, name, role, title) VALUES('delete', old.id, old.full_name, old.role, old.title);
      INSERT INTO entities_fts(rowid, name, role, title) VALUES (new.id, new.full_name, new.role, new.title);
    END;
  `);
}

function main() {
    const db = new Database(DB_PATH);
    // Disable FK for easier merging
    db.pragma('foreign_keys = OFF');
    
    try {
        if (!DRY_RUN) dropFTS(db);
        
        db.exec('BEGIN TRANSACTION');
        consolidateEntities(db);
        
        if (!DRY_RUN) {
            db.exec('COMMIT');
            rebuildFTS(db);
            db.exec('VACUUM');
        } else {
            db.exec('ROLLBACK');
            console.log('\nRolled back (Dry Run)');
        }
        
        console.log('\nSummary:');
        console.log(`Duplicate Groups Merged: ${stats.mergedGroups}`);
        console.log(`Entities Removed: ${stats.entitiesRemoved}`);
        console.log(`Mentions Moved: ${stats.mentionsMoved}`);
        
    } catch (error) {
        console.error('Fatal error:', error);
        db.exec('ROLLBACK');
    } finally {
        db.close();
    }
}

main();
