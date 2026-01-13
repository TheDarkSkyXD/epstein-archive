import Database from 'better-sqlite3';
import { join } from 'path';

const DB_PATH = process.env.DB_PATH || join(process.cwd(), 'epstein-archive.db');
const db = new Database(DB_PATH);

function classify(fileName: string, filePath: string, content: string) {
  const name = fileName.toLowerCase();
  const path = filePath.toLowerCase();
  const first = (content || '').split('\n').slice(0, 40).join('\n');
  if (/\.(jpg|jpeg|png|gif|webp|bmp)$/.test(name) || path.includes('/media/images')) return 'image';
  if (/\.csv$/.test(name) || path.includes('/csv/')) return 'spreadsheet';
  if (/^from:\s|^to:\s|^subject:\s|^date:\s|rfc|message-id/i.test(first)) return 'email';
  if (
    /plaintiff|defendant|case\s+no\.|in the\s+.*court|affidavit|deposition|complaint/i.test(first)
  )
    return 'legal_document';
  if (/https?:\/\//.test(first) && /search|results|web|serp/i.test(path)) return 'search_results';
  if (/exhibit\s+[a-z0-9]+/i.test(content) || /filed/i.test(content)) return 'submitted_evidence';
  if (/transcript/i.test(first) || /deposition/i.test(first)) return 'transcript';
  if (/\.pdf$/.test(name)) return 'pdf_document';
  return 'document';
}

function run() {
  const rows = db
    .prepare('SELECT id, file_name, file_path, content, evidence_type FROM documents')
    .all() as any[];
  const upd = db.prepare('UPDATE documents SET evidence_type = ? WHERE id = ?');
  let updated = 0;
  db.transaction(() => {
    for (const r of rows) {
      const et = classify(
        String(r.file_name || ''),
        String(r.file_path || ''),
        String(r.content || ''),
      );
      if (!r.evidence_type || r.evidence_type !== et) {
        upd.run(et, r.id);
        updated++;
      }
    }
  })();
  console.log(`Classified ${rows.length} documents. Updated: ${updated}`);
  db.close();
}

run();
