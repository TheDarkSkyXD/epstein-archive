import { join, basename } from 'path'
import { mkdirSync, existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'fs'

const EXTERNAL_ROOT = process.env.EXTERNAL_DATA_ROOT || join(process.cwd(), '..', 'data')
const SRC_DIR = join(EXTERNAL_ROOT, 'public', 'data')
const DEST_DIR = join(process.cwd(), 'public', 'data')

function ensureDir(p: string) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true })
}

function copyFile(src: string, dest: string) {
  const buf = readFileSync(src)
  writeFileSync(dest, buf)
}

function sync() {
  ensureDir(DEST_DIR)
  const peopleSrc = join(SRC_DIR, 'people.json')
  if (existsSync(peopleSrc)) copyFile(peopleSrc, join(DEST_DIR, 'people.json'))
  const evSrc = join(SRC_DIR, 'evidence')
  const evDest = join(DEST_DIR, 'evidence')
  ensureDir(evDest)
  if (existsSync(evSrc)) {
    const files = readdirSync(evSrc)
    for (const f of files) {
      const p = join(evSrc, f)
      if (statSync(p).isFile() && f.toLowerCase().endsWith('.json')) {
        copyFile(p, join(evDest, basename(f)))
      }
    }
  }
  process.stdout.write('External JSON synchronized.')
}

sync()

