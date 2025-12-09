import Database from 'better-sqlite3'
import { join } from 'path'

const db = new Database(join(process.cwd(), 'epstein-archive.db'))
function tableExists(name: string): boolean { const r = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(name) as any; return !!r }
function columnExists(table: string, column: string): boolean { const r = db.prepare(`PRAGMA table_info(${table})`).all() as any[]; return r.some(c => c.name === column) }

if (!tableExists('merge_log')) {
  db.exec(`CREATE TABLE merge_log (id INTEGER PRIMARY KEY AUTOINCREMENT, src_id INTEGER NOT NULL, dst_id INTEGER NOT NULL, score REAL, timestamp TEXT DEFAULT (datetime('now')))`) 
}
if (!columnExists('merge_log','reason')) { db.exec(`ALTER TABLE merge_log ADD COLUMN reason TEXT`) }
db.exec(`CREATE INDEX IF NOT EXISTS idx_merge_log_dst ON merge_log(dst_id)`)
db.exec(`CREATE INDEX IF NOT EXISTS idx_merge_log_reason ON merge_log(reason)`)
console.log('merge_log migration applied')