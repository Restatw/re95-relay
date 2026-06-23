import Database from 'better-sqlite3'
import { initSchema } from './schema.js'
import { seedBoards } from './seeds.js'

let _db = null

export function getDb(path = process.env.DB_PATH ?? './data/relay.db') {
  if (_db) return _db
  _db = new Database(path)
  _db.pragma('journal_mode = WAL')
  _db.pragma('foreign_keys = ON')
  initSchema(_db)
  seedBoards(_db)
  return _db
}
