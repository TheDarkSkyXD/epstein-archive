import { join } from 'path'
import { readdirSync, statSync } from 'fs'
import Database from 'better-sqlite3'

const DB_PATH = process.env.DB_PATH || join(process.cwd(), 'epstein-archive.db')
const DATA_ROOT = process.env.DATA_ROOT || '/opt/epstein-archive/data'
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

const files = Array.from(walk(DATA_ROOT)).filter(p => /\.(txt|rtf|md|pdf)$/i.test(p))
const totalFs = files.length
const totalDocs = db.prepare('SELECT COUNT(*) AS c FROM documents').get().c as number
const missing = db.prepare('SELECT COUNT(*) AS c FROM documents WHERE content LIKE ?').get('%Textify%').c as number
const types = db.prepare('SELECT evidence_type, COUNT(*) AS c FROM documents GROUP BY evidence_type').all() as any[]
const catsSample = db.prepare("SELECT json_extract(metadata_json,'$.categories') AS cats, COUNT(*) AS c FROM documents GROUP BY cats ORDER BY c DESC LIMIT 10").all() as any[]
const headersSample = db.prepare("SELECT id, json_extract(metadata_json,'$.emailHeaders.subject') AS subj FROM documents WHERE evidence_type='email' AND subj IS NOT NULL LIMIT 5").all() as any[]

console.log('FS files:', totalFs)
console.log('DB documents:', totalDocs)
console.log('Watermark occurrences (should be 0):', missing)
console.log('Evidence types:', types)
console.log('Top categories:', catsSample)
console.log('Email subjects sample:', headersSample)

db.close()

