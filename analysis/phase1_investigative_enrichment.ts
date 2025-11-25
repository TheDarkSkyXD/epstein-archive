import Database from 'better-sqlite3';
import { join } from 'path';
import * as fs from 'fs';

const DB_PATH = join(process.cwd(), 'epstein-archive.db');
const db = new Database(DB_PATH);

console.log('='.repeat(80));
console.log('PHASE 1: INVESTIGATIVE-GRADE DATABASE ENRICHMENT');
console.log('Entity Separation | Metadata Extraction | Document Classification | Date Extraction');
console.log('='.repeat(80));

// ============================================================================
// STEP 1: CREATE NEW ENRICHMENT TABLES (avoid ALTER TABLE corruption)
// ============================================================================

function createEnrichmentTables() {
  console.log('\n[1/5] Creating enrichment tables...');
  
  // People table (separate from organizations)
  db.exec(`
    CREATE TABLE IF NOT EXISTS people (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_id INTEGER UNIQUE, -- Link to original entities table
      full_name TEXT NOT NULL,
      name_variants TEXT, -- JSON array of aliases, nicknames
      prefix TEXT, -- Mr., Dr., Hon., etc.
      first_name TEXT,
      middle_name TEXT,
      last_name TEXT,
      suffix TEXT, -- Jr., Sr., III, etc.
      primary_title TEXT, -- President, CEO, Attorney, etc.
      primary_role TEXT, -- Political, Legal, Business, etc.
      affiliations TEXT, -- JSON array of organization IDs
      birth_date DATE,
      death_date DATE,
      nationality TEXT,
      locations TEXT, -- JSON array of known locations
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (entity_id) REFERENCES entities(id)
    );
  `);
  
  // Organizations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS organizations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_id INTEGER UNIQUE,
      official_name TEXT NOT NULL,
      name_variants TEXT, -- JSON array of aliases
      organization_type TEXT, -- Government, Business, Non-profit, etc.
      industry TEXT,
      founded_date DATE,
      dissolved_date DATE,
      headquarters_location TEXT,
      key_people TEXT, -- JSON array of person IDs
      parent_organization_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (entity_id) REFERENCES entities(id),
      FOREIGN KEY (parent_organization_id) REFERENCES organizations(id)
    );
  `);
  
  // Document enrichment table
  db.exec(`
    CREATE TABLE IF NOT EXISTS document_enrichment (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER UNIQUE,
      document_type TEXT, -- Email, Legal, Flight_Log, Financial, Article, etc.
      document_subtype TEXT, -- Deposition, Contract, Invoice, etc.
      title TEXT, -- Human-readable title
      summary TEXT, -- Brief summary
      extracted_date DATE, -- Primary date from document
      date_range_start DATE,
      date_range_end DATE,
      sender TEXT, -- For emails
      recipients TEXT, -- JSON array for emails
      subject TEXT, -- For emails
      case_number TEXT, -- For legal documents
      court TEXT, -- For legal documents
      parties TEXT, -- JSON array of involved parties
      locations TEXT, -- JSON array of mentioned locations
      amounts TEXT, -- JSON array of financial amounts
      confidence_score REAL, -- 0-1 confidence in extraction
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (document_id) REFERENCES documents(id)
    );
  `);
  
  
  // Events/Timeline table (drop existing first to avoid conflicts)
  db.exec(`DROP TABLE IF EXISTS timeline_events;`);
  db.exec(`
    CREATE TABLE timeline_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_date DATE NOT NULL,
      event_type TEXT, -- Travel, Legal, Financial, Communication, Business, Personal
      title TEXT NOT NULL,
      description TEXT,
      location TEXT,
      people_involved TEXT, -- JSON array of person IDs
      organizations_involved TEXT, -- JSON array of org IDs
      document_ids TEXT, -- JSON array of source document IDs
      significance_score INTEGER DEFAULT 5, -- 1-10
      verified BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_people_entity ON people(entity_id);
    CREATE INDEX IF NOT EXISTS idx_people_name ON people(full_name);
    CREATE INDEX IF NOT EXISTS idx_orgs_entity ON organizations(entity_id);
    CREATE INDEX IF NOT EXISTS idx_orgs_name ON organizations(official_name);
    CREATE INDEX IF NOT EXISTS idx_doc_enrich_doc ON document_enrichment(document_id);
    CREATE INDEX IF NOT EXISTS idx_doc_enrich_type ON document_enrichment(document_type);
    CREATE INDEX IF NOT EXISTS idx_timeline_date ON timeline_events(event_date);
    CREATE INDEX IF NOT EXISTS idx_timeline_type ON timeline_events(event_type);
  `);
  
  console.log('✓ Enrichment tables created');
}

// ============================================================================
// STEP 2: CLASSIFY ENTITIES (People vs Organizations)
// ============================================================================

function classifyEntities() {
  console.log('\n[2/5] Classifying entities (people vs organizations)...');
  
  const entities = db.prepare('SELECT id, full_name FROM entities').all() as any[];
  
  const ORG_INDICATORS = [
    'inc', 'llc', 'ltd', 'plc', 'corp', 'corporation', 'company', 'co',
    'university', 'college', 'institute', 'school', 'academy',
    'council', 'commission', 'committee', 'board', 'authority',
    'agency', 'department', 'ministry', 'bureau', 'office',
    'bank', 'trust', 'fund', 'capital', 'partners', 'group',
    'foundation', 'association', 'society', 'union',
    'times', 'post', 'herald', 'news', 'journal', 'tribune',
    'government', 'state', 'federal', 'national'
  ];
  
  let peopleCount = 0;
  let orgCount = 0;
  
  for (const entity of entities) {
    const nameLower = entity.full_name.toLowerCase();
    const words = nameLower.split(/\s+/);
    
    let isOrganization = false;
    for (const word of words) {
      if (ORG_INDICATORS.includes(word)) {
        isOrganization = true;
        break;
      }
    }
    
    if (isOrganization) {
      // Insert into organizations table
      db.prepare(`
        INSERT OR IGNORE INTO organizations (entity_id, official_name, organization_type)
        VALUES (?, ?, ?)
      `).run(entity.id, entity.full_name, 'Unknown');
      orgCount++;
    } else {
      // Insert into people table
      db.prepare(`
        INSERT OR IGNORE INTO people (entity_id, full_name, primary_role)
        VALUES (?, ?, ?)
      `).run(entity.id, entity.full_name, 'Unknown');
      peopleCount++;
    }
    
    if ((peopleCount + orgCount) % 1000 === 0) {
      console.log(`  Classified ${peopleCount + orgCount}/${entities.length} entities...`);
    }
  }
  
  console.log(`✓ Classified ${peopleCount} people and ${orgCount} organizations`);
}

// ============================================================================
// STEP 3: EXTRACT METADATA (Titles, Roles, etc.)
// ============================================================================

function extractMetadata() {
  console.log('\n[3/5] Extracting metadata (titles, roles, etc.)...');
  
  // Known people with titles
  const KNOWN_PEOPLE: Record<string, { title: string; role: string }> = {
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
    'Political': [/president|senator|governor|congressman|minister|secretary of state/i],
    'Legal': [/attorney|lawyer|judge|prosecutor|counsel/i],
    'Academic': [/professor|doctor|scientist|researcher/i],
    'Media': [/journalist|reporter|author|writer|editor/i],
    'Business': [/ceo|founder|executive|businessman|financier|investor/i],
    'Social': [/socialite|philanthropist/i],
  };
  
  let updatedCount = 0;
  
  // Update known people
  for (const [name, metadata] of Object.entries(KNOWN_PEOPLE)) {
    const result = db.prepare(`
      UPDATE people 
      SET primary_title = ?, primary_role = ?
      WHERE full_name = ?
    `).run(metadata.title, metadata.role, name);
    
    if (result.changes > 0) updatedCount++;
  }
  
  // Infer roles for others
  const people = db.prepare(`SELECT id, full_name FROM people WHERE primary_role = 'Unknown'`).all() as any[];
  
  for (const person of people) {
    const nameLower = person.full_name.toLowerCase();
    let inferredRole = 'Individual';
    
    for (const [role, patterns] of Object.entries(ROLE_PATTERNS)) {
      if (patterns.some(pattern => pattern.test(nameLower))) {
        inferredRole = role;
        break;
      }
    }
    
    db.prepare('UPDATE people SET primary_role = ? WHERE id = ?').run(inferredRole, person.id);
    updatedCount++;
  }
  
  console.log(`✓ Updated metadata for ${updatedCount} entities`);
}

// ============================================================================
// STEP 4: CLASSIFY DOCUMENTS
// ============================================================================

function classifyDocuments() {
  console.log('\n[4/5] Classifying documents...');
  
  const documents = db.prepare('SELECT id, file_name, content FROM documents').all() as any[];
  let classifiedCount = 0;
  
  for (const doc of documents) {
    const content = doc.content || '';
    const firstLines = content.split('\n').slice(0, 30).join('\n');
    
    let docType: string = 'Document';
    let docSubtype: string | null = null;
    let title: string = '';
    let extractedDate: string | null = null;
    let sender: string | null = null;
    let recipients: string | null = null;
    let subject: string | null = null;
    let caseNumber: string | null = null;
    let court: string | null = null;
    
    // Email detection
    if (/From:\s/.test(firstLines) && /To:\s/.test(firstLines)) {
      docType = 'Email';
      
      const fromMatch = firstLines.match(/From:\s*(.+?)$/im);
      if (fromMatch) sender = fromMatch[1].trim();
      
      const toMatch = firstLines.match(/To:\s*(.+?)$/im);
      if (toMatch) recipients = JSON.stringify([toMatch[1].trim()]);
      
      const subjectMatch = firstLines.match(/Subject:\s*(.+?)$/im);
      if (subjectMatch) {
        subject = subjectMatch[1].trim();
        title = `Email: ${subject!.substring(0, 80)}`;
      }
      
      const dateMatch = firstLines.match(/(?:Date|Sent):\s*(.+?)$/im);
      if (dateMatch) {
        try {
          extractedDate = new Date(dateMatch[1].trim()).toISOString().split('T')[0];
        } catch (e) {
          // Ignore date parsing errors
        }
      }
    }
    // Legal document detection
    else if (/case\s+no\.?/i.test(firstLines) || /deposition/i.test(firstLines) || /affidavit/i.test(firstLines)) {
      docType = 'Legal';
      
      if (/deposition/i.test(firstLines)) docSubtype = 'Deposition';
      else if (/affidavit/i.test(firstLines)) docSubtype = 'Affidavit';
      else if (/motion/i.test(firstLines)) docSubtype = 'Motion';
      else if (/complaint/i.test(firstLines)) docSubtype = 'Complaint';
      
      const caseMatch = firstLines.match(/case\s+no\.?\s*:?\s*([^\n]+)/i);
      if (caseMatch) {
        caseNumber = caseMatch[1].trim();
        title = `Legal: ${caseNumber}`;
      }
      
      const courtMatch = firstLines.match(/(district court|supreme court|court of appeals|bankruptcy court)[^\n]*/i);
      if (courtMatch) court = courtMatch[0].trim();
    }
    // Flight log detection
    else if (/N908JE/i.test(content) || /flight\s+log/i.test(content) || /passenger/i.test(content)) {
      docType = 'Flight_Log';
      title = `Flight Log: ${doc.file_name}`;
    }
    // Financial document detection
    else if (/invoice|receipt|statement|transaction|payment/i.test(firstLines)) {
      docType = 'Financial';
      if (/invoice/i.test(firstLines)) docSubtype = 'Invoice';
      else if (/statement/i.test(firstLines)) docSubtype = 'Statement';
    }
    // Article/News detection
    else if (/http[s]?:\/\//.test(firstLines) || /published:/i.test(firstLines)) {
      docType = 'Article';
    }
    
    // Generate title if not set
    if (!title) {
      const lines = content.split('\n').filter((l: string) => l.trim().length > 10);
      if (lines.length > 0) {
        title = lines[0].trim().substring(0, 100);
      } else {
        title = doc.file_name.replace(/\.(txt|pdf)$/i, '');
      }
    }
    
    // Add filename to title
    title = `${title} (${doc.file_name.substring(0, 40)})`;
    
    // Extract summary
    const summary = content.substring(0, 500).trim();
    
    // Insert enrichment
    db.prepare(`
      INSERT OR REPLACE INTO document_enrichment (
        document_id, document_type, document_subtype, title, summary,
        extracted_date, sender, recipients, subject, case_number, court
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      doc.id, docType, docSubtype, title, summary,
      extractedDate, sender, recipients, subject, caseNumber, court
    );
    
    classifiedCount++;
    
    if (classifiedCount % 100 === 0) {
      console.log(`  Classified ${classifiedCount}/${documents.length} documents...`);
    }
  }
  
  console.log(`✓ Classified ${classifiedCount} documents`);
}

