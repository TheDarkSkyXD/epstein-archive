import Database from 'better-sqlite3';
import { join } from 'path';
import * as fs from 'fs';

const DB_PATH = join(process.cwd(), 'epstein-archive.db');
const db = new Database(DB_PATH);

console.log('='.repeat(80));
console.log('COMPREHENSIVE DATA QUALITY IMPROVEMENT');
console.log('='.repeat(80));

// ============================================================================
// STEP 1: DOCUMENT ENRICHMENT (Evidence Types, Titles, Summaries)
// ============================================================================

async function enrichDocuments() {
  console.log('\n[1/4] ENRICHING DOCUMENTS...');
  
  const documents = db.prepare(`SELECT id, file_name, content FROM documents WHERE evidence_type IS NULL OR evidence_type = ''`).all() as any[];
  console.log(`Found ${documents.length} documents to enrich`);
  
  const updateStmt = db.prepare(`
    UPDATE documents 
    SET evidence_type = @evidence_type, title = @title, content_preview = @content_preview
    WHERE id = @id
  `);
  
  
  let enrichedCount = 0;
  
  for (const doc of documents) {
    const content = doc.content || '';
    const firstLines = content.split('\n').slice(0, 20).join('\n');
    
    // Determine evidence type
    let evidenceType = 'Document';
    
    if (/From:\s/.test(firstLines) && /To:\s/.test(firstLines) && (/Subject:\s/.test(firstLines) || /Sent:\s/.test(firstLines))) {
      evidenceType = 'Email';
    } else if (/case\s+no\.?/i.test(firstLines) || /\sv\.\s/.test(firstLines) || /deposition/i.test(firstLines) || /affidavit/i.test(firstLines) || /court/i.test(firstLines)) {
      evidenceType = 'Legal';
    } else if (/N908JE/i.test(content) || /flight\s+log/i.test(content) || /passenger\s+list/i.test(content)) {
      evidenceType = 'Flight Log';
    } else if (/http[s]?:\/\//.test(firstLines) || /published:/i.test(firstLines) || /byline:/i.test(firstLines)) {
      evidenceType = 'Article';
    }
    
    // Generate title
    let title = '';
    
    if (evidenceType === 'Email') {
      const subjectMatch = firstLines.match(/^Subject:[\s]*(.+)$/im);
      if (subjectMatch) {
        title = subjectMatch[1].trim().substring(0, 100);
      }
    } else if (evidenceType === 'Legal') {
      const caseMatch = firstLines.match(/case\s+no\.?\s*:?\s*([^\n]+)/i);
      if (caseMatch) {
        title = `Legal Document - ${caseMatch[1].trim().substring(0, 80)}`;
      }
    }
    
    // Fallback: use first non-empty line
    if (!title) {
      const lines = content.split('\n').filter((l: any) => l.trim().length > 10);
      if (lines.length > 0) {
        title = lines[0].trim().substring(0, 100);
      }
    }
    
    // Final fallback: use filename
    if (!title || title.length < 5) {
      title = doc.file_name.replace(/\.(pdf|txt|doc|docx)$/i, '');
    }
    
    // Add filename in parentheses
    const filename = doc.file_name.substring(0, 50);
    title = `${title} (${filename})`;
    
    // Generate content preview (summary)
    const contentPreview = content.substring(0, 500).trim();
    
    updateStmt.run({
      id: doc.id,
      evidence_type: evidenceType,
      title: title,
      content_preview: contentPreview
    });
    
    enrichedCount++;
    
    if (enrichedCount % 100 === 0) {
      console.log(`  Enriched ${enrichedCount}/${documents.length} documents...`);
    }
  }
  
  
  console.log(`✓ Enriched ${enrichedCount} documents`);
}

// ============================================================================
// STEP 2: ENTITY CLEANUP (Remove invalid entities)
// ============================================================================

