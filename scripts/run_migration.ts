import Database from 'better-sqlite3'
import { readFileSync } from 'fs'
import { join } from 'path'

const db = new Database(join(process.cwd(), 'epstein-archive.db'))
const file = process.argv[2]
if (!file) {
  console.error('Usage: tsx scripts/run_migration.ts <path-to-sql>')
  process.exit(1)
}
const sql = readFileSync(file, 'utf-8')
db.exec(sql)
console.log(`Applied migration: ${file}`)