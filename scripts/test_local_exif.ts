import fs from 'fs';
import exifParser from 'exif-parser';

const filePath = 'data/media/images/12.03.25 USVI Production/originals/DJI_0360.JPG';

try {
  const buffer = fs.readFileSync(filePath);
  const parser = exifParser.create(buffer);
  const result = parser.parse();
  if (result.tags && result.tags.DateTimeOriginal) {
      console.log('✅ Found Date:', new Date(result.tags.DateTimeOriginal * 1000).toISOString());
      console.log('✅ Found GPS:', result.tags.GPSLatitude, result.tags.GPSLongitude);
  } else {
      console.log('❌ No DateTimeOriginal in local original.');
      console.log('Tags:', JSON.stringify(result.tags, null, 2));
  }
} catch (e) {
  console.error('Error:', e);
}