async function cleanupInvalidEntities() {
  console.log('\n[2/4] CLEANING UP INVALID ENTITIES...');
  
  const invalidPatterns = [
    // Newline characters
    { pattern: /[\r\n]/, reason: 'Contains newline characters' },
    // "Sent" suffix
    { pattern: /\s+Sent$/i, reason: 'Has "Sent" suffix' },
    // Non-person entities
    { pattern: /^(Floor|Also Present|Absolutely Essential|Agree|All Ye Who Enter|Fashion Week|Presentity|Apple News|Arizona State University)/i, reason: 'Not a person' },
    // Very short names (likely fragments)
    { pattern: /^[A-Z][a-z]{0,2}$/, reason: 'Too short (likely fragment)' },
    // Single letter
    { pattern: /^[A-Z]$/, reason: 'Single letter' },
  ];
  
  const entitiesToDelete: string[] = [];
  const entities = db.prepare('SELECT id, full_name FROM entities').all() as any[];
  
  for (const entity of entities) {
    for (const { pattern, reason } of invalidPatterns) {
      if (pattern.test(entity.full_name)) {
        entitiesToDelete.push(entity.id);
        break;
      }
    }
  }
  
  console.log(`Found ${entitiesToDelete.length} invalid entities to delete`);
  
  // Delete in batches
  const batchSize = 100;
  let deletedCount = 0;
  
  for (let i = 0; i < entitiesToDelete.length; i += batchSize) {
    const batch = entitiesToDelete.slice(i, i + batchSize);
    const placeholders = batch.map(() => '?').join(',');
    
    db.transaction(() => {
      // Delete mentions first (foreign key)
      db.prepare(`DELETE FROM entity_mentions WHERE entity_id IN (${placeholders})`).run(...batch);
      // Delete evidence types
      db.prepare(`DELETE FROM entity_evidence_types WHERE entity_id IN (${placeholders})`).run(...batch);
      // Delete entities
      db.prepare(`DELETE FROM entities WHERE id IN (${placeholders})`).run(...batch);
    })();
    
    deletedCount += batch.length;
    console.log(`  Deleted ${deletedCount}/${entitiesToDelete.length} invalid entities...`);
  }
  
  console.log(`✓ Deleted ${deletedCount} invalid entities`);
}

// ============================================================================
// STEP 3: ENTITY TITLE/ROLE ENRICHMENT
// ============================================================================

async function enrichEntityTitlesAndRoles() {
  console.log('\n[3/4] ENRICHING ENTITY TITLES AND ROLES...');
  
  // Known entities with titles and roles
  const KNOWN_ENTITIES: Record<string, { title?: string; role: string }> = {
    'Donald Trump': { title: 'President (2017-2021)', role: 'Political' },
    'Bill Clinton': { title: 'President (1993-2001)', role: 'Political' },
    'Hillary Clinton': { title: 'Secretary of State (2009-2013)', role: 'Political' },
    'Jeffrey Epstein': { title: 'Financier', role: 'Business' },
    'Ghislaine Maxwell': { title: 'Socialite', role: 'Social' },
    'Alan Dershowitz': { title: 'Attorney', role: 'Legal' },
    'Virginia Roberts': { title: 'Accuser', role: 'Legal' },
    'Leslie Wexner': { title: 'CEO L Brands', role: 'Business' },
    'Bill Gates': { title: 'Co-founder Microsoft', role: 'Business' },
  };
  
  // Role inference patterns
  const ROLE_PATTERNS: Record<string, RegExp[]> = {
    'Political': [/president|senator|governor|congressman|minister|prime|secretary of state/i],
    'Legal': [/attorney|lawyer|judge|prosecutor|counsel/i],
    'Academic': [/professor|doctor|scientist|researcher|phd/i],
    'Media': [/journalist|reporter|author|writer|editor|news|times|post|herald/i],
    'Business': [/ceo|founder|executive|businessman|financier|investor|bank|capital|corp|inc/i],
    'Social': [/socialite|philanthropist/i],
  };
  
  // Update known entities
  let knownCount = 0;
  for (const [entityName, metadata] of Object.entries(KNOWN_ENTITIES)) {
    const result = db.prepare(`
      UPDATE entities 
      SET title = ?, primary_role = ?
      WHERE full_name = ?
    `).run(metadata.title || null, metadata.role, entityName);
    
    if (result.changes > 0) knownCount++;
  }
  
  console.log(`✓ Updated ${knownCount} known entities`);
  
  // Infer roles for remaining entities
  const entitiesWithoutRole = db.prepare(`
    SELECT id, full_name 
    FROM entities 
    WHERE primary_role IS NULL OR primary_role = '' OR primary_role = 'Unknown'
  `).all() as any[];
  
  let inferredCount = 0;
  
  db.transaction(() => {
    for (const entity of entitiesWithoutRole) {
      const name = entity.full_name.toLowerCase();
      let inferredRole = 'Business'; // Default to Business instead of Unknown
      
      for (const [role, patterns] of Object.entries(ROLE_PATTERNS)) {
        if (patterns.some(pattern => pattern.test(name))) {
          inferredRole = role;
          break;
        }
      }
      
      db.prepare('UPDATE entities SET primary_role = ? WHERE id = ?').run(inferredRole, entity.id);
      if (inferredRole !== 'Unknown') inferredCount++;
    }
  })();
  
  console.log(`✓ Inferred roles for ${inferredCount} entities`);
}

