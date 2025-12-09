import Database from 'better-sqlite3';
import { join } from 'path';

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
    // chain_of_custody cascades from evidence_items

    // 2. Create a new realistic investigation
    console.log('Creating new investigation...');
    const title = "Core Network Analysis: 2000-2005";
    const description = "Primary investigation into the financial and social connections during the critical period. Tracking flight logs and key associates.";
    
    const invResult = db.prepare(`
      INSERT INTO investigations (title, description, owner_id, status, scope, collaborator_ids)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      title,
      description,
      'system', // owner_id
      'open', // status
      'Global', // scope
      '[]' // collaborator_ids
    );
    
    const investigationId = invResult.lastInsertRowid;
    console.log(`Created investigation '${title}' (ID: ${investigationId})`);

    // 3. Add Key Entities as Evidence
    console.log('Adding key entities...');
    const keyNames = ['Epstein', 'Maxwell', 'Prince Andrew', 'Clinton', 'Trump'];
    
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
          'entity', // type
          entity.id.toString(), // source_id
          'Entity Database', // source
          `Key subject identified in multiple documents. Role: ${entity.primary_role || 'Associate'}`,
          'high',
          'verified',
          'public',
          new Date().toISOString(),
          'system'
        );
        
        // Add chain of custody
        db.prepare('INSERT INTO chain_of_custody (evidence_id, date, actor, action, notes) VALUES (?,?,?,?,?)')
          .run(evidenceResult.lastInsertRowid, new Date().toISOString(), 'system', 'linked', 'Entity linked to investigation');
      } else {
        console.log(`  Could not find entity matching '${name}'`);
      }
    }

    // 4. Add some Documents as Evidence
    console.log('Adding relevant documents...');
    const docs = db.prepare(`
      SELECT id, file_name, evidence_type, content_preview 
      FROM documents 
      WHERE content_preview IS NOT NULL AND content_preview != '' 
      ORDER BY RANDOM() LIMIT 5
    `).all() as any[];

    for (const doc of docs) {
      console.log(`  Adding document: ${doc.file_name}`);
      const evidenceResult = db.prepare(`
        INSERT INTO evidence_items (
          investigation_id, document_id, title, type, source_id, source, description, 
          relevance, credibility, sensitivity, extracted_at, extracted_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        investigationId,
        doc.id,
        doc.file_name,
        'document',
        doc.id.toString(),
        'Document Archive',
        `Document containing potential evidence. Preview: ${doc.content_preview.substring(0, 50)}...`,
        'medium',
        'verified',
        'public',
        new Date().toISOString(),
        'system'
      );

       // Add chain of custody
       db.prepare('INSERT INTO chain_of_custody (evidence_id, date, actor, action, notes) VALUES (?,?,?,?,?)')
       .run(evidenceResult.lastInsertRowid, new Date().toISOString(), 'system', 'aquired', 'Document added to case file');
    }

    // 5. Add a Timeline Event
    console.log('Adding timeline event...');
    db.prepare(`
      INSERT INTO investigation_timeline_events (
        investigation_id, title, description, type, start_date, confidence, importance
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      investigationId,
      'Initial Network Mapping',
      'Completed initial identification of primary nodes.',
      'analysis',
      new Date().toISOString(),
      90,
      'high'
    );

    console.log('✅ Investigation reseeding complete!');

  } catch (error) {
    console.error('Error reseeding investigations:', error);
    process.exit(1);
  }
}

run();
