import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import Database from 'better-sqlite3';

// Configuration
const DB_PATH = process.env.DB_PATH || 'epstein-archive.db';
const IMAGE_DIR = 'data/media/images/DOJ VOL000001';
const BLACK_THRESHOLD = 30; // 0-255, pixels darker than this are "black"
const MIN_CONSECUTIVE_PIXELS = 50; // Minimum length of a black line (approx. 2cm at 72dpi)
const MIN_BLACK_LINES = 5; // Minimum number of black lines to confirm a box

const db = new Database(DB_PATH);

async function isRedacted(buffer: Buffer): Promise<boolean> {
  const { data, info } = await sharp(buffer)
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const width = info.width;
  const height = info.height;

  let blackLinesFound = 0;

  // Scan every 5th row to speed up
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
    // Check end of row
    if (consecutiveBlack > MIN_CONSECUTIVE_PIXELS) hasLongBlackRun = true;

    if (hasLongBlackRun) {
      blackLinesFound++;
      // If we found enough lines, we can bail early
      if (blackLinesFound >= MIN_BLACK_LINES) return true;
    }
  }

  return false;
}

async function run() {
  console.log(`🚀 Starting Visual Redaction Scan...`);
  console.log(`📂 Source: ${IMAGE_DIR}`);

  if (!fs.existsSync(IMAGE_DIR)) {
    console.error(`❌ Source directory not found: ${IMAGE_DIR}`);
    return;
  }

  // Flat directory scan for images
  const files = fs.readdirSync(IMAGE_DIR).filter((f) => f.match(/\.(jpg|jpeg|png)$/i));
  console.log(`📸 Found ${files.length} files to scan.`);

  const updateStmt = db.prepare(`
        UPDATE documents 
        SET has_redactions = 1, redaction_count = MAX(redaction_count, 1) 
        WHERE file_name = ?
    `);

  let redactedCount = 0;
  let updatedCount = 0;

  for (const [index, file] of files.entries()) {
    const filePath = path.join(IMAGE_DIR, file);

    try {
      const buffer = fs.readFileSync(filePath);
      const redacted = await isRedacted(buffer);

      if (redacted) {
        redactedCount++;

        // Map "0001" -> "IMG_1360.pdf"?
        // Wait, if filenames are just "0001", "0002"...
        // How do they map to documents?
        // The ingest script used "find . -name *.pdf".
        // If these are folders 0001... containing the PDF?
        // Let's assume file name IS the document ID for now or try to match heuristic.
        // The ingest script said: "Found PDFs".
        // If `0001` is a PDF:
        const pdfName = file;
        if (!pdfName.toLowerCase().endsWith('.pdf')) {
          // Try appending .pdf
          // Or check if original ingestion stored it as-is.
          // Actually, let's just use LIKE
          // db.prepare("UPDATE documents SET ... WHERE file_path LIKE ?").run(`%/${file}`);
          // But for safety, let's update by content_hash or exact match if possible.
          // For now, let's try strict name + .pdf
        }

        // Correction: The files are seemingly "0001" type PDF?
        // `file` command said "PDF document".
        // Ingest script: `fileName = path.basename(filePath)`.
        // So document file_name is "0001".

        const result = updateStmt.run(file); // Try exact match first

        if (result.changes > 0) {
          console.log(`✅ [Redacted] ${file} -> Updated`);
          updatedCount++;
        } else {
          // Try with .pdf
          const result2 = updateStmt.run(`${file}.pdf`);
          if (result2.changes > 0) {
            console.log(`✅ [Redacted] ${file}.pdf -> Updated`);
            updatedCount++;
          } else {
            console.log(`⚠️ [Redacted] ${file} -> No matching PDF found`);
          }
        }
      }
    } catch (e) {
      console.error(`❌ Error scanning ${file}:`, e);
    }

    if ((index + 1) % 50 === 0) {
      console.log(`📊 Progress: ${index + 1}/${files.length} scanned.`);
    }
  }

  console.log(`\n🎉 Scan Complete!`);
  console.log(`🔍 Detected Redactions: ${redactedCount}`);
  console.log(`💾 Updated Documents: ${updatedCount}`);
}

run();
