import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdfLib = require('pdf-parse');
const PDFParse = pdfLib.PDFParse || pdfLib.default?.PDFParse;

const INPUT_DIR = 'data/text/lvoocaudiop1';

async function convertPdfs() {
  if (!fs.existsSync(INPUT_DIR)) {
    console.error(`Directory not found: ${INPUT_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(INPUT_DIR).filter(f => f.endsWith('.pdf'));
  console.log(`Found ${files.length} PDF files in ${INPUT_DIR}`);

  for (const file of files) {
    const filePath = path.join(INPUT_DIR, file);
    const dataBuffer = fs.readFileSync(filePath);

    try {
      console.log(`Processing ${file}...`);
      // Use v2 API
      const parser = new PDFParse({ data: dataBuffer });
      const result = await parser.getText();
      const text = result.text;
      
      await parser.destroy();
      
      const cleanText = text
        .replace(/\n\s*\d+\s*\n/g, '\n') 
        .replace(/\r\n/g, '\n');

      const textFilename = file.replace('.pdf', '.txt');
      const textPath = path.join(INPUT_DIR, textFilename);
      
      fs.writeFileSync(textPath, cleanText);
      console.log(`✅ Converted ${file} -> ${textFilename} (${cleanText.length} chars)`);
      
    } catch (e) {
      console.error(`❌ Failed to convert ${file}:`, e);
    }
  }
}

if (!PDFParse) {
    console.error('CRITICAL: Could not find PDFParse class in export.');
    console.log('Keys:', Object.keys(pdfLib));
} else {
    convertPdfs();
}
