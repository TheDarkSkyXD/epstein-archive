import Database from 'better-sqlite3';
import { join } from 'path';
import * as fs from 'fs';

const DB_PATH = join(process.cwd(), 'epstein-archive.db');
const db = new Database(DB_PATH);

console.log('='.repeat(80));
console.log('COMPREHENSIVE DATA QUALITY & SPICE-BASED RISK ASSESSMENT');
console.log('='.repeat(80));

// ============================================================================
// STEP 1: CLEAN UP INVALID ENTITIES
// ============================================================================

function cleanupInvalidEntities() {
  console.log('\n[1/3] CLEANING UP INVALID ENTITIES...');
  
  const invalidPatterns = [
    // Non-person fragments
    { pattern: /^(Sent|Subject|Teid|Present|Presentation|Presentity|Essential|Ceremony)$/i, reason: 'Non-person fragment' },
    { pattern: /\s+(Sent|Subject|Presentation|Presentity)$/i, reason: 'Has invalid suffix' },
    { pattern: /^(All Other|Absolutely|Also|Award|Advanced|Bullish|Brexit)/i, reason: 'Non-person prefix' },
    // Newlines
    { pattern: /[\r\n]/, reason: 'Contains newline' },
    // Very short (likely fragments)
    { pattern: /^[A-Z][a-z]{0,2}$/, reason: 'Too short' },
    // Single letter
    { pattern: /^[A-Z]$/,reason: 'Single letter' },
    // All caps (likely acronyms or non-persons)
    { pattern: /^[A-Z\s]+$/, reason: 'All caps (likely acronym)' },
    // Numbers
    { pattern: /^\d/, reason: 'Starts with number' },
    // Common non-person words
    { pattern: /^(The|A|An|And|Or|Of|In|On|At|To|For|With|From|By|As|Is|Was|Are|Were|Been|Being|Have|Has|Had|Do|Does|Did|Will|Would|Should|Could|May|Might|Must|Can|Shall)$/i, reason: 'Common word' },
  ];
  
  const entitiesToDelete: number[] = [];
  const entities = db.prepare('SELECT id, full_name FROM entities').all() as any[];
  
  for (const entity of entities) {
    for (const { pattern, reason } of invalidPatterns) {
      if (pattern.test(entity.full_name)) {
        entitiesToDelete.push(entity.id);
        console.log(`  Marking for deletion: "${entity.full_name}" (${reason})`);
        break;
      }
    }
  }
  
  console.log(`\nFound ${entitiesToDelete.length} invalid entities to delete`);
  
  if (entitiesToDelete.length === 0) {
    console.log('✓ No invalid entities found');
    return 0;
  }
  
  // Delete in batches
  const batchSize = 100;
  let deletedCount = 0;
  
  for (let i = 0; i < entitiesToDelete.length; i += batchSize) {
    const batch = entitiesToDelete.slice(i, i + batchSize);
    const placeholders = batch.map(() => '?').join(',');
    
    db.transaction(() => {
      // Delete mentions first (foreign key)
      db.prepare(`DELETE FROM entity_mentions WHERE entity_id IN (${placeholders})`).run(...batch);
      // Delete from people/organizations tables
      db.prepare(`DELETE FROM people WHERE entity_id IN (${placeholders})`).run(...batch);
      db.prepare(`DELETE FROM organizations WHERE entity_id IN (${placeholders})`).run(...batch);
      // Delete entities
      db.prepare(`DELETE FROM entities WHERE id IN (${placeholders})`).run(...batch);
    })();
    
    deletedCount += batch.length;
  }
  
  console.log(`✓ Deleted ${deletedCount} invalid entities`);
  return deletedCount;
}

// ============================================================================
// STEP 2: CALCULATE SPICE SCORES BASED ON DOCUMENT CONTEXT
// ============================================================================

function calculateSpiceScores() {
  console.log('\n[2/3] CALCULATING SPICE SCORES...');
  
  // Spicy keywords that indicate incriminating context
  const SPICY_KEYWORDS = {
    level5: [
      'abuse', 'assault', 'victim', 'trafficking', 'underage', 'minor', 'rape',
      'sexual misconduct', 'exploitation', 'coercion', 'forced', 'illegal'
    ],
    level4: [
      'inappropriate', 'misconduct', 'allegation', 'accused', 'complaint',
      'lawsuit', 'settlement', 'testimony', 'deposition', 'witness'
    ],
    level3: [
      'relationship', 'associate', 'connection', 'meeting', 'private',
      'confidential', 'secret', 'undisclosed'
    ],
    level2: [
      'friend', 'acquaintance', 'knew', 'met', 'visited', 'traveled',
      'flight', 'island', 'party'
    ],
    level1: [
      'mentioned', 'referenced', 'name', 'list', 'contact'
    ]
  };
  
  const entities = db.prepare(`
    SELECT e.id, e.full_name, e.mentions,
           GROUP_CONCAT(em.mention_context, ' ') as all_contexts
    FROM entities e
    LEFT JOIN entity_mentions em ON e.id = em.entity_id
    GROUP BY e.id
  `).all() as any[];
  
  console.log(`Analyzing ${entities.length} entities...`);
  
  let processedCount = 0;
  
  for (const entity of entities) {
    const context = (entity.all_contexts || '').toLowerCase();
    
    let spiceScore = 0;
    let spiceRating = 0;
    
    // Check for spicy keywords
    for (const keyword of SPICY_KEYWORDS.level5) {
      if (context.includes(keyword)) {
        spiceScore += 50;
        spiceRating = Math.max(spiceRating, 5);
      }
    }
    
    for (const keyword of SPICY_KEYWORDS.level4) {
      if (context.includes(keyword)) {
        spiceScore += 30;
        spiceRating = Math.max(spiceRating, 4);
      }
    }
    
    for (const keyword of SPICY_KEYWORDS.level3) {
      if (context.includes(keyword)) {
        spiceScore += 15;
        spiceRating = Math.max(spiceRating, 3);
      }
    }
    
    for (const keyword of SPICY_KEYWORDS.level2) {
      if (context.includes(keyword)) {
        spiceScore += 5;
        spiceRating = Math.max(spiceRating, 2);
      }
    }
    
    for (const keyword of SPICY_KEYWORDS.level1) {
      if (context.includes(keyword)) {
        spiceScore += 1;
        spiceRating = Math.max(spiceRating, 1);
      }
    }
    
    // Update entity
    db.prepare(`
      UPDATE entities 
      SET spice_score = ?, spice_rating = ?
      WHERE id = ?
    `).run(spiceScore, spiceRating, entity.id);
    
    processedCount++;
    
    if (processedCount % 1000 === 0) {
      console.log(`  Processed ${processedCount}/${entities.length} entities...`);
    }
  }
  
  console.log(`✓ Calculated spice scores for ${processedCount} entities`);
}

