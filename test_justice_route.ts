import { getDb } from './src/server/db/connection.js';
import path from 'path';

const db = getDb();

async function testRoute(url: string) {
  console.log(`\nTesting URL: ${url}`);

  const match = url.match(/\/epstein\/files\/(.+)$/);
  if (!match) {
    console.log('❌ No match for regex');
    return;
  }

  const urlSuffix = match[1];
  const cleanSuffix = urlSuffix.split('?')[0];
  const decodedSuffix = decodeURIComponent(cleanSuffix);

  console.log(`Suffix: ${cleanSuffix}`);
  console.log(`Decoded: ${decodedSuffix}`);

  const pattern1 = `%/epstein/files/${cleanSuffix}`;
  const pattern2 = `%/epstein/files/${decodedSuffix}`;

  console.log(`Pattern 1: ${pattern1}`);
  console.log(`Pattern 2: ${pattern2}`);

  const doc = db
    .prepare(
      `
    SELECT id, file_path 
    FROM documents 
    WHERE file_path LIKE ? 
       OR file_path LIKE ?
    LIMIT 1
  `,
    )
    .get(pattern1, pattern2) as { id: string; file_path: string } | undefined;

  if (doc) {
    console.log(`✅ Found Document: ${doc.id}`);
    console.log(`   Path: ${doc.file_path}`);
    return;
  }

  console.log('⚠️  Direct match failed, trying filename fallback...');

  const filename = path.basename(decodedSuffix);
  console.log(`Filename: ${filename}`);

  const docByFilename = db
    .prepare(
      `
    SELECT id, file_path FROM documents WHERE file_name = ? LIMIT 1
  `,
    )
    .get(filename) as { id: string; file_path: string } | undefined;

  if (docByFilename) {
    console.log(`✅ Found by Filename: ${docByFilename.id}`);
    console.log(`   Path: ${docByFilename.file_path}`);
  } else {
    console.log('❌ Not found');
  }
}

// Test cases
// 1. Exact URL from user example (but with file we know exists)
// We know EFTA01221677.pdf exists in DataSet 9
await testRoute('/epstein/files/DataSet%209/EFTA01221677.pdf');

// 2. URL with space decoded (simulating some browsers/proxies)
await testRoute('/epstein/files/DataSet 9/EFTA01221677.pdf');

// 3. Fallback test (just filename)
await testRoute('/epstein/files/UnknownFolder/EFTA01221677.pdf');
