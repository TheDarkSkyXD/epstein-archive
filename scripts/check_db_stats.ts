
import Database from 'better-sqlite3';

const dbs = [
  'epstein-archive-production.db',
  'epstein-archive-clean.db',
  'epstein-archive-safe.db',
  'epstein-archive-production.backup-pre-tiered-ocr.db'
];

dbs.forEach(dbName => {
  try {
    const db = new Database(dbName, { readonly: true });
    
    // Check tables existence
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    const hasDocuments = tables.some((t: any) => t.name === 'documents');
    const hasEntities = tables.some((t: any) => t.name === 'entities');
    
    console.log(`\n--- Stats for ${dbName} ---`);


    
    if (dbName === 'epstein-archive-clean.db') {
        const mediaScans = db.prepare("SELECT file_path, file_name FROM documents WHERE evidence_type = 'media_scan' LIMIT 5").all();
        console.log('Sample Media Scans:', mediaScans);

        const reports = db.prepare("SELECT file_path, file_name FROM documents WHERE evidence_type = 'investigative_report' LIMIT 5").all();
        console.log('Sample Reports:', reports);
    }


    
    if (dbName === 'epstein-archive-clean.db') {
        const mentionsCount = db.prepare(`
            SELECT COUNT(*) as count 
            FROM entity_mentions em
            JOIN documents d ON em.document_id = d.id
            WHERE d.evidence_type = 'media_scan'
        `).get() as { count: number };
        console.log('Media Scan Mentions:', mentionsCount.count);
    }

    if (hasDocuments) {
        const docCount = db.prepare('SELECT COUNT(*) as count FROM documents').get() as { count: number };
        console.log(`Documents: ${docCount.count}`);
        
        try {
            const fileTypes = db.prepare("SELECT file_type, COUNT(*) as count FROM documents GROUP BY file_type").all();
            console.log('File Types:', fileTypes);
            
            const evidenceTypes = db.prepare("SELECT evidence_type, COUNT(*) as count FROM documents GROUP BY evidence_type").all();
            console.log('Evidence Types:', evidenceTypes);
        } catch (e) {
            console.log("Could not analyze types: " + (e as Error).message);
        }

    } else {
        console.log("No 'documents' table found.");
    }

    if (hasEntities) {
        const entityCount = db.prepare('SELECT COUNT(*) as count FROM entities').get() as { count: number };
        console.log(`Entities: ${entityCount.count}`);
    } else {
        console.log("No 'entities' table found.");
    }
    
    db.close();
  } catch (error) {
    console.log(`Error reading ${dbName}: ${(error as Error).message}`);
  }
});
