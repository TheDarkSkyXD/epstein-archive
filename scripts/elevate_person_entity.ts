import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DB_PATH = path.join(__dirname, '../epstein-archive.db')
const db = new Database(DB_PATH)

function ensureFTS() {
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(title, file_name, content, content_preview, metadata_json, content='documents', content_rowid='id');
  `)
  const dCount = db.prepare(`SELECT COUNT(*) AS c FROM documents_fts`).get().c as number
  if (!dCount) db.exec(`INSERT INTO documents_fts(rowid, title, file_name, content, content_preview, metadata_json) SELECT id, title, file_name, content, content_preview, metadata_json FROM documents`)
}

function getOrCreatePerson(fullName: string) {
  const existing = db.prepare(`SELECT id FROM entities WHERE full_name = ?`).get(fullName) as any
  if (existing?.id) return existing.id as number
  const stmt = db.prepare(`INSERT INTO entities (full_name, entity_type, primary_role, title, mentions, spice_rating) VALUES (?, 'Person', 'Political strategist', 'Steve Bannon', 0, 0)`) 
  const info = stmt.run(fullName)
  return info.lastInsertRowid as number
}

function linkMentions(entityId: number, keyword: string) {
  const rows = db.prepare(`SELECT rowid AS id FROM documents_fts WHERE documents_fts MATCH ?`).all(`${keyword}*`) as Array<any>
  const ins = db.prepare(`INSERT OR IGNORE INTO entity_mentions (entity_id, document_id, context_text, context_type, keyword, significance_score) VALUES (?, ?, NULL, 'text', ?, 0.5)`) 
  const tx = db.transaction((docIds: number[]) => { for (const d of docIds) ins.run(entityId, d, keyword) })
  tx(rows.map(r => r.id))
}

function updateEntitySignals(entityId: number) {
  const m = db.prepare(`SELECT COUNT(*) AS c FROM entity_mentions WHERE entity_id = ?`).get(entityId) as any
  db.prepare(`UPDATE entities SET mentions = ? WHERE id = ?`).run(m.c || 0, entityId)
  const rf = db.prepare(`SELECT MAX(red_flag_rating) AS r FROM documents WHERE id IN (SELECT document_id FROM entity_mentions WHERE entity_id = ?)`).get(entityId) as any
  if (rf?.r !== undefined && rf.r !== null) db.prepare(`UPDATE entities SET red_flag_rating = ? WHERE id = ?`).run(rf.r, entityId)
}

function run() {
  ensureFTS()
  const id = getOrCreatePerson('Steve Bannon')
  linkMentions(id, 'Bannon')
  linkMentions(id, 'Steve Bannon')
  updateEntitySignals(id)
  const out = db.prepare(`SELECT id, full_name, entity_type, mentions, COALESCE(red_flag_rating, spice_rating, 0) AS red_flag_rating FROM entities WHERE id = ?`).get(id)
  console.log(JSON.stringify(out))
}

run()