import { Router } from 'express'
import { getDb } from '../db/index.js'
import { broadcast } from '../ws/hub.js'
import { verifyPost } from '../middleware/verify.js'

const router = Router()

async function verifyTurnstile(req, res, next) {
  const secret = process.env.TURNSTILE_SECRET
  if (!secret) return next()

  const token = req.body?.cfToken
  if (!token) return res.status(400).json({ error: 'missing verification token' })

  const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret,
      response: token,
      remoteip: req.headers['cf-connecting-ip'] || req.ip,
    }),
  })
  const data = await resp.json()
  if (!data.success) return res.status(403).json({ error: 'bot verification failed' })
  next()
}

function deserialise(row) {
  if (!row) return null
  return { ...row, tags: row.tags ? JSON.parse(row.tags) : null }
}

// GET /api/boards/:board/threads?page=1&limit=20
router.get('/boards/:board/threads', (req, res) => {
  const { board } = req.params
  const limit  = Math.min(parseInt(req.query.limit  ?? 20, 10), 100)
  const offset = Math.max(parseInt(req.query.page   ?? 1,  10) - 1, 0) * limit

  const db = getDb()
  if (!db.prepare('SELECT 1 FROM boards WHERE id = ?').get(board)) {
    return res.status(404).json({ error: 'board not found' })
  }

  const ops = db.prepare(`
    SELECT * FROM posts
    WHERE board = ? AND thread_id = 'root'
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(board, limit, offset)

  const threads = ops.map(op => {
    const replies = db.prepare(`
      SELECT * FROM posts WHERE board = ? AND thread_id = ?
      ORDER BY created_at ASC
    `).all(board, op.id)
    return {
      ...deserialise(op),
      replyCount: replies.length,
      previewReplies: replies.slice(-5).map(deserialise),
    }
  })

  res.json(threads)
})

// GET /api/threads/:id
router.get('/threads/:id', (req, res) => {
  const db = getDb()
  const op = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id)
  if (!op) return res.status(404).json({ error: 'thread not found' })

  const replies = db.prepare(`
    SELECT * FROM posts WHERE thread_id = ? ORDER BY created_at ASC
  `).all(op.id)

  res.json({ op: deserialise(op), replies: replies.map(deserialise) })
})

// GET /api/sync?since=<ms>[&board=<id>]
router.get('/sync', (req, res) => {
  const since = parseInt(req.query.since ?? 0, 10)
  const board = req.query.board

  const db = getDb()
  let stmt, args

  if (board) {
    stmt = db.prepare('SELECT * FROM posts WHERE board = ? AND created_at > ? ORDER BY created_at ASC LIMIT 500')
    args = [board, since]
  } else {
    stmt = db.prepare('SELECT * FROM posts WHERE created_at > ? ORDER BY created_at ASC LIMIT 500')
    args = [since]
  }

  res.json(stmt.all(...args).map(deserialise))
})

// POST /api/posts
router.post('/posts', verifyTurnstile, verifyPost, (req, res) => {
  const { id, board, threadId, name, title, content, tags, mediaCid, createdAt, displayId, sig, pubkey } = req.body ?? {}

  if (!id || !board || (!content?.trim() && !mediaCid)) {
    return res.status(400).json({ error: 'id and board required; content or image required' })
  }

  const db = getDb()
  if (!db.prepare('SELECT 1 FROM boards WHERE id = ?').get(board)) {
    return res.status(404).json({ error: 'board not found' })
  }
  if (db.prepare('SELECT 1 FROM posts WHERE id = ?').get(id)) {
    return res.status(409).json({ error: 'post id already exists' })
  }

  const post = {
    id,
    board,
    thread_id:  threadId ?? 'root',
    name:       (name?.trim() || 'Anonymous'),
    title:      title?.trim() || null,
    content:    content?.trim() ?? '',
    tags:       tags?.length ? JSON.stringify(tags) : null,
    media_cid:  mediaCid ?? null,
    created_at: createdAt ?? Date.now(),
    display_id: displayId ?? null,
    sig:        sig ?? null,
    pubkey:     pubkey ?? null,
  }

  db.prepare(`
    INSERT INTO posts (id, board, thread_id, name, title, content, tags, media_cid, created_at, display_id, sig, pubkey)
    VALUES (@id, @board, @thread_id, @name, @title, @content, @tags, @media_cid, @created_at, @display_id, @sig, @pubkey)
  `).run(post)

  const out = { ...req.body, threadId: post.thread_id, mediaCid: post.media_cid, createdAt: post.created_at }
  broadcast({ type: 'post', payload: out })
  res.status(201).json(out)
})

export default router
