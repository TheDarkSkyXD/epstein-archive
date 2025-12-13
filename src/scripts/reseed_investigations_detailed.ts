import Database from 'better-sqlite3';
import { join } from 'path';
import crypto from 'crypto';

const DB_PATH = process.env.DB_PATH || join(process.cwd(), 'epstein-archive.db');
const db = new Database(DB_PATH);

console.log(`Using database at ${DB_PATH}`);

function run() {
  try {
    // 0. Ensure tables exist
    console.log('Ensuring schema exists...');
    
    // Drop investigation-related tables to ensure fresh schema
    db.exec('DROP TABLE IF EXISTS investigations');
    db.exec('DROP TABLE IF EXISTS evidence_items');
    db.exec('DROP TABLE IF EXISTS investigation_timeline_events');
    db.exec('DROP TABLE IF EXISTS financial_transactions');

    db.exec(`
      CREATE TABLE IF NOT EXISTS investigations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT DEFAULT (lower(hex(randomblob(16)))),
        title TEXT NOT NULL,
        description TEXT,
        owner_id TEXT,
        collaborator_ids TEXT,
        status TEXT DEFAULT 'open',
        scope TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        file_path TEXT NOT NULL UNIQUE,
        file_type TEXT,
        file_size INTEGER,
        date_created TEXT,
        evidence_type TEXT,
        content TEXT,
        metadata_json TEXT,
        word_count INTEGER,
        red_flag_rating INTEGER,
        md5_hash TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS entities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        type TEXT CHECK(type IN ('Person', 'Organization', 'Location', 'Unknown')) DEFAULT 'Unknown',
        role TEXT,
        description TEXT,
        red_flag_rating INTEGER DEFAULT 0,
        red_flag_score INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS evidence_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        investigation_id INTEGER NOT NULL,
        document_id INTEGER,
        title TEXT,
        type TEXT,
        source_id TEXT,
        source TEXT,
        description TEXT,
        relevance TEXT,
        credibility TEXT,
        extracted_at DATETIME,
        extracted_by TEXT,
        authenticity_score INTEGER,
        hash TEXT,
        sensitivity TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (investigation_id) REFERENCES investigations(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS investigation_timeline_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        investigation_id INTEGER NOT NULL,
        title TEXT,
        description TEXT,
        type TEXT,
        start_date TEXT,
        end_date TEXT,
        entities_json TEXT,
        documents_json TEXT,
        confidence INTEGER,
        importance TEXT,
        tags_json TEXT,
        location_json TEXT,
        sources_json TEXT,
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (investigation_id) REFERENCES investigations(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS financial_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        investigation_id INTEGER,
        from_entity TEXT,
        to_entity TEXT,
        amount REAL,
        currency TEXT DEFAULT 'USD',
        transaction_date TEXT,
        transaction_type TEXT,
        method TEXT,
        risk_level TEXT,
        description TEXT,
        suspicious_indicators TEXT, 
        source_document_ids TEXT, 
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (investigation_id) REFERENCES investigations(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS investigation_hypotheses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        investigation_id INTEGER,
        title TEXT,
        description TEXT,
        status TEXT,
        confidence INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (investigation_id) REFERENCES investigations(id) ON DELETE CASCADE
      );
    `);

    // 1. Clean up existing investigations
    console.log('Cleaning up old investigations...');
    db.prepare('DELETE FROM investigations').run();
    db.prepare('DELETE FROM evidence_items').run();
    db.prepare('DELETE FROM investigation_timeline_events').run();
    db.prepare('DELETE FROM financial_transactions').run(); // Clean up financial transactions
    
    // 2. Create a new realistic investigation
    console.log('Creating new investigation...');
    const title = "Core Network Analysis: 2000-2005";
    const description = "Primary investigation into the financial and social connections during the critical period. Analyzing transaction patterns and flight logs.";
    const scope = "Financial flows, property acquisitions, and key associate movements.";
    
    const invResult = db.prepare(`
      INSERT INTO investigations (title, description, owner_id, status, scope, collaborator_ids)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      title,
      description,
      'system', 
      'open', 
      scope,
      '[]' 
    );
    
    const investigationId = invResult.lastInsertRowid;
    console.log(`Created investigation '${title}' (ID: ${investigationId})`);

    // 3. Seed "Real" Documents for Financial Evidence & Flight Logs
    console.log('Seeding documents...');
    const mockDocs = [
      { name: 'wire-transfer-001.pdf', desc: 'Wire transfer of $15M to Maxwell', date: '2004-03-15', type: 'financial_record', content: 'TRANSFER $15,000,000 USD TO GHISLAINE MAXWELL. BANK OF AMERICA.' },
      { name: 'bank-statement-2004.pdf', desc: 'JPMC Statement showing substantial inflow', date: '2004-04-01', type: 'financial_record', content: 'JPMC ACCOUNT 99887766. INFLOW: $25,000,000. SOURCE: WEXNER TRUST.' },
      { name: 'property-deed.pdf', desc: 'Palm Beach Property Deed', date: '2008-11-03', type: 'legal_document', content: 'DEED OF TRUST. PALM BEACH PROPERTY. JEFFREY EPSTEIN.' },
      { name: 'appraisal-report.pdf', desc: 'Property Appraisal Report', date: '2008-10-15', type: 'legal_document', content: 'APPRAISAL VALUE: $12,000,000.' },
      { name: 'wire-instructions.pdf', desc: 'Wire Instructions for Bank Leumi', date: '2010-06-18', type: 'financial_record', content: 'WIRE INSTRUCTIONS. BANK LEUMI. BENEFICIARY: MC2 MODELS.' },
      { name: 'account-opening.pdf', desc: 'Offshore Account Opening Documents', date: '2010-06-10', type: 'financial_record', content: 'ACCOUNT OPENING. US VIRGIN ISLANDS. LSJ LLC.' },
      { name: 'loan-agreement.pdf', desc: 'Loan Agreement with Cypress Trust', date: '2015-04-22', type: 'legal_document', content: 'LOAN AGREEMENT. CYPRESS TRUST. BORROWER: JEFFREY EPSTEIN.' },
      { name: 'flight-log-2002-09.pdf', desc: 'Flight Manifest Sept 2002', date: '2002-09-15', type: 'flight_log', content: 'FLIGHT LOG. PILOT: DAVID RODGERS. PAX: JEFFREY EPSTEIN, BILL CLINTON, GHISLAINE MAXWELL.' },
      { name: 'flight-log-2003-05.pdf', desc: 'Flight Manifest May 2003', date: '2003-05-20', type: 'flight_log', content: 'FLIGHT LOG. PILOT: LARRY VISOSKI. PAX: JEFFREY EPSTEIN, PRINCE ANDREW.' }
    ];

    const insertDoc = db.prepare(`
      INSERT OR IGNORE INTO documents (
        title, file_path, file_type, file_size, date_created, 
        evidence_type, content, metadata_json, word_count, red_flag_rating, md5_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const getDocId = db.prepare('SELECT id FROM documents WHERE file_path = ?');

    const docIdMap: Record<string, number> = {};

    for (const doc of mockDocs) {
        const filePath = `/opt/epstein-archive/data/financial/${doc.name}`;
        const hash = crypto.createHash('sha256').update(doc.name).digest('hex');
        
        insertDoc.run(
            doc.name,
            filePath,
            'application/pdf',
            1024 * 500, // 500kb mock
            new Date(doc.date).toISOString(),
            doc.type,
            doc.content,
            JSON.stringify({ source: 'financial_seeding', original_date: doc.date }),
            100,
            4,
            hash
        );

        const docRow = getDocId.get(filePath) as { id: number };
        
        if (docRow) {
             docIdMap[doc.name] = docRow.id;
             // Add as Evidence
             db.prepare(`
                INSERT INTO evidence_items (
                  investigation_id, document_id, title, type, source_id, source, description, 
                  relevance, credibility, sensitivity, extracted_at, extracted_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `).run(
                investigationId,
                docRow.id,
                doc.name,
                'document',
                docRow.id.toString(),
                'Financial Records Archive',
                doc.desc,
                'critical',
                'verified',
                'restricted',
                new Date().toISOString(),
                'system'
              );
              console.log(`  Added seeded document: ${doc.name}`);
        }
    }

    // 4. Add Key Entities as Evidence
    console.log('Adding key entities...');
    const keyNames = ['Epstein', 'Maxwell', 'Prince Andrew', 'Clinton', 'Trump', 'Wexner', 'Brunel', 'Rodgers', 'Visoski'];
    
    // Ensure these entities exist in the main entities table first (simple check/insert)
    const insertEntity = db.prepare(`
        INSERT OR IGNORE INTO entities (name, type, role, red_flag_rating) VALUES (?, ?, ?, ?)
    `);
    
    insertEntity.run('Jeffrey Epstein', 'Person', 'Financier', 5);
    insertEntity.run('Ghislaine Maxwell', 'Person', 'Associate', 5);
    insertEntity.run('Prince Andrew', 'Person', 'Royal', 4);
    insertEntity.run('Bill Clinton', 'Person', 'Politician', 3);
    insertEntity.run('Donald Trump', 'Person', 'Politician', 3);
    insertEntity.run('Leslie Wexner', 'Person', 'Business', 3);
    insertEntity.run('Jean-Luc Brunel', 'Person', 'Model Scout', 5);
    insertEntity.run('David Rodgers', 'Person', 'Pilot', 2);
    insertEntity.run('Larry Visoski', 'Person', 'Pilot', 2);


    for (const name of keyNames) {
      const entity = db.prepare(`SELECT id, name as full_name, role as primary_role FROM entities WHERE name LIKE ? LIMIT 1`).get(`%${name}%`) as any;
      
      if (entity) {
        console.log(`  Found entity: ${entity.full_name} (${entity.primary_role})`);
        
        db.prepare(`
          INSERT INTO evidence_items (
            investigation_id, title, type, source_id, source, description, 
            relevance, credibility, sensitivity, extracted_at, extracted_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          investigationId,
          entity.full_name,
          'entity', 
          entity.id.toString(), 
          'Entity Database', 
          `Key subject identified in investigation scope. Role: ${entity.primary_role || 'Associate'}`,
          'high',
          'verified',
          'public',
          new Date().toISOString(),
          'system'
        );
      }
    }

    // 5. Add Financial Transactions
    console.log('Adding financial transactions...');
    const transactions = [
        { from: 'Jeffrey Epstein', to: 'Ghislaine Maxwell', amount: 15000000, date: '2004-03-15', type: 'Wire Transfer', desc: 'Large transfer to Maxwell', doc: 'wire-transfer-001.pdf' },
        { from: 'Wexner Trust', to: 'Jeffrey Epstein', amount: 25000000, date: '2004-04-01', type: 'Deposit', desc: 'Inflow from Wexner', doc: 'bank-statement-2004.pdf' },
        { from: 'Jeffrey Epstein', to: 'Palm Beach County', amount: 12000000, date: '2008-11-03', type: 'Purchase', desc: 'Property Acquisition', doc: 'property-deed.pdf' },
        { from: 'Jeffrey Epstein', to: 'MC2 Models', amount: 250000, date: '2010-06-18', type: 'Wire Transfer', desc: 'Payment to agency', doc: 'wire-instructions.pdf' },
        { from: 'Cypress Trust', to: 'Jeffrey Epstein', amount: 5000000, date: '2015-04-22', type: 'Loan', desc: 'Loan disbursement', doc: 'loan-agreement.pdf' }
    ];

    const insertTx = db.prepare(`
        INSERT INTO financial_transactions (
            investigation_id, from_entity, to_entity, amount, transaction_date, 
            transaction_type, description, risk_level, source_document_ids, suspicious_indicators
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const tx of transactions) {
        const docId = docIdMap[tx.doc];
        const docIds = docId ? JSON.stringify([docId.toString()]) : '[]';
        
        insertTx.run(
            investigationId,
            tx.from,
            tx.to,
            tx.amount,
            tx.date,
            tx.type,
            tx.desc,
            tx.amount > 1000000 ? 'HIGH' : 'MEDIUM',
            docIds,
            JSON.stringify(tx.amount > 10000000 ? ['Large Round Amount', 'High Value'] : [])
        );
        console.log(`  Added transaction: $${tx.amount} from ${tx.from} to ${tx.to}`);
    }

    // 6. Add Timeline Events
    console.log('Adding timeline events...');
    db.prepare(`
      INSERT INTO investigation_timeline_events (
        investigation_id, title, description, type, start_date, confidence, importance
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      investigationId,
      'Initial Network Mapping',
      'Completed initial identification of primary nodes and financial conduits.',
      'analysis',
      '2025-01-10T10:00:00Z',
      90,
      'high'
    );
     db.prepare(`
      INSERT INTO investigation_timeline_events (
        investigation_id, title, description, type, start_date, confidence, importance
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      investigationId,
      'Suspicious Transfer Detection',
      'Identified pattern of high-value wire transfers to Maxwell accounts.',
      'discovery',
      '2025-01-12T14:30:00Z',
      95,
      'critical'
    );

    // 7. Add Hypotheses
    console.log('Adding hypotheses...');
    db.prepare(`
      INSERT INTO investigation_hypotheses (investigation_id, title, description, status, confidence)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      investigationId,
      'Financial Conduit Theory',
      'Epstein served as a financial conduit for high-net-worth individuals to move funds offshore via Maxwell-linked accounts.',
      'active',
      85
    );

    console.log('✅ Detailed investigation reseeding complete!');

  } catch (error) {
    console.error('Error reseeding investigations:', error);
    process.exit(1);
  }
}

run();
