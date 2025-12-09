import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DB_PATH = path.join(__dirname, '../epstein-archive.db')
const db = new Database(DB_PATH)

const CO_WEIGHT = 1
const TL_WEIGHT = 5
const BATCH = 1000

function mapCoOccurrences() {
  const rows = db.prepare(`SELECT document_id, GROUP_CONCAT(entity_id) AS ids FROM entity_mentions GROUP BY document_id HAVING COUNT(entity_id) > 1`).all() as Array<{ document_id: number; ids: string }>
  const ins = db.prepare(`INSERT INTO entity_relationships (source_id, target_id, relationship_type, weight, confidence) VALUES (?, ?, 'co_occurrence', ?, 0.6) ON CONFLICT(source_id, target_id, relationship_type) DO UPDATE SET weight = weight + ?`)
  const tx = db.transaction((pairs: Array<[number, number]>) => { for (const [a, b] of pairs) ins.run(a, b, CO_WEIGHT, CO_WEIGHT) })
  let buf: Array<[number, number]> = []
  for (const r of rows) {
    const ids = [...new Set(r.ids.split(',').map(Number))].sort((a, b) => a - b)
    if (ids.length > 50) continue
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) buf.push([ids[i], ids[j]])
    if (buf.length >= BATCH) { tx(buf); buf = [] }
  }
  if (buf.length) tx(buf)
}

function mapTimeline() {
  const rows = db.prepare(`SELECT id, people_involved FROM timeline_events WHERE people_involved IS NOT NULL AND people_involved != '[]'`).all() as Array<{ id: number; people_involved: string }>
  const ins = db.prepare(`INSERT INTO entity_relationships (source_id, target_id, relationship_type, weight, confidence) VALUES (?, ?, 'timeline_connection', ?, 0.8) ON CONFLICT(source_id, target_id, relationship_type) DO UPDATE SET weight = weight + ?`)
  const tx = db.transaction((pairs: Array<[number, number]>) => { for (const [a, b] of pairs) ins.run(a, b, TL_WEIGHT, TL_WEIGHT) })
  let buf: Array<[number, number]> = []
  for (const r of rows) {
    try {
      const ids = [...new Set(JSON.parse(r.people_involved).map((n: any) => Number(n)))].sort((a, b) => a - b)
      for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) buf.push([ids[i], ids[j]])
    } catch {}
  }
  if (buf.length) tx(buf)
}

function run() {
  mapCoOccurrences()
  mapTimeline()
  const total = (db.prepare(`SELECT COUNT(*) AS c FROM entity_relationships`).get() as any).c
  console.log(JSON.stringify({ relationships: total }))
}

run()