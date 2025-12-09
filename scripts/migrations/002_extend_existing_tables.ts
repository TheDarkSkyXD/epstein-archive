import Database from 'better-sqlite3';
import { join } from 'path';

/**
 * Migration 002: Extend Existing Tables
 * Adds columns to: entity_relationships, documents, entities
 */

const DB_PATH = join(process.cwd(), 'epstein-archive.db');

function columnExists(db: Database.Database, table: string, column: string): boolean {
  const result = db.prepare(`PRAGMA table_info(${table})`).all() as any[];
  return result.some(col => col.name === column);
}

function addColumnIfNotExists(
  db: Database.Database,
  table: string,
  column: string,
  type: string,
  defaultValue?: string
) {
  if (!columnExists(db, table, column)) {
    const defaultClause = defaultValue ? ` DEFAULT ${defaultValue}` : '';
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}${defaultClause}`);
    console.log(`  ✅ Added ${table}.${column}`);
    return true;
  } else {
    console.log(`  ⏭️  ${table}.${column} already exists`);
    return false;
  }
}

function runMigration() {
  console.log('🚀 Starting Migration 002: Extend Existing Tables');
  
  const db = new Database(DB_PATH);
  
  try {
    let addedCount = 0;
    
    // ============================================
    // entity_relationships extensions
    // ============================================
    console.log('\n📊 Extending entity_relationships table...');
    addedCount += addColumnIfNotExists(db, 'entity_relationships', 'proximity_score', 'REAL', '0') ? 1 : 0;
    addedCount += addColumnIfNotExists(db, 'entity_relationships', 'risk_score', 'REAL', '0') ? 1 : 0;
    addedCount += addColumnIfNotExists(db, 'entity_relationships', 'confidence', 'REAL', '0.5') ? 1 : 0;
    addedCount += addColumnIfNotExists(db, 'entity_relationships', 'first_seen_at', 'TEXT') ? 1 : 0;
    addedCount += addColumnIfNotExists(db, 'entity_relationships', 'last_seen_at', 'TEXT') ? 1 : 0;
    
    // ============================================
    // documents extensions
    // ============================================
    console.log('\n📄 Extending documents table...');
    addedCount += addColumnIfNotExists(db, 'documents', 'evidentiary_risk_score', 'REAL', '0') ? 1 : 0;
    addedCount += addColumnIfNotExists(db, 'documents', 'credibility_score', 'REAL', '0.5') ? 1 : 0;
    addedCount += addColumnIfNotExists(db, 'documents', 'sensitivity_flags', 'TEXT', "'{}'") ? 1 : 0;
    addedCount += addColumnIfNotExists(db, 'documents', 'source_collection', 'TEXT') ? 1 : 0;
    addedCount += addColumnIfNotExists(db, 'documents', 'source_original_url', 'TEXT') ? 1 : 0;
    
    // ============================================
    // entities extensions
    // ============================================
    console.log('\n👤 Extending entities table...');
    addedCount += addColumnIfNotExists(db, 'entities', 'aliases_json', 'TEXT', "'[]'") ? 1 : 0;
    addedCount += addColumnIfNotExists(db, 'entities', 'handles_json', 'TEXT', "'[]'") ? 1 : 0;
    addedCount += addColumnIfNotExists(db, 'entities', 'status_last_updated', 'TEXT') ? 1 : 0;
    addedCount += addColumnIfNotExists(db, 'entities', 'evidence_type_distribution', 'TEXT', "'{}'") ? 1 : 0;
    
    // ============================================
    // Create indexes
    // ============================================
    console.log('\n🔍 Creating indexes...');
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_entity_relationships_proximity ON entity_relationships(proximity_score DESC);
      CREATE INDEX IF NOT EXISTS idx_entity_relationships_risk ON entity_relationships(risk_score DESC);
      CREATE INDEX IF NOT EXISTS idx_entity_relationships_confidence ON entity_relationships(confidence DESC);
      CREATE INDEX IF NOT EXISTS idx_documents_risk ON documents(evidentiary_risk_score DESC);
      CREATE INDEX IF NOT EXISTS idx_documents_credibility ON documents(credibility_score DESC);
    `);
    
    const indexes = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='index' 
      AND name IN (
        'idx_entity_relationships_proximity',
        'idx_entity_relationships_risk',
        'idx_entity_relationships_confidence',
        'idx_documents_risk',
        'idx_documents_credibility'
      )
    `).all() as { name: string }[];
    
    console.log(`  ✅ Created ${indexes.length} new indexes`);
    
    console.log(`\n✅ Migration 002 completed successfully`);
    console.log(`   Added ${addedCount} new columns`);
    console.log(`   Created ${indexes.length} new indexes`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    db.close();
  }
}

// Run migration
runMigration();
