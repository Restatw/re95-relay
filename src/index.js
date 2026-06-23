import 'dotenv/config'
import http from 'http'
import express from 'express'
import cors from 'cors'
import { mkdirSync } from 'fs'
import { getDb } from './db/index.js'
import { createWss } from './ws/hub.js'
import boardsRouter from './routes/boards.js'
import postsRouter  from './routes/posts.js'
import mediaRouter  from './routes/media.js'

const PORT      = parseInt(process.env.PORT ?? 3001, 10)
const HOST      = process.env.HOST ?? '0.0.0.0'
const MEDIA_DIR = process.env.MEDIA_DIR ?? './data/media'

const origins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
  .split(',').map(s => s.trim())

mkdirSync(MEDIA_DIR, { recursive: true })

const app = express()

app.use(cors({ origin: origins, credentials: true }))
app.use(express.json({ limit: '1mb' }))

app.use('/api/boards',  boardsRouter)
app.use('/api',         postsRouter)
app.use('/api/media',   mediaRouter)

app.get('/api/health', (_req, res) => {
  const db = getDb()
  const { post_count } = db.prepare('SELECT COUNT(*) AS post_count FROM posts').get()
  res.json({ status: 'ok', post_count, ts: Date.now() })
})

const server = http.createServer(app)
createWss(server)

server.listen(PORT, HOST, () => {
  console.log(`re95-relay listening on ${HOST}:${PORT}`)
  // warm up DB connection
  getDb()
})
