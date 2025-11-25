import fs from 'fs';
import path from 'path';

const WATERMARK_LINES = 4; // 3 lines of watermark + 1 blank line

async function removeWatermark() {
  const baseDir = path.join(process.cwd(), '..', 'Epstein Estate Documents - Seventh Production', 'IMAGES');
  
  console.log('Starting watermark removal from OCR files...\n');
  
  let processedCount = 0;
  let errorCount = 0;
  
  // Process files 001-OCR.txt through 012-OCR.txt
  for (let i = 1; i <= 12; i++) {
    const folderNum = String(i).padStart(3, '0');
    const filePath = path.join(baseDir, folderNum, `${folderNum}-OCR.txt`);
    
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  File not found: ${filePath}`);
        errorCount++;
        continue;
      }
      
      // Read the file
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      
      // Check if watermark is present
      if (lines.length > WATERMARK_LINES && lines[0].includes('This text file has been created by the free version of Textify')) {
        // Remove the first 4 lines (watermark + blank line)
        const cleanedContent = lines.slice(WATERMARK_LINES).join('\n');
        
        // Write back to file
        fs.writeFileSync(filePath, cleanedContent, 'utf-8');
        
        console.log(`✅ Processed: ${folderNum}-OCR.txt (removed ${WATERMARK_LINES} lines)`);
        processedCount++;
      } else {
        console.log(`ℹ️  Skipped: ${folderNum}-OCR.txt (watermark not found or already removed)`);
      }
      
    } catch (error) {
      console.error(`❌ Error processing ${folderNum}-OCR.txt:`, error);
      errorCount++;
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Processed: ${processedCount} files`);
  console.log(`   Errors: ${errorCount} files`);
  console.log(`   Total: ${processedCount + errorCount} files checked`);
}

// Run the script
removeWatermark().catch(console.error);
