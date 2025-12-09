import Database from 'better-sqlite3';
import { join } from 'path';
import crypto from 'crypto';

const DB_PATH = process.env.DB_PATH || join(process.cwd(), 'epstein-archive.db');
const db = new Database(DB_PATH);

console.log(`Using database at ${DB_PATH}`);

function run() {
  try {
    // 1. Clean up existing investigations
    console.log('Cleaning up old investigations...');
    db.prepare('DELETE FROM investigations').run();
    db.prepare('DELETE FROM evidence_items').run();
    db.prepare('DELETE FROM investigation_timeline_events').run();
    
    // Clean up specifically seeded mock documents (optional, but good for idempotency if we knew their IDs, but here we just append or ignore if file_path distinct)
    // We will use INSERT OR IGNORE for documents based on unique path
    
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

    // 3. Seed "Real" Documents for Financial Evidence
    console.log('Seeding financial documents...');
    const mockDocs = [
      { name: 'wire-transfer-001.pdf', desc: 'Wire transfer of $15M to Maxwell', date: '2004-03-15' },
      { name: 'bank-statement-2004.pdf', desc: 'JPMC Statement showing substantial inflow', date: '2004-04-01' },
      { name: 'property-deed.pdf', desc: 'Palm Beach Property Deed', date: '2008-11-03' },
      { name: 'appraisal-report.pdf', desc: 'Property Appraisal Report', date: '2008-10-15' },
      { name: 'wire-instructions.pdf', desc: 'Wire Instructions for Bank Leumi', date: '2010-06-18' },
      { name: 'account-opening.pdf', desc: 'Offshore Account Opening Documents', date: '2010-06-10' },
      { name: 'loan-agreement.pdf', desc: 'Loan Agreement with Cypress Trust', date: '2015-04-22' }
    ];

    const insertDoc = db.prepare(`
      INSERT OR IGNORE INTO documents (
        file_name, file_path, file_type, file_size, date_created, date_modified, 
        content_preview, evidence_type, content, metadata_json, word_count, red_flag_rating, content_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const getDocId = db.prepare('SELECT id FROM documents WHERE file_path = ?');

    for (const doc of mockDocs) {
        const filePath = `/opt/epstein-archive/data/financial/${doc.name}`;
        const hash = crypto.createHash('sha256').update(doc.name).digest('hex');
        
        insertDoc.run(
            doc.name,
            filePath,
            'application/pdf',
            1024 * 500, // 500kb mock
            new Date(doc.date).toISOString(),
            new Date(doc.date).toISOString(),
            `[CONFIDENTIAL] ${doc.desc}. Transaction details redacted...`,
            'financial_record',
            `Content of ${doc.name}...`,
            JSON.stringify({ source: 'financial_seeding', original_date: doc.date }),
            100,
            4,
            hash
        );

        const docRow = getDocId.get(filePath) as { id: number };
        
        if (docRow) {
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
    const keyNames = ['Epstein', 'Maxwell', 'Prince Andrew', 'Clinton', 'Trump', 'Wexner'];
    
    for (const name of keyNames) {
      const entity = db.prepare(`SELECT id, full_name, primary_role FROM entities WHERE full_name LIKE ? LIMIT 1`).get(`%${name}%`) as any;
      
      if (entity) {
        console.log(`  Found entity: ${entity.full_name} (${entity.primary_role})`);
        
        const evidenceResult = db.prepare(`
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
          `Key subject identified in multiple financial flows. Role: ${entity.primary_role || 'Associate'}`,
          'high',
          'verified',
          'public',
          new Date().toISOString(),
          'system'
        );
      }
    }

    // 5. Add Timeline Events
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

    console.log('✅ Detailed investigation reseeding complete!');

  } catch (error) {
    console.error('Error reseeding investigations:', error);
    process.exit(1);
  }
}

run();
