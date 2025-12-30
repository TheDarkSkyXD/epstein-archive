#!/usr/bin/env tsx
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '../epstein-archive.db');
const DRY_RUN = process.argv.includes('--dry-run');

const JUNK_PATTERNS = [
  /^(The|A|An|Of|To|In|For|And|Or|But|With|At|By|From|On|As|Is|Was|Were|Be|Been|Being|Have|Has|Had|Do|Does|Did|Will|Would|Could|Should|Shall|May|Might|Must|Can)\s/i,
  /\s(To|Of|In|At|By|For|And|The|Is|Was|Were|Be|Are)\s*$/i,
  /^(Got|Need|Want|Let|Get|Make|Take|Give|Put|Said|Says|Asked|Told|Went|Came|Called|Tried|Used|Thought|Knew|Made)\s/i,
  /^Page\s+\d+/i,
  /^Section\s+\d+/i,
  /^Exhibit\s+/i,
  /^Chapter\s+\d+/i,
  /^Document\s+/i,
  /^File\s+/i,
  /^[A-Z]\d+$/,
  /^[^a-zA-Z]*$/,
  /^(Unknown|None|Null|N\/A|NA|TBD|TODO)$/i,
];

const WHITELIST = new Set([
  'The New York Times', 'The Washington Post', 'The Wall Street Journal',
  'The Guardian', 'The Associated Press', 'The Daily Mail',
  'Federal Bureau of Investigation', 'Central Intelligence Agency',
  'Department of Justice', 'Department of State'
]);

function main() {
  const db = new Database(DB_PATH);
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  
  console.log(`\n🧹 Deep Junk Cleanup & Normalization\n`);
  console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN' : '✏️  LIVE MODE'}\n`);

  const entities = db.prepare('SELECT id, full_name, mentions FROM entities').all() as any[];
  
  let deletedCount = 0;
  let mergedCount = 0;

  db.transaction(() => {
    for (const entity of entities) {
      if (WHITELIST.has(entity.full_name)) continue;

      let isJunk = false;
      for (const pattern of JUNK_PATTERNS) {
        if (pattern.test(entity.full_name)) {
          isJunk = true;
          break;
        }
      }

      const words = entity.full_name.split(/\s+/);
      const connectingWords = words.filter(w => 
        ['of', 'to', 'in', 'for', 'and', 'the', 'a', 'an', 'at', 'by', 'is', 'was', 'are', 'were'].includes(w.toLowerCase())
      );
      if (words.length >= 3 && connectingWords.length / words.length > 0.4) {
        isJunk = true;
      }

      if (isJunk) {
        // Special Case: "By Name" artifacts
        const byMatch = entity.full_name.match(/^By\s+(.+)$/i);
        if (byMatch) {
          const baseName = byMatch[1];
          const baseEntity = db.prepare('SELECT id FROM entities WHERE full_name = ?').get(baseName) as any;
          
          if (baseEntity) {
            if (!DRY_RUN) {
              // Merge mentions
              db.prepare(`
                UPDATE entity_mentions 
                SET entity_id = ? 
                WHERE entity_id = ? 
                AND document_id NOT IN (SELECT document_id FROM entity_mentions WHERE entity_id = ?)
              `).run(baseEntity.id, entity.id, baseEntity.id);
              
              // Delete duplicate mentions that couldn't be updated
              db.prepare('DELETE FROM entity_mentions WHERE entity_id = ?').run(entity.id);

              // Merge relations
              const rels = db.prepare('SELECT id, target_entity_id, relationship_type FROM entity_relationships WHERE source_entity_id = ?').all(entity.id) as any[];
              for (const rel of rels) {
                const existing = db.prepare(`
                  SELECT id FROM entity_relationships 
                  WHERE source_entity_id = ? AND target_entity_id = ? AND relationship_type = ?
                `).get(baseEntity.id, rel.target_entity_id, rel.relationship_type);
                
                if (existing) {
                  db.prepare('DELETE FROM entity_relationships WHERE id = ?').run(rel.id);
                } else {
                  db.prepare('UPDATE entity_relationships SET source_entity_id = ? WHERE id = ?').run(baseEntity.id, rel.id);
                }
              }
              
              const targetRels = db.prepare('SELECT id, source_entity_id, relationship_type FROM entity_relationships WHERE target_entity_id = ?').all(entity.id) as any[];
              for (const rel of targetRels) {
                const existing = db.prepare(`
                  SELECT id FROM entity_relationships 
                  WHERE source_entity_id = ? AND target_entity_id = ? AND relationship_type = ?
                `).get(rel.source_entity_id, baseEntity.id, rel.relationship_type);
                
                if (existing) {
                  db.prepare('DELETE FROM entity_relationships WHERE id = ?').run(rel.id);
                } else {
                  db.prepare('UPDATE entity_relationships SET target_entity_id = ? WHERE id = ?').run(baseEntity.id, rel.id);
                }
              }

              // Delete the artifact
              db.prepare('DELETE FROM entities WHERE id = ?').run(entity.id);
            }
            mergedCount++;
            continue;
          }
        }

        // General aggressive deletion for patterns that are likely not real names even with mentions
        // Especially if they are short or clearly sentence fragments
        const junkPhrases = ['Living In', 'Best Of', 'State Of The', 'Wide Range Of', 'University And', 'Street In', 'Brought To The', 'Evidence That The', 'Officials In', 'Support Of The', 'Sign In', 'Participation In The', 'By Means', 'Pushing The', 'People On The', 'Leaves The', 'Cash In', 'Try The', 'Talk To The', 'Hope The', 'Returning To The', 'Too In', 'By American', 'Fall Into The', 'Gaps In', 'Arrives In', 'By Order', 'Taking Care Of'];
        
        if (junkPhrases.includes(entity.full_name) || words.length < 2 || (isJunk && entity.mentions < 100)) {
           if (!DRY_RUN) {
             // Manually delete from tables that might lack ON DELETE CASCADE
             db.prepare('DELETE FROM entity_relationships WHERE source_entity_id = ? OR target_entity_id = ?').run(entity.id, entity.id);
             db.prepare('DELETE FROM flight_passengers WHERE entity_id = ?').run(entity.id);
             db.prepare('DELETE FROM entities WHERE id = ?').run(entity.id);
           }
           deletedCount++;
        }
      }
    }
  })();

  console.log(`\n✅ ${DRY_RUN ? 'Simulated' : 'Executed'} Cleanup:`);
  console.log(`   Entities deleted: ${deletedCount}`);
  console.log(`   Entities merged: ${mergedCount}`);
  
  db.close();
}

main();
