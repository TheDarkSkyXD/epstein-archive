const express = require('express')
const cors = require('cors')
const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const app = express()
const PORT = process.env.PORT || 3012
const DB_PATH = process.env.DB_PATH || '/opt/epstein-archive/epstein-archive.db'
const DATA_PATH = path.join('/opt/epstein-archive', 'data')

app.use(cors())
app.use(express.json())
if (fs.existsSync(DATA_PATH)) {
  app.use('/data', express.static(DATA_PATH))
}

let db
try {
  db = new Database(DB_PATH)
  console.log('Database connected', DB_PATH)
} catch (e) {
  console.error('DB connect error', e)
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', database: db && db.open ? 'connected' : 'disconnected' })
})

app.get('/api/media/albums', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT 
        a.*, 
        COUNT(i.id) AS imageCount,
        ci.path AS coverImagePath
      FROM media_albums a
      LEFT JOIN media_images i ON a.id = i.album_id
      LEFT JOIN media_images ci ON a.cover_image_id = ci.id
      GROUP BY a.id
      ORDER BY a.name
    `)
    const rows = stmt.all()
    res.json(rows)
  } catch (e) {
    console.error('albums error', e)
    res.status(500).json({ error: 'albums failed' })
  }
})

app.get('/api/media/images', (req, res) => {
  try {
    const albumId = req.query.albumId ? parseInt(req.query.albumId) : null
    let sql = "SELECT i.*, a.name AS albumName FROM media_images i LEFT JOIN media_albums a ON i.album_id = a.id"
    if (albumId) { sql += " WHERE i.album_id = " + albumId }
    sql += " ORDER BY i.date_added DESC"
    const rows = db.prepare(sql).all()
    res.json(rows)
  } catch (e) {
    console.error('images error', e)
    res.status(500).json({ error: 'images failed' })
  }
})

app.get('/api/media/albums/:id/images', (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const sql = "SELECT * FROM media_images WHERE album_id = " + id + " ORDER BY date_added DESC"
    const rows = db.prepare(sql).all()
    res.json(rows)
  } catch (e) {
    console.error('album images error', e)
    res.status(500).json({ error: 'album images failed' })
  }
})

app.get('/api/media/images/:id/file', (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const row = db.prepare('SELECT path, file_path, thumbnail_path FROM media_images WHERE id = ?').get(id)
    if (!row) return res.status(404).json({ error: 'Image not found' })
    const p = (row.path || row.file_path || '').toString()
    if (!p) return res.status(404).json({ error: 'Image path missing' })
    const abs = p.startsWith('/data') ? path.join('/opt/epstein-archive', p.replace(/^\/data\//, '')) : p
    if (!fs.existsSync(abs)) return res.status(404).json({ error: 'Image file not found' })
    res.sendFile(abs)
  } catch (e) {
    console.error('image file error', e)
    res.status(500).json({ error: 'image file failed' })
  }
})

app.use((req, res) => { res.status(404).json({ error: 'Endpoint not found', path: req.path }) })

app.listen(PORT, () => { console.log('API started on', PORT) })
