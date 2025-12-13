import fs from 'fs';
import path from 'path';
import exifParser from 'exif-parser';

const filePath = '/home/deploy/epstein-archive/data/media/images/12.03.25 USVI Production/4 December 2025/IMG_1039.JPG';

if (!fs.existsSync(filePath)) {
  console.error('File not found:', filePath);
  process.exit(1);
}

const buffer = fs.readFileSync(filePath);
console.log(`Read ${buffer.length} bytes.`);

try {
  const parser = exifParser.create(buffer);
  const result = parser.parse();
  console.log('EXIF Result:', JSON.stringify(result.tags, null, 2));
} catch (e) {
  console.error('Error parsing EXIF:', e);
}
