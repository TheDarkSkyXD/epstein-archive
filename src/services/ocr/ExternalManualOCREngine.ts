
import fs from 'fs';
import path from 'path';
import { OCREngine, OCRResult } from './types.js';

export class ExternalManualOCREngine implements OCREngine {
  name = 'External Manual OCR';

  supports(mimeType: string): boolean {
    // Supports any file type as long as a corresponding text file exists
    return true;
  }

  async process(filePath: string): Promise<OCRResult> {
    const start = Date.now();
    const dir = path.dirname(filePath);
    const ext = path.extname(filePath);
    const basename = path.basename(filePath, ext); // e.g., "document" from "document.pdf"

    // Candidates to search for
    const candidates = [
        `${basename} (ocr).txt`,
        `${basename}_ocr.txt`,
        `${basename}.ocr.txt`,
        `${basename}-ocr.txt`,
        `${basename} OCR.txt`,
        `${basename}.txt` // Fallback: sometimes the text file is just the same name
    ];

    let foundPath: string | null = null;

    for (const c of candidates) {
        const p = path.join(dir, c);
        if (fs.existsSync(p)) {
            // Check if it's explicitly labelled "ocr" if we are using the fallback
            // User said "labelled ocr in the filename".
            // So strictly speaking, `basename.txt` might not count unless `basename` itself has "ocr".
            // But if `basename.txt` exists alongside `basename.pdf`, it's almost certainly the text.
            // However, to be safe and follow instructions "labelled ocr in the filename":
            
            if (c.toLowerCase().includes('ocr')) {
                foundPath = p;
                break;
            }
        }
    }
    
    // If strict candidates failed, try a directory scan for looser matching?
    // User: "labelled ocr in the filename"
    if (!foundPath) {
        // Try finding *any* txt file in the dir that starts with basename and has 'ocr'
        // This handles cases like "Document Name - Exhibit A (OCR).txt" vs "Document Name - Exhibit A.pdf"
        try {
            const files = fs.readdirSync(dir);
            const match = files.find(f => 
                f.toLowerCase().endsWith('.txt') && 
                f.toLowerCase().includes('ocr') &&
                f.startsWith(basename)
            );
            if (match) {
                foundPath = path.join(dir, match);
            }
        } catch (e) {
            // ignore
        }
    }

    // NEW: Check for sibling OCR directory (common in this dataset: IMAGES/xxxx -> OCR/DOJ-xxx-textify-ocr.txt)
    if (!foundPath) {
        try {
            // Check up to 2 levels up for an "OCR" folder
            // e.g. /data/originals/DOJ VOL001/IMAGES/0001/image.jpg
            // we want /data/originals/DOJ VOL001/OCR/
            
            const parent1 = path.dirname(dir); // .../IMAGES
            const parent2 = path.dirname(parent1); // .../DOJ VOL001
            
            const ocrDirs = [
                path.join(dir, 'OCR'),
                path.join(parent1, 'OCR'),
                path.join(parent2, 'OCR')
            ];

            for (const ocrDir of ocrDirs) {
                if (fs.existsSync(ocrDir)) {
                    // We found an OCR directory. Now we need to guess the filename.
                    // The mapping seems to be specific: "0001" folder -> "DOJ-001..." file?
                    // Or maybe there is a loose match.
                    
                    const files = fs.readdirSync(ocrDir);
                    
                    // Strategy 1: Look for filename match (image.txt)
                    let match = files.find(f => f.startsWith(basename) && f.toLowerCase().includes('ocr'));
                    
                    // Strategy 2: Look for folder name match (e.g. if we are in folder "0001", look for "DOJ-001")
                    if (!match) {
                        const folderName = path.basename(dir); // "0001"
                        // Try to match "001" in "DOJ-001"
                        const numMatch = folderName.match(/\d+/);
                        if (numMatch) {
                            const num = parseInt(numMatch[0]).toString(); // "1"
                            // Look for a file in OCR dir that has this number padded or plain
                            // "DOJ-001" has "001"
                             match = files.find(f => {
                                 return f.includes(`-${num.padStart(3, '0')}-`) || f.includes(`-${num.padStart(2, '0')}-`);
                             });
                        }
                    }

                    if (match) {
                        foundPath = path.join(ocrDir, match);
                        break;
                    }
                }
            }
        } catch (e) {
            // ignore
        }
    }

    if (foundPath) {
        const text = fs.readFileSync(foundPath, 'utf-8');
        return {
            text,
            confidence: 100, // Manual/External is trusted as ground truth
            engine: this.name,
            durationMs: Date.now() - start,
            metadata: {
                source_file: path.basename(foundPath)
            }
        };
    }

    // Return a neutral/empty result instead of throwing, so other engines can try
    return {
        text: '',
        confidence: 0,
        engine: this.name,
        durationMs: 0
    };
  }
}
