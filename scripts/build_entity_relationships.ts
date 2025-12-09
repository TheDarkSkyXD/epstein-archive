#!/usr/bin/env tsx
/**
 * Build Entity Relationships
 * 
 * Creates co-occurrence relationships between entities that appear
 * in the same documents but don't have relationships yet.
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../epstein-archive.db');
const DRY_RUN = process.argv.includes('--dry-run');
const BATCH_SIZE = 1000;

let stats = {
  newRelationships: 0,
  updatedRelationships: 0,
  entitiesProcessed: 0,
};

function buildRelationships(db: Database.Database): void {
  console.log('\n🔗 Building Entity Relationships from Document Co-occurrence\n');
  console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN' : '✏️  LIVE MODE'}\n`);
  
  // Get isolated entities (entities with mentions but no relationships)
  console.log('Finding isolated entities...');
  const isolatedEntities = db.prepare(`
    SELECT DISTINCT e.id, e.full_name, e.mentions
    FROM entities e
    INNER JOIN entity_mentions em ON em.entity_id = e.id
    WHERE e.entity_type = 'Person'
    AND NOT EXISTS (
      SELECT 1 FROM entity_relationships r 
      WHERE r.source_id = e.id OR r.target_id = e.id
    )
    ORDER BY e.mentions DESC
    LIMIT 5000
  `).all() as { id: number; full_name: string; mentions: number }[];
  
  console.log(`Found ${isolatedEntities.length} isolated entities with mentions\n`);
  
  // Prepare statements
  const findCoOccurrences = db.prepare(`
    SELECT 
      em2.entity_id as other_id,
      COUNT(DISTINCT em1.document_id) as co_occurrence_count
    FROM entity_mentions em1
    INNER JOIN entity_mentions em2 ON em1.document_id = em2.document_id
    INNER JOIN entities e2 ON em2.entity_id = e2.id
    WHERE em1.entity_id = ?
    AND em2.entity_id != ?
    AND e2.entity_type = 'Person'
    GROUP BY em2.entity_id
    HAVING co_occurrence_count >= 2
    ORDER BY co_occurrence_count DESC
    LIMIT 50
  `);
  
  const checkExisting = db.prepare(`
    SELECT id, weight FROM entity_relationships 
    WHERE (source_id = ? AND target_id = ?) OR (source_id = ? AND target_id = ?)
  `);
  
  const insertRelationship = db.prepare(`
    INSERT INTO entity_relationships (source_id, target_id, weight, relationship_type)
    VALUES (?, ?, ?, 'co_occurrence')
  `);
  
  const updateRelationship = db.prepare(`
    UPDATE entity_relationships SET weight = weight + ? WHERE id = ?
  `);
  
  let processed = 0;
  
  for (const entity of isolatedEntities) {
    const coOccurrences = findCoOccurrences.all(entity.id, entity.id) as { other_id: number; co_occurrence_count: number }[];
    
    for (const co of coOccurrences) {
      const existing = checkExisting.get(entity.id, co.other_id, co.other_id, entity.id) as any;
      
      if (!DRY_RUN) {
        if (existing) {
          updateRelationship.run(co.co_occurrence_count, existing.id);
          stats.updatedRelationships++;
        } else {
          insertRelationship.run(entity.id, co.other_id, co.co_occurrence_count);
          stats.newRelationships++;
        }
      } else {
        if (existing) {
          stats.updatedRelationships++;
        } else {
          stats.newRelationships++;
        }
      }
    }
    
    processed++;
    stats.entitiesProcessed++;
    
    if (processed % 500 === 0) {
      console.log(`   Processed ${processed}/${isolatedEntities.length} entities...`);
    }
  }
  
  console.log(`   Processed ${processed}/${isolatedEntities.length} entities`);
}

function verifyRelationships(db: Database.Database): void {
  console.log('\n📊 Verification...');
  
  const totalRel = db.prepare(`SELECT COUNT(*) as count FROM entity_relationships`).get() as { count: number };
  const avgWeight = db.prepare(`SELECT AVG(weight) as avg FROM entity_relationships`).get() as { avg: number };
  const stillIsolated = db.prepare(`
    SELECT COUNT(*) as count FROM entities e
    WHERE e.entity_type = 'Person'
    AND NOT EXISTS (
      SELECT 1 FROM entity_relationships r 
      WHERE r.source_id = e.id OR r.target_id = e.id
    )
  `).get() as { count: number };
  
  console.log(`   Total relationships: ${totalRel.count.toLocaleString()}`);
  console.log(`   Average weight: ${avgWeight.avg?.toFixed(1) || 0}`);
  console.log(`   Still isolated: ${stillIsolated.count.toLocaleString()}`);
}

async function main() {
  console.log('🔗 Entity Relationship Builder\n');
  console.log(`Database: ${DB_PATH}`);
  
  const db = new Database(DB_PATH);
  
  try {
    db.exec('BEGIN TRANSACTION');
    
    buildRelationships(db);
    
    if (!DRY_RUN) {
      db.exec('COMMIT');
    } else {
      db.exec('ROLLBACK');
      console.log('\n🔍 DRY RUN - No changes committed');
    }
    
    verifyRelationships(db);
    
    console.log('\n' + '═'.repeat(50));
    console.log(`\n📋 Summary${DRY_RUN ? ' (DRY RUN)' : ''}`);
    console.log(`   Entities processed:     ${stats.entitiesProcessed}`);
    console.log(`   New relationships:      ${stats.newRelationships}`);
    console.log(`   Updated relationships:  ${stats.updatedRelationships}`);
    console.log('\n' + '═'.repeat(50));
    
  } catch (error) {
    db.exec('ROLLBACK');
    console.error('\n❌ Error:', error);
    throw error;
  } finally {
    db.close();
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
