import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'
import OpenAI from 'openai'
import * as dotenv from 'dotenv'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DB_PATH = path.join(__dirname, '../epstein-archive.db')
const db = new Database(DB_PATH)

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null

const BATCH_SIZE = 25
const DRY_RUN = process.argv.includes('--dry-run')

const docs = db.prepare(
  `SELECT id, file_name, title, content, red_flag_rating FROM documents WHERE red_flag_rating IS NULL LIMIT ?`
).all(DRY_RUN ? 25 : 2314) as Array<{ id: number; file_name: string; title: string; content: string; red_flag_rating: number | null }>

async function rate(doc: { id: number; file_name: string; title: string; content: string }): Promise<number> {
  if (!openai) {
    const text = (doc.content || '').toLowerCase()
    const terms = ['testimony', 'deposition', 'allegation', 'victim', 'minor', 'trafficking', 'abuse', 'assault', 'illegal', 'criminal', 'lawsuit', 'indictment', 'charge']
    const hits = terms.filter(t => text.includes(t)).length
    return Math.min(5, Math.max(1, Math.ceil(hits / 2)))
  }

  const prompt = `Assign a Red Flag rating 1-5 for investigative significance.\n1=minimal, 3=significant, 5=critical.\nTitle: ${doc.title}\nContent: ${(doc.content || '').substring(0, 1500)}`
  try {
    const r = await openai.chat.completions.create({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], temperature: 0.2, max_tokens: 5 })
    const v = parseInt((r.choices[0].message.content || '1').trim())
    return Math.min(5, Math.max(1, isNaN(v) ? 1 : v))
  } catch {
    return 1
  }
}

async function run() {
  const upd = db.prepare(`UPDATE documents SET red_flag_rating = ? WHERE id = ?`)
  let processed = 0
  let errors = 0
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = docs.slice(i, i + BATCH_SIZE)
    for (const d of batch) {
      try {
        const rating = await rate(d)
        if (!DRY_RUN) upd.run(rating, d.id)
        processed++
      } catch {
        errors++
      }
    }
    if (openai && i + BATCH_SIZE < docs.length) await new Promise(r => setTimeout(r, 800))
  }
  if (!DRY_RUN) {
    const dist = db.prepare(
      `SELECT red_flag_rating AS r, COUNT(*) AS c FROM documents WHERE red_flag_rating IS NOT NULL GROUP BY red_flag_rating ORDER BY red_flag_rating`
    ).all() as Array<{ r: number; c: number }>
    console.log(JSON.stringify({ processed, errors, distribution: dist }))
  } else {
    console.log(JSON.stringify({ processed, errors }))
  }
}

run().then(() => process.exit(0)).catch(() => process.exit(1))