// ============================================================================
// STEP 3: ASSIGN RISK LEVELS BASED ON SPICE SCORES
// ============================================================================

function assignRiskLevels() {
  console.log('\n[3/3] ASSIGNING RISK LEVELS BASED ON SPICE...');
  
  // Risk levels based on spice score
  // HIGH: Spice score >= 30 (level 4-5 keywords)
  // MEDIUM: Spice score 5-29 (level 2-3 keywords)
  // LOW: Spice score < 5 (level 1 or just mentioned)
  
  const highCount = db.prepare(`
    UPDATE entities 
    SET likelihood_level = 'HIGH'
    WHERE spice_score >= 30
  `).run().changes;
  
  const mediumCount = db.prepare(`
    UPDATE entities 
    SET likelihood_level = 'MEDIUM'
    WHERE spice_score >= 5 AND spice_score < 30
  `).run().changes;
  
  const lowCount = db.prepare(`
    UPDATE entities 
    SET likelihood_level = 'LOW'
    WHERE spice_score < 5
  `).run().changes;
  
  console.log(`✓ Updated ${highCount} entities to HIGH risk (spice >= 30)`);
  console.log(`✓ Updated ${mediumCount} entities to MEDIUM risk (spice 5-29)`);
  console.log(`✓ Updated ${lowCount} entities to LOW risk (spice < 5)`);
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  try {
    // Create backup
    console.log('\nCreating database backup...');
    const backupDir = join(process.cwd(), 'database_backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = join(backupDir, `epstein-archive_backup_${timestamp}.db`);
    fs.copyFileSync(DB_PATH, backupPath);
    console.log(`✓ Backup created: ${backupPath}`);
    
    // Run all steps
    const deletedCount = cleanupInvalidEntities();
    calculateSpiceScores();
    assignRiskLevels();
    
    // Final statistics
    console.log('\n' + '='.repeat(80));
    console.log('FINAL STATISTICS');
    console.log('='.repeat(80));
    
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_entities,
        SUM(CASE WHEN likelihood_level = 'HIGH' THEN 1 ELSE 0 END) as high_risk,
        SUM(CASE WHEN likelihood_level = 'MEDIUM' THEN 1 ELSE 0 END) as medium_risk,
        SUM(CASE WHEN likelihood_level = 'LOW' THEN 1 ELSE 0 END) as low_risk,
        AVG(spice_score) as avg_spice,
        MAX(spice_score) as max_spice
      FROM entities
    `).get() as any;
    
    console.log(`Total Entities: ${stats.total_entities.toLocaleString()} (deleted ${deletedCount})`);
    console.log(`Average Spice Score: ${stats.avg_spice.toFixed(2)}`);
    console.log(`Max Spice Score: ${stats.max_spice}`);
    console.log(`\nRisk Distribution:`);
    console.log(`  HIGH: ${stats.high_risk.toLocaleString()} (${((stats.high_risk / stats.total_entities) * 100).toFixed(1)}%)`);
    console.log(`  MEDIUM: ${stats.medium_risk.toLocaleString()} (${((stats.medium_risk / stats.total_entities) * 100).toFixed(1)}%)`);
    console.log(`  LOW: ${stats.low_risk.toLocaleString()} (${((stats.low_risk / stats.total_entities) * 100).toFixed(1)}%)`);
    
    // Show top spicy entities
    console.log('\n' + '='.repeat(80));
    console.log('TOP 10 HIGHEST SPICE SCORES');
    console.log('='.repeat(80));
    
    const topSpicy = db.prepare(`
      SELECT full_name, spice_score, spice_rating, likelihood_level, mentions
      FROM entities
      ORDER BY spice_score DESC, mentions DESC
      LIMIT 10
    `).all() as any[];
    
    topSpicy.forEach((e: any, i: number) => {
      console.log(`${i + 1}. ${e.full_name}`);
      console.log(`   Spice: ${e.spice_score} (🌶️ ${e.spice_rating}/5) | Risk: ${e.likelihood_level} | Mentions: ${e.mentions}`);
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ DATA QUALITY & RISK ASSESSMENT COMPLETE');
    console.log('='.repeat(80));
    
    db.close();
  } catch (error) {
    console.error('\n❌ Error:', error);
    db.close();
    process.exit(1);
  }
}

main();
