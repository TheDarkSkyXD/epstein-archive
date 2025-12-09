import { databaseService } from '../services/DatabaseService';

async function backfillEntityEvidenceTypes() {
  try {
    const db = databaseService.getDatabase();

    const evidenceTypes: { id: number; type_name: string }[] = db
      .prepare('SELECT id, type_name FROM evidence_types')
      .all() as any[];
    const typeIdByName = new Map(evidenceTypes.map(t => [t.type_name, t.id]));

    const entities: { id: number }[] = db.prepare('SELECT id FROM entities').all() as any[];

    const selectDistinctTypes = db.prepare(`
      SELECT DISTINCT d.evidence_type AS evidenceType
      FROM documents d
      INNER JOIN entity_mentions em ON d.id = em.document_id
      WHERE em.entity_id = ? AND d.evidence_type IS NOT NULL AND d.evidence_type <> ''
    `);

    const insertLink = db.prepare(
      'INSERT OR IGNORE INTO entity_evidence_types (entity_id, evidence_type_id) VALUES (?, ?)' 
    );

    const tx = db.transaction((batch: { id: number }[]) => {
      for (const e of batch) {
        const rows = selectDistinctTypes.all(e.id) as any[];
        for (const row of rows) {
          const name = String(row.evidenceType).toLowerCase();
          const id = typeIdByName.get(name);
          if (id) insertLink.run(e.id, id);
        }
      }
    });

    const chunkSize = 1000;
    for (let i = 0; i < entities.length; i += chunkSize) {
      tx(entities.slice(i, i + chunkSize));
    }

    const count = db.prepare('SELECT COUNT(*) AS c FROM entity_evidence_types').get() as any;
    console.log(`Backfill complete. entity_evidence_types rows: ${count.c}`);
  } catch (error) {
    console.error('Backfill failed:', error);
    process.exit(1);
  }
}

backfillEntityEvidenceTypes().then(() => process.exit(0));

