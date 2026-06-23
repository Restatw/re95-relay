import { Router } from 'express'
import { getDb } from '../db/index.js'

const router = Router()

// GET /api/boards
router.get('/', (_req, res) => {
  const boards = getDb().prepare('SELECT * FROM boards ORDER BY created_at').all()
  res.json(boards)
})

// POST /api/boards  (create custom board)
router.post('/', (req, res) => {
  const { id, name, emoji } = req.body ?? {}
  const slug = (id ?? '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
  if (!slug)         return res.status(400).json({ error: 'invalid id' })
  if (!name?.trim()) return res.status(400).json({ error: 'name required' })

  const db = getDb()
  if (db.prepare('SELECT 1 FROM boards WHERE id = ?').get(slug)) {
    return res.status(409).json({ error: `/${slug}/ already exists` })
  }
  const board = { id: slug, name: name.trim(), emoji: emoji?.trim() || null, created_at: Date.now() }
  db.prepare('INSERT INTO boards (id, name, emoji, created_at) VALUES (@id, @name, @emoji, @created_at)').run(board)
  res.status(201).json(board)
})

export default router
