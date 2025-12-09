#!/usr/bin/env tsx
/**
 * Database Performance Optimization
 * 
 * Adds indexes for common query patterns and runs ANALYZE
 * to update query planner statistics.
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../epstein-archive.db');

const INDEXES_TO_CREATE = [
  // Entity queries
  { table: 'entities', columns: ['entity_type'], name: 'idx_entities_type' },
  { table: 'entities', columns: ['mentions'], name: 'idx_entities_mentions' },
  { table: 'entities', columns: ['primary_role'], name: 'idx_entities_role' },
  { table: 'entities', columns: ['full_name'], name: 'idx_entities_name' },
  
  // Relationship queries  
  { table: 'entity_relationships', columns: ['source_id'], name: 'idx_relationships_source' },
  { table: 'entity_relationships', columns: ['target_id'], name: 'idx_relationships_target' },
  { table: 'entity_relationships', columns: ['weight'], name: 'idx_relationships_weight' },
  
  // Mention queries
  { table: 'entity_mentions', columns: ['entity_id'], name: 'idx_mentions_entity' },
  { table: 'entity_mentions', columns: ['document_id'], name: 'idx_mentions_document' },
  { table: 'entity_mentions', columns: ['entity_id', 'document_id'], name: 'idx_mentions_entity_doc' },
  
  // Document queries
  { table: 'documents', columns: ['evidence_type'], name: 'idx_documents_type' },
  { table: 'documents', columns: ['date_created'], name: 'idx_documents_date' },
  
  // People table
  { table: 'people', columns: ['entity_id'], name: 'idx_people_entity' },
  { table: 'people', columns: ['full_name'], name: 'idx_people_name' },
];

function createIndexes(db: Database.Database): void {
  console.log('\n📊 Creating Performance Indexes...\n');
  
  let created = 0;
  let existing = 0;
  let failed = 0;
  
  for (const idx of INDEXES_TO_CREATE) {
    const columns = idx.columns.join(', ');
    const sql = `CREATE INDEX IF NOT EXISTS ${idx.name} ON ${idx.table}(${columns})`;
    
    try {
      // Check if exists
      const exists = db.prepare(`
        SELECT 1 FROM sqlite_master 
        WHERE type = 'index' AND name = ?
      `).get(idx.name);
      
      if (exists) {
        console.log(`   ⏭️  ${idx.name} (already exists)`);
        existing++;
      } else {
        db.exec(sql);
        console.log(`   ✅ ${idx.name} ON ${idx.table}(${columns})`);
        created++;
      }
    } catch (error: any) {
      console.log(`   ❌ ${idx.name}: ${error.message}`);
      failed++;
    }
  }
  
  console.log(`\n   Created: ${created}, Existing: ${existing}, Failed: ${failed}`);
}

function runAnalyze(db: Database.Database): void {
  console.log('\n📈 Running ANALYZE for query optimization...');
  db.exec('ANALYZE');
  console.log('   ✅ Statistics updated');
}

function runVacuum(db: Database.Database): void {
  console.log('\n🧹 Running VACUUM to reclaim space...');
  db.exec('VACUUM');
  console.log('   ✅ Database compacted');
}

function showStats(db: Database.Database): void {
  console.log('\n📊 Database Statistics:\n');
  
  const tables = db.prepare(`
    SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
  `).all() as { name: string }[];
  
  for (const table of tables.slice(0, 15)) {
    try {
      const count = db.prepare(`SELECT COUNT(*) as count FROM "${table.name}"`).get() as { count: number };
      console.log(`   ${table.name}: ${count.count.toLocaleString()} rows`);
    } catch {
      // Skip virtual tables
    }
  }
  
  // Index count
  const indexes = db.prepare(`
    SELECT COUNT(*) as count FROM sqlite_master WHERE type = 'index'
  `).get() as { count: number };
  
  console.log(`\n   Total indexes: ${indexes.count}`);
}

async function main() {
  console.log('⚡ Database Performance Optimization\n');
  console.log(`Database: ${DB_PATH}`);
  
  const db = new Database(DB_PATH);
  
  try {
    createIndexes(db);
    runAnalyze(db);
    showStats(db);
    
    console.log('\n' + '═'.repeat(50));
    console.log('\n✅ Optimization complete!');
    console.log('\n' + '═'.repeat(50));
    
  } catch (error) {
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
