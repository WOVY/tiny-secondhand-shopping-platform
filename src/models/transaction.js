const db = require('../config/db');

class InsufficientBalanceError extends Error {}

// better-sqlite3의 트랜잭션 콜백은 완전히 동기적으로 실행되며 Node는 단일 스레드이므로,
// 이 함수 실행 도중에는 다른 요청의 콜백이 중간에 끼어들 수 없다 (잔액 확인과 갱신 사이의
// 경합 조건/이중 송금을 방지하는 핵심 장치).
const transfer = db.transaction(({ fromUserId, toUserId, amount }) => {
  const sender = db.prepare('SELECT balance FROM users WHERE id = ?').get(fromUserId);
  if (!sender || sender.balance < amount) {
    throw new InsufficientBalanceError('잔액이 부족합니다.');
  }

  db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').run(amount, fromUserId);
  db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(amount, toUserId);

  return db
    .prepare('INSERT INTO transactions (from_user_id, to_user_id, amount) VALUES (?, ?, ?)')
    .run(fromUserId, toUserId, amount).lastInsertRowid;
});

function listForUser(userId) {
  return db
    .prepare(
      `SELECT transactions.*, su.username AS from_username, tu.username AS to_username
       FROM transactions
       JOIN users su ON su.id = transactions.from_user_id
       JOIN users tu ON tu.id = transactions.to_user_id
       WHERE from_user_id = ? OR to_user_id = ?
       ORDER BY transactions.created_at DESC, transactions.id DESC`
    )
    .all(userId, userId);
}

module.exports = { transfer, listForUser, InsufficientBalanceError };
