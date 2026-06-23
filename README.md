# re95-relay

WebSocket + REST relay backend for the [re95](https://chan.re95.org) anonymous imageboard PWA.

Clients write posts locally to IndexedDB first; this relay syncs them across devices in real time.

## Stack

| Layer | Tech |
|---|---|
| Runtime | Node.js ≥ 20 (ESM) |
| HTTP | Express 5 |
| WebSocket | ws |
| Database | better-sqlite3 (WAL mode) |
| Media upload | multer |

## Quick Start

```bash
cp .env.example .env   # edit values
npm install
npm run dev            # hot-reload via node --watch
```

```bash
curl http://localhost:3001/api/health
```

## Environment Variables

```
PORT=3001
HOST=127.0.0.1
CORS_ORIGINS=https://chan.re95.org,http://localhost:5173
DB_PATH=/absolute/path/to/data/relay.db
MEDIA_DIR=/absolute/path/to/data/media
MAX_MEDIA_MB=10
RELAY_SECRET=change-me
```

Copy `.env.example` to `.env` — the `data/` directory is git-ignored and created automatically on first run.

## API

```
GET  /api/health
GET  /api/boards
POST /api/boards                          { id, name, emoji? }
GET  /api/boards/:board/threads
GET  /api/threads/:id
GET  /api/sync?since=<unixMs>&board=<id>  delta pull, up to 500 posts
POST /api/posts
POST /api/media                           multipart/form-data field: file
HEAD /api/media/:cid
GET  /api/media/:cid
```

## WebSocket `/ws`

```json
// client → server
{ "type": "subscribe",   "board": "b" }
{ "type": "unsubscribe", "board": "b" }
{ "type": "ping" }

// server → client
{ "type": "hello", "serverTime": 1234567890000 }
{ "type": "pong" }
{ "type": "post",  "payload": { ...post } }
```

## Media

Files are content-addressed by SHA-256 of the raw bytes (CID). Stored flat in `MEDIA_DIR/<cid>`. Served with `Cache-Control: immutable`.

## Production (systemd)

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

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now re95-relay
sudo journalctl -u re95-relay -f
```

## nginx Proxy

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

location /ws {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";
    proxy_read_timeout 86400;
}
```
