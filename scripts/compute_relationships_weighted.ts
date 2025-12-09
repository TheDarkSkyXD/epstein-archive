import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DB_PATH = path.join(__dirname, '../epstein-archive.db')
const db = new Database(DB_PATH)

type Args = {
  since?: string
  entityId?: string[]
  docId?: string[]
  dryRun?: boolean
}

function parseArgs(): Args {
  const args: Args = {}
  for (const a of process.argv.slice(2)) {
    if (a.startsWith('--since=')) args.since = a.split('=')[1]
    else if (a.startsWith('--entity-id=')) (args.entityId ||= []).push(a.split('=')[1])
    else if (a.startsWith('--doc-id=')) (args.docId ||= []).push(a.split('=')[1])
    else if (a === '--dry-run') args.dryRun = true
  }
  return args
}

const BATCH = 500

function sigmoid(x: number, k: number): number {
  return 1 / (1 + Math.exp(-x / k))
}

function evidenceBonus(type: string): number {
  const t = type.toLowerCase()
  if (t.includes('legal')) return 3
  if (t.includes('financial')) return 4
  if (t.includes('travel')) return 2
  if (t.includes('email')) return 1
  return 0
}

function computeWeighted(args: Args) {
  const scope = {
    since: args.since || null,
    entityIds: args.entityId || [],
    docIds: args.docId || [],
    dryRun: !!args.dryRun,
  }
  console.log(JSON.stringify({ mode: 'relationships_weighted', scope }))

  let jobId: number | null = null
  if (!scope.dryRun) {
    try {
      const ins = db.prepare(`INSERT INTO jobs (job_type, payload_json, status, started_at) VALUES ('relationships_recompute', ?, 'running', datetime('now'))`)
      const r = ins.run(JSON.stringify(scope))
      jobId = Number(r.lastInsertRowid)
    } catch {}
  }

  const docs: Array<any> = scope.docIds.length
    ? db.prepare(`SELECT id, red_flag_rating, evidentiary_risk_score, evidence_type FROM documents WHERE id IN (${scope.docIds.map(() => '?').join(',')})`).all(...scope.docIds)
    : scope.since
    ? db.prepare(`SELECT id, red_flag_rating, evidentiary_risk_score, evidence_type FROM documents WHERE date_created >= ?`).all(scope.since)
    : db.prepare(`SELECT id, red_flag_rating, evidentiary_risk_score, evidence_type FROM documents`).all()

  const docMap = new Map<number, any>()
  for (const d of docs) docMap.set(Number(d.id), d)

  const mentions: Array<any> = scope.entityIds.length
    ? db.prepare(`SELECT document_id AS doc, entity_id AS eid, page_number AS pg, position_in_text AS pos FROM entity_mentions WHERE entity_id IN (${scope.entityIds.map(() => '?').join(',')})`).all(...scope.entityIds)
    : scope.docIds.length
    ? db.prepare(`SELECT document_id AS doc, entity_id AS eid, page_number AS pg, position_in_text AS pos FROM entity_mentions WHERE document_id IN (${scope.docIds.map(() => '?').join(',')})`).all(...scope.docIds)
    : db.prepare(`SELECT document_id AS doc, entity_id AS eid, page_number AS pg, position_in_text AS pos FROM entity_mentions`).all()

  const byDoc = new Map<number, Array<any>>()
  for (const m of mentions) {
    const arr = byDoc.get(Number(m.doc)) || []
    arr.push({ eid: Number(m.eid), pg: Number(m.pg || 0), pos: Number(m.pos || 0) })
    byDoc.set(Number(m.doc), arr)
  }

  const up = db.prepare(`
    INSERT INTO entity_relationships 
      (source_id, target_id, relationship_type, weight, confidence, metadata_json, proximity_score, risk_score, first_seen_at, last_seen_at)
    VALUES (?, ?, 'co_occurrence', ?, ?, ?, ?, ?, NULL, NULL)
    ON CONFLICT(source_id, target_id, relationship_type) DO UPDATE SET 
      weight = entity_relationships.weight + excluded.weight,
      proximity_score = COALESCE(entity_relationships.proximity_score, entity_relationships.weight) + excluded.proximity_score,
      risk_score = COALESCE(entity_relationships.risk_score, 0) + excluded.risk_score,
      confidence = MAX(entity_relationships.confidence, excluded.confidence)
  `)

  const tx = db.transaction((rows: Array<any>) => { for (const r of rows) up.run(r.a, r.b, r.w, r.c, r.m, r.p, r.r) })

  let buf: Array<any> = []
  let created = 0

  for (const [docIdStr, list] of byDoc.entries()) {
    const docId = Number(docIdStr)
    const doc = docMap.get(docId) || { red_flag_rating: 0, evidentiary_risk_score: 0, evidence_type: 'document' }
    const ids = [...new Set(list.map(x => x.eid))]
    if (ids.length < 2 || ids.length > 80) continue
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i]
        const b = list[j]
        if (a.eid === b.eid) continue
        const base = 1 + Math.min(3, ids.length)
        const paragraphBonus = a.pg === b.pg && Math.abs(a.pos - b.pos) <= 500 ? 2 : 0
        const eventBonus = 0
        const redFlagBonus = Number(doc.red_flag_rating || 0)
        const typeBonus = evidenceBonus(String(doc.evidence_type || 'document'))
        const total = base + paragraphBonus + eventBonus + redFlagBonus + typeBonus
        const proximity = total
        const confidence = Math.min(0.99, Math.max(0.5, sigmoid(total, 6)))
        const risk = Number(doc.evidentiary_risk_score || 0) + (typeBonus > 0 ? typeBonus * 0.5 : 0)
        const meta = {
          weight_components: {
            co_occurrence_weight: base,
            paragraph_bonus: paragraphBonus,
            event_bonus: eventBonus,
            red_flag_bonus: redFlagBonus,
            evidence_type_bonus: { [String(doc.evidence_type || 'document')]: typeBonus }
          },
          doc_ids: [docId],
          signal_count_by_type: { [String(doc.evidence_type || 'document')]: 1 }
        }
        const m = JSON.stringify(meta)
        const pair = a.eid < b.eid ? [a.eid, b.eid] as const : [b.eid, a.eid] as const
        const row = { a: pair[0], b: pair[1], w: total, c: confidence, m, p: proximity, r: risk }
        if (scope.dryRun) {
          console.log(JSON.stringify({ upsert: row }))
        } else {
          buf.push(row)
          created++
          if (buf.length >= BATCH) { tx(buf); buf = [] }
        }
      }
    }
  }
  if (buf.length) tx(buf)
  const total = (db.prepare(`SELECT COUNT(*) AS c FROM entity_relationships`).get() as any).c
  console.log(JSON.stringify({ relationships_processed: created, total_relationships: total }))
  if (jobId && !scope.dryRun) {
    try {
      db.prepare(`UPDATE jobs SET status='success', finished_at=datetime('now') WHERE id=?`).run(jobId)
    } catch {}
  }
}

computeWeighted(parseArgs())