import Database from 'better-sqlite3'
import { join } from 'path'

const DB_PATH = process.env.DB_PATH || join(process.cwd(), 'epstein-archive.db')
const db = new Database(DB_PATH)

const u = db.prepare('SELECT id, evidence_type, content, metadata_json, file_name FROM documents').all() as any[]
const upd = db.prepare('UPDATE documents SET metadata_json = ? WHERE id = ?')

function parseEmail(content: string) {
  const first = content.split('\n').slice(0, 60).join('\n')
  const m = {
    from: first.match(/^from:\s*(.+)$/im)?.[1]?.trim() || null,
    to: first.match(/^to:\s*(.+)$/im)?.[1]?.trim() || null,
    cc: first.match(/^cc:\s*(.+)$/im)?.[1]?.trim() || null,
    subject: first.match(/^subject:\s*(.+)$/im)?.[1]?.trim() || null,
    date: first.match(/^(sent|date):\s*(.+)$/im)?.[2]?.trim() || null
  }
  return { emailHeaders: m }
}

function parseLegal(content: string) {
  const first = content.split('\n').slice(0, 120).join('\n')
  const caseNumber = first.match(/case\s*no\.?\s*([A-Za-z0-9\-:\/]+)/i)?.[1] || null
  const caseTitle = first.match(/([A-Z][A-Za-z\s\.]+)\s+v\.\s+([A-Z][A-Za-z\s\.]+)/)?.[0] || null
  const jurisdiction = first.match(/in the\s+(.+?)\s+court/i)?.[1] || null
  const courtName = first.match(/court\s+of\s+([A-Za-z\s]+)/i)?.[1] || null
  const filingDate = first.match(/filed\s+on\s+([A-Za-z0-9,\s\/\-]+)/i)?.[1] || null
  const documentType = first.match(/(complaint|indictment|motion|order|subpoena|exhibit|transcript)/i)?.[1]?.toLowerCase() || null
  return { legal: { caseTitle, caseNumber, jurisdiction, courtName, documentType, filingDate } }
}

let updated = 0
db.transaction(() => {
  for (const r of u) {
    let meta: any = {}
    try { meta = r.metadata_json ? JSON.parse(r.metadata_json) : {} } catch {}
    if (r.evidence_type === 'email') {
      const add = parseEmail(String(r.content||''))
      meta = { ...meta, ...add }
    } else if (r.evidence_type === 'legal_document') {
      const add = parseLegal(String(r.content||''))
      meta = { ...meta, ...add }
    }
    upd.run(JSON.stringify(meta), r.id)
    updated++
  }
})()

console.log(`Structured fields updated for ${updated} documents.`)
db.close()

