/**
 * Extract flight data from EPSTEIN FLIGHT LOGS UNREDACTED.pdf
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

async function main() {
  const pdfPath = path.join(process.cwd(), 'data/originals/EPSTEIN FLIGHT LOGS UNREDACTED.pdf');
  
  console.log('Reading PDF:', pdfPath);
  const dataBuffer = fs.readFileSync(pdfPath);
  
  const data = await pdfParse(dataBuffer);
  console.log('Total pages:', data.numpages);
  console.log('\n=== EXTRACTED TEXT (first 10000 chars) ===\n');
  console.log(data.text.substring(0, 10000));
  
  // Save full text for analysis
  const outputPath = path.join(process.cwd(), 'data/text/flight_logs_extracted.txt');
  fs.writeFileSync(outputPath, data.text);
  console.log('\nFull text saved to:', outputPath);
  console.log('Total characters:', data.text.length);
}

main().catch(console.error);
