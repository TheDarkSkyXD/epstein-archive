
import Database from 'better-sqlite3';

const db = new Database('epstein-archive-production.db', { readonly: true });
db.prepare("ATTACH DATABASE 'epstein-archive-clean.db' AS clean").run();

const overlap = db.prepare(`
    SELECT main.evidence_type as production_type, COUNT(*) as count
    FROM main.documents main
    JOIN clean.documents clean ON main.file_path = clean.file_path
    WHERE clean.evidence_type = 'investigative_report'
    GROUP BY main.evidence_type
`).all();

console.log('Overlap of clean.investigative_report with production:', overlap);

db.close();
