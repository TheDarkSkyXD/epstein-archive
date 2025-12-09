import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DB_PATH = path.join(__dirname, '../epstein-archive.db')
const db = new Database(DB_PATH)

const DATE_REGEXES = [
  /\b(19|20)\d{2}-\d{2}-\d{2}\b/g,
  /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g,
  /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+(19|20)\d{2}\b/gi
]

const ORG_WORDS = ['Inc', 'LLC', 'Corp', 'Corporation', 'Company', 'Co.', 'Ltd', 'Foundation', 'Institute', 'Bank', 'University', 'College', 'Department', 'Agency']
const LOCATION_WORDS = ['Island', 'Beach', 'City', 'County', 'State', 'Country', 'Street', 'Avenue', 'Road', 'Boulevard', 'Plaza', 'Square', 'Park']

function detectType(fn: string, content: string): string {
  const t = content || ''
  if (t.includes('From:') && t.includes('To:')) return 'email'
  if (t.includes('DEPOSITION') || (t.includes('Q:') && t.includes('A:'))) return 'deposition'
  if (fn.toUpperCase().includes('FLIGHT') || t.includes('PASSENGER')) return 'flight_log'
  if (t.includes('Agreement') || t.includes('Contract')) return 'legal'
  return 'document'
}

function extractKeywords(text: string, n = 12): string[] {
  const common = new Set(['the','and','for','with','from','that','this','have','was','were','been','has','shall','hereby','thereof'])
  const words = (text || '').toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(w => w.length > 3 && !common.has(w))
  const uniq = Array.from(new Set(words))
  return uniq.slice(0, n)
}

function extractDates(text: string): string[] {
  const out: string[] = []
  for (const rx of DATE_REGEXES) {
    const m = (text || '').match(rx)
    if (m) out.push(...m)
  }
  return Array.from(new Set(out))
}

function extractLocations(text: string): string[] {
  const t = text || ''
  const hits = LOCATION_WORDS.filter(w => t.includes(w))
  return Array.from(new Set(hits))
}

function extractOrganizations(text: string): string[] {
  const t = text || ''
  const hits = ORG_WORDS.filter(w => t.includes(w))
  return Array.from(new Set(hits))
}

function run() {
  const rows = db.prepare(`SELECT id, file_name, content, evidence_type, metadata_json FROM documents`).all() as Array<{ id: number; file_name: string; content: string; evidence_type: string | null; metadata_json: string | null }>
  const upd = db.prepare(`UPDATE documents SET evidence_type = COALESCE(?, evidence_type), metadata_json = ? WHERE id = ?`)
  const tx = db.transaction((items: Array<{ id: number; fn: string; content: string; prevMeta: string | null; prevEvidence: string | null }>) => {
    for (const it of items) {
      const docType = detectType(it.fn, it.content)
      const keywords = extractKeywords(it.content)
      const dates = extractDates(it.content)
      const locations = extractLocations(it.content)
      const orgs = extractOrganizations(it.content)
      const meta = { keywords, dates, locations, organizations: orgs }
      const metaStr = JSON.stringify(meta)
      const evidence = docType === 'deposition' ? 'legal' : docType === 'flight_log' ? 'travel' : docType === 'email' ? 'communication' : 'document'
      upd.run(evidence, metaStr, it.id)
    }
  })
  const items = rows.map(r => ({ id: r.id, fn: r.file_name, content: r.content || '', prevMeta: r.metadata_json, prevEvidence: r.evidence_type }))
  tx(items)
  const stats = { updated: items.length }
  console.log(JSON.stringify(stats))
}

run()