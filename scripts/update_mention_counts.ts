import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DB_PATH = path.join(__dirname, '../epstein-archive.db')
const db = new Database(DB_PATH)

function updateEntityCounts() {
  const rows = db.prepare(`SELECT entity_id AS id, COUNT(*) AS c FROM entity_mentions GROUP BY entity_id`).all() as Array<{ id: number; c: number }>
  const upd = db.prepare(`UPDATE entities SET mentions = ? WHERE id = ?`)
  const tx = db.transaction((arr: Array<{ id: number; c: number }>) => { for (const r of arr) upd.run(r.c, r.id) })
  tx(rows)
}

function updateDocumentCounts() {
  const rows = db.prepare(`SELECT document_id AS id, COUNT(*) AS c FROM entity_mentions GROUP BY document_id`).all() as Array<{ id: number; c: number }>
  const upd = db.prepare(`UPDATE documents SET mentions_count = ? WHERE id = ?`)
  const tx = db.transaction((arr: Array<{ id: number; c: number }>) => { for (const r of arr) upd.run(r.c, r.id) })
  tx(rows)
}

function run() {
  updateEntityCounts()
  updateDocumentCounts()
  const e = (db.prepare(`SELECT SUM(mentions) AS s FROM entities`).get() as any).s
  const d = (db.prepare(`SELECT SUM(mentions_count) AS s FROM documents`).get() as any).s
  console.log(JSON.stringify({ entity_mentions_total: e, document_mentions_total: d }))
}

run()