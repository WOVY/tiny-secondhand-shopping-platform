const db = require('../config/db');

function create({ roomId, senderId, content }) {
  const result = db
    .prepare('INSERT INTO messages (room_id, sender_id, content) VALUES (?, ?, ?)')
    .run(roomId, senderId, content);
  return db.prepare('SELECT * FROM messages WHERE id = ?').get(result.lastInsertRowid);
}

function listByRoom(roomId, limit = 200) {
  return db
    .prepare(
      `SELECT messages.*, users.username AS sender_username
       FROM messages JOIN users ON users.id = messages.sender_id
       WHERE room_id = ?
       ORDER BY messages.created_at ASC, messages.id ASC
       LIMIT ?`
    )
    .all(roomId, limit);
}

function listConversationsForUser(userId) {
  // LIKE 패턴은 JS에서 완성된 문자열로 만들어 바인딩한다. SQL에서 ?(바인드 파라미터,
  // better-sqlite3는 JS 숫자를 REAL로 바인딩함)를 '||'로 문자열 연결하면 정수가
  // "1.0"처럼 소수점이 붙은 형태로 변환되어 'dm:1:%' 같은 패턴이 깨지는 문제가 있었다.
  const rows = db
    .prepare(
      `SELECT room_id, content, created_at
       FROM messages
       WHERE room_id LIKE ? OR room_id LIKE ?
       ORDER BY created_at DESC, id DESC`
    )
    .all(`dm:${userId}:%`, `dm:%:${userId}`);

  // rows는 최신순으로 정렬되어 있으므로, room_id별로 처음 만나는 행이 최근 메시지다.
  const conversations = new Map();
  for (const row of rows) {
    if (conversations.has(row.room_id)) continue;
    const [, a, b] = row.room_id.split(':');
    const otherId = Number(a) === Number(userId) ? Number(b) : Number(a);
    conversations.set(row.room_id, {
      otherId,
      lastContent: row.content,
      lastAt: row.created_at,
    });
  }
  return Array.from(conversations.values());
}

module.exports = { create, listByRoom, listConversationsForUser };
