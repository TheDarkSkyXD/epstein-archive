import Database from 'better-sqlite3'
import { join } from 'path'
import { readdirSync, statSync, readFileSync } from 'fs'
import pdf from 'pdf-parse'

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

function cleanContent(content: string) {
  const lines = content.split(/\r?\n/)
  const filtered = lines.filter(l => !/This text file has been created by the free version of Textify on macOS/i.test(l))
  return filtered.join('\n')
}

function deriveMeta(filePath: string, content: string) {
  const source_collection = filePath.includes('/Epstein Estate Documents') ? 'Epstein Estate Documents' : 'uploads'
  const watermark = /Textify on macOS/i.test(content)
  const word_count = (content.match(/\b[\w']+\b/g) || []).length
  return { source_collection, ocr_tool: watermark ? 'textify' : null, content_hash: null, word_count }
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

async function run() {
  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO documents (
      file_name, file_path, file_type, file_size, date_created,
      content, metadata_json, word_count, spice_rating, evidence_type
    ) VALUES (
      @file_name, @file_path, @file_type, @file_size, @date_created,
      @content, @metadata_json, @word_count, @spice_rating, @evidence_type
    )`)

  let imported = 0
  const tx = db.transaction(async (files: string[]) => {
    for (const fp of files) {
      const st = statSync(fp)
      const file_name = fp.split('/').pop() || fp
      const file_type = (file_name.split('.').pop() || 'txt').toLowerCase()
      const raw = await readFileContent(fp)
      const content = cleanContent(raw)
      const meta = deriveMeta(fp, raw)
      insertStmt.run({
        file_name,
        file_path: fp,
        file_type,
        file_size: st.size,
        date_created: new Date(st.birthtime || st.mtime).toISOString(),
        content,
        metadata_json: JSON.stringify(meta),
        word_count: meta.word_count,
        spice_rating: 0,
        evidence_type: 'document'
      })
      imported++
      if (imported % 200 === 0) process.stdout.write('.')
    }
  })

  const allFiles = Array.from(walk(DATA_ROOT)).filter(p => /\.(txt|rtf|md|pdf)$/i.test(p))
  await tx(allFiles)
  console.log(`\nFS ingest complete. Imported: ${imported}`)
  db.close()
}

run().catch(err => { console.error(err); process.exit(1) })

