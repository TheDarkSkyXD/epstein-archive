
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'epstein-archive-production.db');
const CORPUS_PATH = process.env.RAW_CORPUS_BASE_PATH || '/Users/veland/Downloads/Epstein Files/Epstein Estate Documents - Seventh Production';

const db = new Database(DB_PATH);

// Mime types to ingest
const ALLOWED_EXTS = ['.pdf', '.jpg', '.jpeg', '.png', '.tif', '.tiff', '.bmp', '.gif'];

function getMimeType(ext: string) {
    switch (ext.toLowerCase()) {
        case '.pdf': return 'application/pdf';
        case '.jpg': 
        case '.jpeg': return 'image/jpeg';
        case '.png': return 'image/png';
        case '.tif':
        case '.tiff': return 'image/tiff';
        case '.gif': return 'image/gif';
        case '.bmp': return 'image/bmp';
        default: return 'application/octet-stream';
    }
}

function getFileType(ext: string) {
    const e = ext.toLowerCase();
    if (e === '.pdf') return 'pdf';
    return 'image';
}

function walk(dir: string, fileList: string[] = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            if (file !== '.' && file !== '..') walk(filePath, fileList);
        } else {
            const ext = path.extname(file).toLowerCase();
            if (ALLOWED_EXTS.includes(ext)) {
                fileList.push(filePath);
            }
        }
    }
    return fileList;
}

function main() {
    console.log(`Ingesting documents from: ${CORPUS_PATH}`);
    console.log(`Database: ${DB_PATH}`);

    if (!fs.existsSync(CORPUS_PATH)) {
        console.error(`Corpus path does not exist: ${CORPUS_PATH}`);
        process.exit(1);
    }

    const files = walk(CORPUS_PATH);
    console.log(`Found ${files.length} candidate files.`);

    const insert = db.prepare(`
        INSERT INTO documents (
            file_name, file_path, file_type, file_size, 
            date_created, date_modified, content_hash, evidence_type,
            created_at, content
        ) VALUES (
            @fileName, @filePath, @fileType, @fileSize,
            @dateCreated, @dateModified, @contentHash, @evidenceType,
            @createdAt, @content
        )
    `);

    const check = db.prepare('SELECT id FROM documents WHERE file_path = ?');

    let added = 0;
    let skipped = 0;

    const run = db.transaction(() => {
        for (const filePath of files) {
            if (check.get(filePath)) {
                skipped++;
                continue;
            }

            const stat = fs.statSync(filePath);
            const fileName = path.basename(filePath);
            const ext = path.extname(fileName);
            const fileType = getFileType(ext);
            
            insert.run({
                fileName,
                filePath,
                fileType,
                fileSize: stat.size,
                dateCreated: stat.birthtime.toISOString(),
                dateModified: stat.mtime.toISOString(),
                contentHash: `${stat.size}-${stat.mtimeMs}`, // simple hash
                evidenceType: 'Media', // Default
                createdAt: new Date().toISOString(),
                content: `[${fileType} file]`, // Placeholder content so it's not null
            });
            added++;
            
            if (added % 100 === 0) process.stdout.write(`Added ${added} files...\r`);
        }
    });

    run();

    console.log(`\nIngestion complete.`);
    console.log(`Added: ${added}`);
    console.log(`Skipped (already exists): ${skipped}`);
}

main();
