#!/usr/bin/env tsx
/**
 * Entity Role & Title Enrichment Script
 * 
 * Purpose: Assign proper roles, titles, and categories to key entities
 * using the Known Entities list and contextual information.
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../epstein-archive.db');
const DRY_RUN = process.argv.includes('--dry-run');

// Comprehensive role/title mappings for known entities
interface EntityEnrichment {
  title: string;
  role: string;
  primary_role: string;
  category?: string;
}

const ENTITY_ENRICHMENTS: Record<string, EntityEnrichment> = {
  // Core Figures
  'Jeffrey Epstein': { title: 'Financier', role: 'Primary Subject', primary_role: 'Key Figure' },
  'Ghislaine Maxwell': { title: 'Socialite', role: 'Co-Conspirator', primary_role: 'Key Figure' },
  
  // U.S. Presidents & Politicians
  'Donald Trump': { title: 'Former U.S. President', role: 'Associate', primary_role: 'Politician' },
  'Bill Clinton': { title: 'Former U.S. President', role: 'Associate', primary_role: 'Politician' },
  'Hillary Clinton': { title: 'Former Secretary of State', role: 'Political Figure', primary_role: 'Politician' },
  'President Obama': { title: 'Former U.S. President', role: 'Political Figure', primary_role: 'Politician' },
  'Al Gore': { title: 'Former Vice President', role: 'Political Figure', primary_role: 'Politician' },
  'Bill Richardson': { title: 'Former Governor', role: 'Associate', primary_role: 'Politician' },
  
  // Royalty
  'Prince Andrew': { title: 'Duke of York', role: 'Royal', primary_role: 'Royalty' },
  'Sarah Ferguson': { title: 'Duchess of York', role: 'Royal', primary_role: 'Royalty' },
  
  // Legal Professionals
  'Alan Dershowitz': { title: 'Professor / Attorney', role: 'Legal Counsel', primary_role: 'Lawyer' },
  'Alex Acosta': { title: 'Former U.S. Labor Secretary', role: 'Prosecutor', primary_role: 'Lawyer' },
  'Ken Starr': { title: 'Former Solicitor General', role: 'Legal Counsel', primary_role: 'Lawyer' },
  'Louis Freeh': { title: 'Former FBI Director', role: 'Legal Counsel', primary_role: 'Law Enforcement' },
  'Kathy Ruemmler': { title: 'Former White House Counsel', role: 'Legal Counsel', primary_role: 'Lawyer' },
  
  // Business Leaders
  'Leslie Wexner': { title: 'L Brands Founder', role: 'Business Partner', primary_role: 'Businessman' },
  'Bill Gates': { title: 'Microsoft Co-Founder', role: 'Associate', primary_role: 'Businessman' },
  'Elon Musk': { title: 'Tesla/SpaceX CEO', role: 'Associate', primary_role: 'Businessman' },
  'Peter Thiel': { title: 'PayPal Co-Founder', role: 'Associate', primary_role: 'Businessman' },
  'Glenn Dubin': { title: 'Hedge Fund Manager', role: 'Associate', primary_role: 'Financier' },
  'Larry Summers': { title: 'Former Treasury Secretary', role: 'Associate', primary_role: 'Economist' },
  'Tom Pritzker': { title: 'Hyatt Executive Chairman', role: 'Associate', primary_role: 'Businessman' },
  
  // Media / Journalists
  'Michael Wolff': { title: 'Author / Journalist', role: 'Media', primary_role: 'Journalist' },
  'Steve Bannon': { title: 'Former White House Strategist', role: 'Political Strategist', primary_role: 'Political Advisor' },
  'Landon Thomas': { title: 'New York Times Reporter', role: 'Media', primary_role: 'Journalist' },
  'Sharon Churcher': { title: 'Daily Mail Reporter', role: 'Media', primary_role: 'Journalist' },
  'Vicky Ward': { title: 'Author / Journalist', role: 'Media', primary_role: 'Journalist' },
  
  // Celebrities / Entertainers
  'Kevin Spacey': { title: 'Actor', role: 'Celebrity Associate', primary_role: 'Actor' },
  'David Copperfield': { title: 'Magician', role: 'Celebrity Associate', primary_role: 'Entertainer' },
  'Leonardo DiCaprio': { title: 'Actor', role: 'Celebrity Associate', primary_role: 'Actor' },
  'Naomi Campbell': { title: 'Supermodel', role: 'Celebrity Associate', primary_role: 'Model' },
  'Mick Jagger': { title: 'Musician', role: 'Celebrity Associate', primary_role: 'Musician' },
  'George Lucas': { title: 'Film Director', role: 'Celebrity Associate', primary_role: 'Director' },
  'Chris Tucker': { title: 'Actor / Comedian', role: 'Celebrity Associate', primary_role: 'Actor' },
  'Courtney Love': { title: 'Musician', role: 'Celebrity Associate', primary_role: 'Musician' },
  
  // Academics / Scientists
  'Stephen Hawking': { title: 'Physicist', role: 'Academic', primary_role: 'Scientist' },
  'Noam Chomsky': { title: 'Linguist / Professor', role: 'Academic', primary_role: 'Academic' },
  'Marvin Minsky': { title: 'AI Pioneer / Professor', role: 'Academic', primary_role: 'Scientist' },
  
  // Foreign Leaders
  'Ehud Barak': { title: 'Former Israeli PM', role: 'Foreign Leader', primary_role: 'Politician' },
  
  // Victims / Witnesses
  'Virginia Giuffre': { title: 'Plaintiff / Accuser', role: 'Victim', primary_role: 'Victim' },
  'Annie Farmer': { title: 'Witness', role: 'Victim', primary_role: 'Victim' },
  'Maria Farmer': { title: 'Witness', role: 'Victim', primary_role: 'Victim' },
  'Johanna Sjoberg': { title: 'Witness', role: 'Victim', primary_role: 'Victim' },
  'Courtney Wild': { title: 'Plaintiff', role: 'Victim', primary_role: 'Victim' },
  'Jane Doe': { title: 'Anonymous Plaintiff', role: 'Victim', primary_role: 'Victim' },
  
  // Epstein Associates / Staff
  'Sarah Kellen Vickers': { title: 'Personal Assistant', role: 'Employee', primary_role: 'Staff' },
  'Nadia Marcinkova': { title: 'Pilot / Associate', role: 'Employee', primary_role: 'Staff' },
  'Jean Luc Brunel': { title: 'Model Scout', role: 'Associate', primary_role: 'Associate' },
  'Adriana Ross': { title: 'Personal Assistant', role: 'Employee', primary_role: 'Staff' },
  'Lesley Groff': { title: 'Executive Assistant', role: 'Employee', primary_role: 'Staff' },
  'Juan Alessi': { title: 'House Manager', role: 'Employee', primary_role: 'Staff' },
  
  // Family
  'Robert Maxwell': { title: 'Media Mogul', role: 'Family', primary_role: 'Businessman' },
  'Mark Epstein': { title: 'Business Partner', role: 'Family', primary_role: 'Family' },
  'Ivanka Trump': { title: 'Businesswoman', role: 'Family Member', primary_role: 'Businesswoman' },
  'Melania Trump': { title: 'Former First Lady', role: 'Family Member', primary_role: 'Public Figure' },
  
  // Law Enforcement / Investigators
  'Richard Kahn': { title: 'Estate Executor', role: 'Legal', primary_role: 'Executor' },
  'Detective Joe Recarey': { title: 'Palm Beach Detective', role: 'Investigator', primary_role: 'Law Enforcement' },
  'Chief Michael Reiter': { title: 'Palm Beach Police Chief', role: 'Investigator', primary_role: 'Law Enforcement' },
  
  // Other Notable Associates
  'Doug Band': { title: 'Clinton Foundation Advisor', role: 'Political Advisor', primary_role: 'Political Advisor' },
  'Peggy Siegal': { title: 'Publicist', role: 'Associate', primary_role: 'PR Professional' },
};

let stats = {
  updated: 0,
  notFound: 0,
};

function enrichEntities(db: Database.Database): void {
  console.log('\n🏷️  Entity Role & Title Enrichment\n');
  console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN' : '✏️  LIVE MODE'}\n`);
  
  const updateStmt = db.prepare(`
    UPDATE entities 
    SET title = ?, role = ?, primary_role = ?
    WHERE full_name = ? AND entity_type = 'Person'
  `);
  
  for (const [name, enrichment] of Object.entries(ENTITY_ENRICHMENTS)) {
    // Check if entity exists
    const entity = db.prepare(`
      SELECT id, full_name, title, role, primary_role 
      FROM entities 
      WHERE full_name = ? AND entity_type = 'Person'
    `).get(name) as any;
    
    if (entity) {
      console.log(`   ✓ ${name}: ${enrichment.title} | ${enrichment.role} | ${enrichment.primary_role}`);
      
      if (!DRY_RUN) {
        updateStmt.run(enrichment.title, enrichment.role, enrichment.primary_role, name);
      }
      stats.updated++;
    } else {
      console.log(`   ⚠️ Not found: ${name}`);
      stats.notFound++;
    }
  }
}

function generateReport(db: Database.Database): void {
  console.log('\n' + '═'.repeat(50));
  console.log(`\n📋 Enrichment Summary${DRY_RUN ? ' (DRY RUN)' : ''}`);
  console.log(`   Entities updated:   ${stats.updated}`);
  console.log(`   Entities not found: ${stats.notFound}`);
  
  // Show role distribution after
  console.log('\n📊 Role Distribution (Top 15):');
  const roles = db.prepare(`
    SELECT primary_role, COUNT(*) as count 
    FROM entities 
    WHERE entity_type = 'Person' AND primary_role IS NOT NULL AND primary_role != ''
    GROUP BY primary_role 
    ORDER BY count DESC 
    LIMIT 15
  `).all() as { primary_role: string; count: number }[];
  
  roles.forEach(r => {
    console.log(`   ${r.primary_role}: ${r.count}`);
  });
  
  console.log('\n' + '═'.repeat(50));
}

async function main() {
  console.log('\n🧹 Entity Role & Title Enrichment Script\n');
  console.log(`Database: ${DB_PATH}\n`);
  
  const db = new Database(DB_PATH);
  
  try {
    db.exec('BEGIN TRANSACTION');
    
    enrichEntities(db);
    
    if (!DRY_RUN) {
      db.exec('COMMIT');
    } else {
      db.exec('ROLLBACK');
      console.log('\n🔍 DRY RUN - No changes committed');
    }
    
    generateReport(db);
    
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
