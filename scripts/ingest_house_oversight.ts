
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { glob } from 'glob';

// Check package.json first. If csv-parser is not there, I will use a simple implementation.
// Based on previous package.json view, I didn't see csv-parser.
// So I will implement a robust CSV line parser to avoid dependency issues.

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'epstein-archive-production.db');
const DATA_DIR = path.join(process.cwd(), 'data');
const METADATA_FILE = path.join(DATA_DIR, 'csv', 'house_oversight_clean.csv');

const db = new Database(DB_PATH);

interface CSVDoc {
    'Bates Begin': string;
    'Bates End': string;
    'Original Filename': string;
    'Date Created': string;
    'Date Sent': string;
    'Author': string;
    'Email From': string;
    'Email To': string;
    'Text Link': string;
    'Native Link': string;
    'Document Title': string;
    [key: string]: string; // Allow other columns
}

// Simple CSV Parser handling quotes
function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuote = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            if (inQuote && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuote = !inQuote;
            }
        } else if (char === ',' && !inQuote) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
}

// Recursively find files and build a map: filename -> fullpath
function indexFiles(dir: string, extensions: string[]): Map<string, string> {
    console.log(`Indexing ${dir}...`);
    const fileMap = new Map<string, string>();
    
    if (!fs.existsSync(dir)) {
        console.warn(`Directory not found: ${dir}`);
        return fileMap;
    }

    function walk(currentDir: string) {
        const files = fs.readdirSync(currentDir);
        for (const file of files) {
            const fullPath = path.join(currentDir, file);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                walk(fullPath);
            } else {
                const ext = path.extname(file).toLowerCase();
                if (extensions.includes(ext)) {
                    fileMap.set(file, fullPath);
                }
            }
        }
    }
    
    walk(dir);
    console.log(`Indexed ${fileMap.size} files in ${dir}`);
    return fileMap;
}

