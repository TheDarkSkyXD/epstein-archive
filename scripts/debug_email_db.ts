import Database from 'better-sqlite3';

const DB_PATH = process.env.DB_PATH || 'epstein-archive.db';
const db = new Database(DB_PATH);

const filename = '20160203-You need everything in this email.-3152.eml';
console.log(`Searching for: ${filename}`);

interface DocumentRow {
  id: number;
  evidence_type: string;
  file_type: string;
  metadata_json: string;
  content: string | null;
}

const doc = db.prepare('SELECT * FROM documents WHERE file_path LIKE ?').get(`%${filename}%`) as
  | DocumentRow
  | undefined;

if (doc) {
  console.log('Found document:');
  console.log('ID:', doc.id);
  console.log('Evidence Type:', doc.evidence_type);
  console.log('File Type:', doc.file_type);
  console.log('Metadata JSON:', doc.metadata_json);
  console.log('Snippet of Content:', doc.content ? doc.content.substring(0, 500) : 'NULL');
} else {
  console.log('Document not found in DB.');
}

console.log('Checking for any email evidence type:');
const count = db
  .prepare("SELECT COUNT(*) as count FROM documents WHERE evidence_type = 'email'")
  .get() as any;
console.log(`Total 'email' type docs: ${count.count}`);

db.close();
