#!/usr/bin/env tsx
/**
 * Simple Entity Merge Script
 * 
 * Merges duplicate entities by:
 * 1. Adding variant mention count to canonical entity
 * 2. Deleting the variant entity
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../epstein-archive.db');
const DRY_RUN = process.argv.includes('--dry-run');

// Entities to merge: [variant name, canonical name]
const MERGE_PAIRS: [string, string][] = [
  // Jeffrey Epstein variants
  ['Billionaire Jeffrey Epstein', 'Jeffrey Epstein'],
  ['Sex Offender Jeffrey', 'Jeffrey Epstein'],
  ['Defendant Epstein', 'Jeffrey Epstein'],
  ['Because Epstein', 'Jeffrey Epstein'],
  ['Epstein Case', 'Jeffrey Epstein'],
  ['Epstein House', 'Jeffrey Epstein'],
  ['Epstein Depo', 'Jeffrey Epstein'],
  ['Representing Epstein', 'Jeffrey Epstein'],
  ['Suits Against Epstein', 'Jeffrey Epstein'],
  ['While Epstein', 'Jeffrey Epstein'],
  ['Another Epstein', 'Jeffrey Epstein'],
  ['Following Epstein', 'Jeffrey Epstein'],
  ['Isaid Epstein', 'Jeffrey Epstein'],
  ['Defendant Jeffrey', 'Jeffrey Epstein'],
  ['Whether Jeffrey Epstein', 'Jeffrey Epstein'],
  ['Unseal Epstein Appeal', 'Jeffrey Epstein'],
  ['Epstein Vic', 'Jeffrey Epstein'],
  ['Epstein Takes', 'Jeffrey Epstein'],
  ['Jeffrey Mac', 'Jeffrey Epstein'],
  ['While Jeffrey', 'Jeffrey Epstein'],
  ['Dear Mr Epstein', 'Jeffrey Epstein'],
  ['Jeffrey Edward Epstein', 'Jeffrey Epstein'],
  ['Jeffrey Epstein Pleads', 'Jeffrey Epstein'],
  ['Epstein Deposition', 'Jeffrey Epstein'],
  
  // Other duplicates
  ['Mr Trump', 'Donald Trump'],
  ['Republican Donald Trump', 'Donald Trump'],
  ['Enter Donald Trump', 'Donald Trump'],
  ['Consider President Trump', 'Donald Trump'],
  ['William Jefferson Clinton', 'Bill Clinton'],
  ['Mr Clinton', 'Bill Clinton'],
  ['Randy Andy', 'Prince Andrew'],
  ['Miss Maxwell', 'Ghislaine Maxwell'],
  ['Defendant Maxwell', 'Ghislaine Maxwell'],
  ['Professor Dershowitz', 'Alan Dershowitz'],
  ['Prof Dershowitz', 'Alan Dershowitz'],
  ['Attorney Dershowitz', 'Alan Dershowitz'],
  ['Alexander Acosta', 'Alex Acosta'],
  ['Mr Gates', 'Bill Gates'],
  ['Lawrence Summers', 'Larry Summers'],
  ['Mr Summers', 'Larry Summers'],
  ['Prime Minister Barak', 'Ehud Barak'],
];

let stats = { merged: 0, mentionsTransferred: 0, skipped: 0 };

async function main() {
  console.log('\n🔗 Simple Entity Merge Script\n');
  console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN' : '✏️  LIVE MODE'}\n`);
  
  const db = new Database(DB_PATH);
  
  try {
    if (!DRY_RUN) db.exec('BEGIN TRANSACTION');
    
    for (const [variantName, canonicalName] of MERGE_PAIRS) {
      // Find both entities
      const variant = db.prepare('SELECT id, full_name, mentions FROM entities WHERE full_name = ?').get(variantName) as { id: number; full_name: string; mentions: number } | undefined;
      const canonical = db.prepare('SELECT id, full_name, mentions FROM entities WHERE full_name = ?').get(canonicalName) as { id: number; full_name: string; mentions: number } | undefined;
      
      if (!variant) {
        console.log(`   ⊘ "${variantName}" not found`);
        stats.skipped++;
        continue;
      }
      
      if (!canonical) {
        console.log(`   ⚠️ Canonical "${canonicalName}" not found`);
        stats.skipped++;
        continue;
      }
      
      console.log(`   → "${variant.full_name}" (${variant.mentions}) → "${canonical.full_name}" (${canonical.mentions})`);
      
      if (!DRY_RUN) {
        // Transfer mentions to canonical
        db.prepare('UPDATE entities SET mentions = mentions + ? WHERE id = ?').run(variant.mentions, canonical.id);
        
        // Update entity_mentions references (handle duplicates by ignoring conflicts)
        db.prepare('UPDATE OR IGNORE entity_mentions SET entity_id = ? WHERE entity_id = ?').run(canonical.id, variant.id);
        db.prepare('DELETE FROM entity_mentions WHERE entity_id = ?').run(variant.id);
        
        // Update evidence_entity references
        db.prepare('UPDATE OR IGNORE evidence_entity SET entity_id = ? WHERE entity_id = ?').run(canonical.id, variant.id);
        db.prepare('DELETE FROM evidence_entity WHERE entity_id = ?').run(variant.id);
        
        // Update entity_evidence_types references
        db.prepare('INSERT OR IGNORE INTO entity_evidence_types SELECT ?, evidence_type_id FROM entity_evidence_types WHERE entity_id = ?').run(canonical.id, variant.id);
        db.prepare('DELETE FROM entity_evidence_types WHERE entity_id = ?').run(variant.id);
        
        // Update entity_relationships (both source and target)
        try {
          db.prepare('UPDATE OR IGNORE entity_relationships SET source_entity_id = ? WHERE source_entity_id = ?').run(canonical.id, variant.id);
          db.prepare('UPDATE OR IGNORE entity_relationships SET target_entity_id = ? WHERE target_entity_id = ?').run(canonical.id, variant.id);
          db.prepare('DELETE FROM entity_relationships WHERE source_entity_id = ? OR target_entity_id = ?').run(variant.id, variant.id);
        } catch (e) { /* table might not exist */ }
        
        // Update media_items references
        db.prepare('UPDATE OR IGNORE media_items SET entity_id = ? WHERE entity_id = ?').run(canonical.id, variant.id);
        db.prepare('DELETE FROM media_items WHERE entity_id = ?').run(variant.id);
        
        // Delete the variant
        db.prepare('DELETE FROM entities WHERE id = ?').run(variant.id);
      }
      
      stats.merged++;
      stats.mentionsTransferred += variant.mentions;
    }
    
    if (!DRY_RUN) {
      db.exec('COMMIT');
      console.log('\n✅ Changes committed');
    } else {
      console.log('\n🔍 DRY RUN - No changes made');
    }
    
    // Show updated top entities
    console.log('\n📊 Top 10 Entities:');
    const top = db.prepare('SELECT full_name, mentions FROM entities ORDER BY mentions DESC LIMIT 10').all() as { full_name: string; mentions: number }[];
    top.forEach((e, i) => console.log(`   ${i + 1}. ${e.full_name}: ${e.mentions.toLocaleString()}`));
    
    console.log(`\n📋 Summary:`);
    console.log(`   Entities merged: ${stats.merged}`);
    console.log(`   Mentions transferred: ${stats.mentionsTransferred}`);
    console.log(`   Skipped: ${stats.skipped}`);
    
  } catch (err) {
    if (!DRY_RUN) db.exec('ROLLBACK');
    throw err;
  } finally {
    db.close();
  }
}

main().catch(console.error);
