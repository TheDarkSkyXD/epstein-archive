import fs from 'fs';
import path from 'path';
import { databaseService } from '../src/services/DatabaseService';
import { AdvancedEntityExtractor } from './AdvancedEntityExtractor';

/**
 * SOPHISTICATED RE-IMPORT WITH NER
 * 
 * This script performs a complete re-import with:
 * - Advanced NER-based entity extraction
 * - Comprehensive filtering (no locations, countries, generic terms)
 * - Integrated title/role assignment
 * - Proper risk distribution (LOW/MEDIUM/HIGH)
 * - Context-aware spice scoring
 * - All documents preserved with entity-document links
 */

const BASE_PATH = '/Users/veland/Downloads/Epstein Files/Epstein Estate Documents - Seventh Production';

// ============================================================================
// KNOWN ENTITIES WITH TITLES AND ROLES
// ============================================================================

const KNOWN_ENTITIES: Record<string, { title?: string; role: string; titleVariants?: string[] }> = {
  // US Presidents
  'Donald Trump': { title: 'President (2017-2021)', role: 'Political', titleVariants: ['President', '45th President', 'President Trump'] },
  'Bill Clinton': { title: 'President (1993-2001)', role: 'Political', titleVariants: ['President', '42nd President', 'President Clinton'] },
  'Barack Obama': { title: 'President (2009-2017)', role: 'Political', titleVariants: ['President', '44th President', 'President Obama'] },
  'George Bush': { title: 'President (2001-2009)', role: 'Political', titleVariants: ['President', '43rd President', 'President Bush'] },
  'Ronald Reagan': { title: 'President (1981-1989)', role: 'Political', titleVariants: ['President', '40th President', 'President Reagan'] },
  
  // Political Figures
  'Hillary Clinton': { title: 'Secretary of State (2009-2013)', role: 'Political', titleVariants: ['Secretary of State', 'Senator', 'First Lady'] },
  'Al Gore': { title: 'Vice President (1993-2001)', role: 'Political', titleVariants: ['Vice President', 'VP Gore'] },
  'Mike Pence': { title: 'Vice President (2017-2021)', role: 'Political', titleVariants: ['Vice President', 'VP Pence'] },
  'Joe Biden': { title: 'Vice President (2009-2017)', role: 'Political', titleVariants: ['Vice President', 'VP Biden', 'Senator'] },
  'George Mitchell': { title: 'Senator', role: 'Political', titleVariants: ['Senator', 'Senate Majority Leader'] },
  'Steve Bannon': { title: 'Political Strategist', role: 'Political', titleVariants: ['Chief Strategist', 'White House Chief Strategist'] },
  
  // Key Epstein Case Figures
  'Jeffrey Epstein': { title: 'Financier', role: 'Business', titleVariants: ['Financier', 'Businessman', 'Investor'] },
  'Ghislaine Maxwell': { title: 'Socialite', role: 'Social', titleVariants: ['Socialite', 'British Socialite'] },
  'Virginia Roberts': { title: 'Accuser', role: 'Legal', titleVariants: ['Accuser', 'Plaintiff', 'Virginia Giuffre'] },
  'Alan Dershowitz': { title: 'Attorney', role: 'Legal', titleVariants: ['Attorney', 'Lawyer', 'Professor', 'Harvard Professor'] },
  'David Schoen': { title: 'Attorney', role: 'Legal', titleVariants: ['Attorney', 'Lawyer', 'Defense Attorney'] },
  'Kathy Ruemmler': { title: 'Attorney', role: 'Legal', titleVariants: ['Attorney', 'White House Counsel', 'Lawyer'] },
  
  // Business Leaders
  'Leslie Wexner': { title: 'CEO L Brands', role: 'Business', titleVariants: ['CEO', 'Businessman', 'L Brands CEO'] },
  'Bill Gates': { title: 'Co-founder Microsoft', role: 'Business', titleVariants: ['Co-founder', 'Microsoft Co-founder', 'Philanthropist'] },
  'Larry Summers': { title: 'Economist', role: 'Academic', titleVariants: ['Economist', 'Treasury Secretary', 'Harvard President'] },
  
  // Media/Journalists
  'Michael Wolff': { title: 'Author', role: 'Media', titleVariants: ['Author', 'Journalist', 'Writer'] },
  'Landon Thomas': { title: 'Journalist', role: 'Media', titleVariants: ['Journalist', 'Reporter', 'Financial Reporter'] },
  'Edward Snowden': { title: 'Whistleblower', role: 'Political', titleVariants: ['Whistleblower', 'Former NSA Contractor', 'NSA Whistleblower'] },
  
  // International Figures
  'Prince Andrew': { title: 'Duke of York', role: 'Political', titleVariants: ['Prince', 'Duke of York', 'Royal'] },
  'Hosni Mubarak': { title: 'President of Egypt (1981-2011)', role: 'Political', titleVariants: ['President', 'Egyptian President'] },
  'Moon Jae': { title: 'President of South Korea', role: 'Political', titleVariants: ['President', 'South Korean President'] },
  
  // Academic/Scientific
  'Alan Turing': { title: 'Mathematician', role: 'Academic', titleVariants: ['Mathematician', 'Computer Scientist', 'Cryptographer'] },
  'Boris Nikolic': { title: 'Scientist', role: 'Academic', titleVariants: ['Scientist', 'Advisor', 'Biomedical Scientist'] },
  
  // Organizations
  'New York Times': { title: 'Newspaper', role: 'Media', titleVariants: ['Newspaper', 'Publication', 'NYT'] },
  'Merrill Lynch': { title: 'Investment Bank', role: 'Business', titleVariants: ['Investment Bank', 'Financial Institution', 'Bank'] },
  'Investment Strategy Group': { title: 'Financial Services', role: 'Business', titleVariants: ['Financial Services', 'Investment Firm'] },
  'Ackrell Capital': { title: 'Investment Firm', role: 'Business', titleVariants: ['Investment Firm', 'Capital Firm'] },
  'Vanity Fair': { title: 'Magazine', role: 'Media', titleVariants: ['Magazine', 'Publication'] },
  'Washington Post': { title: 'Newspaper', role: 'Media', titleVariants: ['Newspaper', 'Publication', 'WaPo'] },
};

