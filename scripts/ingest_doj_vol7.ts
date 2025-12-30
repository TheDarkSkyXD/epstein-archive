
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import pdf from 'pdf-parse';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'epstein-archive.db');
const DOJ_DIR = 'data/originals/DOJ VOL00007/IMAGES';

const db = new Database(DB_PATH);

async function run() {
    console.log(`🚀 Starting DOJ VOL00007 Ingestion...`);
    console.log(`📁 DB Path: ${DB_PATH}`);
    console.log(`📁 Source Dir: ${DOJ_DIR}`);

    if (!fs.existsSync(DOJ_DIR)) {
        console.error(`❌ DOJ directory not found: ${DOJ_DIR}`);
        return;
    }

    // 1. Find all PDFs
    const pdfFiles: string[] = [];
    function walk(dir: string) {
        if (!fs.existsSync(dir)) return;
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
    walk(DOJ_DIR);
    console.log(`🔍 Found ${pdfFiles.length} PDFs.`);

    // 2. Prepare DB Statements
    const insertDoc = db.prepare(`
        INSERT INTO documents (
            file_name, file_path, file_type, file_size, 
            date_created, content_hash, evidence_type,
            created_at, content, metadata_json
        ) VALUES (
            @fileName, @filePath, @fileType, @fileSize,
            @dateCreated, @contentHash, @evidenceType,
            @createdAt, @content, @metadataJson
        )
    `);

    const checkExists = db.prepare('SELECT id FROM documents WHERE file_path = ?');
    
    let added = 0;
    let skipped = 0;
    let errors = 0;

    // 3. Process Files
    console.log(`📥 Ingesting into database...`);

    for (const filePath of pdfFiles) {
        try {
            // Check if already exists
            const relativePath = filePath.replace(/\\/g, '/');
            if (checkExists.get(relativePath)) {
                skipped++;
                if (skipped % 100 === 0) process.stdout.write(`Skipped ${skipped}...\r`);
                continue;
            }

            const fileName = path.basename(filePath);
            const stat = fs.statSync(filePath);
            
            // Extract text from PDF
            let content = '';
            try {
                const dataBuffer = fs.readFileSync(filePath);
                const data = await pdf(dataBuffer);
                content = data.text;
            } catch (err) {
                console.error(`\n⚠️ Failed to parse PDF ${fileName}:`, err);
                content = `[Error extracting text from PDF: ${fileName}]`;
                errors++;
            }

            // Fallback content if empty
            if (!content || !content.trim()) {
                content = `[No text content extracted from PDF: ${fileName}]`;
            }
            
            insertDoc.run({
                fileName,
                filePath: relativePath,
                fileType: 'pdf',
                fileSize: stat.size,
                dateCreated: stat.birthtime.toISOString(),
                contentHash: `${stat.size}-${stat.mtimeMs}`,
                evidenceType: 'Evidence',
                createdAt: new Date().toISOString(),
                content: content,
                metadataJson: JSON.stringify({ sourceCollection: 'DOJ Discovery VOL00007' })
            });
            
            added++;
            if (added % 10 === 0) {
                console.log(`📊 Progress: Added ${added}, Skipped ${skipped}, Errors ${errors}...`);
            }
        } catch (dbErr) {
             console.error(`\n❌ Database Error on ${filePath}:`, dbErr);
             errors++;
        }
    }

    console.log(`\n🎉 Ingestion Complete!`);
    console.log(`✅ Added: ${added}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`❌ Errors: ${errors}`);
    
    if (added > 0) {
        console.log(`🧹 Optimizing FTS index...`);
        db.exec("INSERT INTO documents_fts(documents_fts) VALUES('optimize');");
    }
    
    console.log(`✅ Done.`);
}

run().catch(err => {
    console.error(`❌ Fatal Error:`, err);
    process.exit(1);
});
