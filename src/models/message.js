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

module.exports = { create, listByRoom };
