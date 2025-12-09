import Database from 'better-sqlite3'
import { join, basename } from 'path'
import { readdirSync, statSync, readFileSync, existsSync } from 'fs'
import pdf from 'pdf-parse'

type Person = { id?: number; fullName: string; primaryRole?: string; secondaryRoles?: string[] }

const DB_PATH = join(process.cwd(), 'epstein-archive.db')
const EXTERNAL_ROOT = process.env.EXTERNAL_DATA_ROOT || join(process.cwd(), '..', 'data')

const db = new Database(DB_PATH)

function* walk(dir: string): Generator<string> {
  const entries = readdirSync(dir)
  for (const e of entries) {
    const p = join(dir, e)
    const st = statSync(p)
    if (st.isDirectory()) yield* walk(p)
    else yield p
  }
}

async function readFileContent(path: string) {
  const ext = path.split('.').pop()?.toLowerCase() || ''
  if (ext === 'pdf') {
    const buf = readFileSync(path)
    try {
      const data = await pdf(buf)
      return String((data as any).text || '')
    } catch {
      return ''
    }
  }
  try { return readFileSync(path, 'utf-8') } catch { return '' }
}

function classifyEvidenceType(fp: string): string {
  const f = fp.toLowerCase()
  if (f.includes('oversight') || f.includes('exhibit') || f.includes('court') || f.includes('affidavit') || f.includes('deposition')) return 'legal_document'
  if (f.includes('email')) return 'email'
  return 'document'
}

function sourceCollection(fp: string): string | null {
  if (fp.includes('House Oversight')) return 'House Oversight'
  if (fp.includes('USVI Production')) return 'USVI Court Production'
  if (fp.includes('Epstein Estate Documents')) return 'Epstein Estate Documents'
  return null
}

function loadExternalPeople(): Person[] {
  const p = join(EXTERNAL_ROOT, 'public', 'data', 'people.json')
  if (!existsSync(p)) return []
  try {
    const arr = JSON.parse(readFileSync(p, 'utf-8')) as any[]
    return arr.map(x => ({ fullName: x.name || x.fullName || x.id || '', primaryRole: x.primaryRole || x.role }))
  } catch { return [] }
}

function ensureEvidenceTypes(types: string[]) {
  const sel = db.prepare('SELECT id FROM evidence_types WHERE type_name = ?')
  const ins = db.prepare('INSERT OR IGNORE INTO evidence_types (type_name) VALUES (?)')
  for (const t of types) {
    const row = sel.get(t) as any
    if (!row) ins.run(t)
  }
}

function upsertPerson(person: Person): number {
  const get = db.prepare('SELECT id FROM entities WHERE LOWER(full_name) = LOWER(?)')
  const ins = db.prepare('INSERT INTO entities (full_name, primary_role, secondary_roles, likelihood_level, mentions, red_flag_rating) VALUES (?, ?, ?, ?, ?, ?)')
  const row = get.get(person.fullName) as { id: number } | undefined
  if (row) return row.id
  const info = ins.run(person.fullName, person.primaryRole || null, person.secondaryRoles ? person.secondaryRoles.join(', ') : null, 'MEDIUM', 0, 0)
  return Number(info.lastInsertRowid)
}

