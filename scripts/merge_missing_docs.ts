
import Database from 'better-sqlite3';

const PROD_DB = 'epstein-archive-production.db';
const CLEAN_DB = 'epstein-archive-clean.db';

const db = new Database(PROD_DB);

try {
    console.log('Attaching clean database...');
    db.prepare(`ATTACH DATABASE '${CLEAN_DB}' AS clean`).run();

    console.log('Beginning transaction...');
    const insertStmt = db.prepare(`
        INSERT INTO main.documents (
            file_name, file_path, file_type, file_size, 
            date_created, evidence_type, content, 
            metadata_json, word_count, red_flag_rating, content_hash
        )
        SELECT 
            file_name, file_path, file_type, file_size, 
            date_created, evidence_type, content, 
            metadata_json, word_count, red_flag_rating, content_hash
        FROM clean.documents 
        WHERE evidence_type IN ('media_scan', 'investigative_report')
        AND file_path NOT IN (SELECT file_path FROM main.documents)
    `);

    const result = insertStmt.run();
    console.log(`Inserted ${result.changes} documents.`);

} catch (error) {
    console.error('Migration failed:', error);
} finally {
    db.close();
}
