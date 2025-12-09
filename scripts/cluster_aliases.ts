import Database from 'better-sqlite3'
import { join } from 'path'

type Args = { threshold?: number; dryRun?: boolean }
function parseArgs(): Args { const a: Args = {}; for (const s of process.argv.slice(2)) { if (s.startsWith('--threshold=')) a.threshold = Number(s.split('=')[1]); else if (s === '--dry-run') a.dryRun = true } return a }

function normalizeName(n: string): string { return n.trim().toLowerCase().replace(/[^a-z\s]/g,'').replace(/\s+/g,' ').trim() }

function jaroWinkler(a: string, b: string): number {
  const m = Math.floor(Math.max(a.length, b.length) / 2) - 1
  const mtA: boolean[] = Array(a.length).fill(false)
  const mtB: boolean[] = Array(b.length).fill(false)
  let matches = 0
  for (let i = 0; i < a.length; i++) {
    const start = Math.max(0, i - m)
    const end = Math.min(b.length - 1, i + m)
    for (let j = start; j <= end; j++) {
      if (!mtB[j] && a[i] === b[j]) { mtA[i] = true; mtB[j] = true; matches++; break }
    }
  }
  if (matches === 0) return 0
  let t = 0
  let k = 0
  for (let i = 0; i < a.length; i++) {
    if (mtA[i]) { while (!mtB[k]) k++; if (a[i] !== b[k]) t++; k++ }
  }
  const jaro = (matches / a.length + matches / b.length + (matches - t / 2) / matches) / 3
  let l = 0
  for (; l < Math.min(4, Math.min(a.length, b.length)); l++) { if (a[l] !== b[l]) break }
  return jaro + l * 0.1 * (1 - jaro)
}

const db = new Database(join(process.cwd(), 'epstein-archive.db'))
const args = parseArgs()
const threshold = typeof args.threshold === 'number' ? args.threshold : 0.9
const entities = db.prepare(`SELECT id, full_name FROM entities`).all() as { id: number, full_name: string }[]
const buckets = new Map<string, { id: number, name: string }[]>()
for (const e of entities) { const n = normalizeName(e.full_name); if (!n) continue; const parts = n.split(' '); const key = `${n[0] || ''}|${(parts[parts.length-1]||'').slice(0,3)}|${Math.ceil(n.length/5)}`; const arr = buckets.get(key) || []; arr.push({ id: e.id, name: n }); buckets.set(key, arr) }

const merges: { src: number, dst: number, score: number }[] = []
for (const [, arr] of buckets.entries()) {
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      const s = jaroWinkler(arr[i].name, arr[j].name)
      if (s >= threshold) { const src = Math.min(arr[i].id, arr[j].id); const dst = Math.max(arr[i].id, arr[j].id); merges.push({ src, dst, score: Number(s.toFixed(4)) }) }
    }
  }
}

console.log(JSON.stringify({ buckets: buckets.size, candidates: merges.length }))

if (args.dryRun) {
  for (const m of merges.slice(0, 100)) console.log(JSON.stringify({ propose: m }))
  process.exit(0)
}

const tx = db.transaction((ops: { src: number, dst: number, score: number }[]) => {
  const up = db.prepare(`INSERT INTO merge_log (src_id, dst_id, reason, score) VALUES (?, ?, 'alias_cluster', ?)`)
  for (const m of ops) up.run(m.src, m.dst, m.score)
})
tx(merges)
console.log(JSON.stringify({ merges: merges.length }))
try { db.prepare(`INSERT INTO jobs (job_type, payload_json, status, started_at, finished_at) VALUES ('alias_cluster', ?, 'success', datetime('now'), datetime('now'))`).run(JSON.stringify({ threshold })) } catch {}