
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { createHash } from 'crypto';
import pdf from 'pdf-parse';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'epstein-archive.db');
const BASE_PATH = '/Users/veland/Downloads/Epstein Files/Epstein Estate Documents - Seventh Production';
const DATA_DIR = path.join(BASE_PATH, 'DATA');
const IMAGES_DIR = path.join(BASE_PATH, 'IMAGES');
const NATIVES_DIR = path.join(BASE_PATH, 'NATIVES');

const METADATA_FILE = path.join(DATA_DIR, 'HOUSE_OVERSIGHT_009.txt');
const IMAGE_MAP_FILE = path.join(DATA_DIR, 'HOUSE_OVERSIGHT_009.opt');

// --- Types ---

interface DocumentRecord {
    batesBegin: string;
    batesEnd: string;
    originalFilename: string;
    title: string;
    author: string;
    dateCreated: string;
    dateSent: string;
    fileExtension: string;
    nativeLink: string;
    textLink: string;
    // ... add other fields as needed
    images: string[];
}

// --- Database Setup ---

const db = new Database(DB_PATH);

// Ensure the table exists (it should, but just in case)
db.exec(`
  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL UNIQUE,
    file_type TEXT,
    file_size INTEGER,
    date_created TEXT,
    date_modified TEXT,
    content_preview TEXT,
    evidence_type TEXT,
    mentions_count INTEGER DEFAULT 0,
    content TEXT,
    metadata_json TEXT,
    word_count INTEGER,
    spice_rating INTEGER,
    content_hash TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// --- Helpers ---

function getBatesRange(start: string, end: string): string[] {
    if (start === end) return [start];
    
    // Attempt to split into Prefix + Number
    // Regex for "Everything up to the last digit" and "The last digits"
    const matchStart = start.match(/^(.*?)(\d+)$/);
    const matchEnd = end.match(/^(.*?)(\d+)$/);
    
    if (!matchStart || !matchEnd || matchStart[1] !== matchEnd[1]) {
        // Fallback: just return start and end if we can't determine range
        // Or maybe just Start?
        return [start]; 
    }
    
    const prefix = matchStart[1];
    const numStart = parseInt(matchStart[2], 10);
    const numEnd = parseInt(matchEnd[2], 10);
    const length = matchStart[2].length;
    
    const range: string[] = [];
    for (let i = numStart; i <= numEnd; i++) {
        range.push(prefix + i.toString().padStart(length, '0'));
    }
    return range;
}

function parseDatLine(line: string, headers: string[]): Record<string, string> {
    // Delimiter is þ + 0x14 (DC4) + þ
    // Lines start and end with þ (and maybe a BOM at the start of file)
    
    // Remove BOM and newlines first
    let cleanLine = line.replace(/^\uFEFF/, '').trim();
    
    // Remove wrapping þ
    if (cleanLine.startsWith('þ')) cleanLine = cleanLine.substring(1);
    if (cleanLine.endsWith('þ')) cleanLine = cleanLine.substring(0, cleanLine.length - 1);
    
    // Split by þ + \x14 + þ
    const values = cleanLine.split('þ\x14þ');
    
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
        record[header] = values[index] || '';
    });
    return record;
}

function parseOptLine(line: string): { bates: string, imagePath: string } | null {
    const parts = line.split(',');
    if (parts.length >= 3) {
        return {
            bates: parts[0],
            imagePath: parts[2]
        };
    }
    return null;
}

async function extractTextFromPdf(filePath: string): Promise<string> {
    try {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdf(dataBuffer);
        return data.text;
    } catch (e) {
        console.error(`Error reading PDF ${filePath}:`, e);
        return '';
    }
}

// --- Main Ingestion Logic ---

async function main() {
    const dryRun = process.argv.includes('--dry-run');
    console.log(`Starting ingestion... (Dry Run: ${dryRun})`);

    // 1. Parse Image Mapping (.opt)
    console.log('Parsing image mapping...');
    const imageMap = new Map<string, string[]>(); // Bates -> Image Paths
    if (fs.existsSync(IMAGE_MAP_FILE)) {
        const optContent = fs.readFileSync(IMAGE_MAP_FILE, 'utf-8');
        const lines = optContent.split('\n');
        for (const line of lines) {
            if (!line.trim()) continue;
            const parsed = parseOptLine(line);
            if (parsed) {
                // The image path in OPT is relative like \HOUSE_OVERSIGHT_009\IMAGES\001\HOUSE_OVERSIGHT_010477.jpg
                // We need to resolve it to absolute path.
                // Assuming standard structure:
                const relPath = parsed.imagePath.replace(/\\/g, '/').replace(/^\//, ''); // Normalize slashes
                // The relative path usually starts with HOUSE_OVERSIGHT_009...
                // Our IMAGES_DIR is .../IMAGES.
                // We need to match efficiently. 
                // The provided path: HOUSE_OVERSIGHT_009/IMAGES/001/file.jpg
                // Our base path: .../Epstein Estate Documents - Seventh Production
                
                // Let's construct the full path by looking at the components.
                const parts = relPath.split('/');
                // Remove the top level folder if it matches our expectation?
                // Actually, let's just grab the filename and find it in our known structure or construct carefully.
                // The OPT file implies structure inside the production folder.
                
                const fullPath = path.join(BASE_PATH, ...parts.slice(1)); // Skip the top level folder name likely in the path?
                // Let's verify with an ls on the first one later.
                // For now, let's assume `path.join(BASE_PATH, relPath)` might work but usually these started with the volume name.
                // Correction: The provided view_file output showed: \HOUSE_OVERSIGHT_009\IMAGES\001\HOUSE_OVERSIGHT_010477.jpg
                // My BASE_PATH is .../Epstein Estate Documents - Seventh Production
                // So I probably need to stripping the first segment "HOUSE_OVERSIGHT_009" to map to "Epstein Estate Documents - Seventh Production" or just join it depending on folder structure.
                
                // Let's just store the relative path for now and resolve later.
                if (!imageMap.has(parsed.bates)) {
                    imageMap.set(parsed.bates, []);
                }
                imageMap.get(parsed.bates)?.push(parsed.imagePath);
            }
        }
    }
    console.log(`Loaded ${imageMap.size} image mappings.`);

    // 2. Parse Metadata (.txt)
    console.log('Parsing metadata...');
    const fileContent = fs.readFileSync(METADATA_FILE, 'utf-8');
    const lines = fileContent.split('\n');
    
    // Header
    const headerLine = lines[0];
    // Use the same helper or logic to parse headers
    const headerRecord = parseDatLine(headerLine, []); 
    // Wait, parseDatLine needs headers to keys. 
    // Let's just manually parse the header line using same split logic.
    let cleanHeader = headerLine.replace(/^\uFEFF/, '').trim();
    if (cleanHeader.startsWith('þ')) cleanHeader = cleanHeader.substring(1);
    if (cleanHeader.endsWith('þ')) cleanHeader = cleanHeader.substring(0, cleanHeader.length - 1);
    const headers = cleanHeader.split('þ\x14þ');
    
    console.log('Headers:', headers);

    const check = db.prepare('SELECT id FROM documents WHERE file_path = ?');
    const insert = db.prepare(`
        INSERT INTO documents (
            file_name, file_path, file_type, file_size, 
            date_created, date_modified, content_hash, evidence_type,
            created_at, content, metadata_json, content_preview
        ) VALUES (
            @fileName, @filePath, @fileType, @fileSize,
            @dateCreated, @dateModified, @contentHash, @evidenceType,
            @createdAt, @content, @metadataJson, @contentPreview
        )
    `);

    let processed = 0;
    let skipped = 0;

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const record = parseDatLine(lines[i], headers);
        const batesBegin = record['Bates Begin'];
        const filename = record['Original Filename'] || `${batesBegin}.unknown`;
        
        // Resolve File Path (Native or Placeholder)
        let filePath = '';
        let fileType = record['Document Extension'] || 'unknown';
        let fileSize = parseInt(record['File Size']) || 0;
        let content = '';
        let contentPreview = '';
        
        // Try to find Native
        if (record['Native Link']) {
             // Normailze path
             const validNativePath = record['Native Link'].replace(/\\/g, '/').replace(/^\//, '');
             // It likely starts with volume name.
             // Attempt to calculate full path.
             // We'll try to find it in NATIVES_DIR recursively or just check if it exists in the standard place.
             
             // Strategy: Look for the filename in NATIVES_DIR/001/ etc?
             // Since traversing is slow, we will assume a pattern or search specific subfolders?
             // Or better, just use the BATES number to create a unique "virtual" path if physical file missing.
             
             // Check if specific native exists
             // We saw structure NATIVES/001/HOUSE_OVERSIGHT_016552.xls
             // The native link is probably \HOUSE_OVERSIGHT_009\NATIVES\001\HOUSE_OVERSIGHT_016552.xls
             
             const parts = validNativePath.split('/');
             // parts[0] is HOUSE_OVERSIGHT_009
             // parts[1] is NATIVES
             // parts[2] is 001
             // parts[3] is filename
             
             const potentialPath = path.join(BASE_PATH, ...parts.slice(1)); 
             if (fs.existsSync(potentialPath)) {
                 filePath = potentialPath;
                 fileSize = fs.statSync(filePath).size;
                 
                 // Extract Text if possible
                 if (filePath.toLowerCase().endsWith('.pdf')) {
                     content = await extractTextFromPdf(filePath);
                 } else {
                     content = `[Native File Available: ${path.basename(filePath)}]`;
                 }
             }
        }

        // If no native found, do we have images?
        const batesRange = getBatesRange(batesBegin, record['Bates End'] || batesBegin);
        const linkedImages: string[] = [];
        
        for (const bates of batesRange) {
            const imgs = imageMap.get(bates);
            if (imgs) {
                // Determine absolute path for image?
                // In imageMap we stored relative paths from OPT.
                // We need to resolve them fully if we want to check existence or serve them.
                // For now, let's just store what we have, but normalized.
                imgs.forEach(img => linkedImages.push(img.replace(/\\/g, '/')));
            }
        }

        if (!filePath) {
            // Create a virtual path for the database record uniqueness
            filePath = path.join(DATA_DIR, 'VIRTUAL', `${batesBegin}.${fileType}`);
            content = '[Metadata Only - No Text/Native]';
            if (linkedImages.length > 0) {
                content += `\n[${linkedImages.length} Images Available]`;
            }
        }

        // Check duplicates
        if (check.get(filePath)) {
            skipped++;
            continue;
        }

        const metadata = {
            ...record,
            linked_images: linkedImages || []
        };

        if (dryRun) {
            console.log(`[DRY RUN] Would insert: ${batesBegin} - ${filename} (Images: ${linkedImages?.length || 0})`);
            if (i % 100 === 0) break; // Stop early for dry run
        } else {
            insert.run({
                fileName: filename,
                filePath: filePath,
                fileType: fileType,
                fileSize: fileSize,
                dateCreated: record['Date Created'] || new Date().toISOString(),
                dateModified: new Date().toISOString(),
                contentHash: createHash('md5').update(JSON.stringify(metadata)).digest('hex'),
                evidenceType: 'Seventh Production',
                createdAt: new Date().toISOString(),
                content: content,
                metadataJson: JSON.stringify(metadata),
                contentPreview: contentPreview
            });
        }
        
        processed++;
        if (processed % 100 === 0) process.stdout.write(`Processed ${processed} records...\r`);
    }

    console.log(`\nComplete.`);
    console.log(`Processed: ${processed}`);
    console.log(`Skipped: ${skipped}`);
}

main().catch(console.error);
