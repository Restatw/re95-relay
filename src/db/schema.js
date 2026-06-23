// SQLite schema initialisation — runs once on startup
export function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS boards (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      emoji      TEXT,
      created_at INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS posts (
      id          TEXT PRIMARY KEY,
      board       TEXT NOT NULL REFERENCES boards(id),
      thread_id   TEXT NOT NULL,          -- 'root' for OP, parent post id for replies
      name        TEXT NOT NULL DEFAULT 'Anonymous',
      title       TEXT,
      content     TEXT NOT NULL,
      tags        TEXT,                   -- JSON array serialised as string
      media_cid   TEXT,                   -- SHA-256 hex of media file
      created_at  INTEGER NOT NULL,
      display_id  TEXT,                   -- 8-char hex derived from pubkey
      sig         TEXT,                   -- ECDSA P-256 signature hex
      pubkey      TEXT                    -- uncompressed P-256 pubkey hex (65 bytes)
    );

    CREATE INDEX IF NOT EXISTS idx_posts_board     ON posts(board);
    CREATE INDEX IF NOT EXISTS idx_posts_thread    ON posts(thread_id);
    CREATE INDEX IF NOT EXISTS idx_posts_created   ON posts(created_at);
    CREATE INDEX IF NOT EXISTS idx_posts_board_ts  ON posts(board, created_at);

    CREATE TABLE IF NOT EXISTS media (
      cid        TEXT PRIMARY KEY,        -- SHA-256 hex
      mime_type  TEXT NOT NULL,
      size       INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
  `)
}