function main() {
    const isDryRun = process.argv.includes('--dry-run');
    console.log(`Starting ingestion of House Oversight Data... (Dry Run: ${isDryRun})`);

    // 1. Index Text Files
    const textMap = indexFiles(path.join(DATA_DIR, 'text'), ['.txt']);
    // Also index ocr_clean
    const ocrMap = indexFiles(path.join(DATA_DIR, 'ocr_clean', 'text'), ['.txt']);
    // Mertge maps (prefer ocr_clean?)
    ocrMap.forEach((path, name) => textMap.set(name, path)); // content in ocr_clean might be better? Or maybe just add missing.
    // Let's assume textMap is primary, update if duplicates? 
    // Actually, let's keep all.

    // 2. Index Native Files (PDFs)
    const nativeMap = indexFiles(path.join(DATA_DIR, 'originals'), ['.pdf']);
    // Also search root data?
    // nativeMap ...

    // 3. Prepare DB
    if (!isDryRun) {
        db.exec(`
            CREATE TABLE IF NOT EXISTS documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_name TEXT,
                file_path TEXT UNIQUE,
                file_type TEXT,
                file_size INTEGER,
                date_created TEXT,
                date_modified TEXT,
                content TEXT,
                content_hash TEXT,
                metadata_json TEXT,
                evidence_type TEXT DEFAULT 'House Oversight Production',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);
    }

    const insert = db.prepare(`
        INSERT INTO documents (
            file_name, file_path, file_type, file_size, 
            date_created, content, content_hash, evidence_type, metadata_json
        ) VALUES (
            @fileName, @filePath, @fileType, @fileSize,
            @dateCreated, @content, @contentHash, @evidenceType, @metadataJson
        )
    `);

    // 4. Parse CSV
    const csvContent = fs.readFileSync(METADATA_FILE, 'utf-8');
    const lines = csvContent.split('\n');
    let headers: string[] = [];
    
    let processed = 0;
    let inserted = 0;
    let skipped = 0;

    const parseLine = (line: string) => {
        // Handle potential BOM
        const l = line.replace(/^\uFEFF/, '');
        return parseCSVLine(l);
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = parseLine(line);

        if (i === 0) { // Should check if it's the header line. Usually starts with empty or 'Bates Begin'
             // The viewed file had: 0,1,2... then headers on line 2.
             // Let's look at line 1 and 2 logic.
             // Line 1: 0,1,2,3...
             // Line 2: ,Bates Begin, ,Bates End, ...
             // My viewed output showed line 1 as indices? No, that was the tool output.
             // The file content line 2: ",Bates Begin, ,Bates End..."
             // It seems to have odd empty columns or spacers?
             // ",Bates Begin, ,Bates End, ,Bates Begin Attach,"
             // Let's assume headers are on line 2 (index 1).
             continue;
        }
        if (i === 1) { // Header line
             headers = cols.map(h => h.trim());
             console.log('Headers detected:', headers);
             continue;
        }

        // Map columns to object
        const doc: any = {};
        cols.forEach((val, idx) => {
            if (headers[idx]) {
                doc[headers[idx]] = val.trim();
            }
        });

        const batesBegin = doc['Bates Begin'];
        if (!batesBegin) continue;

        processed++;

        // Find Text File
        // The Text Link column is like: \HOUSE_OVERSIGHT_009\TEXT\001\HOUSE_OVERSIGHT_010477.txt
        // We just extract the filename.
        const textLink = doc['Text Link'] || '';
        const textFilename = path.basename(textLink.replace(/\\/g, '/')); // Handle Windows paths
        
        // Find in Map
        // Try exact match, or try batesBegin + .txt
        let textPath = textMap.get(textFilename);
        if (!textPath) {
            textPath = textMap.get(`${batesBegin}.txt`);
        }

        // Find Native
        const nativeLink = doc['Native Link'] || '';
        const nativeFilename = path.basename(nativeLink.replace(/\\/g, '/'));
        const nativePath = nativeMap.get(nativeFilename);

        // Content Extraction
        let content = '';
        let fileSize = 0;
        let finalPath = '';
        let fileType = 'txt'; // Default to text record

        if (textPath) {
            try {
                content = fs.readFileSync(textPath, 'utf-8');
                const stat = fs.statSync(textPath);
                fileSize = stat.size;
                finalPath = textPath;
            } catch (e) {
                console.warn(`Failed to read text file: ${textPath}`);
            }
        } else {
            // No text file found. Should we skip? 
            // Or insert metadata only?
            // "Ingest new data". The metadata is valuable.
            // Let's insert with placeholder content if missing.
            content = '[Content Not Available - Metadata Only]';
            finalPath = nativePath || `MISSING_PATH/${batesBegin}`; // Mock path to satisfy unique constraint if needed, or null?
            // unique constraint on file_path might be an issue.
            // Let's use a systematic missing path.
        }

        // Native path override if we want to link native primarily
        if (nativePath) {
            // If we have a native PDF, maybe point file_path to IT?
            // Use metadata_json to store the 'original_file_path'.
            // But documents table 'file_path' usually points to the file being served/read.
            // For now, let's point to Text file as the primary 'file_path' for FTS?
            // Or if text is extracted from native, point to native?
            // Since we have OCR text files, pointing to them is safer for 'content'.
        }

        const metadata = {
            ...doc,
            original_native_path: nativePath || null,
            original_text_path: textPath || null,
            ingestion_source: 'house_oversight_clean.csv'
        };

        const record = {
            fileName: doc['Original Filename'] || `${batesBegin}.txt`,
            filePath: textPath || (nativePath ? nativePath : `/virtual/${batesBegin}`),
            fileType: path.extname(textPath || nativePath || '').substring(1) || 'txt',
            fileSize: fileSize,
            dateCreated: doc['Date Created'] || new Date().toISOString(),
            content: content,
            contentHash: `${batesBegin}-${content.length}`, // Simple hash
            evidenceType: 'House Oversight Production',
            metadataJson: JSON.stringify(metadata)
        };

        if (isDryRun) {
            if (processed <= 5) {
                console.log(`[Dry Run] Would insert: ${record.fileName} (Bates: ${batesBegin})`);
                console.log(`   Text Path: ${textPath || 'MISSING'}`);
                console.log(`   Native Path: ${nativePath || 'MISSING'}`);
            }
        } else {
            try {
                insert.run(record);
                inserted++;
            } catch (e: any) {
                if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                    // console.log(`Duplicate skipped: ${batesBegin}`);
                    skipped++;
                } else {
                    console.error(`Error inserting ${batesBegin}:`, e);
                }
            }
        }

        if (processed % 1000 === 0) {
            console.log(`Processed ${processed} rows...`);
        }
    }

    console.log(`Done. Processed: ${processed}, Inserted: ${inserted}, Skipped: ${skipped}`);
}

main();