// ============================================================================
// STEP 5: EXTRACT DATES AND CREATE TIMELINE EVENTS
// ============================================================================

function extractDatesAndEvents() {
  console.log('\n[5/5] Extracting dates and creating timeline events...');
  
  const documents = db.prepare(`
    SELECT d.id, d.file_name, d.content, de.document_type, de.extracted_date, de.title
    FROM documents d
    LEFT JOIN document_enrichment de ON d.id = de.document_id
  `).all() as any[];
  
  let eventsCreated = 0;
  
  for (const doc of documents) {
    if (!doc.extracted_date) continue;
    
    let eventType = 'Document';
    if (doc.document_type === 'Email') eventType = 'Communication';
    else if (doc.document_type === 'Legal') eventType = 'Legal';
    else if (doc.document_type === 'Flight_Log') eventType = 'Travel';
    else if (doc.document_type === 'Financial') eventType = 'Financial';
    
    const title = doc.title || doc.file_name;
    const description = `Document: ${doc.file_name}`;
    
    db.prepare(`
      INSERT INTO timeline_events (
        event_date, event_type, title, description, document_ids
      ) VALUES (?, ?, ?, ?, ?)
    `).run(
      doc.extracted_date,
      eventType,
      title.substring(0, 200),
      description,
      JSON.stringify([doc.id])
    );
    
    eventsCreated++;
  }
  
  console.log(`✓ Created ${eventsCreated} timeline events`);
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
    
    // Run enrichment steps
    createEnrichmentTables();
    classifyEntities();
    extractMetadata();
    classifyDocuments();
    extractDatesAndEvents();
    
    // Final statistics
    console.log('\n' + '='.repeat(80));
    console.log('PHASE 1 COMPLETE - STATISTICS');
    console.log('='.repeat(80));
    
    const stats = db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM people) as people_count,
        (SELECT COUNT(*) FROM organizations) as org_count,
        (SELECT COUNT(*) FROM document_enrichment) as enriched_docs,
        (SELECT COUNT(*) FROM timeline_events) as events_count,
        (SELECT COUNT(*) FROM document_enrichment WHERE document_type != 'Document') as classified_docs
    `).get() as any;
    
    console.log(`People: ${stats.people_count.toLocaleString()}`);
    console.log(`Organizations: ${stats.org_count.toLocaleString()}`);
    console.log(`Documents Enriched: ${stats.enriched_docs.toLocaleString()}`);
    console.log(`Documents Classified: ${stats.classified_docs.toLocaleString()}`);
    console.log(`Timeline Events: ${stats.events_count.toLocaleString()}`);
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ PHASE 1 ENRICHMENT COMPLETE');
    console.log('='.repeat(80));
    
    db.close();
  } catch (error) {
    console.error('\n❌ Error during enrichment:', error);
    db.close();
    process.exit(1);
  }
}

main();