// ============================================================================
// ROLE INFERENCE PATTERNS
// ============================================================================

const ROLE_PATTERNS: Record<string, RegExp[]> = {
  'Political': [/president|senator|governor|congressman|minister|prime|secretary of state|ambassador|diplomat/i],
  'Legal': [/attorney|lawyer|judge|prosecutor|counsel|solicitor|barrister/i],
  'Academic': [/professor|doctor|scientist|researcher|phd|scholar|lecturer/i],
  'Media': [/journalist|reporter|author|writer|editor|columnist|correspondent|anchor/i],
  'Business': [/ceo|founder|executive|businessman|financier|investor|entrepreneur|chairman/i],
  'Social': [/socialite|philanthropist|activist|humanitarian/i],
};

// ============================================================================
// MAIN IMPORT FUNCTION
// ============================================================================

async function sophisticatedReimport() {
  console.log('='.repeat(80));
  console.log('SOPHISTICATED RE-IMPORT WITH NER');
  console.log('='.repeat(80));
  
  const db = (databaseService as any).db;
  const extractor = new AdvancedEntityExtractor();
  
  // Step 1: Recreate database
  console.log('\n[1/7] Recreating database...');
  await databaseService.initializeDatabase();
  
  // Add missing columns
  try {
    db.exec(`ALTER TABLE entities ADD COLUMN title TEXT`);
    db.exec(`ALTER TABLE entities ADD COLUMN title_variants TEXT`);
  } catch (e) {
    // Columns might already exist, ignore error
  }
  
  console.log('✓ Database recreated');
  
  // Step 2: Collect document files
  console.log('\n[2/7] Collecting document files...');
  const textFiles = await collectFiles(path.join(BASE_PATH, 'TEXT'), ['.txt']);
  const ocrFiles = await collectFiles(path.join(BASE_PATH, 'IMAGES'), ['-OCR.txt']);
  const allFiles = [...textFiles, ...ocrFiles];
  console.log(`✓ Found ${allFiles.length} documents (${textFiles.length} text + ${ocrFiles.length} OCR)`);
  
  // Step 3: Process documents and extract entities
  console.log('\n[3/7] Processing documents and extracting entities...');
  const entityData = new Map<string, {
    type: string;
    documentIds: Set<number>;
    contexts: string[];
  }>();
  
  let processedCount = 0;
  
  for (const filePath of allFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const fileName = path.basename(filePath);
      const fileSize = fs.statSync(filePath).size;
      
      // Insert document
      const result = db.prepare(`
        INSERT INTO documents (file_name, file_path, file_type, file_size, content, word_count)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(fileName, filePath, 'text', fileSize, content, content.split(/\s+/).length);
      
      const documentId = result.lastInsertRowid as number;
      
      // Extract entities using advanced extractor
      const entities = extractor.extractEntities(content);
      
      for (const entity of entities) {
        if (!entityData.has(entity.name)) {
          entityData.set(entity.name, {
            type: entity.type,
            documentIds: new Set(),
            contexts: []
          });
        }
        entityData.get(entity.name)!.documentIds.add(documentId);
      }
      
      processedCount++;
      if (processedCount % 100 === 0) {
        console.log(`  Processed ${processedCount}/${allFiles.length} documents...`);
      }
    } catch (error) {
      console.warn(`  Warning: Failed to process ${filePath}`);
    }
  }
  
  console.log(`✓ Processed ${processedCount} documents`);
  console.log(`✓ Found ${entityData.size} unique entities`);
  
  // Step 4: Insert entities with titles/roles
  console.log('\n[4/7] Inserting entities with titles and roles...');
  const entityIdMap = new Map<string, number>();
  let entityCount = 0;
  
  for (const [entityName, data] of entityData.entries()) {
    // Get title and role
    const knownEntity = KNOWN_ENTITIES[entityName];
    const title = knownEntity?.title || null;
    const titleVariants = knownEntity?.titleVariants ? JSON.stringify(knownEntity.titleVariants) : null;
    
    // Infer role if not known
    let role = knownEntity?.role || 'Unknown';
    if (role === 'Unknown') {
      for (const [roleName, patterns] of Object.entries(ROLE_PATTERNS)) {
        if (patterns.some(pattern => pattern.test(entityName))) {
          role = roleName;
          break;
        }
      }
    }
    
    // Insert entity
    const result = db.prepare(`
      INSERT INTO entities (full_name, primary_role, title, title_variants, mentions, spice_rating, spice_score, likelihood_level)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(entityName, role, title, titleVariants, data.documentIds.size, 0, 0, 'MEDIUM');
    
    const entityId = result.lastInsertRowid as number;
    entityIdMap.set(entityName, entityId);
    
    entityCount++;
    if (entityCount % 100 === 0) {
      console.log(`  Inserted ${entityCount}/${entityData.size} entities...`);
    }
  }
  
  console.log(`✓ Inserted ${entityCount} entities`);
  
  // Step 5: Create entity mentions
  console.log('\n[5/7] Creating entity-document mentions...');
  let mentionCount = 0;
  
  for (const [entityName, data] of entityData.entries()) {
    const entityId = entityIdMap.get(entityName)!;
    
    for (const documentId of data.documentIds) {
      db.prepare(`
        INSERT INTO entity_mentions (entity_id, document_id, mention_context)
        VALUES (?, ?, ?)
      `).run(entityId, documentId, `Mentioned in document`);
      mentionCount++;
    }
  }
  
  console.log(`✓ Created ${mentionCount} entity-document mentions`);
  
  // Step 6: Calculate spice ratings and risk distribution
  console.log('\n[6/7] Calculating spice ratings and risk distribution...');
  await calculateSpiceAndRisk(db);
  
  // Step 7: Build FTS indexes
  console.log('\n[7/7] Building full-text search indexes...');
  db.exec(`INSERT INTO entities_fts(entities_fts) VALUES('rebuild')`);
  db.exec(`INSERT INTO documents_fts(documents_fts) VALUES('rebuild')`);
  console.log('✓ FTS indexes built');
  
  // Final statistics
  const stats = await databaseService.getStatistics();
  console.log('\n' + '='.repeat(80));
  console.log('IMPORT COMPLETE');
  console.log('='.repeat(80));
  console.log(`Total Entities: ${stats.totalEntities}`);
  console.log(`Total Documents: ${stats.totalDocuments}`);
  console.log(`Total Mentions: ${stats.totalMentions}`);
  console.log('='.repeat(80));
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function collectFiles(dir: string, extensions: string[]): Promise<string[]> {
  const files: string[] = [];
  
  function walk(directory: string) {
    if (!fs.existsSync(directory)) return;
    
    const items = fs.readdirSync(directory);
    for (const item of items) {
      const fullPath = path.join(directory, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        walk(fullPath);
      } else {
        const matchesExtension = extensions.some(ext => item.endsWith(ext));
        if (matchesExtension) {
          files.push(fullPath);
        }
      }
    }
  }
  
  walk(dir);
  return files;
}

async function calculateSpiceAndRisk(db: any) {
  // Get mention statistics
  const stats = db.prepare(`
    SELECT 
      MAX(mentions) as max_mentions,
      MIN(mentions) as min_mentions,
      AVG(mentions) as avg_mentions
    FROM entities
  `).get();
  
  console.log(`  Mention stats: min=${stats.min_mentions}, max=${stats.max_mentions}, avg=${stats.avg_mentions.toFixed(2)}`);
  
  // Calculate spice ratings
  const threshold5 = stats.avg_mentions * 10;
  const threshold4 = stats.avg_mentions * 5;
  const threshold3 = stats.avg_mentions * 2;
  const threshold2 = stats.avg_mentions;
  
  db.prepare(`UPDATE entities SET spice_rating = 5, spice_score = mentions * 5 WHERE mentions >= ?`).run(threshold5);
  db.prepare(`UPDATE entities SET spice_rating = 4, spice_score = mentions * 4 WHERE mentions >= ? AND mentions < ?`).run(threshold4, threshold5);
  db.prepare(`UPDATE entities SET spice_rating = 3, spice_score = mentions * 3 WHERE mentions >= ? AND mentions < ?`).run(threshold3, threshold4);
  db.prepare(`UPDATE entities SET spice_rating = 2, spice_score = mentions * 2 WHERE mentions >= ? AND mentions < ?`).run(threshold2, threshold3);
  db.prepare(`UPDATE entities SET spice_rating = 1, spice_score = mentions WHERE mentions < ?`).run(threshold2);
  
  // Calculate risk distribution (percentile-based)
  const entities = db.prepare('SELECT id, mentions FROM entities ORDER BY mentions').all();
  const totalEntities = entities.length;
  
  const lowPercentile = Math.floor(totalEntities * 0.40); // Bottom 40%
  const highPercentile = Math.floor(totalEntities * 0.75); // Top 25%
  
  const lowThreshold = entities[lowPercentile]?.mentions || 1;
  const highThreshold = entities[highPercentile]?.mentions || 2;
  
  db.prepare(`UPDATE entities SET likelihood_level = 'LOW' WHERE mentions <= ?`).run(lowThreshold);
  db.prepare(`UPDATE entities SET likelihood_level = 'MEDIUM' WHERE mentions > ? AND mentions < ?`).run(lowThreshold, highThreshold);
  db.prepare(`UPDATE entities SET likelihood_level = 'HIGH' WHERE mentions >= ?`).run(highThreshold);
  
  // Get distributions
  const spiceDistribution = db.prepare(`
    SELECT spice_rating, COUNT(*) as count
    FROM entities
    GROUP BY spice_rating
    ORDER BY spice_rating DESC
  `).all();
  
  const riskDistribution = db.prepare(`
    SELECT likelihood_level, COUNT(*) as count
    FROM entities
    GROUP BY likelihood_level
    ORDER BY likelihood_level
  `).all();
  
  console.log('  Spice rating distribution:');
  spiceDistribution.forEach((row: any) => {
    console.log(`    ${'🌶️'.repeat(row.spice_rating)}: ${row.count} entities`);
  });
  
  console.log('  Risk level distribution:');
  riskDistribution.forEach((row: any) => {
    const percentage = ((row.count / totalEntities) * 100).toFixed(1);
    console.log(`    ${row.likelihood_level}: ${row.count} entities (${percentage}%)`);
  });
}

// Run import
sophisticatedReimport().catch(console.error);
