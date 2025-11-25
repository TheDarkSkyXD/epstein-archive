import { databaseService } from '../src/services/DatabaseService';

/**
 * TITLE/ROLE ENRICHMENT & RISK DISTRIBUTION
 * 
 * This script will:
 * 1. Assign titles to known entities (e.g., "President (2017-2021)")
 * 2. Assign roles (Political, Media, Academic, Business, Legal, etc.)
 * 3. Distribute risk levels based on mention count (LOW/MEDIUM/HIGH)
 */

// Known entity titles and roles
const KNOWN_ENTITIES: Record<string, { title?: string; role: string; titleVariants?: string[] }> = {
  'Donald Trump': { title: 'President (2017-2021)', role: 'Political', titleVariants: ['President', '45th President'] },
  'Bill Clinton': { title: 'President (1993-2001)', role: 'Political', titleVariants: ['President', '42nd President'] },
  'Barack Obama': { title: 'President (2009-2017)', role: 'Political', titleVariants: ['President', '44th President'] },
  'Hillary Clinton': { title: 'Secretary of State (2009-2013)', role: 'Political', titleVariants: ['Secretary of State', 'Senator'] },
  'Al Gore': { title: 'Vice President (1993-2001)', role: 'Political', titleVariants: ['Vice President'] },
  'Jeffrey Epstein': { title: 'Financier', role: 'Business', titleVariants: ['Financier', 'Businessman'] },
  'Ghislaine Maxwell': { title: 'Socialite', role: 'Social', titleVariants: ['Socialite'] },
  'Alan Dershowitz': { title: 'Attorney', role: 'Legal', titleVariants: ['Attorney', 'Lawyer', 'Professor'] },
  'Virginia Roberts': { title: 'Accuser', role: 'Legal', titleVariants: ['Accuser', 'Plaintiff'] },
  'Leslie Wexner': { title: 'CEO L Brands', role: 'Business', titleVariants: ['CEO', 'Businessman'] },
  'Bill Gates': { title: 'Co-founder Microsoft', role: 'Business', titleVariants: ['Co-founder', 'Philanthropist'] },
  'Edward Snowden': { title: 'Whistleblower', role: 'Political', titleVariants: ['Whistleblower', 'Former NSA Contractor'] },
  'Steve Bannon': { title: 'Political Strategist', role: 'Political', titleVariants: ['Political Strategist', 'Former White House Chief Strategist'] },
  'George Mitchell': { title: 'Senator', role: 'Political', titleVariants: ['Senator', 'Former Senate Majority Leader'] },
  'Alan Turing': { title: 'Mathematician', role: 'Academic', titleVariants: ['Mathematician', 'Computer Scientist'] },
  'Michael Wolff': { title: 'Author', role: 'Media', titleVariants: ['Author', 'Journalist'] },
  'Jean Luc Brunel': { title: 'Model Scout', role: 'Business', titleVariants: ['Model Scout', 'Modeling Agent'] },
  'Hosni Mubarak': { title: 'President of Egypt (1981-2011)', role: 'Political', titleVariants: ['President'] },
  'Bashar Al': { title: 'President of Syria', role: 'Political', titleVariants: ['President'] },
  'Moon Jae': { title: 'President of South Korea', role: 'Political', titleVariants: ['President'] },
  'Boris Nikolic': { title: 'Scientist', role: 'Academic', titleVariants: ['Scientist', 'Advisor'] },
  'Kathy Ruemmler': { title: 'Attorney', role: 'Legal', titleVariants: ['Attorney', 'White House Counsel'] },
  'David Schoen': { title: 'Attorney', role: 'Legal', titleVariants: ['Attorney', 'Lawyer'] },
  'Landon Thomas': { title: 'Journalist', role: 'Media', titleVariants: ['Journalist', 'Reporter'] },
  'New York Times': { title: 'Newspaper', role: 'Media', titleVariants: ['Newspaper', 'Publication'] },
  'Merrill Lynch': { title: 'Investment Bank', role: 'Business', titleVariants: ['Investment Bank', 'Financial Institution'] },
  'Investment Strategy Group': { title: 'Financial Services', role: 'Business', titleVariants: ['Financial Services'] },
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

async function enrichEntitiesWithTitlesAndRoles() {
  console.log('='.repeat(80));
  console.log('TITLE/ROLE ENRICHMENT & RISK DISTRIBUTION');
  console.log('='.repeat(80));
  
  const db = (databaseService as any).db;
  
  // Step 1: Assign known titles and roles
  console.log('\n[1/3] Assigning known titles and roles...');
  let knownCount = 0;
  
  for (const [entityName, metadata] of Object.entries(KNOWN_ENTITIES)) {
    const entity = db.prepare('SELECT id FROM entities WHERE full_name = ?').get(entityName);
    if (entity) {
      db.prepare(`
        UPDATE entities 
        SET title = ?, role = ?, title_variants = ?
        WHERE id = ?
      `).run(
        metadata.title || null,
        metadata.role,
        metadata.titleVariants ? JSON.stringify(metadata.titleVariants) : null,
        entity.id
      );
      knownCount++;
    }
  }
  
  console.log(`✓ Assigned metadata to ${knownCount} known entities`);
  
  // Step 2: Infer roles for remaining entities
  console.log('\n[2/3] Inferring roles for remaining entities...');
  const entitiesWithoutRole = db.prepare('SELECT id, full_name FROM entities WHERE role IS NULL').all();
  let inferredCount = 0;
  
  for (const entity of entitiesWithoutRole) {
    const name = entity.full_name.toLowerCase();
    let inferredRole = 'Unknown';
    
    for (const [role, patterns] of Object.entries(ROLE_PATTERNS)) {
      if (patterns.some(pattern => pattern.test(name))) {
        inferredRole = role;
        break;
      }
    }
    
    db.prepare('UPDATE entities SET role = ? WHERE id = ?').run(inferredRole, entity.id);
    if (inferredRole !== 'Unknown') {
      inferredCount++;
    }
  }
  
  console.log(`✓ Inferred roles for ${inferredCount} entities`);
  
  // Step 3: Distribute risk levels based on mentions
  console.log('\n[3/3] Distributing risk levels...');
  
  // Get mention count distribution
  const stats = db.prepare(`
    SELECT 
      MAX(mentions) as max_mentions,
      MIN(mentions) as min_mentions,
      AVG(mentions) as avg_mentions
    FROM entities
  `).get();
  
  const { max_mentions, min_mentions, avg_mentions } = stats;
  
  // Define thresholds
  // HIGH: top 20% (mentions > 80th percentile)
  // MEDIUM: middle 60% (20th-80th percentile)
  // LOW: bottom 20% (mentions < 20th percentile)
  
  const highThreshold = avg_mentions * 2; // Roughly top 20%
  const lowThreshold = avg_mentions * 0.3; // Roughly bottom 20%
  
  // Update risk levels
  db.prepare(`
    UPDATE entities 
    SET likelihood_level = 'HIGH'
    WHERE mentions >= ?
  `).run(highThreshold);
  
  db.prepare(`
    UPDATE entities 
    SET likelihood_level = 'LOW'
    WHERE mentions < ?
  `).run(lowThreshold);
  
  db.prepare(`
    UPDATE entities 
    SET likelihood_level = 'MEDIUM'
    WHERE mentions >= ? AND mentions < ?
  `).run(lowThreshold, highThreshold);
  
  // Get distribution
  const distribution = db.prepare(`
    SELECT likelihood_level, COUNT(*) as count
    FROM entities
    GROUP BY likelihood_level
  `).all();
  
  console.log('✓ Risk level distribution:');
  distribution.forEach((row: any) => {
    console.log(`  ${row.likelihood_level}: ${row.count} entities`);
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('ENRICHMENT COMPLETE');
  console.log('='.repeat(80));
}

enrichEntitiesWithTitlesAndRoles().catch(console.error);
