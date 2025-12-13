#!/usr/bin/env tsx
/**
 * Insert Missing Known Entities
 * 
 * Adds entities from Known Entities RTF that don't exist in the database
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../epstein-archive-production.db');
const DRY_RUN = process.argv.includes('--dry-run');

interface KnownEntity {
  name: string;
  title: string;
  role: string;
  primary_role: string;
}

// All entities from Known Entities RTF that need to be present
const KNOWN_ENTITIES: KnownEntity[] = [
  // Core figures (already present, but included for completeness)
  { name: 'Jeffrey Epstein', title: 'Financier', role: 'Primary Subject', primary_role: 'Key Figure' },
  { name: 'Ghislaine Maxwell', title: 'Socialite', role: 'Co-Conspirator', primary_role: 'Key Figure' },
  
  // Politicians
  { name: 'Donald Trump', title: 'U.S. President', role: 'Associate', primary_role: 'Politician' },
  { name: 'Bill Clinton', title: 'Former U.S. President', role: 'Associate', primary_role: 'Politician' },
  { name: 'Hillary Clinton', title: 'Former U.S. Secretary of State', role: 'Political Figure', primary_role: 'Politician' },
  { name: 'Al Gore', title: 'Former U.S. Vice President', role: 'Political Figure', primary_role: 'Politician' },
  { name: 'Bill Richardson', title: 'Former Governor of New Mexico', role: 'Associate', primary_role: 'Politician' },
  { name: 'Robert F. Kennedy Jr.', title: 'Environmental Lawyer', role: 'Political Figure', primary_role: 'Politician' },
  
  // Royalty
  { name: 'Prince Andrew', title: 'Duke of York', role: 'Royal', primary_role: 'Royalty' },
  { name: 'Sarah Ferguson', title: 'Duchess of York', role: 'Royal', primary_role: 'Royalty' },
  
  // Foreign Leaders
  { name: 'Ehud Barak', title: 'Former Prime Minister of Israel', role: 'Foreign Leader', primary_role: 'Politician' },
  
  // Business/Finance
  { name: 'Les Wexner', title: 'L Brands Founder', role: 'Business Partner', primary_role: 'Businessman' },
  { name: 'Abigail Wexner', title: 'Philanthropist', role: 'Associate', primary_role: 'Philanthropist' },
  { name: 'Glenn Dubin', title: 'Hedge Fund Manager', role: 'Associate', primary_role: 'Financier' },
  { name: 'Eva Andersson-Dubin', title: 'Physician', role: 'Associate', primary_role: 'Doctor' },
  { name: 'Tom Pritzker', title: 'Executive Chairman, Hyatt Hotels', role: 'Associate', primary_role: 'Businessman' },
  { name: 'Larry Summers', title: 'Former U.S. Treasury Secretary', role: 'Associate', primary_role: 'Economist' },
  { name: 'Elon Musk', title: 'Technology Executive (Tesla, SpaceX)', role: 'Associate', primary_role: 'Businessman' },
  { name: 'Peter Thiel', title: 'Technology Investor', role: 'Associate', primary_role: 'Businessman' },
  { name: 'Frederic Fekkai', title: 'Hairstylist / Entrepreneur', role: 'Associate', primary_role: 'Businessman' },
  
  // Lawyers
  { name: 'Alan Dershowitz', title: 'Lawyer / Legal Scholar', role: 'Legal Counsel', primary_role: 'Lawyer' },
  { name: 'Kathryn Ruemmler', title: 'Lawyer / Former White House Counsel', role: 'Legal Counsel', primary_role: 'Lawyer' },
  { name: 'Louis Freeh', title: 'Former FBI Director', role: 'Legal Counsel', primary_role: 'Law Enforcement' },
  { name: 'Stanley Pottinger', title: 'Lawyer / Former Nixon Official', role: 'Legal Counsel', primary_role: 'Lawyer' },
  { name: 'Eric Gany', title: 'Epstein Attorney', role: 'Legal', primary_role: 'Lawyer' },
  
  // Celebrities - Actors
  { name: 'Leonardo DiCaprio', title: 'Actor', role: 'Celebrity Associate', primary_role: 'Actor' },
  { name: 'Kevin Spacey', title: 'Actor', role: 'Celebrity Associate', primary_role: 'Actor' },
  { name: 'Cate Blanchett', title: 'Actor', role: 'Celebrity Associate', primary_role: 'Actor' },
  { name: 'Bruce Willis', title: 'Actor', role: 'Celebrity Associate', primary_role: 'Actor' },
  { name: 'Cameron Diaz', title: 'Actor', role: 'Celebrity Associate', primary_role: 'Actor' },
  { name: 'Chris Tucker', title: 'Comedian / Actor', role: 'Celebrity Associate', primary_role: 'Actor' },
  { name: 'Marla Maples', title: 'Actor / Trump Family', role: 'Family Member', primary_role: 'Actress' },
  
  // Celebrities - Musicians
  { name: 'Michael Jackson', title: 'Musician', role: 'Celebrity Associate', primary_role: 'Musician' },
  { name: 'Mick Jagger', title: 'Musician (The Rolling Stones)', role: 'Celebrity Associate', primary_role: 'Musician' },
  { name: 'Courtney Love', title: 'Musician', role: 'Celebrity Associate', primary_role: 'Musician' },
  
  // Celebrities - Models
  { name: 'Naomi Campbell', title: 'Model', role: 'Celebrity Associate', primary_role: 'Model' },
  
  // Celebrities - Other
  { name: 'David Copperfield', title: 'Magician / Entertainer', role: 'Celebrity Associate', primary_role: 'Entertainer' },
  { name: 'George Lucas', title: 'Film Director / Producer', role: 'Celebrity Associate', primary_role: 'Director' },
  
  // Academics
  { name: 'Stephen Hawking', title: 'Theoretical Physicist', role: 'Academic', primary_role: 'Scientist' },
  { name: 'Marvin Minsky', title: 'MIT Professor / AI Researcher', role: 'Academic', primary_role: 'Scientist' },
  { name: 'Noam Chomsky', title: 'Linguist / Political Theorist', role: 'Academic', primary_role: 'Academic' },
  
  // Journalists
  { name: 'Michael Wolff', title: 'Journalist / Author', role: 'Media', primary_role: 'Journalist' },
  { name: 'Sharon Churcher', title: 'Journalist (UK)', role: 'Media', primary_role: 'Journalist' },
  { name: 'Vicky Ward', title: 'Journalist', role: 'Media', primary_role: 'Journalist' },
  { name: 'Wendy Leigh', title: 'Journalist / Author', role: 'Media', primary_role: 'Journalist' },
  { name: 'Forest Sawyer', title: 'Journalist', role: 'Media', primary_role: 'Journalist' },
  { name: 'Peggy Siegal', title: 'Publicist', role: 'Associate', primary_role: 'PR Professional' },
  
  // Victims/Survivors
  { name: 'Virginia Giuffre', title: 'Survivor / Plaintiff', role: 'Victim', primary_role: 'Victim' },
  { name: 'Annie Farmer', title: 'Survivor', role: 'Victim', primary_role: 'Victim' },
  { name: 'Maria Farmer', title: 'Survivor / Whistleblower', role: 'Victim', primary_role: 'Victim' },
  { name: 'Anouska De Georgiou', title: 'Survivor', role: 'Victim', primary_role: 'Victim' },
  { name: 'Johanna Sjoberg', title: 'Victim / Key Witness', role: 'Victim', primary_role: 'Victim' },
  { name: 'Courtney Wild', title: 'Survivor', role: 'Victim', primary_role: 'Victim' },
  { name: 'Nadia Marcinkova', title: 'Epstein Associate / Victim', role: 'Employee', primary_role: 'Staff' },
  
  // Pilots
  { name: 'John Connolly', title: 'Epstein Pilot', role: 'Employee', primary_role: 'Pilot' },
  { name: 'Dave Rodgers', title: 'Epstein Pilot', role: 'Employee', primary_role: 'Pilot' },
  { name: 'Janusz Banasiak', title: 'Epstein Pilot', role: 'Employee', primary_role: 'Pilot' },
  { name: 'Philip Guderyon', title: 'Epstein Pilot', role: 'Employee', primary_role: 'Pilot' },
  
  // Household Staff
  { name: 'Juan Alessi', title: 'Epstein Property Manager', role: 'Employee', primary_role: 'Staff' },
  { name: 'Maria Alessi', title: 'Epstein Household Staff', role: 'Employee', primary_role: 'Staff' },
  { name: 'Alfredo Rodriguez', title: 'Epstein Property Manager', role: 'Employee', primary_role: 'Staff' },
  { name: 'Sarah Kellen', title: 'Epstein Assistant', role: 'Employee', primary_role: 'Staff' },
  { name: 'Adriana Ross', title: 'Epstein Contact', role: 'Employee', primary_role: 'Staff' },
  { name: 'Leslie Groff', title: 'Epstein Household Employee', role: 'Employee', primary_role: 'Staff' },
  { name: 'Rebecca Boylan', title: 'Epstein Household Employee', role: 'Employee', primary_role: 'Staff' },
  { name: 'Crystal Figueroa', title: 'Epstein Household Employee', role: 'Employee', primary_role: 'Staff' },
  { name: 'Anthony Figueroa', title: 'Epstein Household Employee', role: 'Employee', primary_role: 'Staff' },
  { name: 'Shannon Harrison', title: 'Epstein Household Staff', role: 'Employee', primary_role: 'Staff' },
  { name: 'Shelly Harrison', title: 'Epstein Household Staff', role: 'Employee', primary_role: 'Staff' },
  { name: 'Cresencia Valdez', title: 'Epstein Household Staff', role: 'Employee', primary_role: 'Staff' },
  { name: 'Maritza Vasquez', title: 'Epstein Household Staff', role: 'Employee', primary_role: 'Staff' },
  
  // Epstein Associates
  { name: 'Jean-Luc Brunel', title: 'Model Scout / Epstein Associate', role: 'Associate', primary_role: 'Associate' },
  { name: 'James Michael Austrich', title: 'Epstein Associate', role: 'Associate', primary_role: 'Associate' },
  { name: 'Ron Eppinger', title: 'Epstein Associate', role: 'Associate', primary_role: 'Associate' },
  { name: 'Ross Gow', title: 'Epstein Associate', role: 'Associate', primary_role: 'Associate' },
  { name: 'Fred Graff', title: 'Epstein Associate', role: 'Associate', primary_role: 'Associate' },
  { name: 'Brett Jaffe', title: 'Epstein Associate', role: 'Associate', primary_role: 'Associate' },
  { name: 'Carol Kess', title: 'Epstein Associate', role: 'Associate', primary_role: 'Associate' },
  { name: 'Stephen Kaufmann', title: 'Epstein Associate', role: 'Associate', primary_role: 'Associate' },
  { name: 'Bob Meister', title: 'Epstein Associate', role: 'Associate', primary_role: 'Associate' },
  { name: 'Kevin Thompson', title: 'Epstein Associate', role: 'Associate', primary_role: 'Associate' },
  { name: 'Doug Band', title: 'Clinton Foundation Executive', role: 'Political Advisor', primary_role: 'Political Advisor' },
  
  // Contacts from Black Book
  { name: 'Bella Klein', title: 'Epstein Contact / Staff', role: 'Contact', primary_role: 'Contact' },
  { name: 'Victoria Bean', title: 'Epstein Contact', role: 'Contact', primary_role: 'Contact' },
  { name: 'Dana Burns', title: 'Workplace Safety Consultant', role: 'Contact', primary_role: 'Contact' },
  { name: 'Daniel Estes', title: 'Epstein Contact', role: 'Contact', primary_role: 'Contact' },
  { name: 'Alexandra Fekkai', title: 'Socialite', role: 'Associate', primary_role: 'Socialite' },
  { name: 'JoJo Fontanella', title: 'Epstein Contact', role: 'Contact', primary_role: 'Contact' },
  { name: 'Lynn Miller', title: 'Epstein Contact', role: 'Contact', primary_role: 'Contact' },
  { name: 'Sheridan Gibson-Butte', title: 'Epstein Contact', role: 'Contact', primary_role: 'Contact' },
  { name: 'Robert Giuffre', title: 'Virginia Giuffre\'s Father', role: 'Family', primary_role: 'Family' },
  { name: 'Alexandra Hall', title: 'Epstein Contact', role: 'Contact', primary_role: 'Contact' },
  { name: 'Joanna Harrison', title: 'Epstein Contact', role: 'Contact', primary_role: 'Contact' },
  { name: 'Victoria Hazel', title: 'Epstein Contact', role: 'Contact', primary_role: 'Contact' },
  { name: 'Brittany Henderson', title: 'Epstein Contact', role: 'Contact', primary_role: 'Contact' },
  { name: 'Forest Jones', title: 'Epstein Contact', role: 'Contact', primary_role: 'Contact' },
  { name: 'Peter Listerman', title: 'Epstein Contact', role: 'Contact', primary_role: 'Contact' },
  { name: 'Tom Lyons', title: 'Epstein Contact', role: 'Contact', primary_role: 'Contact' },
  { name: 'Jamie Melanson', title: 'Epstein Contact', role: 'Contact', primary_role: 'Contact' },
  { name: 'Donald Morrell', title: 'Epstein Contact', role: 'Contact', primary_role: 'Contact' },
  { name: 'David Mullen', title: 'Epstein Contact', role: 'Contact', primary_role: 'Contact' },
  { name: 'David Norr', title: 'Epstein Contact', role: 'Contact', primary_role: 'Contact' },
  { name: 'Joe Pagano', title: 'Epstein Contact', role: 'Contact', primary_role: 'Contact' },
  { name: 'May Paluga', title: 'Epstein Contact', role: 'Contact', primary_role: 'Contact' },
  { name: 'Rinaldo Rizzo', title: 'Epstein Contact', role: 'Contact', primary_role: 'Contact' },
  { name: 'Debra Rizzo', title: 'Epstein Contact', role: 'Contact', primary_role: 'Contact' },
  { name: 'Sky Roberts', title: 'Epstein Victim Contact', role: 'Contact', primary_role: 'Contact' },
  { name: 'Kimberley Roberts', title: 'Epstein Contact', role: 'Contact', primary_role: 'Contact' },
  { name: 'Lynn Roberts', title: 'Epstein Contact', role: 'Contact', primary_role: 'Contact' },
  { name: 'Haley Robson', title: 'Epstein Contact', role: 'Contact', primary_role: 'Contact' },
  { name: 'Scott Rothinson', title: 'Epstein Contact', role: 'Contact', primary_role: 'Contact' },
  { name: 'Doug Schoettle', title: 'Epstein Contact', role: 'Contact', primary_role: 'Contact' },
  { name: 'Cecilia Stein', title: 'Epstein Contact', role: 'Contact', primary_role: 'Contact' },
  { name: 'Marianne Strong', title: 'Epstein Contact', role: 'Contact', primary_role: 'Contact' },
  { name: 'Mark Tafoya', title: 'Epstein Contact', role: 'Contact', primary_role: 'Contact' },
  { name: 'Emmy Taylor', title: 'Epstein Contact', role: 'Contact', primary_role: 'Contact' },
  { name: 'Brent Tindall', title: 'Epstein Contact', role: 'Contact', primary_role: 'Contact' },
  { name: 'Emma Vaghan', title: 'Epstein Contact', role: 'Contact', primary_role: 'Contact' },
  { name: 'Anthony Valladares', title: 'Epstein Contact', role: 'Contact', primary_role: 'Contact' },
  { name: 'Christina Venero', title: 'Epstein Contact', role: 'Contact', primary_role: 'Contact' },
  { name: 'Jarred Weisfield', title: 'Political Operative', role: 'Contact', primary_role: 'Contact' },
  { name: 'Sharon White', title: 'Epstein Contact', role: 'Contact', primary_role: 'Contact' },
  { name: 'Daniel Wilson', title: 'Epstein Contact', role: 'Contact', primary_role: 'Contact' },
  { name: 'Adriana Mucinska', title: 'Epstein Contact', role: 'Contact', primary_role: 'Contact' },
  { name: 'Victoria Hazell', title: 'Epstein Contact', role: 'Contact', primary_role: 'Contact' },
  { name: 'Kristy Rodgers', title: 'Epstein Contact', role: 'Contact', primary_role: 'Contact' },
  { name: 'Patsy Rodgers', title: 'Epstein Contact', role: 'Contact', primary_role: 'Contact' },
  { name: 'Sharon Reynolds', title: 'Epstein Contact', role: 'Contact', primary_role: 'Contact' },
  { name: 'Kelly Spamm', title: 'Epstein Contact', role: 'Contact', primary_role: 'Contact' },
  { name: 'Alexandra Dixon', title: 'Epstein Contact', role: 'Contact', primary_role: 'Contact' },
  { name: 'Donna Oliver', title: 'Epstein Contact', role: 'Contact', primary_role: 'Contact' },
  { name: 'Judith Lightfoot', title: 'Epstein Contact', role: 'Contact', primary_role: 'Contact' },
  
  // Law Enforcement
  { name: 'Detective Joe Recarey', title: 'Palm Beach Police Detective', role: 'Investigator', primary_role: 'Law Enforcement' },
  { name: 'Chief Michael Reiter', title: 'Palm Beach Police Chief', role: 'Investigator', primary_role: 'Law Enforcement' },
  
  // Medical Professionals
  { name: 'Dr Chris Donahue', title: 'Physician', role: 'Medical', primary_role: 'Doctor' },
  { name: 'Dr Wah Wah', title: 'Massage Therapist', role: 'Medical', primary_role: 'Doctor' },
  { name: 'Dr Karen Kutikoff', title: 'Psychiatrist', role: 'Medical', primary_role: 'Doctor' },
  { name: 'Dr Carol Hayek', title: 'Physician', role: 'Medical', primary_role: 'Doctor' },
  { name: 'Dr John Harris', title: 'Physician', role: 'Medical', primary_role: 'Doctor' },
  { name: 'Dr Steven Olson', title: 'Physician', role: 'Medical', primary_role: 'Doctor' },
  { name: 'Dr Darshanee Majaliyana', title: 'Physician', role: 'Medical', primary_role: 'Doctor' },
  { name: 'Dr Mona Devansean', title: 'Physician', role: 'Medical', primary_role: 'Doctor' },
  { name: 'Dr Scott Robert Geiger', title: 'Physician', role: 'Medical', primary_role: 'Doctor' },
  { name: 'Dr Michele Streeter', title: 'Physician', role: 'Medical', primary_role: 'Doctor' },
  
  // Architects
  { name: 'Ed Tuttle', title: 'Architect (Epstein Residences)', role: 'Professional', primary_role: 'Architect' },
  { name: 'Mark Zeff', title: 'Architect', role: 'Professional', primary_role: 'Architect' },
  { name: 'Ricardo Legoretta', title: 'Architect', role: 'Professional', primary_role: 'Architect' },
  
  // Family
  { name: 'Mark Epstein', title: 'Jeffrey Epstein\'s Brother', role: 'Family', primary_role: 'Family' },
  { name: 'Tiffany Trump', title: 'Trump Family Member', role: 'Family Member', primary_role: 'Public Figure' },
  { name: 'Ivanka Trump', title: 'Businesswoman / Trump Family', role: 'Family Member', primary_role: 'Businesswoman' },
  { name: 'Melania Trump', title: 'U.S. First Lady', role: 'Family Member', primary_role: 'Public Figure' },
  
  // Advocates
  { name: 'Meg Garvin', title: 'Victims Rights Advocate (RAINN)', role: 'Advocate', primary_role: 'Advocate' },
];

let stats = {
  inserted: 0,
  updated: 0,
  alreadyPresent: 0,
};

async function main() {
  console.log('\n📥 Insert Missing Known Entities\n');
  console.log(`Database: ${DB_PATH}`);
  console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN' : '✏️  LIVE MODE'}\n`);
  console.log(`Total known entities: ${KNOWN_ENTITIES.length}\n`);
  
  const db = new Database(DB_PATH);
  
  const findEntity = db.prepare(`SELECT id, full_name FROM entities WHERE full_name = ?`);
  
  const insertEntity = db.prepare(`
    INSERT INTO entities (full_name, title, role, primary_role, mentions, entity_type)
    VALUES (?, ?, ?, ?, 0, 'Person')
  `);
  
  const updateEntity = db.prepare(`
    UPDATE entities SET title = ?, role = ?, primary_role = ?
    WHERE full_name = ?
  `);
  
  try {
    db.exec('BEGIN TRANSACTION');
    
    for (const entity of KNOWN_ENTITIES) {
      const existing = findEntity.get(entity.name) as any;
      
      if (existing) {
        // Update existing entity with role/title info
        if (!DRY_RUN) {
          updateEntity.run(entity.title, entity.role, entity.primary_role, entity.name);
        }
        stats.updated++;
      } else {
        // Insert new entity
        console.log(`   + Inserting: ${entity.name} (${entity.title} | ${entity.primary_role})`);
        if (!DRY_RUN) {
          insertEntity.run(entity.name, entity.title, entity.role, entity.primary_role);
        }
        stats.inserted++;
      }
    }
    
    if (!DRY_RUN) {
      db.exec('COMMIT');
    } else {
      db.exec('ROLLBACK');
      console.log('\n🔍 DRY RUN - No changes committed');
    }
    
    console.log('\n' + '═'.repeat(50));
    console.log(`\n📋 Summary${DRY_RUN ? ' (DRY RUN)' : ''}`);
    console.log(`   New entities inserted: ${stats.inserted}`);
    console.log(`   Existing updated:      ${stats.updated}`);
    console.log(`   Total known entities:  ${KNOWN_ENTITIES.length}`);
    
    // Show current counts
    const totalCount = db.prepare('SELECT COUNT(*) as count FROM entities').get() as { count: number };
    console.log(`\n   Total entities in DB:  ${totalCount.count}`);
    
    console.log('\n' + '═'.repeat(50));
    
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  } finally {
    db.close();
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
