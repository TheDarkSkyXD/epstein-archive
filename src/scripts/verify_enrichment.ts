import Database from 'better-sqlite3';
import { join } from 'path';

const DB_PATH = join(process.cwd(), 'epstein-archive.db');
const db = new Database(DB_PATH);

console.log('Verifying enrichment results...');

const categories = db.prepare(`
  SELECT 
    json_extract(metadata_json, '$.categories') as categories,
    COUNT(*) as count
  FROM documents
  GROUP BY categories
`).all();

console.log('\nCategories distribution:');
categories.forEach((row: any) => {
  console.log(`${row.categories}: ${row.count}`);
});

const legalDocs = db.prepare(`
  SELECT title, file_name 
  FROM documents 
  WHERE json_extract(metadata_json, '$.categories') LIKE '%Legal%'
  LIMIT 5
`).all();

console.log('\nSample Legal Documents:');
legalDocs.forEach((doc: any) => {
  console.log(`- ${doc.title} (${doc.file_name})`);
});

const emailDocs = db.prepare(`
  SELECT title, file_name 
  FROM documents 
  WHERE json_extract(metadata_json, '$.categories') LIKE '%Email%'
  LIMIT 5
`).all();

console.log('\nSample Emails:');
emailDocs.forEach((doc: any) => {
  console.log(`- ${doc.title} (${doc.file_name})`);
});

db.close();
