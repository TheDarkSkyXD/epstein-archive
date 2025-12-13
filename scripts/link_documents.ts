/**
 * Link OCR text documents to their original source files (PDFs/images)
 * 
 * This script:
 * 1. Adds an original_file_id column to link text documents to originals
 * 2. Matches text files to images/PDFs by filename pattern
 * 3. Updates the content of image documents with the OCR text from matching text files
 * 4. Classifies documents based on their content (from OCR)
 */

import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'epstein-archive-production.db');
const db = new Database(DB_PATH);

interface Document {
    id: number;
    file_name: string;
    file_path: string;
    file_type: string;
    content: string | null;
    evidence_type: string;
}

function extractBaseFilename(filePath: string): string {
    // Extract base filename without extension
    const basename = path.basename(filePath);
    return basename.replace(/\.[^/.]+$/, ''); // Remove extension
}

function classifyByContent(content: string): string {
    if (!content || content.length < 50) return 'document';
    
    const lowerContent = content.toLowerCase();
    
    // Deposition keywords
    if (lowerContent.includes('deposition') || 
        lowerContent.includes('testimony') || 
        lowerContent.includes('q.') && lowerContent.includes('a.') ||
        lowerContent.includes('examination') ||
        lowerContent.includes('sworn statement')) {
        return 'deposition';
    }
    
    // Email keywords
    if (lowerContent.includes('from:') && lowerContent.includes('to:') ||
        lowerContent.includes('subject:') ||
        lowerContent.includes('sent:') ||
        lowerContent.includes('@') && lowerContent.includes('dear')) {
        return 'email';
    }
    
    // Legal keywords
    if (lowerContent.includes('court') ||
        lowerContent.includes('plaintiff') ||
        lowerContent.includes('defendant') ||
        lowerContent.includes('hereby') ||
        lowerContent.includes('indictment') ||
        lowerContent.includes('motion') ||
        lowerContent.includes('affidavit') ||
        lowerContent.includes('subpoena')) {
        return 'legal';
    }
    
    // Financial keywords
    if (lowerContent.includes('invoice') ||
        lowerContent.includes('payment') ||
        lowerContent.includes('account') ||
        lowerContent.includes('balance') ||
        lowerContent.includes('transaction') ||
        lowerContent.includes('$') && lowerContent.includes('total')) {
        return 'financial';
    }
    
    // Article keywords
    if (lowerContent.includes('by ') && lowerContent.includes('published') ||
        lowerContent.includes('journalist') ||
        lowerContent.includes('news') ||
        lowerContent.includes('reported')) {
        return 'article';
    }
    
    return 'document';
}

async function main() {
    console.log('=== Linking OCR Text to Original Documents ===\n');
    
    // Step 1: Add original_file_id column if it doesn't exist
    try {
        db.exec('ALTER TABLE documents ADD COLUMN original_file_id INTEGER REFERENCES documents(id)');
        console.log('Added original_file_id column');
    } catch (e: any) {
        if (!e.message.includes('duplicate column')) {
            console.log('Column already exists or error:', e.message);
        }
    }
    
    // Step 2: Get all text documents (OCR)
    const textDocs = db.prepare(`
        SELECT id, file_name, file_path, content, evidence_type 
        FROM documents 
        WHERE file_type = 'txt' AND content IS NOT NULL AND LENGTH(content) > 100
    `).all() as Document[];
    
    console.log(`Found ${textDocs.length} text documents with OCR content\n`);
    
    // Step 3: Get all image documents
    const imageDocs = db.prepare(`
        SELECT id, file_name, file_path, file_type, evidence_type 
        FROM documents 
        WHERE file_type = 'image' OR file_type = 'pdf'
    `).all() as Document[];
    
    console.log(`Found ${imageDocs.length} image/PDF documents\n`);
    
    // Build a map of base filename to image document
    const imageMap = new Map<string, Document>();
    for (const img of imageDocs) {
        const baseFilename = extractBaseFilename(img.file_path);
        imageMap.set(baseFilename, img);
    }
    
    // Step 4: Match and link
    const updateLink = db.prepare('UPDATE documents SET original_file_id = ? WHERE id = ?');
    const updateImageContent = db.prepare('UPDATE documents SET content = ?, evidence_type = ? WHERE id = ?');
    
    let linked = 0;
    let contentCopied = 0;
    let classified = 0;
    
    const stats: Record<string, number> = {};
    
    const run = db.transaction(() => {
        for (const textDoc of textDocs) {
            const baseFilename = extractBaseFilename(textDoc.file_path);
            const matchingImage = imageMap.get(baseFilename);
            
            if (matchingImage) {
                // Link text document to its original
                updateLink.run(matchingImage.id, textDoc.id);
                linked++;
                
                // Copy OCR content to the image document
                if (textDoc.content && textDoc.content.length > 100) {
                    // Classify based on content
                    const newType = classifyByContent(textDoc.content);
                    updateImageContent.run(textDoc.content, newType, matchingImage.id);
                    contentCopied++;
                    
                    if (newType !== 'photo' && newType !== 'document') {
                        classified++;
                        stats[newType] = (stats[newType] || 0) + 1;
                    }
                }
            }
        }
    });
    
    run();
    
    console.log(`\n=== Results ===`);
    console.log(`Linked: ${linked} text documents to their original images`);
    console.log(`Content copied: ${contentCopied} image documents now have OCR text`);
    console.log(`Classified: ${classified} documents reclassified based on content`);
    console.log('\nClassification breakdown:', stats);
    
    // Step 5: Re-classify remaining photo documents that now have content
    console.log('\n=== Re-classifying photo documents with OCR content ===');
    
    const photosWithContent = db.prepare(`
        SELECT id, content, evidence_type 
        FROM documents 
        WHERE evidence_type = 'photo' AND content IS NOT NULL AND LENGTH(content) > 100
    `).all() as Document[];
    
    console.log(`Found ${photosWithContent.length} photos with OCR content to reclassify`);
    
    const updateType = db.prepare('UPDATE documents SET evidence_type = ? WHERE id = ?');
    let reclassified = 0;
    
    const reclassifyRun = db.transaction(() => {
        for (const doc of photosWithContent) {
            const newType = classifyByContent(doc.content || '');
            if (newType !== 'photo' && newType !== 'document') {
                updateType.run(newType, doc.id);
                reclassified++;
                stats[newType] = (stats[newType] || 0) + 1;
            }
        }
    });
    
    reclassifyRun();
    
    console.log(`Reclassified: ${reclassified} photo documents`);
    
    // Final distribution
    const finalDist = db.prepare(`
        SELECT evidence_type, COUNT(*) as count, AVG(LENGTH(COALESCE(content, ''))) as avg_content_len
        FROM documents 
        GROUP BY evidence_type 
        ORDER BY count DESC
    `).all();
    
    console.log('\n=== Final Distribution ===');
    console.table(finalDist);
}

main().catch(console.error);
