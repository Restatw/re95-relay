# re95-relay — CLAUDE.md

Backend relay node for the **re95** anonymous imageboard PWA (`re95.org`).  
Provides REST API + WebSocket sync so PWA clients share posts across devices.

## Commands

```bash
npm run dev     # node --watch (hot-reload, no transpile needed)
npm start       # production

curl http://localhost:3001/api/health
```

No test runner yet. Smoke-test with curl or the frontend dev server.

## Stack

| Layer | Tech |
|---|---|
| Runtime | Node.js ≥ 20 (ESM) |
| HTTP server | Express 5 |
| WebSocket | ws (native, no Socket.IO) |
| Database | better-sqlite3 (WAL mode) |
| Media upload | multer (memory storage → write by CID) |
| CORS | cors middleware |
| Env | dotenv (`cp .env.example .env`) |

## Directory Layout

```
src/
  index.js          ← entry point — Express + HTTP server + WS mount
  db/
    index.js        ← singleton DB connection, lazy init
    schema.js       ← CREATE TABLE statements
    seeds.js        ← default boards (mirrors frontend boardsStore.js)
  routes/
    boards.js       ← GET /api/boards, POST /api/boards
    posts.js        ← GET /api/boards/:board/threads
                       GET /api/threads/:id
                       GET /api/sync?since=<ms>
                       POST /api/posts  (Turnstile + ECDSA verify)
    media.js        ← POST /api/media (upload)
                       HEAD /api/media/:cid (existence check)
                       GET  /api/media/:cid (serve)
  ws/
    hub.js          ← WebSocket server; subscribe/unsubscribe by board; broadcast()
  middleware/
    verify.js       ← optional ECDSA P-256 sig verification (skipped if no sig)
data/
  relay.db          ← SQLite (git-ignored)
  media/            ← raw files named by SHA-256 CID (git-ignored)
```

## API Reference

### REST

```
GET  /api/health
GET  /api/boards
POST /api/boards                          body: { id, name, emoji? }
GET  /api/boards/:board/threads?page=1&limit=20
GET  /api/threads/:id
GET  /api/sync?since=<unixMs>&board=<id>  returns up to 500 posts
POST /api/posts                           body: Post + cfToken
POST /api/media                           multipart/form-data field: file
HEAD /api/media/:cid
GET  /api/media/:cid
```

### WebSocket `/ws`

Client sends JSON frames:
```json
{ "type": "subscribe",   "board": "b" }
{ "type": "unsubscribe", "board": "b" }
{ "type": "ping" }
```

Server pushes:
```json
{ "type": "hello", "serverTime": 1234567890000 }
{ "type": "pong" }
{ "type": "post",  "payload": <Post> }
```

## Post Schema

```js
{
  id:        string    // 16-char hex, client-generated
  board:     string    // board slug e.g. 'b'
  threadId:  string    // 'root' for OP, parent post id for replies
  name:      string    // defaults to 'Anonymous'
  title:     string|null
  content:   string
  tags:      string[]|null
  mediaCid:  string|null   // SHA-256 hex (CID)
  createdAt: number        // Unix ms
  displayId: string|null   // 8-char hex from pubkey hash
  sig:       string|null   // ECDSA P-256 signature hex
  pubkey:    string|null   // uncompressed P-256 pubkey hex (65 bytes)
}
```

## Bot Protection (Cloudflare Turnstile)

`POST /api/posts` validates a Turnstile token before accepting posts.

- Frontend sends `cfToken` in the request body alongside the post
- Relay verifies with `https://challenges.cloudflare.com/turnstile/v0/siteverify`
- If `TURNSTILE_SECRET` is not set, verification is skipped (dev mode)
- Invalid token → 403

## Identity / Signature Verification

- Client may optionally attach `displayId`, `sig`, `pubkey` to a post
- Relay verifies: `sig` = ECDSA-P256(SHA-256, privkey, JSON({ id, content }))
- Posts without sig are accepted as anonymous
- If sig is present but invalid → 403

## Media / CID

- CID = SHA-256 hex of raw file bytes
- Files stored flat in `data/media/<cid>` (no extension)
- MIME type tracked in the `media` SQLite table
- Served with `Cache-Control: immutable` — content-addressed, safe to cache forever
- `HEAD /api/media/:cid` lets the frontend check existence before uploading

## Environment Variables

See `.env.example`. Copy to `.env` before running:

```
PORT=3001
HOST=127.0.0.1
CORS_ORIGINS=https://re95.org,http://localhost:5173
DB_PATH=/home/pi/re95-relay/data/relay.db
MEDIA_DIR=/home/pi/re95-relay/data/media
MAX_MEDIA_MB=10
RELAY_SECRET=change-me       # reserved for relay-to-relay auth
TURNSTILE_SECRET=            # Cloudflare Turnstile secret key; leave empty to disable
```

## Planned Phases

| Phase | Status | Notes |
|---|---|---|
| 1 — Core API + DB | ✅ done | Express, SQLite, boards/posts/sync routes |
| 2 — Media system | ✅ done | CID upload/serve, MIME filter, size limit, HEAD check |
| 3 — WebSocket push | ✅ done | board subscriptions, broadcast on POST |
| 4 — Sig verification | ✅ done | ECDSA P-256 via Node webcrypto |
| 5 — Production deploy | ✅ done | systemd unit, nginx proxy on re95.org |
| 6 — Frontend useSync.js | ✅ done | Vue composable: WS push + delta pull + media back-fill |
| 7 — Bot protection | ✅ done | Cloudflare Turnstile on POST /api/posts |
| 8 — Relay-to-relay sync | 🔲 todo | Pull from peer relays on connect; JWT/secret auth |

## Production (systemd)

Node is installed via nvm — use the full path in the service file:

```ini
# /etc/systemd/system/re95-relay.service
[Unit]
Description=re95 relay node
After=network.target

[Service]
User=pi
WorkingDirectory=/home/pi/re95-relay
EnvironmentFile=/home/pi/re95-relay/.env
ExecStart=/home/pi/.nvm/versions/node/v20.20.2/bin/node src/index.js
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now re95-relay
sudo journalctl -u re95-relay -f
```
