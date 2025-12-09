import { DatabaseService } from '../src/services/DatabaseService';
import path from 'path';

console.log('CWD:', process.cwd());
console.log('DB Path should be:', path.join(process.cwd(), 'epstein-archive.db'));

const dbService = DatabaseService.getInstance();
const db = dbService.getDatabase();

const count = db.prepare('SELECT count(*) as c FROM media_items').get() as { c: number };
console.log('Media Items Count:', count.c);

const items = db.prepare('SELECT id, title FROM media_items').all();
console.log('Items:', items);
