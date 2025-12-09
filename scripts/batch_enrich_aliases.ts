import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DB_PATH = path.join(__dirname, '../epstein-archive.db')
const db = new Database(DB_PATH)

type Canon = { name: string; role?: string; title?: string; aliases: string[] }

const CANONICALS: Canon[] = [
  { name: 'Steve Bannon', role: 'Political strategist', title: 'Steve Bannon', aliases: ['Steven Bannon', 'Bannon'] },
  { name: 'Alex Acosta', role: 'U.S. Labor Secretary', title: 'Alex Acosta', aliases: ['Alexander Acosta', 'Acosta'] },
  { name: 'Ehud Barak', role: 'Former Israeli PM', title: 'Ehud Barak', aliases: ['Barak'] },
  { name: 'Leslie Wexner', role: 'Billionaire', title: 'Leslie Wexner', aliases: ['L Brands', 'Wexner'] },
  { name: 'Alan Dershowitz', role: 'Lawyer', title: 'Alan Dershowitz', aliases: ['Dershowitz'] },
  { name: 'Prince Andrew', role: 'Duke of York', title: 'Prince Andrew', aliases: ['Andrew'] },
  { name: 'Bill Clinton', role: 'U.S. President', title: 'Bill Clinton', aliases: ['William Clinton', 'Clinton'] },
  { name: 'Donald Trump', role: 'U.S. President', title: 'Donald Trump', aliases: ['President Trump', 'Trump'] },
]

function ensureCanonical(c: Canon) {
  const row = db.prepare(`SELECT id FROM entities WHERE full_name = ?`).get(c.name) as any
  if (row?.id) return Number(row.id)
  const info = db.prepare(`INSERT INTO entities (full_name, entity_type, primary_role, title, mentions, spice_rating) VALUES (?, 'Person', ?, ?, 0, 0)`).run(c.name, c.role || 'Subject', c.title || c.name)
  return Number(info.lastInsertRowid)
}

function findAliasEntityIds(c: Canon, canonicalId: number): number[] {
  const ids: number[] = []
  const patterns = [c.name, ...c.aliases]
  for (const p of patterns) {
    const like = `%${p}%`
    const rows = db.prepare(`SELECT id FROM entities WHERE full_name LIKE ? AND id != ?`).all(like, canonicalId) as Array<any>
    for (const r of rows) ids.push(Number(r.id))
  }
  return Array.from(new Set(ids))
}

function reassignMentions(fromIds: number[], toId: number, keyword: string) {
  const upd = db.prepare(`UPDATE entity_mentions SET entity_id = ? WHERE entity_id = ?`)
  const tx = db.transaction((ids: number[]) => { for (const id of ids) upd.run(toId, id) })
  if (fromIds.length) tx(fromIds)
  const rows = db.prepare(`SELECT id FROM documents WHERE title LIKE ? OR file_name LIKE ? OR content LIKE ? OR content_preview LIKE ?`).all(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`) as Array<any>
  const ins = db.prepare(`INSERT OR IGNORE INTO entity_mentions (entity_id, document_id, context_text, context_type, keyword, significance_score) VALUES (?, ?, NULL, 'text', ?, 0.6)`) 
  const tx2 = db.transaction((docIds: number[]) => { for (const d of docIds) ins.run(toId, d.id, keyword) })
  if (rows.length) tx2(rows)
}

function markAliases(ids: number[], canonicalName: string) {
  const upd = db.prepare(`UPDATE entities SET primary_role = 'Alias', title = ? WHERE id = ?`)
  const tx = db.transaction((list: number[]) => { for (const id of list) upd.run(`Alias of ${canonicalName}`, id) })
  if (ids.length) tx(ids)
}

function updateSignals(entityId: number) {
  const m = db.prepare(`SELECT COUNT(*) AS c FROM entity_mentions WHERE entity_id = ?`).get(entityId) as any
  db.prepare(`UPDATE entities SET mentions = ? WHERE id = ?`).run(m.c || 0, entityId)
  const rf = db.prepare(`SELECT MAX(red_flag_rating) AS r FROM documents WHERE id IN (SELECT document_id FROM entity_mentions WHERE entity_id = ?)`).get(entityId) as any
  if (rf?.r !== undefined && rf.r !== null) db.prepare(`UPDATE entities SET red_flag_rating = ? WHERE id = ?`).run(rf.r, entityId)
}

function run() {
  db.pragma('journal_mode = WAL')
  const results: any[] = []
  for (const c of CANONICALS) {
    const canonicalId = ensureCanonical(c)
    const aliasIds = findAliasEntityIds(c, canonicalId)
    reassignMentions(aliasIds, canonicalId, c.name.split(' ')[0])
    if (c.aliases && c.aliases.length) for (const a of c.aliases) reassignMentions(aliasIds, canonicalId, a)
    markAliases(aliasIds, c.name)
    updateSignals(canonicalId)
    const row = db.prepare(`SELECT id, full_name, entity_type, mentions, COALESCE(red_flag_rating, spice_rating, 0) AS red_flag_rating FROM entities WHERE id = ?`).get(canonicalId)
    results.push(row)
  }
  console.log(JSON.stringify(results))
}

run()