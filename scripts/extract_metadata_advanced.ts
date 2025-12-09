import Database from 'better-sqlite3'
import { join } from 'path'

type Args = { since?: string; docId?: string[]; dryRun?: boolean }
function parseArgs(): Args { const a: Args = {}; for (const s of process.argv.slice(2)) { if (s.startsWith('--since=')) a.since = s.split('=')[1]; else if (s.startsWith('--doc-id=')) (a.docId ||= []).push(s.split('=')[1]); else if (s === '--dry-run') a.dryRun = true } return a }

function extractAll(text: string) {
  const emails = Array.from(new Set((text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []).map(s=>s.toLowerCase())))
  const phones = Array.from(new Set((text.match(/\+?\d[\d\s().-]{7,}\d/g) || [])))
  const urls = Array.from(new Set((text.match(/https?:\/\/[\w./%-]+/gi) || [])))
  const dates = Array.from(new Set((text.match(/\b\d{4}-\d{2}-\d{2}\b/g) || []).concat(text.match(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},\s+\d{4}\b/gi) || [])))
  const addresses = Array.from(new Set((text.match(/\d+\s+[A-Za-z\s]+\s+(?:Street|St|Ave|Avenue|Road|Rd|Boulevard|Blvd|Lane|Ln)\b/gi) || [])))
  return { emails, phones, urls, dates, addresses }
}

const db = new Database(join(process.cwd(), 'epstein-archive.db'))
const args = parseArgs()
const docs = args.docId?.length
  ? db.prepare(`SELECT id, content, metadata_json FROM documents WHERE id IN (${args.docId.map(()=>'?').join(',')})`).all(...args.docId)
  : args.since
  ? db.prepare(`SELECT id, content, metadata_json FROM documents WHERE date_created >= ?`).all(args.since)
  : db.prepare(`SELECT id, content, metadata_json FROM documents`).all()

const updates: { id: number, meta: string }[] = []
for (const d of docs) {
  const base = d.metadata_json ? (()=>{ try { return JSON.parse(d.metadata_json) } catch { return {} } })() : {}
  const text = String(d.content || '')
  const ext = extractAll(text)
  const risk = (ext.emails.length + ext.phones.length + ext.addresses.length) > 5 ? 7 : (ext.emails.length + ext.phones.length) > 2 ? 4 : 1
  const cred = 0.5
  const sens = risk >= 7 ? ['allegation_only'] : []
  const merged = { ...base, emails: ext.emails, phone_numbers: ext.phones, urls: ext.urls, dates: ext.dates, addresses: ext.addresses, evidentiary_risk_score: risk, credibility_score: cred, sensitivity_flags: sens }
  const meta = JSON.stringify(merged)
  if (args.dryRun) {
    console.log(JSON.stringify({ doc_id: d.id, update: merged }))
  } else {
    updates.push({ id: Number(d.id), meta })
  }
}

if (updates.length) {
  const tx = db.transaction((rows: { id: number, meta: string }[]) => { const st = db.prepare(`UPDATE documents SET metadata_json=? WHERE id=?`); for (const r of rows) st.run(r.meta, r.id) })
  tx(updates)
}
try { db.prepare(`INSERT INTO jobs (job_type, payload_json, status, started_at, finished_at) VALUES ('metadata_extract', ?, 'success', datetime('now'), datetime('now'))`).run(JSON.stringify({ since: args.since, docId: args.docId })) } catch {}
console.log(JSON.stringify({ processed: docs.length }))