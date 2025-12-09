#!/usr/bin/env tsx
/**
 * Date Standardization Script
 * 
 * Converts non-ISO date formats to standardized format
 * and ensures temporal consistency.
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../epstein-archive.db');
const DRY_RUN = process.argv.includes('--dry-run');

// Month name to number mapping
const MONTH_MAP: Record<string, string> = {
  'january': '01', 'jan': '01',
  'february': '02', 'feb': '02',
  'march': '03', 'mar': '03',
  'april': '04', 'apr': '04',
  'may': '05',
  'june': '06', 'jun': '06',
  'july': '07', 'jul': '07',
  'august': '08', 'aug': '08',
  'september': '09', 'sep': '09', 'sept': '09',
  'october': '10', 'oct': '10',
  'november': '11', 'nov': '11',
  'december': '12', 'dec': '12',
};

let stats = {
  updated: 0,
  failed: 0,
  skipped: 0,
};

function parseDate(dateStr: string): string | null {
  const original = dateStr.trim();
  
  // Already ISO format
  if (/^\d{4}-\d{2}-\d{2}$/.test(original)) {
    return original;
  }
  
  // Common patterns
  
  // "Month DD, YYYY" or "Month DD YYYY"
  const monthDayYear = original.match(/^(\w+)\s+(\d{1,2}),?\s+(\d{4})$/i);
  if (monthDayYear) {
    const month = MONTH_MAP[monthDayYear[1].toLowerCase()];
    if (month) {
      const day = monthDayYear[2].padStart(2, '0');
      return `${monthDayYear[3]}-${month}-${day}`;
    }
  }
  
  // "DD Month YYYY"
  const dayMonthYear = original.match(/^(\d{1,2})\s+(\w+)\s+(\d{4})$/i);
  if (dayMonthYear) {
    const month = MONTH_MAP[dayMonthYear[2].toLowerCase()];
    if (month) {
      const day = dayMonthYear[1].padStart(2, '0');
      return `${dayMonthYear[3]}-${month}-${day}`;
    }
  }
  
  // "MM/DD/YYYY" or "MM-DD-YYYY"
  const slashDate = original.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (slashDate) {
    const month = slashDate[1].padStart(2, '0');
    const day = slashDate[2].padStart(2, '0');
    return `${slashDate[3]}-${month}-${day}`;
  }
  
  // "YYYY/MM/DD"
  const isoSlash = original.match(/^(\d{4})[\/](\d{1,2})[\/](\d{1,2})$/);
  if (isoSlash) {
    const month = isoSlash[2].padStart(2, '0');
    const day = isoSlash[3].padStart(2, '0');
    return `${isoSlash[1]}-${month}-${day}`;
  }
  
  // Just year
  if (/^\d{4}$/.test(original)) {
    return `${original}-01-01`;
  }
  
  return null;
}

function standardizeDates(db: Database.Database): void {
  console.log('\n📅 Standardizing Date Formats...\n');
  console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN' : '✏️  LIVE MODE'}\n`);
  
  // Get date entities
  const dateEntities = db.prepare(`
    SELECT id, full_name FROM entities WHERE entity_type = 'Date'
  `).all() as { id: number; full_name: string }[];
  
  console.log(`Processing ${dateEntities.length} date entities...\n`);
  
  const updateStmt = db.prepare(`UPDATE entities SET full_name = ? WHERE id = ?`);
  
  for (const entity of dateEntities) {
    const standardized = parseDate(entity.full_name);
    
    if (standardized && standardized !== entity.full_name) {
      console.log(`   ${entity.full_name} → ${standardized}`);
      
      if (!DRY_RUN) {
        updateStmt.run(standardized, entity.id);
      }
      stats.updated++;
    } else if (!standardized) {
      console.log(`   ⚠️ Could not parse: ${entity.full_name}`);
      stats.failed++;
    } else {
      stats.skipped++;
    }
  }
  
  // Also standardize document dates
  console.log('\nProcessing document dates...\n');
  
  const docDates = db.prepare(`
    SELECT id, date_created FROM documents 
    WHERE date_created IS NOT NULL AND date_created != ''
  `).all() as { id: number; date_created: string }[];
  
  const updateDocStmt = db.prepare(`UPDATE documents SET date_created = ? WHERE id = ?`);
  
  for (const doc of docDates) {
    const standardized = parseDate(doc.date_created);
    
    if (standardized && standardized !== doc.date_created) {
      if (!DRY_RUN) {
        updateDocStmt.run(standardized, doc.id);
      }
      stats.updated++;
    }
  }
}

async function main() {
  console.log('📅 Date Standardization Script\n');
  console.log(`Database: ${DB_PATH}`);
  
  const db = new Database(DB_PATH);
  
  try {
    db.exec('BEGIN TRANSACTION');
    
    standardizeDates(db);
    
    if (!DRY_RUN) {
      db.exec('COMMIT');
    } else {
      db.exec('ROLLBACK');
      console.log('\n🔍 DRY RUN - No changes committed');
    }
    
    console.log('\n' + '═'.repeat(50));
    console.log(`\n📋 Summary${DRY_RUN ? ' (DRY RUN)' : ''}`);
    console.log(`   Updated: ${stats.updated}`);
    console.log(`   Failed to parse: ${stats.failed}`);
    console.log(`   Already standard: ${stats.skipped}`);
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