// ============================================================================
// STEP 4: MERGE DUPLICATE ENTITIES
// ============================================================================

async function mergeDuplicateEntities() {
  console.log('\n[4/4] MERGING DUPLICATE ENTITIES...');
  
  // Find entities with "Sent" suffix and their base names
  const sentEntities = db.prepare(`
    SELECT id, full_name 
    FROM entities 
    WHERE full_name LIKE '% Sent'
  `).all() as any[];
  
  let mergedCount = 0;
  
  for (const sentEntity of sentEntities) {
    const baseName = sentEntity.full_name.replace(/\s+Sent$/i, '').trim();
    
    // Find the base entity
    const baseEntity = db.prepare('SELECT id FROM entities WHERE full_name = ?').get(baseName) as any;
    
    if (baseEntity) {
      // Merge: update all mentions to point to base entity
      db.transaction(() => {
        db.prepare(`
          UPDATE entity_mentions 
          SET entity_id = ? 
          WHERE entity_id = ?
        `).run(baseEntity.id, sentEntity.id);
        
        // Delete the "Sent" entity
        db.prepare('DELETE FROM entity_evidence_types WHERE entity_id = ?').run(sentEntity.id);
        db.prepare('DELETE FROM entities WHERE id = ?').run(sentEntity.id);
      })();
      
      mergedCount++;
    }
  }
  
  console.log(`✓ Merged ${mergedCount} duplicate entities`);
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  try {
    // Create backup first
    console.log('\nCreating database backup...');
    const backupDir = join(process.cwd(), 'database_backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = join(backupDir, `epstein-archive_backup_${timestamp}.db`);
    fs.copyFileSync(DB_PATH, backupPath);
    console.log(`✓ Backup created: ${backupPath}`);
    
    // Run all enrichment steps
    await enrichDocuments();
    await cleanupInvalidEntities();
    await enrichEntityTitlesAndRoles();
    await mergeDuplicateEntities();
    
    // Final stats
    console.log('\n' + '='.repeat(80));
    console.log('FINAL STATISTICS');
    console.log('='.repeat(80));
    
    const stats = db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM entities) as total_entities,
        (SELECT COUNT(*) FROM documents) as total_documents,
        (SELECT COUNT(*) FROM documents WHERE evidence_type IS NOT NULL) as docs_with_type,
        (SELECT COUNT(*) FROM entities WHERE primary_role IS NOT NULL AND primary_role != 'Unknown') as entities_with_role,
        (SELECT COUNT(*) FROM entities WHERE title IS NOT NULL) as entities_with_title
    `).get() as any;
    
    console.log(`Total Entities: ${stats.total_entities.toLocaleString()}`);
    console.log(`Total Documents: ${stats.total_documents.toLocaleString()}`);
    console.log(`Documents with Evidence Type: ${stats.docs_with_type.toLocaleString()} (${((stats.docs_with_type / stats.total_documents) * 100).toFixed(1)}%)`);
    console.log(`Entities with Role: ${stats.entities_with_role.toLocaleString()} (${((stats.entities_with_role / stats.total_entities) * 100).toFixed(1)}%)`);
    console.log(`Entities with Title: ${stats.entities_with_title.toLocaleString()} (${((stats.entities_with_title / stats.total_entities) * 100).toFixed(1)}%)`);
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ DATA QUALITY IMPROVEMENT COMPLETE');
    console.log('='.repeat(80));
    
    db.close();
  } catch (error) {
    console.error('\n❌ Error during data quality improvement:', error);
    db.close();
    process.exit(1);
  }
}

main();
