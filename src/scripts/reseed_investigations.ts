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
    db.prepare('DELETE FROM investigation_evidence').run(); // Clean up join table
    db.prepare('DELETE FROM investigation_timeline_events').run();
    // Use a transaction to ensure we don't leave orphaned evidence if we can help it,
    // but for seeding we might want to keep base evidence.
    // For this seed, we'll assume we are adding NEW evidence specific to this seed run or linking existing.

    // 2. Create a new realistic investigation
    console.log('Creating new investigation...');
    const title = 'Core Network Analysis: 2000-2005';
    const description =
      'Primary investigation into the financial and social connections during the critical period. Tracking flight logs and key associates.';

    const invResult = db
      .prepare(
        `
      INSERT INTO investigations (title, description, owner_id, status, scope, collaborator_ids)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
      )
      .run(
        title,
        description,
        'system', // owner_id
        'open', // status
        'Global', // scope
        '[]', // collaborator_ids
      );

    const investigationId = invResult.lastInsertRowid;
    console.log(`Created investigation '${title}' (ID: ${investigationId})`);

    // 3. Add Key Entities as Evidence
    console.log('Adding key entities...');
    const keyNames = ['Epstein', 'Maxwell', 'Prince Andrew', 'Clinton', 'Trump'];

    for (const name of keyNames) {
      const entity = db
        .prepare(`SELECT id, full_name, primary_role FROM entities WHERE full_name LIKE ? LIMIT 1`)
        .get(`%${name}%`) as any;

      if (entity) {
        console.log(`  Found entity: ${entity.full_name} (${entity.primary_role})`);

        // 3a. Check if this entity already exists as an "evidence" record of type 'profile' or similar
        // For simplicity in this seed, we'll create a new EVIDENCE record representing this Entity's Profile
        // In a real app, you might just link the entity directly, but the evidence model allows wrapping it.

        const evidenceTitle = `${entity.full_name} (Entity Profile)`;
        let evidenceId;

        const existingEvidence = db
          .prepare('SELECT id FROM evidence WHERE source_path = ?')
          .get(`entity:${entity.id}`);

        if (existingEvidence) {
          evidenceId = (existingEvidence as any).id;
        } else {
          const evResult = db
            .prepare(
              `
                INSERT INTO evidence (
                    evidence_type, title, description, source_path, original_filename, 
                    created_at, red_flag_rating
                ) VALUES (?, ?, ?, ?, ?, datetime('now'), ?)
             `,
            )
            .run(
              'investigative_report', // Closest type for a profile
              evidenceTitle,
              `Profile for ${entity.full_name}. Role: ${entity.primary_role}`,
              `entity:${entity.id}`, // Unique source path
              `${entity.full_name}.profile`,
              3, // default rating
            );
          evidenceId = evResult.lastInsertRowid;

          // Link the Evidence to the Entity in the join table
          db.prepare(
            `
                INSERT OR IGNORE INTO evidence_entity (evidence_id, entity_id, role, confidence)
                VALUES (?, ?, 'subject', 1.0)
             `,
          ).run(evidenceId, entity.id);
        }

        // 3b. Link Evidence to Investigation
        db.prepare(
          `
          INSERT OR IGNORE INTO investigation_evidence (
            investigation_id, evidence_id, notes, relevance, added_at, added_by
          ) VALUES (?, ?, ?, ?, datetime('now'), ?)
        `,
        ).run(
          investigationId,
          evidenceId,
          `Key subject linked to investigation.`,
          'high',
          'system',
        );
      } else {
        console.log(`  Could not find entity matching '${name}'`);
      }
    }

    // 4. Add some Documents as Evidence
    console.log('Adding relevant documents...');
    const docs = db
      .prepare(
        `
      SELECT id, file_name, evidence_type, content_preview, file_path 
      FROM documents 
      WHERE content_preview IS NOT NULL AND content_preview != '' 
      ORDER BY RANDOM() LIMIT 5
    `,
      )
      .all() as any[];

    for (const doc of docs) {
      console.log(`  Adding document: ${doc.file_name}`);

      // 4a. Create Evidence record wrapper for the document
      // Check existence first
      let evidenceId;
      const existingDocEvidence = db
        .prepare('SELECT id FROM evidence WHERE source_path = ?')
        .get(doc.file_path);

      if (existingDocEvidence) {
        evidenceId = (existingDocEvidence as any).id;
      } else {
        const evDocResult = db
          .prepare(
            `
            INSERT INTO evidence (
                evidence_type, title, description, source_path, original_filename, 
                created_at, red_flag_rating, extracted_text
            ) VALUES (?, ?, ?, ?, ?, datetime('now'), ?, ?)
          `,
          )
          .run(
            'court_filing', // Defaulting to court_filing or mapping from doc.evidence_type
            doc.file_name,
            `Document added to investigation.`,
            doc.file_path,
            doc.file_name,
            3,
            doc.content_preview,
          );
        evidenceId = evDocResult.lastInsertRowid;
      }

      // 4b. Link to Investigation
      db.prepare(
        `
        INSERT OR IGNORE INTO investigation_evidence (
          investigation_id, evidence_id, notes, relevance, added_at, added_by
        ) VALUES (?, ?, ?, ?, datetime('now'), ?)
      `,
      ).run(investigationId, evidenceId, 'Document identified as relevant.', 'medium', 'system');
    }

    // 5. Add a Timeline Event
    console.log('Adding timeline event...');
    db.prepare(
      `
      INSERT INTO investigation_timeline_events (
        investigation_id, title, description, type, start_date, confidence, importance
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      investigationId,
      'Initial Network Mapping',
      'Completed initial identification of primary nodes.',
      'analysis',
      new Date().toISOString(),
      90,
      'high',
    );

    console.log('✅ Investigation reseeding complete!');
  } catch (error) {
    console.error('Error reseeding investigations:', error);
    process.exit(1);
  }
}

run();
