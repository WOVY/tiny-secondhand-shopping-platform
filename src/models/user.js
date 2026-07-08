const db = require('../config/db');
const { SIGNUP_BONUS_BALANCE } = require('../config/constants');

function findByUsername(username) {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
}

function findById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

function create({ username, passwordHash }) {
  const result = db
    .prepare('INSERT INTO users (username, password_hash, balance) VALUES (?, ?, ?)')
    .run(username, passwordHash, SIGNUP_BONUS_BALANCE);
  return findById(result.lastInsertRowid);
}

function updateBio(id, bio) {
  db.prepare('UPDATE users SET bio = ? WHERE id = ?').run(bio, id);
}

function updatePassword(id, passwordHash) {
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, id);
}

function updateStatus(id, status) {
  db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, id);
}

module.exports = {
  findByUsername,
  findById,
  create,
  updateBio,
  updatePassword,
  updateStatus,
};
