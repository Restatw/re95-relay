import { WebSocketServer } from 'ws'

// board → Set<WebSocket>
const subs = new Map()
// all connected sockets
const all = new Set()

export function createWss(server) {
  const wss = new WebSocketServer({ server, path: '/ws' })

  wss.on('connection', ws => {
    all.add(ws)

    ws.on('message', raw => {
      let msg
      try { msg = JSON.parse(raw) } catch { return }

      // { type: 'subscribe', board: 'b' }
      if (msg.type === 'subscribe' && msg.board) {
        if (!subs.has(msg.board)) subs.set(msg.board, new Set())
        subs.get(msg.board).add(ws)
      }

      // { type: 'unsubscribe', board: 'b' }
      if (msg.type === 'unsubscribe' && msg.board) {
        subs.get(msg.board)?.delete(ws)
      }

      // { type: 'ping' } → pong
      if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }))
      }
    })

    ws.on('close', () => {
      all.delete(ws)
      for (const set of subs.values()) set.delete(ws)
    })

    ws.send(JSON.stringify({ type: 'hello', serverTime: Date.now() }))
  })

  return wss
}

// Push event to all subscribers of a board (or all if no board in payload)
export function broadcast(event) {
  const data = JSON.stringify(event)
  const board = event.payload?.board

  if (board && subs.has(board)) {
    for (const ws of subs.get(board)) {
      if (ws.readyState === 1) ws.send(data)
    }
  } else {
    for (const ws of all) {
      if (ws.readyState === 1) ws.send(data)
    }
  }
}
