import { Router } from 'express'
import { createHash } from 'crypto'
import { createReadStream, existsSync } from 'fs'
import { writeFile } from 'fs/promises'
import path from 'path'
import multer from 'multer'
import { getDb } from '../db/index.js'

const router = Router()

const MEDIA_DIR = process.env.MEDIA_DIR ?? './data/media'
const MAX_MB    = parseInt(process.env.MAX_MEDIA_MB ?? 10, 10)

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/webm', 'video/mp4']
    cb(null, allowed.includes(file.mimetype))
  },
})

// POST /api/media  — upload a file, returns { cid, mimeType, size }
router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no valid file' })

  const buf  = req.file.buffer
  const cid  = createHash('sha256').update(buf).digest('hex')
  const dest = path.join(MEDIA_DIR, cid)

  if (!existsSync(dest)) {
    await writeFile(dest, buf)
    getDb().prepare(`
      INSERT OR IGNORE INTO media (cid, mime_type, size, created_at)
      VALUES (?, ?, ?, ?)
    `).run(cid, req.file.mimetype, buf.length, Date.now())
  }

  res.status(201).json({ cid, mimeType: req.file.mimetype, size: buf.length })
})

// GET /api/media/:cid
router.get('/:cid', (req, res) => {
  const { cid } = req.params
  if (!/^[0-9a-f]{64}$/.test(cid)) return res.status(400).json({ error: 'invalid cid' })

  const row  = getDb().prepare('SELECT mime_type FROM media WHERE cid = ?').get(cid)
  const dest = path.join(MEDIA_DIR, cid)

  if (!row || !existsSync(dest)) return res.status(404).json({ error: 'not found' })

  res.setHeader('Content-Type', row.mime_type)
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
  createReadStream(dest).pipe(res)
})

export default router