async function upsertDocument(fp: string): Promise<number> {
  const get = db.prepare('SELECT id FROM documents WHERE file_path = ?')
  const row = get.get(fp) as { id: number } | undefined
  if (row) return row.id
  const st = statSync(fp)
  const content = await readFileContent(fp)
  const meta = { source_collection: sourceCollection(fp) }
  const ins = db.prepare('INSERT INTO documents (file_name, file_path, file_type, file_size, date_created, content, metadata_json, word_count, red_flag_rating, evidence_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
  const info = ins.run(basename(fp), fp, (basename(fp).split('.').pop() || 'txt').toLowerCase(), st.size, new Date(st.birthtime || st.mtime).toISOString(), content, JSON.stringify(meta), (content.match(/\b[\w']+\b/g) || []).length, 0, classifyEvidenceType(fp))
  return Number(info.lastInsertRowid)
}

function indexPeopleMap(): Map<string, number> {
  const m = new Map<string, number>()
  const rows = db.prepare('SELECT id, full_name FROM entities').all() as any[]
  for (const r of rows) {
    const n = String(r.full_name || '').trim().toLowerCase()
    if (!n) continue
    m.set(n, Number(r.id))
  }
  return m
}

function mentionInsert() {
  return db.prepare('INSERT INTO entity_mentions (entity_id, document_id, context_text, context_type, keyword, position_start, position_end, significance_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
}

function upsertRelationship() {
  return db.prepare('INSERT INTO entity_relationships (source_id, target_id, relationship_type, weight, confidence, metadata_json, proximity_score, risk_score, first_seen_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(source_id, target_id, relationship_type) DO UPDATE SET weight = entity_relationships.weight + excluded.weight, proximity_score = COALESCE(entity_relationships.proximity_score, entity_relationships.weight) + excluded.proximity_score, risk_score = COALESCE(entity_relationships.risk_score, 0) + excluded.risk_score, confidence = MAX(entity_relationships.confidence, excluded.confidence)')
}

function computePairWeight(docMeta: any, sameParagraph: boolean, countInDoc: number): { w: number; c: number; p: number; r: number; m: string } {
  const base = 1 + Math.min(3, countInDoc)
  const paragraphBonus = sameParagraph ? 2 : 0
  const type = String(docMeta?.evidence_type || 'document')
  const typeBonus = type.includes('legal') ? 3 : type.includes('financial') ? 4 : type.includes('travel') ? 2 : type.includes('email') ? 1 : 0
  const redFlag = Number(docMeta?.red_flag_rating || 0)
  const total = base + paragraphBonus + redFlag + typeBonus
  const proximity = total
  const confidence = Math.min(0.99, Math.max(0.5, 1 / (1 + Math.exp(-total / 6))))
  const risk = Number(docMeta?.evidentiary_risk_score || 0) + (typeBonus > 0 ? typeBonus * 0.5 : 0)
  const meta = { weight_components: { co_occurrence_weight: base, paragraph_bonus: paragraphBonus, red_flag_bonus: redFlag, evidence_type_bonus: { [type]: typeBonus } } }
  return { w: total, c: confidence, p: proximity, r: risk, m: JSON.stringify(meta) }
}

async function processTextDocuments() {
  const targets = [join(EXTERNAL_ROOT, 'text'), join(EXTERNAL_ROOT, 'ocr_clean', 'text'), join(EXTERNAL_ROOT, 'originals')]
  const files = targets.filter(existsSync).flatMap(d => Array.from(walk(d))).filter(p => /(txt|rtf|pdf)$/i.test(p))
  ensureEvidenceTypes(['document', 'email', 'legal_document'])
  const externalPeople = loadExternalPeople()
  for (const p of externalPeople) upsertPerson(p)
  const peopleMap = indexPeopleMap()
  const insMention = mentionInsert()
  const insRel = upsertRelationship()
  for (const fp of files) {
    const docId = await upsertDocument(fp)
    const docRow = db.prepare('SELECT id, evidence_type, content, red_flag_rating, evidentiary_risk_score FROM documents WHERE id=?').get(docId) as any
    const content = String(docRow?.content || '')
    const people = Array.from(peopleMap.entries())
    const positions: Array<{ eid: number; start: number; end: number; para: number }> = []
    const paraIdx: Array<number> = []
    let offset = 0
    for (const seg of content.split(/\n+/)) {
      const startPara = offset
      for (const [name, eid] of people) {
        const re = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
        let m: RegExpExecArray | null
        while ((m = re.exec(seg)) !== null) {
          const absStart = startPara + m.index
          const absEnd = absStart + m[0].length
          const ctxStart = Math.max(0, absStart - 80)
          const ctxEnd = Math.min(content.length, absEnd + 80)
          const ctx = content.slice(ctxStart, ctxEnd)
          insMention.run(eid, docId, ctx, 'mention', name, absStart, absEnd, 1)
          positions.push({ eid: eid, start: absStart, end: absEnd, para: paraIdx.length })
        }
      }
      paraIdx.push(startPara)
      offset += seg.length + 1
    }
    const byEntity = new Map<number, Array<{ start: number; end: number; para: number }>>()
    for (const pos of positions) {
      const arr = byEntity.get(pos.eid) || []
      arr.push({ start: pos.start, end: pos.end, para: pos.para })
      byEntity.set(pos.eid, arr)
    }
    const ids = Array.from(new Set(positions.map(x => x.eid)))
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = ids[i]
        const b = ids[j]
        const ap = byEntity.get(a) || []
        const bp = byEntity.get(b) || []
        const samePara = ap.some(x => bp.some(y => x.para === y.para && Math.abs(x.start - y.start) <= 500))
        const w = computePairWeight({ evidence_type: docRow.evidence_type, red_flag_rating: docRow.red_flag_rating, evidentiary_risk_score: docRow.evidentiary_risk_score }, samePara, ids.length)
        const pair = a < b ? [a, b] as const : [b, a] as const
        insRel.run(pair[0], pair[1], 'co_occurrence', w.w, w.c, w.m, w.p, w.r, null, null)
      }
    }
    const txt = content.slice(0, 800).toLowerCase()
    if (docRow.evidence_type === 'email' || /\bfrom:\b|\bsubject:\b|\bto:\b/.test(txt)) {
      const from = (txt.match(/^from:\s*(.+)$/im)?.[1] || '').trim().toLowerCase()
      const toLine = (txt.match(/^to:\s*(.+)$/im)?.[1] || '').trim().toLowerCase()
      const tos = toLine.split(/[,;]+/).map(s => s.trim()).filter(Boolean)
      const nameFrom = from.replace(/"/g, '').replace(/<.*?>/g, '').trim()
      const idFrom = peopleMap.get(nameFrom)
      if (idFrom) {
        for (const t of tos) {
          const nameTo = t.replace(/"/g, '').replace(/<.*?>/g, '').trim()
          const idTo = peopleMap.get(nameTo)
          if (idTo) {
            const w = computePairWeight({ evidence_type: 'email', red_flag_rating: docRow.red_flag_rating, evidentiary_risk_score: docRow.evidentiary_risk_score }, true, 2)
            insRel.run(idFrom, idTo, 'emailed', w.w, w.c, w.m, w.p, w.r, null, null)
          }
        }
      }
    }
  }
}

async function main() {
  await processTextDocuments()
  db.close()
  process.stdout.write('External data enrichment complete.')
}

main().catch(err => { console.error(err); process.exit(1) })

