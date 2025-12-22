
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import * as PImage from 'pureimage';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

// Configuration
const DB_PATH = process.env.DB_PATH || 'epstein-archive.db';
const SEARCH_DIR = 'data/originals/DOJ VOL00001/IMAGES';
const BLACK_THRESHOLD = 30; // Pureimage uses specific color text, but we can access buffer
const MIN_CONSECUTIVE_PIXELS = 50;
const MIN_BLACK_LINES = 5;

const db = new Database(DB_PATH);

// Helper to disable font warnings
const standardFontDataUrl = 'node_modules/pdfjs-dist/standard_fonts/';

async function isRedacted(bitmap): Promise<boolean> {
    const width = bitmap.width;
    const height = bitmap.height;
    const data = bitmap.data; // Buffer

    // Pureimage bitmap data is typically RGBA
    let blackLinesFound = 0;

    for (let y = 0; y < height; y += 5) {
        let consecutiveBlack = 0;
        let hasLongBlackRun = false;

        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            // alpha = data[i + 3]

            if (r < BLACK_THRESHOLD && g < BLACK_THRESHOLD && b < BLACK_THRESHOLD && data[i+3] > 200) {
                 consecutiveBlack++;
            } else {
                 if (consecutiveBlack > MIN_CONSECUTIVE_PIXELS) hasLongBlackRun = true;
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

async function run() {
    console.log('🚀 Starting PureImage PDF Scan...');
    
    // Recursive file find
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
            const data = new Uint8Array(fs.readFileSync(filePath));
            const loadingTask = getDocument({ 
                data: data,
                standardFontDataUrl: standardFontDataUrl
            });
            const pdfDocument = await loadingTask.promise;
            const page = await pdfDocument.getPage(1);
            
            const viewport = page.getViewport({ scale: 1.0 });
            const bitmap = PImage.make(viewport.width, viewport.height);
            const context = bitmap.getContext('2d');

            // Mock standard canvas properties/methods if missing in pureimage
            // Pureimage context might lack some methods pdfjs calls?
            // Usually pdfjs mostly uses drawImage, transform, fillRect, etc.
            
            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;

            const redacted = await isRedacted(bitmap);

            if (redacted) {
                 const fileName = path.basename(filePath);
                 const result = updateStmt.run(fileName);
                 if (result.changes > 0) {
                     console.log(`✅ [Redacted] ${fileName} -> Updated DB`);
                     updatedCount++;
                 }
            }
        } catch (e) {
            // Ignore common pureimage/pdfjs incompatibilities if specific
             // console.error(`❌ Error scanning ${path.basename(filePath)}:`, e.message);
        }
        
        if ((index + 1) % 50 === 0) console.log(`progress: ${index+1}/${pdfFiles.length}`);
    }
    console.log(`\n🎉 Done. Updated ${updatedCount} documents.`);
}

run();
