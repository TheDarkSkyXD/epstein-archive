import Database from 'better-sqlite3'
import path from 'path'

const dbPath = path.join(process.cwd(), 'epstein-archive.db')
const db = new Database(dbPath)

const prefixLocal = '/Users/veland/Downloads/Epstein Files/data/media/images'
const prefixThumbLocal = '/Users/veland/Downloads/Epstein Files/data/media/thumbnails'
const webPrefix = '/data/media/images'
const webThumbPrefix = '/data/media/thumbnails'

const rows = db.prepare('SELECT id, path, thumbnail_path FROM media_images').all() as { id: number, path: string, thumbnail_path?: string }[]
let updated = 0
const updateStmt = db.prepare("UPDATE media_images SET path = ?, thumbnail_path = ?, date_modified = datetime('now') WHERE id = ?")

db.transaction(() => {
  for (const r of rows) {
    let p = r.path
    let t = r.thumbnail_path || null
    if (p && p.startsWith(prefixLocal)) {
      p = p.replace(prefixLocal, webPrefix)
    }
    if (t && t.startsWith(prefixThumbLocal)) {
      t = t.replace(prefixThumbLocal, webThumbPrefix)
    }
    if (p !== r.path || t !== r.thumbnail_path) {
      updateStmt.run(p, t, r.id)
      updated++
    }
  }
})()

console.log(`Normalized media paths for ${updated} images`) 
db.close()
