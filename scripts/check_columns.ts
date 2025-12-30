
import Database from 'better-sqlite3';

const db = new Database('epstein-archive-clean.db', { readonly: true });
const columns = db.prepare("PRAGMA table_info(documents)").all();
console.log('Columns in documents table:', columns.map((c: any) => c.name));
db.close();
