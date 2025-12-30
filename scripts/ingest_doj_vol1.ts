
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'epstein-archive.db');
const DOJ_DIR = 'data/originals/DOJ VOL00001';
const OCR_DIR = path.join(DOJ_DIR, 'OCR');
const IMAGES_DIR = path.join(DOJ_DIR, 'IMAGES');

const db = new Database(DB_PATH);

async function run() {
    console.log(`🚀 Starting DOJ VOL00001 Ingestion...`);
    console.log(`📁 DB Path: ${DB_PATH}`);

    if (!fs.existsSync(DOJ_DIR)) {
        console.error(`❌ DOJ directory not found: ${DOJ_DIR}`);
        return;
    }

    // 1. Parse OCR Files
    const ocrMap = new Map<string, string>();
    
    if (fs.existsSync(OCR_DIR)) {
        const ocrFiles = fs.readdirSync(OCR_DIR).filter(f => f.endsWith('.txt'));
        
        console.log(`📄 Parsing ${ocrFiles.length} OCR files...`);
        for (const file of ocrFiles) {
            const content = fs.readFileSync(path.join(OCR_DIR, file), 'utf-8');
            // The EFTA ID usually follows the text for that page in these productions
            const regex = /([\s\S]*?)(EFTA\d{8})/g;
            let match;
            while ((match = regex.exec(content)) !== null) {
                const text = match[1].trim();
                const id = match[2];
                ocrMap.set(id, text);
            }
        }
        console.log(`✅ Parsed OCR for ${ocrMap.size} documents.`);
    } else {
        console.log(`⚠️  OCR directory not found: ${OCR_DIR}. Skipping OCR parsing.`);
    }

    // 2. Find all PDFs
    const pdfFiles: string[] = [];
    function walk(dir: string) {
        const list = fs.readdirSync(dir);
        for (const item of list) {
            const fullPath = path.join(dir, item);
            if (fs.statSync(fullPath).isDirectory()) {
                walk(fullPath);
            } else if (item.toLowerCase().endsWith('.pdf')) {
                pdfFiles.push(fullPath);
            }
        }
    }
    walk(IMAGES_DIR);
    console.log(`🔍 Found ${pdfFiles.length} PDFs.`);

    // 3. Ingest into Database
    const insertDoc = db.prepare(`
        INSERT INTO documents (
            file_name, file_path, file_type, file_size, 
            date_created, date_modified, content_hash, evidence_type,
            created_at, content, source_collection
        ) VALUES (
            @fileName, @filePath, @fileType, @fileSize,
            @dateCreated, @dateModified, @contentHash, @evidenceType,
            @createdAt, @content, @sourceCollection
        )
    `);

    const checkExists = db.prepare('SELECT id FROM documents WHERE file_path = ?');
    const updateStats = db.prepare('UPDATE entities SET document_count = document_count + 1 WHERE id = ?');

    let added = 0;
    let skipped = 0;
    let withOcr = 0;

    const runInTransaction = db.transaction(() => {
        for (const filePath of pdfFiles) {
            // Check if already exists
            const relativePath = filePath.replace(/\\/g, '/');
            if (checkExists.get(relativePath)) {
                skipped++;
                continue;
            }

            const fileName = path.basename(filePath);
            const docId = fileName.replace('.pdf', '');
            const content = ocrMap.get(docId) || `[EFTA Discovery PDF: ${docId}]`;
            if (ocrMap.has(docId)) withOcr++;

            const stat = fs.statSync(filePath);
            
            insertDoc.run({
                fileName,
                filePath: relativePath,
                fileType: 'pdf',
                fileSize: stat.size,
                dateCreated: stat.birthtime.toISOString(),
                dateModified: stat.mtime.toISOString(),
                contentHash: `${stat.size}-${stat.mtimeMs}`,
                evidenceType: 'Evidence',
                createdAt: new Date().toISOString(),
                content: content,
                sourceCollection: 'DOJ Discovery VOL00001 (FBI 2019 Search)'
            });
            
            added++;
            if (added % 100 === 0) {
                console.log(`📊 Progress: ${added}/${pdfFiles.length}...`);
            }
        }
    });

    console.log(`📥 Ingesting into database...`);
    runInTransaction();

    console.log(`\n🎉 Ingestion Complete!`);
    console.log(`✅ Added: ${added}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`👁️  With linked OCR: ${withOcr}`);
    
    console.log(`🧹 Optimizing FTS index...`);
    db.exec("INSERT INTO documents_fts(documents_fts) VALUES('optimize');");
    
    console.log(`✅ Done.`);
}

run().catch(err => {
    console.error(`❌ Fatal Error:`, err);
    process.exit(1);
});
