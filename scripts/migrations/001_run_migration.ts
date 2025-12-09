import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Migration 001: Investigation Core Tables
 * Creates: investigations, hypotheses, hypothesis_evidence_links, notes, tasks
 */

const DB_PATH = join(process.cwd(), 'epstein-archive.db');

function runMigration() {
  console.log('🚀 Starting Migration 001: Investigation Core Tables');
  
  const db = new Database(DB_PATH);
  
  try {
    // Read migration SQL
    const migrationFile = join(__dirname, '001_investigation_core.sql');
    const sql = readFileSync(migrationFile, 'utf-8');
    
    // Execute migration
    db.exec(sql);
    
    // Verify tables were created
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      AND name IN ('investigations', 'hypotheses', 'hypothesis_evidence_links', 'notes', 'tasks')
    `).all() as { name: string }[];
    
    console.log('✅ Created tables:', tables.map(t => t.name).join(', '));
    
    // Verify indexes
    const indexes = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='index' 
      AND name LIKE 'idx_%'
    `).all() as { name: string }[];
    
    console.log(`✅ Created ${indexes.length} indexes`);
    
    // Verify triggers
    const triggers = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='trigger'
    `).all() as { name: string }[];
    
    console.log(`✅ Created ${triggers.length} triggers`);
    
    console.log('✅ Migration 001 completed successfully');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    db.close();
  }
}

// Run migration
runMigration();

