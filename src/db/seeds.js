// Default boards matching the frontend boardsStore.js
export const DEFAULT_BOARDS = [
  { id: 'b',       name: '隨機',     emoji: null, created_at: 0 },
  { id: 'img',     name: '圖片',     emoji: null, created_at: 1 },
  { id: 'tech',    name: '技術',     emoji: null, created_at: 2 },
  { id: 'prog',    name: '程式',     emoji: null, created_at: 3 },
  { id: 'ani',     name: '動漫',     emoji: null, created_at: 4 },
  { id: 'comic',   name: '漫畫',     emoji: null, created_at: 5 },
  { id: 'moe',     name: '萌',       emoji: null, created_at: 6 },
  { id: 'gam',     name: '遊戲',     emoji: null, created_at: 7 },
  { id: 'vn',      name: '視覺小說', emoji: null, created_at: 8 },
  { id: 'mu',      name: '音樂',     emoji: null, created_at: 9 },
  { id: 'tv',      name: '影視',     emoji: null, created_at: 10 },
  { id: 'sp',      name: '運動',     emoji: null, created_at: 11 },
  { id: 'news',    name: '新聞',     emoji: null, created_at: 12 },
  { id: 'pol',     name: '政治',     emoji: null, created_at: 13 },
  { id: 'fin',     name: '財經',     emoji: null, created_at: 14 },
  { id: 'crypto',  name: '加密貨幣', emoji: null, created_at: 15 },
  { id: 'sci',     name: '科學',     emoji: null, created_at: 16 },
  { id: 'space',   name: '太空',     emoji: null, created_at: 17 },
  { id: 'his',     name: '歷史',     emoji: null, created_at: 18 },
  { id: 'lang',    name: '語言',     emoji: null, created_at: 19 },
  { id: 'edu',     name: '教育',     emoji: null, created_at: 20 },
  { id: 'law',     name: '法律',     emoji: null, created_at: 21 },
  { id: 'art',     name: '藝術',     emoji: null, created_at: 22 },
  { id: 'design',  name: '設計',     emoji: null, created_at: 23 },
  { id: 'photo',   name: '攝影',     emoji: null, created_at: 24 },
  { id: 'food',    name: '美食',     emoji: null, created_at: 25 },
  { id: 'fit',     name: '健身',     emoji: null, created_at: 26 },
  { id: 'med',     name: '醫療',     emoji: null, created_at: 27 },
  { id: 'travel',  name: '旅遊',     emoji: null, created_at: 28 },
  { id: 'pet',     name: '寵物',     emoji: null, created_at: 29 },
  { id: 'car',     name: '汽車',     emoji: null, created_at: 30 },
  { id: 'fashion', name: '時尚',     emoji: null, created_at: 31 },
  { id: 'diy',     name: '手作',     emoji: null, created_at: 32 },
  { id: 'arch',    name: '建築',     emoji: null, created_at: 33 },
  { id: 'env',     name: '環保',     emoji: null, created_at: 34 },
  { id: 'lit',     name: '文學',     emoji: null, created_at: 35 },
  { id: 'cos',     name: 'Cosplay',  emoji: null, created_at: 36 },
]

export function seedBoards(db) {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO boards (id, name, emoji, created_at)
    VALUES (@id, @name, @emoji, @created_at)
  `)
  const seedAll = db.transaction(boards => {
    for (const b of boards) insert.run(b)
  })
  seedAll(DEFAULT_BOARDS)
}
