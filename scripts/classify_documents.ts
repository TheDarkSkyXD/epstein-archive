
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'epstein-archive-production.db');
const db = new Database(DB_PATH);

/**
 * Classify documents to match frontend filter types:
 * - legal: court filings, legal documents
 * - email: emails, correspondence, messages
 * - deposition: depositions, testimony, transcripts
 * - article: articles, news, reports
 * - photo: images, photos, media scans
 * - financial: financial records, bank, invoices
 * - document: general documents (default)
 */
function main() {
    console.log(`Re-classifying documents in ${DB_PATH}...`);
    
    // Get all documents
    const docs = db.prepare("SELECT id, file_name, file_type, evidence_type FROM documents").all() as any[];
    console.log(`Processing ${docs.length} documents...`);

    const updateType = db.prepare("UPDATE documents SET evidence_type = ? WHERE id = ?");
    
    let stats: Record<string, number> = {};

    const run = db.transaction(() => {
        for (const doc of docs) {
            let newType = 'document'; // Default
            
            const lowerName = (doc.file_name || '').toLowerCase();
            const fileType = (doc.file_type || '').toLowerCase();

            // 1. Images -> photo
            if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tif', 'tiff', 'image'].includes(fileType)) {
                newType = 'photo';
            }
            // 2. Emails/Correspondence -> email
            else if (lowerName.includes('email') || lowerName.includes('message') || lowerName.includes('gmax') || lowerName.includes('mail') || lowerName.includes('correspondence')) {
                newType = 'email';
            }
            // 3. Depositions -> deposition
            else if (lowerName.includes('deposition') || lowerName.includes('testimony') || lowerName.includes('transcript')) {
                newType = 'deposition';
            }
            // 4. Financial -> financial
            else if (lowerName.includes('finance') || lowerName.includes('ledger') || lowerName.includes('bank') || lowerName.includes('check') || lowerName.includes('invoice') || lowerName.includes('receipt') || lowerName.includes('payment') || lowerName.includes('account')) {
                newType = 'financial';
            }
            // 5. Articles/Reports -> article
            else if (lowerName.includes('article') || lowerName.includes('news') || lowerName.includes('press') || lowerName.includes('media')) {
                newType = 'article';
            }
            // 6. Legal/Court Filings -> legal
            else if (lowerName.includes('indictment') || lowerName.includes('motion') || lowerName.includes('order') || lowerName.includes('filing') || lowerName.includes('complaint') || lowerName.includes('affidavit') || lowerName.includes(' v ') || lowerName.includes(' vs ') || lowerName.includes('court') || lowerName.includes('legal') || lowerName.includes('subpoena') || lowerName.includes('verdict') || lowerName.includes('judgment')) {
                newType = 'legal';
            }
            // 7. Default: document (for PDFs and other unclassified)
            else {
                newType = 'document';
            }

            if (newType !== doc.evidence_type) {
                updateType.run(newType, doc.id);
                stats[newType] = (stats[newType] || 0) + 1;
            }
        }
    });

    run();

    console.log("Classification complete.");
    console.log("Updated counts:", stats);
    
    // Show final distribution
    const finalCounts = db.prepare("SELECT evidence_type, COUNT(*) as count FROM documents GROUP BY evidence_type ORDER BY count DESC").all();
    console.log("\nFinal distribution:");
    console.table(finalCounts);
}

main();
