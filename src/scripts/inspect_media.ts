import Database from 'better-sqlite3'
import path from 'path'

const db = new Database(path.join(process.cwd(), 'epstein-archive.db'))
const row = db.prepare('SELECT COUNT(*) as cnt, MAX(id) as maxId FROM media_images').get() as any
const latest = db.prepare('SELECT id, filename, path, date_added FROM media_images ORDER BY id DESC LIMIT 3').all() as any[]
console.log('media_images count:', row?.cnt)
console.log('latest images:', latest)
db.close()

