/**
 * Ingest document content from filesystem
 * Updates documents table with actual content from text files
 */

import Database from 'better-sqlite3';
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, resolve } from 'path';

const DB_PATH = resolve(process.cwd(), 'epstein-archive.db');
const DATA_ROOT = resolve(process.cwd(), 'data');
const TEXT_ROOT = join(DATA_ROOT, 'text');

console.log(`[Ingest] Starting document content ingestion...`);
console.log(`[Ingest] DB Path: ${DB_PATH}`);
console.log(`[Ingest] Text Root: ${TEXT_ROOT}`);

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Get all documents
const documents = db.prepare('SELECT id, bates_number, title FROM documents').all() as any[];
console.log(`[Ingest] Found ${documents.length} documents in database`);

// Build lookup by bates number
const docLookup = new Map<string, number>();
for (const doc of documents) {
    if (doc.bates_number) {
        docLookup.set(doc.bates_number, doc.id);
    }
}

// Update statement
const updateContent = db.prepare(`
    UPDATE documents SET content = @content, word_count = @words, file_path = @path
    WHERE id = @id
`);

// Recursively find all text files
function findTextFiles(dir: string): string[] {
    const files: string[] = [];
    if (!existsSync(dir)) return files;
    
    try {
        const entries = readdirSync(dir);
        for (const entry of entries) {
            const fullPath = join(dir, entry);
            try {
                const stat = statSync(fullPath);
                if (stat.isDirectory()) {
                    files.push(...findTextFiles(fullPath));
                } else if (entry.endsWith('.txt') || entry.endsWith('.rtf')) {
                    files.push(fullPath);
                }
            } catch (e) {
                // Skip inaccessible files
            }
        }
    } catch (e) {
        // Skip inaccessible directories
    }
    
    return files;
}

console.log(`[Ingest] Scanning for text files in ${TEXT_ROOT}...`);
const textFiles = findTextFiles(TEXT_ROOT);
console.log(`[Ingest] Found ${textFiles.length} text files`);

let updated = 0;
let newDocs = 0;

// Statement to insert new documents
const insertDoc = db.prepare(`
    INSERT INTO documents (title, content, file_path, word_count, bates_number)
    VALUES (@title, @content, @path, @words, @bates)
`);

db.transaction(() => {
    for (const filePath of textFiles) {
        const filename = filePath.split('/').pop() || '';
        const baseName = filename.replace(/\.(txt|rtf)$/i, '');
        
        // Try to match with existing document
        const existingId = docLookup.get(baseName);
        
        // Read content
        let content = '';
        try {
            content = readFileSync(filePath, 'utf-8');
        } catch (e) {
            console.warn(`[Ingest] Failed to read: ${filename}`);
            continue;
        }
        
        const words = content.trim().split(/\s+/).length;
        const relPath = filePath.replace(DATA_ROOT, '/data');
        
        if (existingId) {
            // Update existing document
            updateContent.run({
                id: existingId,
                content,
                words,
                path: relPath
            });
            updated++;
        } else if (content.length > 100) {
            // Create new document for standalone files
            try {
                insertDoc.run({
                    title: baseName,
                    content,
                    path: relPath,
                    words,
                    bates: baseName
                });
                newDocs++;
            } catch (e) {
                // Already exists
            }
        }
        
        if ((updated + newDocs) % 100 === 0) {
            process.stdout.write(`\r[Ingest] Updated ${updated}, Created ${newDocs}`);
        }
    }
})();

console.log(`\n[Ingest] Content ingestion complete!`);
console.log(`[Ingest] Updated: ${updated}`);
console.log(`[Ingest] Created: ${newDocs}`);

// Verify
const stats = db.prepare(`
    SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN content IS NOT NULL AND LENGTH(content) > 0 THEN 1 ELSE 0 END) as with_content,
        SUM(word_count) as total_words
    FROM documents
`).get() as { total: number; with_content: number; total_words: number };

console.log(`\n[Ingest] Final Stats:`);
console.log(`  Total documents: ${stats.total}`);
console.log(`  With content: ${stats.with_content}`);
console.log(`  Total words: ${stats.total_words?.toLocaleString() || 0}`);

db.close();
