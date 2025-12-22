
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import sharp from 'sharp';
import pdf2img from 'pdf-img-convert';

// Configuration
const DB_PATH = process.env.DB_PATH || 'epstein-archive.db';
const SEARCH_DIR = 'data/originals/DOJ VOL00001/IMAGES';
const BLACK_THRESHOLD = 30;
const MIN_CONSECUTIVE_PIXELS = 50;
const MIN_BLACK_LINES = 5;

const db = new Database(DB_PATH);

async function isRedacted(buffer: Uint8Array): Promise<boolean> {
    const { data, info } = await sharp(buffer)
        .grayscale()
        .raw()
        .toBuffer({ resolveWithObject: true });

    const width = info.width;
    const height = info.height;
    
    let blackLinesFound = 0;

    for (let y = 0; y < height; y += 5) {
        let consecutiveBlack = 0;
        let hasLongBlackRun = false;

        for (let x = 0; x < width; x++) {
            const pixelIndex = y * width + x;
            const value = data[pixelIndex];

            if (value < BLACK_THRESHOLD) {
                consecutiveBlack++;
            } else {
                if (consecutiveBlack > MIN_CONSECUTIVE_PIXELS) {
                    hasLongBlackRun = true;
                }
                consecutiveBlack = 0;
            }
        }
        if (consecutiveBlack > MIN_CONSECUTIVE_PIXELS) hasLongBlackRun = true;

        if (hasLongBlackRun) {
            blackLinesFound++;
            if (blackLinesFound >= MIN_BLACK_LINES) return true;
        }
    }
    return false;
}

// ... rest of logic

async function run() {
    console.log('🚀 Starting PDF Visual Redaction Scan...');
    
    // Find all PDFs recursively
    const pdfFiles: string[] = [];
    function walk(dir) {
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
    walk(SEARCH_DIR);
    console.log(`📄 Found ${pdfFiles.length} PDFs to scan.`);

    const updateStmt = db.prepare(`
        UPDATE documents 
        SET has_redactions = 1, redaction_count = MAX(redaction_count, 1) 
        WHERE file_name = ?
    `);

    let updatedCount = 0;

    for (const [index, filePath] of pdfFiles.entries()) {
        try {
            // Convert page 1 to image (returns Uint8Array[])
            const images = await pdf2img.convert(filePath, { page_numbers: [1], scale: 1.0 });
            
            if (images.length > 0) {
                // images[0] is a buffer (png/jpg depending on default, usually png)
                // Wait, pdf-img-convert returns Uint8Array (buffer) or string (base64)
                // Default is Buffer (Uint8Array)
                const buffer = Buffer.from(images[0]);
                
                const redacted = await isRedacted(buffer);
                
                if (redacted) {
                     const fileName = path.basename(filePath);
                     const result = updateStmt.run(fileName);
                     if (result.changes > 0) {
                         console.log(`✅ [Redacted] ${fileName} -> Updated DB`);
                         updatedCount++;
                     }
                }
            }
        } catch (e) {
            console.error(`❌ Error scanning ${path.basename(filePath)}:`, e);
        }
        
        if ((index + 1) % 20 === 0) console.log(`progress: ${index+1}/${pdfFiles.length}`);
    }
    
    console.log(`\n🎉 Done. Updated ${updatedCount} documents.`);
}

run();
